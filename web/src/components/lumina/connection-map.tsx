import type { LucideIcon } from "lucide-react";
import { Cloud, Cpu, Router, Smartphone } from "lucide-react";

type ConnectionMapNode = {
  Icon: LucideIcon;
  detail: string;
  label: string;
};

const nodes: readonly ConnectionMapNode[] = [
  { Icon: Smartphone, label: "แอปของคุณ", detail: "มือถือหรือเว็บ" },
  { Icon: Router, label: "Wi-Fi / Hotspot", detail: "ต้องเป็น 2.4GHz" },
  { Icon: Cloud, label: "HiveMQ", detail: "MQTT broker" },
  { Icon: Cpu, label: "ESP32 Rover", detail: "รอ status" },
];

export function ConnectionMap() {
  return (
    <div className="connection-map" aria-label="MQTT connection path">
      {nodes.map(({ Icon, detail, label }, index) => (
        <div className="connection-map-segment" key={label}>
          <div className="connection-map-node">
            <span className="connection-map-icon">
              <Icon data-icon="inline-start" />
            </span>
            <strong>{label}</strong>
            <small>{detail}</small>
          </div>
          {index < nodes.length - 1 ? <span className="connection-map-link" aria-hidden="true" /> : null}
        </div>
      ))}
    </div>
  );
}
