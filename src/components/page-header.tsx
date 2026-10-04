import type { LucideIcon } from "lucide-react";

/** Every page's entry point: an optional eyebrow, the title, a line of context, and actions. */
export function PageHeader({
  title,
  eyebrow,
  children,
  action,
}: {
  title: string;
  eyebrow?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-head reveal">
      <div className="page-head-text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action && <div className="page-head-action">{action}</div>}
    </div>
  );
}

/** A quiet block for "nothing here yet", with an icon tile and an optional next step. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
      <span className="empty-icon">
        <Icon aria-hidden strokeWidth={1.75} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
