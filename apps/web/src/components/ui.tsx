import type { ComponentPropsWithoutRef, ReactNode } from "react";

type StatusTone = "complete" | "current" | "pending" | "neutral";

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function SurfaceCard({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section className={`surface-card ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}
