import { NavRail } from "@/components/nav-rail";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="shell">
      <NavRail />
      <main className="main">{children}</main>
    </div>
  );
}
