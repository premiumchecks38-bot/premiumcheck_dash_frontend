import type { components } from "./types";

/** Backend schemas (generated from the OpenAPI document by npm run gen:api). */
export type Schemas = components["schemas"];

export type TeamMember = Schemas["TeamMemberResponse"];
export type RoleDefaults = Schemas["RoleDefaults"];
export type Overview = Schemas["Overview"];
export type Notification = Schemas["NotificationOut"];
export type TwoFactorSetup = Schemas["TwoFactorSetupResponse"];

export type BookingListItem = Schemas["AdminBookingListItem"];
export type BookingDetail = Schemas["AdminBookingDetail"];
export type BookingOptions = Schemas["BookingOptions"];
export type AvailabilityDay = Schemas["PreviewDay"];
export type CalendarEvent = Schemas["CalendarEvent"];
export type Quote = Schemas["QuoteResponse"];
export type CertificateSignature = Schemas["CertificateSignatureOut"];
export type Renewal = Schemas["RenewalItem"];
export type CustomerListItem = Schemas["AdminCustomerListItem"];
export type CustomerDetail = Schemas["AdminCustomerDetail"];
export type PaymentSummary = Schemas["PaymentSummary"];
export type PaymentListItem = Schemas["PaymentListItem"];
export type PaymentListTotals = Schemas["PaymentListTotals"];
export type PaymentDetail = Schemas["PaymentDetail"];
export type RefundResult = Schemas["RefundResult"];
export type AttentionItem = Schemas["AttentionItem"];
export type VatReport = Schemas["VatReport"];
export type Payout = Schemas["PayoutOut"];
export type Dispute = Schemas["DisputeListItem"];

export interface PageMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface Envelope<T> {
  success: true;
  data: T;
  message?: string | null;
  meta?: PageMeta;
}

/** A paginated list: the rows and the page information. */
export interface Paged<T> {
  data: T;
  meta: PageMeta;
}

// Catalog
export type Category = Schemas["AdminCategory"];
export type CategoryCreate = Schemas["CategoryCreate"];
export type ServiceSummary = Schemas["AdminServiceSummary"];
export type ServiceDetail = Schemas["AdminServiceDetail"];
export type ServiceCreate = Schemas["ServiceCreate"];
export type PriceOption = Schemas["AdminPriceOption"];
export type PriceOptionCreate = Schemas["PriceOptionCreate"];
export type PropertyType = Schemas["AdminPropertyType"];
export type PriceTableCategory = Schemas["AdminPriceTableCategory"];
export type PricingType = Schemas["PricingType"];

// Areas and availability
export type Area = Schemas["AdminArea"];
export type AreaCreate = Schemas["AreaCreate"];
export type PostcodePrefix = Schemas["AdminPostcodePrefix"];
export type AppointmentWindow = Schemas["AppointmentWindowOut"];
export type BlockedDate = Schemas["BlockedDateOut"];
export type Engineer = Schemas["EngineerOut"];

// Content
export type BlogCategory = Schemas["BlogCategoryOut"];
export type BlogPostSummary = Schemas["BlogPostSummary"];
export type BlogPost = Schemas["BlogPostOut"];
export type BlogPostStatus = Schemas["BlogPostStatus"];
export type PageSummary = Schemas["PageSummary"];
export type PageDetail = Schemas["PageOut"];
export type PageSection = Schemas["PageSectionOut"];
export type PageType = Schemas["PageType"];
export type SectionTypeInfo = Schemas["SectionTypeOut"];
export type Faq = Schemas["FaqOut"];
export type FaqGroup = Schemas["FaqGroup"];
export type ReviewSource = Schemas["ReviewSource"];
export type Media = Schemas["MediaOut"];
export type MediaFolder = Schemas["MediaFolder"];
export type FolderCount = Schemas["FolderCount"];
export type UploadSignature = Schemas["UploadSignatureOut"];
export type BrowsePage = Schemas["BrowsePage"];
export type BrowseItem = Schemas["BrowseItem"];
export type MediaImportResult = Schemas["MediaImportResult"];
export type MediaUsage = Schemas["MediaUsageOut"];
export type MediaSyncResult = Schemas["MediaSyncResult"];
export type ImageRef = Schemas["ImageRef"];

// SEO and redirects
export type SeoListItem = Schemas["SeoListItem"];
export type SeoMeta = Schemas["SeoMetaOut"];
export type SeoResult = Schemas["SeoResult"];
export type SeoEntityType = Schemas["SeoEntityType"];
export type Redirect = Schemas["RedirectOut"];
export type RedirectImportResult = Schemas["RedirectImportResult"];

// Leads, settings and logs
export type QuoteRequest = Schemas["QuoteRequestOut"];
export type QuoteRequestStatus = Schemas["QuoteRequestStatus"];
export type ContactMessage = Schemas["ContactMessageOut"];
export type BookingDraft = Schemas["BookingDraft"];
export type LeadCounts = Schemas["LeadCounts"];
export type SiteSettings = Schemas["SiteSettingsData"];
export type EmailLog = Schemas["EmailLogOut"];
export type EmailLogsPage = Schemas["EmailLogsPage"];
export type EmailQuota = Schemas["EmailQuotaSummary"];
export type AuditLog = Schemas["AuditLogOut"];
export type AuditFacets = Schemas["AuditFacets"];
