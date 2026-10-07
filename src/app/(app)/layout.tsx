import { AppShell } from "@/components/app-shell";
import { LinkedInReconnectNotice } from "@/components/linkedin-notice";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell>
      <LinkedInReconnectNotice />
      {children}
    </AppShell>
  );
}
