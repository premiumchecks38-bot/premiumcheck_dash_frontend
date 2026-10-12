import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { BlogView } from "./blog-view";
import { PageHeader } from "@/components/dashboard/page-header";
import { Can } from "@/components/dashboard/session-context";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Blog & Compliance Hub" };

export default function BlogPage() {
  return (
    <>
      <PageHeader
        title="Blog & Compliance Hub"
        description="Editorial content, guidance notes, compliance regulations and landlord resources."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Content" },
          { label: "Blog" },
        ]}
        actions={
          <Can requires={{ page: "blogs", level: "edit" }}>
            <Button asChild size="sm" variant="accent" data-testid="new-post-btn">
              <Link href={"/blog/new" as Route}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Write article
              </Link>
            </Button>
          </Can>
        }
      />
      <Suspense>
        <BlogView />
      </Suspense>
    </>
  );
}
