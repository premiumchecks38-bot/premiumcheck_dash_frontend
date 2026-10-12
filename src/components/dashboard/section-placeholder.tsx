import { Hammer } from "lucide-react";

import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";

/** Temporary page for sections built in later prompts (permission checked by its layout). */
export function SectionPlaceholder({
  title,
  description,
  group,
}: {
  title: string;
  description: string;
  group?: string;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          ...(group ? [{ label: group }] : []),
          { label: title },
        ]}
      />
      <EmptyState
        icon={Hammer}
        title="This section is being built"
        description="It will appear here in the next dashboard update. Everything else you have access to is available from the menu."
      />
    </>
  );
}
