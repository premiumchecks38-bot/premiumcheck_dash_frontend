import type { Metadata } from "next";

import { CustomerDetailView } from "@/components/dashboard/customers/customer-detail";
import type { CustomerDetail } from "@/lib/api/schemas";
import { prefetchAdmin } from "@/lib/dal";

export const metadata: Metadata = { title: "Customer" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initial = UUID.test(id) ? await prefetchAdmin<CustomerDetail>(`/customers/${id}`) : null;
  return <CustomerDetailView id={id} initial={initial} />;
}
