import Link from "next/link";
import { navItems } from "./data";

type BottomNavProps = {
  active?: "garage" | "profile";
};

export function BottomNav({ active = "garage" }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {navItems.map(({ Icon, href, key, label, state }) =>
        state === "ready" && href ? (
          <Link
            aria-current={active === key ? "page" : undefined}
            className={active === key ? "is-active" : ""}
            href={href}
            key={key}
          >
            <Icon data-icon="inline-start" />
            <span>{label}</span>
          </Link>
        ) : (
          <button
            aria-disabled="true"
            disabled
            key={key}
            type="button"
          >
            <Icon data-icon="inline-start" />
            <span>{label}</span>
          </button>
        ),
      )}
    </nav>
  );
}
