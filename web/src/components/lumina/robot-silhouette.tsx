import type { RobotItem } from "./data";

type SilhouetteTone = Exclude<RobotItem["tone"], "active">;

export function isSilhouetteTone(tone: RobotItem["tone"]): tone is SilhouetteTone {
  return tone !== "active";
}

export function RobotSilhouette({ tone }: { tone: SilhouetteTone }) {
  return (
    <svg aria-hidden="true" className={`robot-silhouette robot-silhouette-${tone}`} viewBox="0 0 120 86">
      {tone === "tracked" ? (
        <>
          <rect x="18" y="45" width="84" height="24" rx="12" />
          <rect x="30" y="28" width="56" height="28" rx="12" />
          <circle cx="38" cy="57" r="6" />
          <circle cx="60" cy="57" r="6" />
          <circle cx="82" cy="57" r="6" />
          <path d="M47 28l6-12h18l7 12" />
        </>
      ) : null}
      {tone === "drone" ? (
        <>
          <rect x="45" y="34" width="30" height="22" rx="10" />
          <path d="M36 45H15M84 45h21M50 34L32 18M70 34l18-16M50 56L32 72M70 56l18 16" />
          <circle cx="15" cy="45" r="10" />
          <circle cx="105" cy="45" r="10" />
          <circle cx="31" cy="17" r="9" />
          <circle cx="89" cy="17" r="9" />
        </>
      ) : null}
      {tone === "arm" ? (
        <>
          <rect x="26" y="66" width="52" height="10" rx="5" />
          <path d="M54 66V49l23-18" />
          <path d="M74 32l13 13 13-10" />
          <circle cx="54" cy="49" r="8" />
          <circle cx="76" cy="31" r="8" />
          <path d="M100 35l9-8M101 36l10 3" />
        </>
      ) : null}
    </svg>
  );
}
