"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { hardwareItems } from "./data";

export function HardwareGrid() {
  const rowRef = useRef<HTMLElement>(null);
  const [canSlideLeft, setCanSlideLeft] = useState(false);
  const [canSlideRight, setCanSlideRight] = useState(false);

  const syncSlideState = useCallback(() => {
    const row = rowRef.current;

    if (!row) {
      return;
    }

    const maxScroll = row.scrollWidth - row.clientWidth;

    setCanSlideLeft(row.scrollLeft > 4);
    setCanSlideRight(row.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const row = rowRef.current;

    if (!row) {
      return;
    }

    syncSlideState();
    row.addEventListener("scroll", syncSlideState, { passive: true });
    window.addEventListener("resize", syncSlideState);

    return () => {
      row.removeEventListener("scroll", syncSlideState);
      window.removeEventListener("resize", syncSlideState);
    };
  }, [syncSlideState]);

  function slideHardware(direction: -1 | 1) {
    const row = rowRef.current;

    if (!row) {
      return;
    }

    row.scrollBy({
      left: direction * Math.max(row.clientWidth * 0.72, 240),
      behavior: "smooth",
    });
  }

  return (
    <div className="hardware-slider">
      <button
        aria-label="เลื่อนฮาร์ดแวร์ไปทางซ้าย"
        className="hardware-slide-control hardware-slide-control-left"
        disabled={!canSlideLeft}
        type="button"
        onClick={() => slideHardware(-1)}
      >
        <ChevronLeft />
      </button>
      <section ref={rowRef} className="hardware-row" aria-label="Rover hardware layer">
        {hardwareItems.map(({ ariaLabel, image, key, name, tone }) => (
          <article className={`hardware-card hardware-card-${tone}`} key={key} aria-label={ariaLabel}>
            <span className="check-badge">
              <Check data-icon="inline-start" />
            </span>
            <div className="hardware-card-surface">
              <Image alt="" className="hardware-illustration" height={520} loading="eager" src={image} width={640} />
              <div className="hardware-label">
                <span aria-hidden="true" />
                <strong>{name}</strong>
              </div>
            </div>
          </article>
        ))}
      </section>
      <button
        aria-label="เลื่อนฮาร์ดแวร์ไปทางขวา"
        className="hardware-slide-control hardware-slide-control-right"
        disabled={!canSlideRight}
        type="button"
        onClick={() => slideHardware(1)}
      >
        <ChevronRight />
      </button>
    </div>
  );
}
