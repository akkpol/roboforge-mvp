import { navItems } from "./data";

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {navItems.map(({ Icon, label, state }) => (
        <button
          aria-disabled={state !== "active"}
          className={state === "active" ? "is-active" : ""}
          disabled={state !== "active"}
          key={label}
          type="button"
        >
          <Icon data-icon="inline-start" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
