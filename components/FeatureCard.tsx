import type { Icon } from "@phosphor-icons/react";

export function FeatureCard({ Icon, title, children, number }: { Icon: Icon; title: string; children: React.ReactNode; number: string }) {
  return (
    <article className="feature-card">
      <span className="feature-card__number">{number}</span>
      <span className="feature-card__icon"><Icon aria-hidden size={24} weight="duotone" /></span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}
