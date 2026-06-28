import Image from "next/image";
import { Check } from "lucide-react";
import { hardwareItems } from "./data";

export function HardwareGrid() {
  return (
    <section className="hardware-row" aria-label="Rover hardware layer">
      {hardwareItems.map(({ Icon, image, key, label, name, tone }) => (
        <article className={`hardware-card hardware-card-${tone}`} key={key}>
          <span className="check-badge">
            <Check data-icon="inline-start" />
          </span>
          <div className="hardware-card-surface">
            <Image alt={`${label} ${name}`} className="hardware-image" height={110} loading="eager" src={image} width={160} />
            <div className="hardware-label">
              <Icon data-icon="inline-start" />
              <span>{label}</span>
              <strong>{name}</strong>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
