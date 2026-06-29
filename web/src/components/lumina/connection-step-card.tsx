import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

export type ConnectionStepTone = "active" | "done" | "pending";

type ConnectionStepCardProps = {
  action?: ReactNode;
  Icon: LucideIcon;
  index: number;
  text: string;
  title: string;
  tone: ConnectionStepTone;
};

export function ConnectionStepCard({ action, Icon, index, text, title, tone }: ConnectionStepCardProps) {
  return (
    <article className={`connection-step-card is-${tone}`}>
      <span className="connection-step-index">{index}</span>
      <span className="connection-step-icon">
        <Icon data-icon="inline-start" />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {action ?? (tone === "done" ? <Check className="connection-step-check" data-icon="inline-start" /> : null)}
    </article>
  );
}
