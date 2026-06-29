import { Check } from "lucide-react";

export type ConnectionStepId = "power" | "wifi" | "online" | "test";

type ConnectionProgressProps = {
  activeStep: ConnectionStepId;
};

const steps: ReadonlyArray<{ id: ConnectionStepId; label: string }> = [
  { id: "power", label: "เปิดเครื่อง" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "online", label: "Online" },
  { id: "test", label: "ทดสอบ" },
];

export function ConnectionProgress({ activeStep }: ConnectionProgressProps) {
  const activeIndex = steps.findIndex((step) => step.id === activeStep);

  return (
    <section className="connection-progress-card" aria-label="Connection progress">
      <div className="connection-progress-header">
        <strong>ขั้นตอน {Math.max(activeIndex + 1, 1)}/4</strong>
        <span>Connection Quest</span>
      </div>
      <ol className="connection-steps">
        {steps.map((step, index) => {
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;

          return (
            <li className={isDone ? "is-done" : isActive ? "is-active" : ""} key={step.id}>
              <span className="connection-step-dot">{isDone ? <Check data-icon="inline-start" /> : null}</span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
