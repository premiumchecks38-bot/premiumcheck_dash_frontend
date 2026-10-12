import { Brand } from "@/components/dashboard/brand";

/** Signed out pages: a single centred card on the website's warm surface colour. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-gutter py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <main
          id="main-content"
          className="rounded-xl border-thin border-border bg-background p-6 shadow-md sm:p-8"
        >
          {children}
        </main>
        <p className="mt-6 text-center font-body text-caption text-text-subtle">
          Staff only. Activity on this dashboard is recorded.
        </p>
      </div>
    </div>
  );
}
