"use client";

import {
  BatteryCharging,
  Bot,
  CheckCircle,
  CircuitBoard,
  Gamepad2,
  Gauge,
  Hand,
  Home,
  LogOut,
  Paintbrush,
  Radio,
  RadioTower,
  Rocket,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  saveBetaApplication,
  saveRobotInterest,
  updateRobotProgress,
  updateRobotTheme,
} from "@/app/dashboard/actions";
import {
  capabilities,
  defaultProgress,
  demoTelemetry,
  fleet,
  supportScripts,
  themes,
  upgradeInterests,
  upgradeItems,
  type ConsoleScreen,
  type OwnerProgress,
  type ThemeId,
  type UpgradeInterest,
} from "@/lib/roboforge-data";
import type { OwnerWorkspace } from "@/lib/supabase/server";

type OwnerConsoleProps = {
  workspace: OwnerWorkspace;
};

function safeTheme(theme: string | null | undefined): ThemeId {
  return theme === "neo" ? "neo" : "forge";
}

function completeProgress(progress: OwnerProgress): OwnerProgress {
  return {
    ...progress,
    ready_for_floor_test:
      progress.setup_complete &&
      progress.first_drive_complete &&
      progress.battery_calibrated,
  };
}

function Button({
  children,
  disabled,
  icon: Icon,
  onClick,
  type = "button",
  variant = "primary",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  icon?: React.ComponentType<{ size?: number }>;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "quiet";
}) {
  return (
    <button
      className={`button rf-button rf-button--${variant}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {Icon ? <Icon size={18} /> : null}
      <span>{children}</span>
    </button>
  );
}

function StatusPill() {
  return (
    <span className="rf-status-pill is-online">
      <RadioTower size={14} /> DEMO LINK
    </span>
  );
}

function RobotHero({
  compact = false,
  identityStatus = "ONLINE",
  theme,
}: {
  compact?: boolean;
  identityStatus?: string;
  theme: ThemeId;
}) {
  const selected = themes[theme];

  return (
    <div className={`rf-robot-hero ${compact ? "rf-robot-hero--compact" : ""}`}>
      <Image
        alt={`${selected.robotName} ${selected.robotClass} digital form`}
        fill
        priority={!compact}
        sizes={compact ? "(min-width: 900px) 45vw, 100vw" : "100vw"}
        src={selected.image}
      />
      <div className="rf-robot-identity">
        <strong>{selected.robotName}</strong>
        <span>{selected.robotClass}</span>
        <small>
          <RadioTower size={13} /> {identityStatus}
        </small>
      </div>
      <span className="rf-robot-serial">RF // ROVER-01 // DIGITAL FORM</span>
    </div>
  );
}

function FleetRail({
  selected,
  setSelected,
}: {
  selected: string;
  setSelected: (id: string) => void;
}) {
  return (
    <section aria-label="Robot fleet" className="rf-fleet-rail">
      {fleet.map((item) => (
        <button
          className={`rf-fleet-card ${selected === item.id ? "is-selected" : ""}`}
          key={item.id}
          onClick={() => setSelected(item.id)}
          type="button"
        >
          <Image
            alt={`${item.label} robot concept`}
            height={120}
            src={item.image}
            width={180}
          />
          <span>{item.label}</span>
          <small>{item.state === "active" ? "ROVER-01" : "COMING SOON"}</small>
        </button>
      ))}
    </section>
  );
}

function TelemetryGrid() {
  const telemetry = demoTelemetry;

  return (
    <div className="rf-telemetry-grid">
      <article>
        <BatteryCharging size={23} />
        <span>BATTERY</span>
        <strong>{Math.round(telemetry.batteryPercent)}%</strong>
        <small>{telemetry.batteryVoltage.toFixed(2)} V</small>
      </article>
      <article>
        <RadioTower size={23} />
        <span>LINK</span>
        <strong>{telemetry.wifiStrength.toUpperCase()}</strong>
        <small>Simulated</small>
      </article>
      <article>
        <Gauge size={23} />
        <span>LIMIT</span>
        <strong>45%</strong>
        <small>Hosted safety mode</small>
      </article>
    </div>
  );
}

function TruthStrip() {
  return (
    <div className="rf-truth-strip">
      <div>
        <span>
          <Sparkles size={17} />
        </span>
        <p>
          <strong>Digital Form</strong>
          <small>Premium identity shown in app</small>
        </p>
      </div>
      <div>
        <span>
          <CircuitBoard size={17} />
        </span>
        <p>
          <strong>Installed Hardware</strong>
          <small>Rover-01 ESP32 control base</small>
        </p>
      </div>
      <div className="is-future">
        <span>
          <Wrench size={17} />
        </span>
        <p>
          <strong>Future Body Kit</strong>
          <small>Roadmap concept, not shipping yet</small>
        </p>
      </div>
    </div>
  );
}

function ProgressPanel({
  onCompleteFirstDrive,
  progress,
}: {
  onCompleteFirstDrive: () => void;
  progress: OwnerProgress;
}) {
  const items = [
    ["Setup complete", progress.setup_complete],
    ["First drive complete", progress.first_drive_complete],
    ["Battery calibrated", progress.battery_calibrated],
    ["Ready for floor test", progress.ready_for_floor_test],
  ] as const;

  return (
    <section aria-label="Owner progress" className="rf-owner-progress">
      <div>
        <span className="eyebrow">
          <ShieldCheck size={15} /> OWNER PROGRESS
        </span>
        <h2>Rover-01 readiness</h2>
      </div>
      <div className="rf-owner-progress__items">
        {items.map(([label, complete]) => (
          <span className={complete ? "is-done" : ""} key={label}>
            <CheckCircle size={16} />
            {label}
          </span>
        ))}
      </div>
      <Button icon={Rocket} onClick={onCompleteFirstDrive} variant="secondary">
        Mark first drive
      </Button>
    </section>
  );
}

function Garage({
  onProgress,
  onScreen,
  progress,
  robotCode,
  theme,
}: {
  onProgress: (progress: OwnerProgress) => void;
  onScreen: (screen: ConsoleScreen) => void;
  progress: OwnerProgress;
  robotCode: string;
  theme: ThemeId;
}) {
  const [selectedFleet, setSelectedFleet] = useState("rover");
  const selectedTheme = themes[theme];

  function completeFirstDrive() {
    onProgress(
      completeProgress({
        ...progress,
        battery_calibrated: true,
        first_drive_complete: true,
        setup_complete: true,
      }),
    );
  }

  return (
    <main className="rf-screen rf-screen--garage">
      <section className="rf-screen-heading">
        <div>
          <span className="eyebrow">
            <Home size={15} /> DIGITAL HANGAR
          </span>
          <h1>My Garage</h1>
          <p>
            One command center for every machine you own and every machine you
            will build next.
          </p>
        </div>
        <StatusPill />
      </section>
      <FleetRail selected={selectedFleet} setSelected={setSelectedFleet} />
      {selectedFleet === "rover" ? (
        <section className="rf-garage-feature">
          <RobotHero theme={theme} />
          <div className="rf-garage-feature__info">
            <span className="rf-unit-label">
              ACTIVE UNIT // {robotCode.toUpperCase()}
            </span>
            <h2>{selectedTheme.robotName}</h2>
            <p className="rf-class-label">
              {selectedTheme.robotClass} · DIFFERENTIAL DRIVE
            </p>
            <TelemetryGrid />
            <TruthStrip />
            <div className="rf-button-row">
              <Button icon={Gamepad2} onClick={() => onScreen("cockpit")}>
                Enter cockpit
              </Button>
              <Button
                icon={Settings2}
                onClick={() => onScreen("profile")}
                variant="secondary"
              >
                Profile
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rf-future-unit">
          <span className="rf-future-unit__icon">
            <Bot size={76} />
          </span>
          <span className="eyebrow">FLEET EXPANSION</span>
          <h2>{selectedFleet.toUpperCase()} UNIT</h2>
          <p>
            This robot class is part of the RoboForge platform roadmap. Control
            hardware is not included in this build.
          </p>
          <span className="rf-concept-badge">COMING SOON</span>
        </section>
      )}
      <ProgressPanel onCompleteFirstDrive={completeFirstDrive} progress={progress} />
    </main>
  );
}

function Profile({
  onScreen,
  theme,
}: {
  onScreen: (screen: ConsoleScreen) => void;
  theme: ThemeId;
}) {
  const selectedTheme = themes[theme];

  return (
    <main className="rf-screen">
      <section className="rf-profile-hero">
        <div className="rf-profile-hero__visual">
          <RobotHero compact theme={theme} />
        </div>
        <div className="rf-profile-hero__copy">
          <span className="eyebrow">ROVER PROFILE // EVOLUTION 01</span>
          <h1>{selectedTheme.robotName}</h1>
          <p>
            {selectedTheme.robotClass} built on the Rover-01 physical base. Its
            digital identity can evolve before every physical upgrade is
            available.
          </p>
          <div className="rf-capability-list">
            {capabilities.map((capability) => (
              <span key={capability}>
                <CheckCircle size={17} /> {capability}
              </span>
            ))}
          </div>
          <Button icon={Gamepad2} onClick={() => onScreen("cockpit")}>
            Enter cockpit
          </Button>
        </div>
      </section>
      <section className="rf-evolution-section">
        <div className="rf-section-title">
          <span className="eyebrow">AEGIS EVOLUTION</span>
          <h2>Evolution roadmap</h2>
        </div>
        <div className="rf-evolution-track">
          <article className="is-current">
            <span>01</span>
            <CircuitBoard size={29} />
            <h3>Core Chassis</h3>
            <p>ESP32, dual motor drive, local Wi-Fi cockpit.</p>
            <small>INSTALLED HARDWARE</small>
          </article>
          <article>
            <span>02</span>
            <Radio size={29} />
            <h3>Sensor Pack</h3>
            <p>Distance, line tracking, mission telemetry.</p>
            <small>FUTURE UPGRADE</small>
          </article>
          <article>
            <span>03</span>
            <Paintbrush size={29} />
            <h3>Body Kit</h3>
            <p>Physical shell matching your selected Digital Form.</p>
            <small>ROADMAP CONCEPT</small>
          </article>
        </div>
      </section>
    </main>
  );
}

function Cockpit({
  onProgress,
  onScreen,
  progress,
}: {
  onProgress: (progress: OwnerProgress) => void;
  onScreen: (screen: ConsoleScreen) => void;
  progress: OwnerProgress;
}) {
  const [armed, setArmed] = useState(false);
  const [movementSent, setMovementSent] = useState(progress.first_drive_complete);
  const missionComplete = armed && movementSent;

  function sendDemoDrive() {
    setMovementSent(true);
    onProgress(
      completeProgress({
        ...progress,
        battery_calibrated: true,
        first_drive_complete: true,
        setup_complete: true,
      }),
    );
  }

  return (
    <main className="rf-screen rf-cockpit">
      <section className="rf-screen-heading">
        <div>
          <span className="eyebrow">
            <Gamepad2 size={15} /> FLEET DECK
          </span>
          <h1>Rover Cockpit</h1>
          <p>
            Hosted cockpit is demo telemetry only. Real motor control stays on
            the Rover local Wi-Fi page.
          </p>
        </div>
        <StatusPill />
      </section>
      <TelemetryGrid />
      <section className="rf-cockpit-grid">
        <article className="rf-control-panel">
          <div className="rf-panel-heading">
            <span>
              <ShieldCheck size={20} />
              <strong>{armed ? "Controls armed" : "Controls locked"}</strong>
            </span>
            <button
              className={`rf-arm-switch ${armed ? "is-on" : ""}`}
              onClick={() => setArmed((current) => !current)}
              type="button"
            >
              <span />
              {armed ? "ARMED" : "ARM"}
            </button>
          </div>
          <div className={`rf-joystick ${armed ? "is-armed" : ""}`}>
            <span className="rf-joystick__north">FWD</span>
            <span className="rf-joystick__south">REV</span>
            <span className="rf-joystick__west">LEFT</span>
            <span className="rf-joystick__east">RIGHT</span>
            <button
              className="rf-joystick__thumb"
              disabled={!armed}
              onClick={sendDemoDrive}
              type="button"
            >
              <Gamepad2 size={28} />
            </button>
          </div>
          <div className="rf-drive-readout">
            <span>
              THROTTLE <strong>{movementSent ? 18 : 0}</strong>
            </span>
            <span>
              STEERING <strong>0</strong>
            </span>
          </div>
        </article>
        <aside className="rf-mission-panel">
          <span className="eyebrow">MISSION 01</span>
          <h2>First Drive</h2>
          <ol>
            <li className="is-done">Connect to hosted demo</li>
            <li className={armed ? "is-done" : ""}>Arm simulated controls</li>
            <li className={movementSent ? "is-done" : ""}>
              Send a demo movement command
            </li>
            <li className="is-done">Cloud does not proxy live motors</li>
          </ol>
          <Button
            icon={Hand}
            onClick={() => {
              setArmed(false);
              setMovementSent(false);
            }}
            variant="danger"
          >
            Emergency stop
          </Button>
          {missionComplete ? (
            <div className="rf-mission-success">
              <CheckCircle size={27} />
              <span>
                <strong>Mission complete</strong>
                <small>Hosted driving loop verified as simulation.</small>
              </span>
            </div>
          ) : null}
          <Button icon={Wrench} onClick={() => onScreen("engineer")} variant="quiet">
            Open Engineer
          </Button>
        </aside>
      </section>
    </main>
  );
}

function Missions({
  progress,
}: {
  progress: OwnerProgress;
}) {
  return (
    <main className="rf-screen">
      <section className="rf-screen-heading">
        <div>
          <span className="eyebrow">
            <Rocket size={15} /> FIELD PROGRAM
          </span>
          <h1>Mission Board</h1>
          <p>
            Short challenges turn setup, driving, and future sensor upgrades
            into a progression loop.
          </p>
        </div>
      </section>
      <div className="rf-mission-cards">
        <article className="is-active">
          <span>01</span>
          <h2>First Drive</h2>
          <p>
            Arm, send a movement command, release to zero, and confirm the
            safety loop.
          </p>
          <small>
            {progress.first_drive_complete ? "COMPLETE" : "AVAILABLE NOW"}
          </small>
        </article>
        <article>
          <span>02</span>
          <h2>Precision Dock</h2>
          <p>Guide Rover-01 through a compact course at reduced speed.</p>
          <small>BETA ROADMAP</small>
        </article>
        <article>
          <span>03</span>
          <h2>Sensor Scout</h2>
          <p>Unlock after the future distance sensor pack is installed.</p>
          <small>COMING SOON</small>
        </article>
      </div>
    </main>
  );
}

function Engineer() {
  const [selected, setSelected] = useState(0);
  const script = supportScripts[selected];

  return (
    <main className="rf-screen">
      <section className="rf-screen-heading">
        <div>
          <span className="eyebrow">
            <CircuitBoard size={15} /> SCRIPTED SUPPORT
          </span>
          <h1>AI Engineer</h1>
          <p>
            Fast Beta troubleshooting without a cloud model or autonomous
            control.
          </p>
        </div>
      </section>
      <section className="rf-engineer-layout">
        <div className="rf-engineer-prompts">
          {supportScripts.map((item, index) => (
            <button
              className={selected === index ? "is-selected" : ""}
              key={item.title}
              onClick={() => setSelected(index)}
              type="button"
            >
              <Wrench size={20} />
              <span>
                {item.title}
                {item.code ? <small>{item.code}</small> : null}
              </span>
            </button>
          ))}
        </div>
        <article className="rf-engineer-answer">
          <span className="eyebrow">ROBOFORGE FIELD NOTE</span>
          <h2>{script.title}</h2>
          <p>{script.body}</p>
          <div className="rf-safety-note">
            <ShieldCheck size={21} /> Power off before changing motor or battery
            wiring.
          </div>
        </article>
      </section>
    </main>
  );
}

function Store({
  onBeta,
  onInterest,
}: {
  onBeta: (interest: UpgradeInterest) => void;
  onInterest: (interest: UpgradeInterest) => void;
}) {
  return (
    <main className="rf-screen">
      <section className="rf-screen-heading">
        <div>
          <span className="eyebrow">
            <ShoppingBag size={15} /> UPGRADE LAB
          </span>
          <h1>Future Loadout</h1>
          <p>
            No checkout yet. This page tests which evolution paths create real
            demand.
          </p>
        </div>
      </section>
      <div className="rf-upgrade-grid">
        {upgradeItems.map((item) => (
          <article key={item.title}>
            <ShoppingBag size={31} />
            <span>{item.category}</span>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
            <small>{item.state}</small>
            <Button
              icon={Send}
              onClick={() => onInterest(item.interest)}
              variant="secondary"
            >
              Interested
            </Button>
          </article>
        ))}
      </div>
      <div className="rf-interest-callout">
        <div>
          <span className="eyebrow">VALIDATE THE NEXT BUILD</span>
          <h2>Vote with a Beta application, not a Like.</h2>
        </div>
        <Button icon={Send} onClick={() => onBeta("Build and control Rover-01")}>
          Register upgrade interest
        </Button>
      </div>
    </main>
  );
}

function BetaModal({
  defaultInterest,
  onClose,
  onSubmit,
}: {
  defaultInterest: UpgradeInterest;
  onClose: () => void;
  onSubmit: (input: {
    email: string;
    interest: UpgradeInterest;
    name: string;
  }) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      email: String(form.get("email") ?? ""),
      interest: String(form.get("interest") ?? defaultInterest) as UpgradeInterest,
      name: String(form.get("name") ?? ""),
    });
  }

  return (
    <div className="rf-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="rf-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="Close"
          className="rf-modal__close"
          onClick={onClose}
          type="button"
        >
          <X size={21} />
        </button>
        <span className="eyebrow">FOUNDING PILOT PROGRAM</span>
        <h2>Join the Rover-01 Beta</h2>
        <p>
          Tell us what you want to build. We will invite a small group to the
          first demo and workshop.
        </p>
        <form onSubmit={submit}>
          <label>
            Name
            <input autoComplete="name" name="name" required />
          </label>
          <label>
            Email
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            What interests you most?
            <select defaultValue={defaultInterest} name="interest">
              {upgradeInterests.map((interest) => (
                <option key={interest} value={interest}>
                  {interest}
                </option>
              ))}
            </select>
          </label>
          <Button icon={Send} type="submit">
            Save beta application
          </Button>
          <small>Limited Beta batch. Pricing follows hardware validation.</small>
        </form>
      </section>
    </div>
  );
}

function BottomNav({
  screen,
  setScreen,
}: {
  screen: ConsoleScreen;
  setScreen: (screen: ConsoleScreen) => void;
}) {
  const items: Array<[ConsoleScreen, string, React.ComponentType<{ size?: number }>]> = [
    ["garage", "Garage", Home],
    ["cockpit", "Cockpit", Gamepad2],
    ["missions", "Missions", Rocket],
    ["engineer", "Engineer", CircuitBoard],
    ["store", "Upgrades", ShoppingBag],
  ];

  return (
    <nav className="rf-bottom-nav">
      {items.map(([id, label, Icon]) => (
        <button
          className={screen === id ? "is-active" : ""}
          key={id}
          onClick={() => setScreen(id)}
          type="button"
        >
          <Icon size={21} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function OwnerConsole({ workspace }: OwnerConsoleProps) {
  const activeRobot = workspace.robots[0];
  const initialTheme = safeTheme(activeRobot?.theme);
  const [screen, setScreen] = useState<ConsoleScreen>("garage");
  const [theme, setTheme] = useState<ThemeId>(initialTheme);
  const [progress, setProgress] = useState<OwnerProgress>(
    workspace.progress ?? defaultProgress,
  );
  const [betaInterest, setBetaInterest] =
    useState<UpgradeInterest>("Build and control Rover-01");
  const [betaOpen, setBetaOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const robotCode = activeRobot?.unit_code ?? "ROVER-01";
  const ownerName = workspace.profile?.display_name ?? "RoboForge Owner";
  const savedInterestCount = workspace.interests.length;

  const statusMessage = useMemo(() => {
    if (isPending) return "Saving...";
    return message;
  }, [isPending, message]);

  function persistTheme(nextTheme: ThemeId) {
    setTheme(nextTheme);
    setMessage("");
    startTransition(() => {
      void updateRobotTheme(nextTheme).then((result) => {
        setMessage(result.ok ? "Theme saved to owner workspace." : result.error ?? "");
      });
    });
  }

  function persistProgress(nextProgress: OwnerProgress) {
    setProgress(nextProgress);
    setMessage("");
    startTransition(() => {
      void updateRobotProgress(nextProgress).then((result) => {
        setMessage(result.ok ? "Mission progress saved." : result.error ?? "");
      });
    });
  }

  function persistInterest(interest: UpgradeInterest) {
    setMessage("");
    startTransition(() => {
      void saveRobotInterest(interest).then((result) => {
        setMessage(
          result.ok
            ? `${interest} interest saved.`
            : result.error ?? "Could not save interest.",
        );
      });
    });
  }

  function openBeta(interest: UpgradeInterest) {
    setBetaInterest(interest);
    setBetaOpen(true);
  }

  function submitBeta(input: {
    email: string;
    interest: UpgradeInterest;
    name: string;
  }) {
    setMessage("");
    startTransition(() => {
      void saveBetaApplication(input).then((result) => {
        if (result.ok) {
          setBetaOpen(false);
          setMessage("Beta application saved.");
        } else {
          setMessage(result.error ?? "Could not save beta application.");
        }
      });
    });
  }

  return (
    <div className={`rf-console theme-${theme}`}>
      <header className="rf-console-topbar">
        <button
          className="brand"
          onClick={() => setScreen("garage")}
          type="button"
        >
          <span className="brand-mark">
            <CircuitBoard size={21} />
          </span>
          <span>
            <strong>ROBOFORGE</strong>
            <small>OWNER GARAGE</small>
          </span>
        </button>
        <div className="rf-console-actions">
          <span className="account-pill">{ownerName}</span>
          <div aria-label="Robot theme" className="rf-theme-switch">
            <button
              className={theme === "forge" ? "is-active" : ""}
              onClick={() => persistTheme("forge")}
              type="button"
            >
              Forge
            </button>
            <button
              className={theme === "neo" ? "is-active" : ""}
              onClick={() => persistTheme("neo")}
              type="button"
            >
              Neo
            </button>
          </div>
          <Link className="rf-sign-out" href="/auth/sign-out" title="Sign out">
            <LogOut size={18} />
          </Link>
        </div>
      </header>
      {screen !== "garage" ? (
        <button
          className="rf-back-to-garage"
          onClick={() => setScreen("garage")}
          type="button"
        >
          Garage
        </button>
      ) : null}
      {statusMessage ? (
        <div className="rf-save-message" role="status">
          {statusMessage}
        </div>
      ) : null}
      {workspace.notice ? (
        <div className="rf-save-message is-warning" role="status">
          {workspace.notice}
        </div>
      ) : null}
      {savedInterestCount > 0 ? (
        <div className="rf-interest-count">
          {savedInterestCount} saved upgrade signal
          {savedInterestCount === 1 ? "" : "s"}
        </div>
      ) : null}
      {screen === "garage" ? (
        <Garage
          onProgress={persistProgress}
          onScreen={setScreen}
          progress={progress}
          robotCode={robotCode}
          theme={theme}
        />
      ) : null}
      {screen === "profile" ? <Profile onScreen={setScreen} theme={theme} /> : null}
      {screen === "cockpit" ? (
        <Cockpit
          onProgress={persistProgress}
          onScreen={setScreen}
          progress={progress}
        />
      ) : null}
      {screen === "missions" ? <Missions progress={progress} /> : null}
      {screen === "engineer" ? <Engineer /> : null}
      {screen === "store" ? (
        <Store onBeta={openBeta} onInterest={persistInterest} />
      ) : null}
      <BottomNav screen={screen} setScreen={setScreen} />
      {betaOpen ? (
        <BetaModal
          defaultInterest={betaInterest}
          onClose={() => setBetaOpen(false)}
          onSubmit={submitBeta}
        />
      ) : null}
    </div>
  );
}
