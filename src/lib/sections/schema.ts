/**
 * Page section forms built from the backend's JSON schemas (GET /admin/pages/section-types,
 * generated from the Pydantic models in app/schemas/pages.py). The same schema drives the form
 * fields, the default values of a new section and validation before saving, so the dashboard
 * refuses exactly what the API would refuse. Rules the schema cannot express (the model
 * validators) are repeated in `extraChecks`.
 */

export interface JsonSchema {
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  enum?: (string | number)[];
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  default?: unknown;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  format?: string;
}

export interface SectionType {
  type: string;
  description: string;
  rich: boolean;
  json_schema: JsonSchema;
}

/** Fields the API fills in itself; never shown or sent. */
const SERVER_FIELDS = new Set(["html", "content_html"]);

export type FieldKind =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "image"
  | "editor"
  | "link"
  | "object"
  | "list"
  | "string-list"
  | "table-rows"
  | "faq-ids"
  | "service-slugs"
  | "category-slug"
  | "area-slugs"
  | "href";

export interface FieldSpec {
  name: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  nullable: boolean;
  schema: JsonSchema;
  options?: (string | number)[];
  /** For objects and lists of objects. */
  fields?: FieldSpec[];
}

const LABELS: Record<string, string> = {
  image_id: "Image",
  primary_cta: "Main button",
  secondary_cta: "Second button",
  cta: "Button",
  show_postcode_search: "Show the postcode search",
  href: "Link (a page path like /services, or https://...)",
  faq_ids: "FAQs",
  service_slugs: "Services",
  category_slug: "Category",
  area_slugs: "Areas",
  link_label: "Link text",
  image_position: "Image position",
  sidebar_position: "Sidebar position",
  show_form: "Show the contact form",
  show_map: "Show the map",
  featured_only: "Featured reviews only",
  placeholder: "Placeholder copy (waiting for the client)",
};

/** Long text fields that read better as a text area. */
const LONG_TEXT = new Set(["subheading", "intro", "text"]);

export function labelFor(name: string, schema?: JsonSchema): string {
  if (LABELS[name]) return LABELS[name];
  const title = schema?.title ?? name.replace(/_/g, " ");
  const lower = title.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Follow a $ref and unwrap "X or null". */
export function resolve(
  schema: JsonSchema,
  root: JsonSchema,
): { schema: JsonSchema; nullable: boolean } {
  let current = schema;
  let nullable = false;
  if (current.anyOf) {
    const options = current.anyOf.filter((s) => s.type !== "null");
    nullable = options.length < current.anyOf.length;
    current = { ...current, ...(options[0] ?? {}), anyOf: undefined };
  }
  if (current.$ref) {
    const name = current.$ref.split("/").pop() ?? "";
    current = { ...(root.$defs?.[name] ?? {}), title: current.title ?? root.$defs?.[name]?.title };
  }
  return { schema: current, nullable };
}

function kindFor(name: string, schema: JsonSchema): FieldKind {
  if (name === "image_id") return "image";
  if (name === "content") return "editor";
  if (name === "faq_ids") return "faq-ids";
  if (name === "service_slugs") return "service-slugs";
  if (name === "category_slug") return "category-slug";
  if (name === "area_slugs") return "area-slugs";
  if (name === "rows" && schema.items?.type === "array") return "table-rows";
  if (name === "href") return "href";
  if (schema.enum) return "select";
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === "boolean") return "boolean";
  if (type === "integer" || type === "number") return "number";
  if (type === "array") return schema.items?.type === "string" ? "string-list" : "list";
  if (type === "object") {
    const props = Object.keys(schema.properties ?? {});
    return props.length === 2 && props.includes("label") && props.includes("href")
      ? "link"
      : "object";
  }
  return LONG_TEXT.has(name) ? "textarea" : "text";
}

export function fieldsFor(schema: JsonSchema, root: JsonSchema = schema): FieldSpec[] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {})
    .filter(([name]) => !SERVER_FIELDS.has(name))
    .map(([name, raw]) => {
      const { schema: field, nullable } = resolve(raw, root);
      const kind = kindFor(name, field);
      const spec: FieldSpec = {
        name,
        label: labelFor(name, raw.title ? raw : field),
        kind,
        required: required.has(name),
        nullable,
        schema: field,
        options: field.enum,
      };
      if (kind === "object" || kind === "link") spec.fields = fieldsFor(field, root);
      if (kind === "list" && field.items) {
        const item = resolve(field.items, root).schema;
        spec.fields = fieldsFor(item, root);
      }
      return spec;
    });
}

/** Values for a new section or list item: required text empty, everything else its default. */
export function defaultsFor(
  schema: JsonSchema,
  root: JsonSchema = schema,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const spec of fieldsFor(schema, root)) {
    if (spec.schema.default !== undefined && spec.schema.default !== null) {
      out[spec.name] = spec.schema.default;
    } else if (spec.required) {
      if (spec.kind === "object" || spec.kind === "link")
        out[spec.name] = defaultsFor(spec.schema, root);
      else if (spec.kind === "list") {
        const min = spec.schema.minItems ?? 0;
        const item = spec.schema.items ? resolve(spec.schema.items, root).schema : {};
        out[spec.name] = Array.from({ length: min }, () => defaultsFor(item, root));
      } else if (spec.kind === "string-list") out[spec.name] = [""];
      else if (spec.kind === "table-rows") out[spec.name] = [[""]];
      else out[spec.name] = "";
    }
  }
  return out;
}

export type SectionErrors = Record<string, string>;

