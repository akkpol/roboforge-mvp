import { Check } from "lucide-react";

export type ConnectionStepId = "install" | "provision";

type ConnectionProgressProps = {
  activeStep: ConnectionStepId;
};

const steps: ReadonlyArray<{ id: ConnectionStepId; hint: string; label: string }> = [
  { id: "install", label: "ติดตั้ง", hint: "ลง MicroPython + Agent ผ่าน USB" },
  { id: "provision", label: "Wi-Fi", hint: "ใส่ชื่อ WiFi hotspot แล้วส่งเข้า ESP32" },
];

export function ConnectionProgress({ activeStep }: ConnectionProgressProps) {
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const currentStep = steps[Math.max(activeIndex, 0)];

  return (
    <section className="connection-progress-card" aria-label="Connection progress">
      <div className="connection-progress-header">
        <strong>ขั้นตอน {Math.max(activeIndex + 1, 1)}/{steps.length}</strong>
        <span>{currentStep.label} — {currentStep.hint}</span>
      </div>
      <ol className="connection-steps">
        {steps.map((step, index) => {
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;

          return (
            <li
              aria-current={isActive ? "step" : undefined}
              className={isDone ? "is-done" : isActive ? "is-active" : ""}
              key={step.id}
            >
              <span className="connection-step-dot">{isDone ? <Check data-icon="inline-start" /> : index + 1}</span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
