import {
  BatteryCharging,
  Broadcast,
  CalendarDots,
  CaretLeft,
  CheckCircle,
  Circuitry,
  Drone,
  GameController,
  Gauge,
  Gear,
  GlobeHemisphereWest,
  HandPalm,
  House,
  Lightning,
  LockKey,
  PaintBrush,
  PaperPlaneTilt,
  Robot,
  RocketLaunch,
  ShieldCheck,
  ShoppingBagOpen,
  SlidersHorizontal,
  Sparkle,
  SteeringWheel,
  Wrench,
  X,
} from "@phosphor-icons/react";
import type { ComponentChildren, JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { DemoRoverApi, HttpRoverApi } from "./api";
import { defaultProfile, fleet, themes } from "./data";
import { translator } from "./i18n";
import type {
  AppMode,
  DriveCommand,
  Language,
  RobotProfile,
  RobotTelemetry,
  ScreenId,
  ThemeId,
} from "./types";

const betaUrl = import.meta.env.VITE_AIRTABLE_FORM_URL ?? "";
const calendlyUrl = import.meta.env.VITE_CALENDLY_URL ?? "";

const initialTelemetry: RobotTelemetry = {
  connected: false,
  armed: false,
  batteryVoltage: 0,
  batteryPercent: 0,
  lastCommandAt: 0,
  uptime: 0,
  firmwareVersion: "loading",
  wifiStrength: "weak",
};

function detectMode(): AppMode {
  const queryMode = new URLSearchParams(window.location.search).get("mode");
  if (queryMode === "device") return "device";
  if (queryMode === "public") return "public";
  if (window.location.hostname === "192.168.4.1") return "device";
  return import.meta.env.VITE_APP_MODE === "device" ? "device" : "public";
}

function initialScreen(mode: AppMode): ScreenId {
  const requested = new URLSearchParams(window.location.search).get("screen");
  const valid: ScreenId[] = [
    "landing",
    "garage",
    "profile",
    "cockpit",
    "missions",
    "engineer",
    "store",
  ];
  if (valid.includes(requested as ScreenId)) return requested as ScreenId;
  return mode === "device" ? "garage" : "landing";
}

function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

type IconComponent = (props: {
  size?: string | number;
  weight?: "regular" | "bold" | "fill" | "duotone";
  className?: string;
}) => JSX.Element;

function Button({
  children,
  onClick,
  variant = "primary",
  icon: Icon,
  type = "button",
  disabled = false,
}: {
  children: ComponentChildren;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "quiet";
  icon?: IconComponent;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      class={`button button--${variant}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon ? <Icon size={19} weight="bold" /> : null}
      <span>{children}</span>
    </button>
  );
}

function Header({
  language,
  setLanguage,
  theme,
  setTheme,
  mode,
  onLogo,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  mode: AppMode;
  onLogo: () => void;
}) {
  return (
    <header class="topbar">
      <button class="brand" type="button" onClick={onLogo}>
        <span class="brand__mark">
          <Circuitry size={21} weight="fill" />
        </span>
        <span>
          <strong>ROBOFORGE</strong>
          <small>{mode === "device" ? "DEVICE LINK" : "DIGITAL HANGAR"}</small>
        </span>
      </button>
      <div class="topbar__controls">
        <div class="theme-switch" aria-label="Robot theme">
          <button
            class={theme === "forge" ? "is-active" : ""}
            type="button"
            onClick={() => setTheme("forge")}
          >
            Forge
          </button>
          <button
            class={theme === "neo" ? "is-active" : ""}
            type="button"
            onClick={() => setTheme("neo")}
          >
            Neo
          </button>
        </div>
        <button
          class="language-button"
          type="button"
          onClick={() => setLanguage(language === "en" ? "th" : "en")}
          aria-label="Change language"
        >
          <GlobeHemisphereWest size={18} weight="bold" />
          {language.toUpperCase()}
        </button>
      </div>
    </header>
  );
}

function StatusPill({
  connected,
  mode,
}: {
  connected: boolean;
  mode: AppMode;
}) {
  return (
    <span class={`status-pill ${connected ? "is-online" : ""}`}>
      <Broadcast size={14} weight="fill" />
      {connected ? (mode === "device" ? "ROVER LINK" : "DEMO LINK") : "OFFLINE"}
    </span>
  );
}

function RobotHero({
  theme,
  compact = false,
  showIdentity = false,
}: {
  theme: ThemeId;
  compact?: boolean;
  showIdentity?: boolean;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const selected = themes[theme];

  const move = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    setTilt({ x: x * 7, y: y * -6 });
  };

  return (
    <div
      class={`robot-hero ${compact ? "robot-hero--compact" : ""}`}
      onPointerMove={move}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <img
        src={selected.image}
        alt={`${selected.robotName} ${selected.robotClass} digital form`}
        style={{
          transform: `perspective(900px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) translateZ(0)`,
        }}
      />
      {showIdentity ? (
        <div class="robot-hero__identity">
          <strong>{selected.robotName}</strong>
          <span>{selected.robotClass}</span>
          <small><Broadcast size={13} weight="fill" /> ONLINE</small>
        </div>
      ) : null}
      <span class="robot-hero__serial">RF // ROVER-01 // DIGITAL FORM</span>
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
    <section class="fleet-rail" aria-label="Robot fleet">
      {fleet.map((item) => {
        return (
          <button
            class={`fleet-card ${selected === item.id ? "is-selected" : ""}`}
            type="button"
            onClick={() => setSelected(item.id)}
          >
            <img src={item.image} alt={`${item.label} robot concept`} />
            <span>{item.label}</span>
            <small>{item.state === "active" ? "ROVER-01" : "COMING SOON"}</small>
          </button>
        );
      })}
    </section>
  );
}

function TruthStrip() {
  return (
    <div class="truth-strip">
      <div>
        <span class="truth-strip__icon"><Sparkle size={17} weight="fill" /></span>
        <p><strong>Digital Form</strong><small>Premium identity shown in app</small></p>
      </div>
      <div>
        <span class="truth-strip__icon"><Circuitry size={17} weight="fill" /></span>
        <p><strong>Installed Hardware</strong><small>Rover-01 ESP32 control base</small></p>
      </div>
      <div class="is-future">
        <span class="truth-strip__icon"><Wrench size={17} weight="fill" /></span>
        <p><strong>Future Body Kit</strong><small>Roadmap concept, not shipping yet</small></p>
      </div>
    </div>
  );
}

function TelemetryGrid({
  telemetry,
  mode,
}: {
  telemetry: RobotTelemetry;
  mode: AppMode;
}) {
  return (
    <div class="telemetry-grid">
      <article>
        <BatteryCharging size={23} weight="duotone" />
        <span>BATTERY</span>
        <strong>{Math.round(telemetry.batteryPercent)}%</strong>
        <small>{telemetry.batteryVoltage.toFixed(2)} V</small>
      </article>
      <article>
        <Broadcast size={23} weight="duotone" />
        <span>LINK</span>
        <strong>{telemetry.wifiStrength.toUpperCase()}</strong>
        <small>{mode === "device" ? "Local AP" : "Simulated"}</small>
      </article>
      <article>
        <Gauge size={23} weight="duotone" />
        <span>LIMIT</span>
        <strong>45%</strong>
        <small>Beta safety mode</small>
      </article>
    </div>
  );
}

function Landing({
  theme,
  onExplore,
  onBeta,
  onBook,
  t,
}: {
  theme: ThemeId;
  onExplore: () => void;
  onBeta: () => void;
  onBook: () => void;
  t: ReturnType<typeof translator>;
}) {
  return (
    <main class="landing">
      <section class="landing__copy">
        <span class="eyebrow"><Lightning size={15} weight="fill" /> ROBOT IDENTITY PLATFORM</span>
        <h1>YOUR ROBOT.<br /><em>EVOLVED.</em></h1>
        <p>{t("landingBody")}</p>
        <div class="landing__actions">
          <Button icon={RocketLaunch} onClick={onExplore}>{t("explore")}</Button>
          <Button icon={PaperPlaneTilt} variant="secondary" onClick={onBeta}>{t("beta")}</Button>
        </div>
        <button class="text-link" type="button" onClick={onBook}>
          <CalendarDots size={18} weight="bold" /> {t("book")}
        </button>
        <div class="launch-notes">
          <span>ONE OWNER</span>
          <span>MULTI-ROBOT GARAGE</span>
          <span>LOCAL CONTROL</span>
        </div>
      </section>
      <section class="landing__visual">
        <RobotHero theme={theme} />
        <div class="landing__identity">
          <span>{themes[theme].robotClass}</span>
          <strong>{themes[theme].robotName}</strong>
          <small>ROVER-01 DIGITAL TWIN</small>
        </div>
      </section>
    </main>
  );
}

function Garage({
  profile,
  theme,
  mode,
  telemetry,
  t,
  onScreen,
}: {
  profile: RobotProfile;
  theme: ThemeId;
  mode: AppMode;
  telemetry: RobotTelemetry;
  t: ReturnType<typeof translator>;
  onScreen: (screen: ScreenId) => void;
}) {
  const [selectedFleet, setSelectedFleet] = useState("rover");

  return (
    <main class="screen screen--garage">
      <section class="screen-heading">
        <div>
          <span class="eyebrow"><House size={15} weight="fill" /> DIGITAL HANGAR</span>
          <h1>{t("garage")}</h1>
          <p>One command center for every machine you own and every machine you will build next.</p>
        </div>
        <StatusPill connected={telemetry.connected} mode={mode} />
      </section>
      <FleetRail selected={selectedFleet} setSelected={setSelectedFleet} />
      {selectedFleet === "rover" ? (
        <section class="garage-feature">
          <RobotHero theme={theme} showIdentity />
          <div class="garage-feature__info">
            <span class="unit-label">ACTIVE UNIT // {profile.id.toUpperCase()}</span>
            <h2>{themes[theme].robotName}</h2>
            <p class="class-label">{themes[theme].robotClass} · DIFFERENTIAL DRIVE</p>
            <TelemetryGrid telemetry={telemetry} mode={mode} />
            <TruthStrip />
            <div class="button-row">
              <Button icon={GameController} onClick={() => onScreen("cockpit")}>{t("cockpit")}</Button>
              <Button icon={SlidersHorizontal} variant="secondary" onClick={() => onScreen("profile")}>{t("profile")}</Button>
            </div>
          </div>
        </section>
      ) : (
        <section class="future-unit">
          <span class="future-unit__icon">
            {selectedFleet === "drone" ? <Drone size={76} weight="duotone" /> : <Robot size={76} weight="duotone" />}
          </span>
          <span class="eyebrow">FLEET EXPANSION</span>
          <h2>{selectedFleet.toUpperCase()} UNIT</h2>
          <p>This robot class is part of the RoboForge platform roadmap. Control hardware is not included in the MVP.</p>
          <span class="concept-badge">COMING SOON</span>
        </section>
      )}
    </main>
  );
}

function Profile({
  theme,
  t,
  onCockpit,
}: {
  theme: ThemeId;
  t: ReturnType<typeof translator>;
  onCockpit: () => void;
}) {
  return (
    <main class="screen">
      <section class="profile-hero">
        <div class="profile-hero__visual">
          <RobotHero theme={theme} compact />
        </div>
        <div class="profile-hero__copy">
          <span class="eyebrow">ROVER PROFILE // EVOLUTION 01</span>
          <h1>{themes[theme].robotName}</h1>
          <p>{themes[theme].robotClass} built on the Rover-01 physical base. Its digital identity can evolve before every physical upgrade is available.</p>
          <div class="capability-list">
            <span><CheckCircle size={17} weight="fill" /> Manual Drive</span>
            <span><CheckCircle size={17} weight="fill" /> Wi-Fi Cockpit</span>
            <span><CheckCircle size={17} weight="fill" /> Battery Telemetry</span>
          </div>
          <Button icon={GameController} onClick={onCockpit}>{t("cockpit")}</Button>
        </div>
      </section>
      <section class="evolution-section">
        <div class="section-title">
          <span class="eyebrow">AEGIS EVOLUTION</span>
          <h2>{t("roadmap")}</h2>
        </div>
        <div class="evolution-track">
          <article class="is-current">
            <span>01</span>
            <Circuitry size={29} weight="duotone" />
            <h3>Core Chassis</h3>
            <p>ESP32, dual motor drive, local Wi-Fi cockpit.</p>
            <small>INSTALLED HARDWARE</small>
          </article>
          <article>
            <span>02</span>
            <Broadcast size={29} weight="duotone" />
            <h3>Sensor Pack</h3>
            <p>Distance, line tracking, mission telemetry.</p>
            <small>FUTURE UPGRADE</small>
          </article>
          <article>
            <span>03</span>
            <PaintBrush size={29} weight="duotone" />
            <h3>Body Kit</h3>
            <p>Physical shell matching your selected Digital Form.</p>
            <small>ROADMAP CONCEPT</small>
          </article>
        </div>
      </section>
    </main>
  );
}

function Joystick({
  armed,
  onDrive,
}: {
  armed: boolean;
  onDrive: (throttle: number, steering: number) => void;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const activePointer = useRef<number | null>(null);

  const update = (
    event: JSX.TargetedPointerEvent<HTMLDivElement>,
    shouldCapture = false,
  ) => {
    if (!armed) return;
    if (shouldCapture) {
      activePointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (activePointer.current !== event.pointerId) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = bounds.width * 0.34;
    const rawX = event.clientX - (bounds.left + bounds.width / 2);
    const rawY = event.clientY - (bounds.top + bounds.height / 2);
    const length = Math.hypot(rawX, rawY);
    const factor = length > radius ? radius / length : 1;
    const x = rawX * factor;
    const y = rawY * factor;
    setPosition({ x, y });
    onDrive(-y / radius, x / radius);
  };

  const release = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    setPosition({ x: 0, y: 0 });
    onDrive(0, 0);
  };

  return (
    <div
      class={`joystick ${armed ? "is-armed" : ""}`}
      onPointerDown={(event) => update(event, true)}
      onPointerMove={(event) => update(event)}
      onPointerUp={release}
      onPointerCancel={release}
      role="application"
      aria-label="Virtual robot joystick"
    >
      <span class="joystick__north">FORWARD</span>
      <span class="joystick__south">REVERSE</span>
      <span class="joystick__west">LEFT</span>
      <span class="joystick__east">RIGHT</span>
      <div class="joystick__ring">
        <span
          class="joystick__thumb"
          style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        >
          <SteeringWheel size={34} weight="duotone" />
        </span>
      </div>
    </div>
  );
}

function Cockpit({
  mode,
  api,
  telemetry,
  setTelemetry,
  t,
}: {
  mode: AppMode;
  api: DemoRoverApi | HttpRoverApi;
  telemetry: RobotTelemetry;
  setTelemetry: (telemetry: RobotTelemetry) => void;
  t: ReturnType<typeof translator>;
}) {
  const [speedLimit, setSpeedLimit] = useState(0.3);
  const [drive, setDrive] = useState({ throttle: 0, steering: 0 });
  const [missionComplete, setMissionComplete] = useState(false);
  const sequence = useRef(0);
  const driveRef = useRef(drive);

  useEffect(() => {
    driveRef.current = drive;
  }, [drive]);

  useEffect(() => {
    const poll = window.setInterval(async () => {
      try {
        setTelemetry(await api.getStatus());
      } catch {
        setTelemetry({ ...initialTelemetry, firmwareVersion: "link-lost" });
      }
    }, 1500);
    return () => window.clearInterval(poll);
  }, [api, setTelemetry]);

  useEffect(() => {
    if (!telemetry.armed) return;
    const ticker = window.setInterval(() => {
      const command: DriveCommand = {
        ...driveRef.current,
        speedLimit,
        sequence: ++sequence.current,
      };
      void api.drive(command);
    }, 120);
    return () => window.clearInterval(ticker);
  }, [api, speedLimit, telemetry.armed]);

  useEffect(() => {
    const safetyStop = () => {
      setDrive({ throttle: 0, steering: 0 });
      if (document.hidden) void api.stop().then(setTelemetry).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", safetyStop);
    window.addEventListener("pagehide", safetyStop);
    return () => {
      document.removeEventListener("visibilitychange", safetyStop);
      window.removeEventListener("pagehide", safetyStop);
      void api.stop().catch(() => undefined);
    };
  }, [api, setTelemetry]);

  const arm = async () => {
    try {
      const next = await api.setArmed(!telemetry.armed);
      setTelemetry(next);
      if (telemetry.armed) setDrive({ throttle: 0, steering: 0 });
    } catch {
      setTelemetry({ ...telemetry, connected: false, armed: false });
    }
  };

  const stop = async () => {
    setDrive({ throttle: 0, steering: 0 });
    try {
      setTelemetry(await api.stop());
    } catch {
      setTelemetry({ ...telemetry, armed: false });
    }
  };

  return (
    <main class="screen cockpit">
      <section class="screen-heading">
        <div>
          <span class="eyebrow"><GameController size={15} weight="fill" /> FLEET DECK</span>
          <h1>Rover Cockpit</h1>
          <p>{mode === "device" ? t("deviceMode") : t("demoMode")}. Release the control and the rover receives a zero command immediately.</p>
        </div>
        <StatusPill connected={telemetry.connected} mode={mode} />
      </section>
      <TelemetryGrid telemetry={telemetry} mode={mode} />
      <section class="cockpit-grid">
        <article class="control-panel">
          <div class="panel-heading">
            <span>
              {telemetry.armed ? <Lightning size={20} weight="fill" /> : <LockKey size={20} weight="fill" />}
              <strong>{telemetry.armed ? t("armed") : t("disarmed")}</strong>
            </span>
            <button class={`arm-switch ${telemetry.armed ? "is-on" : ""}`} type="button" onClick={arm}>
              <span />
              {telemetry.armed ? "ARMED" : "ARM"}
            </button>
          </div>
          <Joystick armed={telemetry.armed} onDrive={(throttle, steering) => setDrive({ throttle, steering })} />
          <div class="drive-readout">
            <span>THROTTLE <strong>{Math.round(drive.throttle * 100)}</strong></span>
            <span>STEERING <strong>{Math.round(drive.steering * 100)}</strong></span>
          </div>
        </article>
        <aside class="mission-panel">
          <span class="eyebrow">MISSION 01</span>
          <h2>{t("mission")}</h2>
          <ol>
            <li class="is-done">Connect to Rover-01</li>
            <li class={telemetry.armed ? "is-done" : ""}>Arm local controls</li>
            <li class={telemetry.lastCommandAt > 0 ? "is-done" : ""}>Move and release joystick</li>
          </ol>
          <label class="speed-control">
            <span>SPEED LIMIT <strong>{Math.round(speedLimit * 100)}%</strong></span>
            <input
              type="range"
              min="0.15"
              max="0.45"
              step="0.05"
              value={speedLimit}
              onInput={(event) => setSpeedLimit(Number(event.currentTarget.value))}
            />
          </label>
          <Button icon={HandPalm} variant="danger" onClick={stop}>{t("stop")}</Button>
          <Button
            icon={CheckCircle}
            variant="secondary"
            onClick={() => setMissionComplete(true)}
          >
            Finish test mission
          </Button>
          {missionComplete ? (
            <div class="mission-success">
              <CheckCircle size={27} weight="fill" />
              <span><strong>{t("missionComplete")}</strong><small>Local driving loop verified.</small></span>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function Missions() {
  return (
    <main class="screen">
      <section class="screen-heading">
        <div>
          <span class="eyebrow"><RocketLaunch size={15} weight="fill" /> FIELD PROGRAM</span>
          <h1>Mission Board</h1>
          <p>Short challenges turn setup, driving, and future sensor upgrades into a progression loop.</p>
        </div>
      </section>
      <div class="mission-cards">
        <article class="is-active"><span>01</span><h2>First Drive</h2><p>Arm, move, release, and confirm the 400 ms safety stop.</p><small>AVAILABLE NOW</small></article>
        <article><span>02</span><h2>Precision Dock</h2><p>Guide Rover-01 through a compact course at reduced speed.</p><small>BETA ROADMAP</small></article>
        <article><span>03</span><h2>Sensor Scout</h2><p>Unlock after the future distance sensor pack is installed.</p><small>COMING SOON</small></article>
      </div>
    </main>
  );
}

function Engineer() {
  const scripts = [
    ["Rover does not move", "Confirm the cockpit is armed, then check the ENA/ENB jumpers are removed for PWM control."],
    ["Rover spins in place", "One motor side is reversed. Power down, swap the pair on that side, and test with the wheels raised."],
    ["Battery looks wrong", "Verify the configured 1S/2S cell count, then calibrate the ADC reading against a multimeter."],
  ];
  const [selected, setSelected] = useState(0);

  return (
    <main class="screen">
      <section class="screen-heading">
        <div>
          <span class="eyebrow"><Circuitry size={15} weight="fill" /> SCRIPTED SUPPORT</span>
          <h1>AI Engineer</h1>
          <p>Fast Beta troubleshooting without a cloud model or autonomous control.</p>
        </div>
      </section>
      <section class="engineer-layout">
        <div class="engineer-prompts">
          {scripts.map(([title], index) => (
            <button class={selected === index ? "is-selected" : ""} type="button" onClick={() => setSelected(index)}>
              <Wrench size={20} weight="duotone" /> {title}
            </button>
          ))}
        </div>
        <article class="engineer-answer">
          <span class="eyebrow">ROBOFORGE FIELD NOTE</span>
          <h2>{scripts[selected][0]}</h2>
          <p>{scripts[selected][1]}</p>
          <div class="safety-note"><ShieldCheck size={21} weight="fill" /> Power off before changing motor or battery wiring.</div>
        </article>
      </section>
    </main>
  );
}

function Store({ onBeta }: { onBeta: () => void }) {
  return (
    <main class="screen">
      <section class="screen-heading">
        <div>
          <span class="eyebrow"><ShoppingBagOpen size={15} weight="fill" /> UPGRADE LAB</span>
          <h1>Future Loadout</h1>
          <p>No checkout in this MVP. This page tests which evolution paths create real demand.</p>
        </div>
      </section>
      <div class="upgrade-grid">
        <article><Broadcast size={31} weight="duotone" /><span>HARDWARE</span><h2>Sensor Pack</h2><p>Distance sensing and mission telemetry for Rover-01.</p><small>ROADMAP</small></article>
        <article><PaintBrush size={31} weight="duotone" /><span>BODY KIT</span><h2>Aegis Shell</h2><p>A physical expression inspired by the Forge Digital Form.</p><small>CONCEPT</small></article>
        <article><Sparkle size={31} weight="duotone" /><span>DIGITAL</span><h2>Neo Decal Set</h2><p>Anime identity pack with matching future physical decals.</p><small>CONCEPT</small></article>
      </div>
      <div class="interest-callout">
        <div><span class="eyebrow">VALIDATE THE NEXT BUILD</span><h2>Vote with a Beta application, not a Like.</h2></div>
        <Button icon={PaperPlaneTilt} onClick={onBeta}>Register upgrade interest</Button>
      </div>
    </main>
  );
}

function BetaModal({
  open,
  onClose,
  t,
}: {
  open: boolean;
  onClose: () => void;
  t: ReturnType<typeof translator>;
}) {
  const [saved, setSaved] = useState(false);

  if (!open) return null;

  const submit = (event: JSX.TargetedSubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    localStorage.setItem(
      "roboforge-beta-application",
      JSON.stringify(Object.fromEntries(data.entries())),
    );
    setSaved(true);
    if (betaUrl) window.open(betaUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div class="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section class="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button class="modal__close" type="button" onClick={onClose} aria-label={t("close")}><X size={21} weight="bold" /></button>
        <span class="eyebrow">FOUNDING PILOT PROGRAM</span>
        <h2>{t("formTitle")}</h2>
        <p>{t("formBody")}</p>
        <form onSubmit={submit}>
          <label>{t("name")}<input required name="name" autoComplete="name" /></label>
          <label>{t("email")}<input required type="email" name="email" autoComplete="email" /></label>
          <label>{t("interest")}
            <select name="interest">
              <option>Build and control Rover-01</option>
              <option>STEM workshop or school</option>
              <option>Anime customization</option>
              <option>Future robot types</option>
            </select>
          </label>
          <Button type="submit" icon={PaperPlaneTilt}>{t("submit")}</Button>
          <small>{t("noPrice")}</small>
          {saved ? <div class="saved-message"><CheckCircle size={18} weight="fill" /> {t("saved")}</div> : null}
        </form>
      </section>
    </div>
  );
}

function BottomNav({
  screen,
  onScreen,
}: {
  screen: ScreenId;
  onScreen: (screen: ScreenId) => void;
}) {
  const items: Array<[ScreenId, string, IconComponent]> = [
    ["garage", "Garage", House],
    ["cockpit", "Cockpit", GameController],
    ["missions", "Missions", RocketLaunch],
    ["engineer", "Engineer", Circuitry],
    ["store", "Upgrades", ShoppingBagOpen],
  ];
  return (
    <nav class="bottom-nav">
      {items.map(([id, label, Icon]) => (
        <button class={screen === id ? "is-active" : ""} type="button" onClick={() => onScreen(id)}>
          <Icon size={21} weight={screen === id ? "fill" : "regular"} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function App() {
  const mode = useMemo(detectMode, []);
  const api = useMemo(() => (mode === "device" ? new HttpRoverApi() : new DemoRoverApi()), [mode]);
  const [screen, setScreen] = useState<ScreenId>(() => initialScreen(mode));
  const [language, setLanguage] = useStoredState<Language>("roboforge-language", "en");
  const [theme, setTheme] = useStoredState<ThemeId>("roboforge-theme", "forge");
  const [profile, setProfile] = useStoredState<RobotProfile>("roboforge-profile", defaultProfile);
  const [telemetry, setTelemetry] = useState(initialTelemetry);
  const [betaOpen, setBetaOpen] = useState(false);
  const t = translator(language);

  useEffect(() => {
    setProfile({
      ...profile,
      theme,
      name: themes[theme].robotName,
      robotClass: themes[theme].robotClass,
    });
  }, [theme]);

  useEffect(() => {
    api.getStatus().then(setTelemetry).catch(() => setTelemetry(initialTelemetry));
  }, [api]);

  const openBooking = () => {
    if (calendlyUrl) window.open(calendlyUrl, "_blank", "noopener,noreferrer");
    else setBetaOpen(true);
  };

  return (
    <div class={`app theme-${theme}`} data-mode={mode}>
      <Header
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
        mode={mode}
        onLogo={() => setScreen(mode === "device" ? "garage" : "landing")}
      />
      {screen !== "landing" ? (
        <button class="back-to-garage" type="button" onClick={() => setScreen("garage")}>
          <CaretLeft size={16} weight="bold" /> Garage
        </button>
      ) : null}
      {screen === "landing" ? (
        <Landing
          theme={theme}
          onExplore={() => setScreen("garage")}
          onBeta={() => setBetaOpen(true)}
          onBook={openBooking}
          t={t}
        />
      ) : null}
      {screen === "garage" ? (
        <Garage
          profile={profile}
          theme={theme}
          mode={mode}
          telemetry={telemetry}
          t={t}
          onScreen={setScreen}
        />
      ) : null}
      {screen === "profile" ? <Profile theme={theme} t={t} onCockpit={() => setScreen("cockpit")} /> : null}
      {screen === "cockpit" ? (
        <Cockpit
          mode={mode}
          api={api}
          telemetry={telemetry}
          setTelemetry={setTelemetry}
          t={t}
        />
      ) : null}
      {screen === "missions" ? <Missions /> : null}
      {screen === "engineer" ? <Engineer /> : null}
      {screen === "store" ? <Store onBeta={() => setBetaOpen(true)} /> : null}
      {screen !== "landing" ? <BottomNav screen={screen} onScreen={setScreen} /> : null}
      <BetaModal open={betaOpen} onClose={() => setBetaOpen(false)} t={t} />
    </div>
  );
}
