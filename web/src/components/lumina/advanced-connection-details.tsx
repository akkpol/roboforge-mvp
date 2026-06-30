"use client";

import { useState } from "react";
import { ChevronDown, Code2 } from "lucide-react";

type AdvancedConnectionDetailsProps = {
  broker: string;
  commandTopic: string;
  mode: string;
  robotId: string;
  statusTopic: string;
};

export function AdvancedConnectionDetails({ broker, commandTopic, mode, robotId, statusTopic }: AdvancedConnectionDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className={isOpen ? "advanced-details is-open" : "advanced-details"}>
      <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
        <span className="advanced-icon">
          <Code2 data-icon="inline-start" />
        </span>
        <span>
          <strong>รายละเอียดการเชื่อมต่อ (ขั้นสูง)</strong>
          <small>
            Robot: {robotId} · Broker: RoboForge
          </small>
        </span>
        <ChevronDown className="advanced-chevron" data-icon="inline-start" />
      </button>
      {isOpen ? (
        <dl className="advanced-details-grid">
          <div>
            <dt>Mode</dt>
            <dd>{mode}</dd>
          </div>
          <div>
            <dt>Broker</dt>
            <dd>{broker}</dd>
          </div>
          <div>
            <dt>Robot ID</dt>
            <dd>{robotId}</dd>
          </div>
          <div>
            <dt>Status topic</dt>
            <dd>{statusTopic}</dd>
          </div>
          <div>
            <dt>Command topic</dt>
            <dd>{commandTopic}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