const HREF = /^(\/|https:\/\/|mailto:|tel:|#)/;

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function check(
  value: unknown,
  schema: JsonSchema,
  root: JsonSchema,
  path: string,
  label: string,
  required: boolean,
  errors: SectionErrors,
): void {
  const { schema: s } = resolve(schema, root);
  if (isEmpty(value)) {
    if (required) errors[path] = `${label} is required`;
    return;
  }
  const type = Array.isArray(s.type) ? s.type[0] : s.type;
  if (s.enum && !s.enum.includes(value as string | number)) {
    errors[path] = `Choose one of: ${s.enum.join(", ")}`;
    return;
  }
  if (type === "string" && typeof value === "string") {
    if (s.minLength !== undefined && value.trim().length < s.minLength)
      errors[path] = `${label} is required`;
    else if (s.maxLength !== undefined && value.length > s.maxLength)
      errors[path] = `${label} must be ${String(s.maxLength)} characters or fewer`;
    else if (s.pattern && !new RegExp(s.pattern).test(value))
      errors[path] = `${label} is not in the right format`;
    else if (path.endsWith("href") && !HREF.test(value))
      errors[path] = "Use a page path like /contact, an https:// address, mailto: or tel:";
    return;
  }
  if (type === "integer" || type === "number") {
    const n = Number(value);
    if (!Number.isFinite(n) || (type === "integer" && !Number.isInteger(n)))
      errors[path] = `${label} must be a whole number`;
    else if (s.minimum !== undefined && n < s.minimum)
      errors[path] = `${label} must be at least ${String(s.minimum)}`;
    else if (s.maximum !== undefined && n > s.maximum)
      errors[path] = `${label} must be at most ${String(s.maximum)}`;
    return;
  }
  if (type === "array" && Array.isArray(value)) {
    if (s.minItems !== undefined && value.length < s.minItems)
      errors[path] = `Add at least ${String(s.minItems)}`;
    else if (s.maxItems !== undefined && value.length > s.maxItems)
      errors[path] = `No more than ${String(s.maxItems)}`;
    const items = s.items;
    if (items) {
      value.forEach((item: unknown, i) =>
        check(
          item,
          items,
          root,
          `${path}.${String(i)}`,
          `Item ${String(i + 1)}`,
          true,
          errors,
        ),
      );
    }
    return;
  }
  if (type === "object" && value && typeof value === "object") {
    const req = new Set(s.required ?? []);
    for (const [name, child] of Object.entries(s.properties ?? {})) {
      if (SERVER_FIELDS.has(name)) continue;
      check(
        (value as Record<string, unknown>)[name],
        child,
        root,
        path ? `${path}.${name}` : name,
        labelFor(name, child),
        req.has(name),
        errors,
      );
    }
  }
}

/** Rules from the model validators in app/schemas/pages.py. */
function extraChecks(type: string, data: Record<string, unknown>, errors: SectionErrors): void {
  if (type === "services_grid") {
    if (data.mode === "category" && isEmpty(data.category_slug))
      errors.category_slug = "Choose the category to show";
    if (data.mode === "selected" && !(data.service_slugs as unknown[] | undefined)?.length)
      errors.service_slugs = "Choose at least one service";
  }
  if (type === "table") {
    const columns = (data.columns as unknown[] | undefined)?.length ?? 0;
    const rows = (data.rows as unknown[][] | undefined) ?? [];
    rows.forEach((row, i) => {
      if (row.length !== columns)
        errors[`rows.${String(i)}`] =
          `Row ${String(i + 1)} needs ${String(columns)} cells, one per column`;
    });
  }
}

/** Validate section data; returns errors keyed by field path ("cards.0.title"). */
export function validateSection(
  type: string,
  data: Record<string, unknown>,
  schema: JsonSchema,
): SectionErrors {
  const errors: SectionErrors = {};
  check(data, { ...schema, type: "object" }, schema, "", "Section", true, errors);
  extraChecks(type, data, errors);
  return errors;
}

/** Drop empty optional values so the API stores null rather than empty strings. */
export function compactSection(
  data: Record<string, unknown>,
  schema: JsonSchema,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const required = new Set(schema.required ?? []);
  for (const [key, value] of Object.entries(data)) {
    if (SERVER_FIELDS.has(key)) continue;
    if (value === "" && !required.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/** Short names and help for the "Add a section" picker. */
export const SECTION_LABELS: Record<string, { label: string; hint: string }> = {
  hero: { label: "Hero banner", hint: "Big heading, short text, an image and buttons." },
  rich_text: { label: "Text", hint: "Headings, paragraphs, lists and tables." },
  services_grid: { label: "Services", hint: "Service cards: featured, a category or chosen ones." },
  cta: { label: "Call to action", hint: "A band with a heading and one button." },
  faq: { label: "FAQs", hint: "Questions and answers, with FAQ structured data." },
  reviews: { label: "Reviews", hint: "Customer reviews from the Reviews page." },
  steps: { label: "Steps", hint: "Numbered steps, like how booking works." },
  image_text: { label: "Image and text", hint: "An image beside text, left or right." },
  areas_list: { label: "Areas", hint: "The towns and areas covered." },
  content_with_sidebar: { label: "Text with sidebar", hint: "Long text with a box of links." },
  contact_details: { label: "Contact details", hint: "Phone, email, hours and the form." },
  cards_grid: { label: "Cards", hint: "A grid of linked cards with icons." },
  table: { label: "Table", hint: "A simple data table with a caption." },
  logos: { label: "Logos", hint: "Accreditation or partner logos." },
  cookie_table: { label: "Cookie table", hint: "The cookies the website sets." },
};

/** A one line summary of a section for the list (its heading, or what it shows). */
export function sectionSummary(type: string, data: Record<string, unknown>): string {
  const heading = typeof data.heading === "string" ? data.heading : "";
  if (heading) return heading;
  if (type === "table" && typeof data.caption === "string") return data.caption;
  return SECTION_LABELS[type]?.hint ?? type;
}
