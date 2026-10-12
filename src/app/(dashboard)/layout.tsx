import { cookies } from "next/headers";

import { AppShell, SIDEBAR_COOKIE } from "@/components/dashboard/shell/app-shell";
import { navigationFor } from "@/config/navigation";
import { currentPath, requireUser } from "@/lib/dal";

const SETUP_PATH = "/account/security/setup";

/**
 * Every signed in page. The session is verified with the backend here (DAL); while a forced
 * 2FA setup is pending, only the setup page is reachable and the sidebar is empty.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = await currentPath();
  const user = await requireUser({ allowTwoFactorSetup: path.startsWith(SETUP_PATH) });
  const jar = await cookies();
  const groups = user.two_factor_setup_required ? [] : navigationFor(user);
  return (
    <AppShell
      user={user}
      groups={groups}
      initialCollapsed={jar.get(SIDEBAR_COOKIE)?.value === "collapsed"}
    >
      {children}
    </AppShell>
  );
}
