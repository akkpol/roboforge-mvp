"use client";

import {
  BatteryCharging,
  Bot,
  CheckCircle,
  CircuitBoard,
  Clipboard,
  ExternalLink,
  Gamepad2,
  Gauge,
  Hand,
  Home,
  KeyRound,
  LockKeyhole,
  LogOut,
  Paintbrush,
  QrCode,
  Radio,
  RadioTower,
  Rocket,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wifi,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  claimRobotByCode,
  finishConnectionSession,
  finishControlSession,
  saveBetaApplication,
  saveFeedbackReport,
  saveRobotInterest,
  startConnectionSession,
  startControlSession,
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
  initialClaimCode?: string | null;
  workspace: OwnerWorkspace;
};

function safeTheme(theme: string | null | undefined): ThemeId {
  return theme === "neo" ? "neo" : "forge";
}

function completeProgress(progress: OwnerProgress): OwnerProgress {
  return {
    ...progress,
    ready_for_floor_test:
      progress.first_connection_complete &&
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
        preload={!compact}
        sizes={compact ? "(min-width: 900px) 45vw, 100vw" : "100vw"}
        src={selected.image}
        unoptimized
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
    ["First connection complete", progress.first_connection_complete],
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

function GarageNextStep({
  onScreen,
  progress,
}: {
  onScreen: (screen: ConsoleScreen) => void;
  progress: OwnerProgress;
}) {
  const nextStep = progress.first_connection_complete
    ? progress.first_drive_complete
      ? {
          action: "Open missions",
          body:
            "The first hosted loop is saved. Missions and upgrade votes are the next beta signals.",
          icon: Rocket,
          screen: "missions" as ConsoleScreen,
          title: "Next: build the habit loop",
        }
      : {
          action: "Enter demo Cockpit",
          body:
            "This Cockpit is hosted simulation. Real motors still open from the robot local Wi-Fi page.",
          icon: Gamepad2,
          screen: "cockpit" as ConsoleScreen,
          title: "Next: finish First Drive",
        }
    : {
        action: "Start Connection Quest",
        body:
          "Use this path after a beta kit is powered on. No kit yet? Stay in the hosted demo while hardware is prepared.",
        icon: RadioTower,
        screen: "connect" as ConsoleScreen,
        title: "Next: connect the rover",
      };
  const Icon = nextStep.icon;

  return (
    <section aria-label="Next step" className="rf-next-step">
      <div>
        <span className="eyebrow">
          <Rocket size={15} /> START HERE
        </span>
        <h2>{nextStep.title}</h2>
        <p>{nextStep.body}</p>
      </div>
      <div className="rf-next-step__path" aria-label="Owner path">
        <span className="is-done">
          <LockKeyhole size={16} /> Web Garage
        </span>
        <span className={progress.first_connection_complete ? "is-done" : ""}>
          <Wifi size={16} /> Connection Quest
        </span>
        <span className={progress.first_drive_complete ? "is-done" : ""}>
          <Gamepad2 size={16} /> Cockpit
        </span>
      </div>
      <Button icon={Icon} onClick={() => onScreen(nextStep.screen)}>
        {nextStep.action}
      </Button>
    </section>
  );
}

function ClaimRobotPanel({
  disabled,
  onClaim,
}: {
  disabled?: boolean;
  onClaim: (claimCode: string) => void;
}) {
  const [claimCode, setClaimCode] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onClaim(claimCode);
  }

  return (
    <section aria-label="Claim robot" className="rf-claim-panel">
      <div className="rf-claim-panel__copy">
        <span className="eyebrow">
          <QrCode size={15} /> CLAIM ROBOT
        </span>
        <h2>Link a physical unit to this Garage</h2>
        <p>
          Enter the code from a RoboForge QR card or beta kit. The robot will
          become part of this owner workspace.
        </p>
      </div>
      <form className="rf-claim-form" onSubmit={submit}>
        <label>
          Robot code
          <span>
            <KeyRound size={17} />
            <input
              autoComplete="off"
              inputMode="text"
              minLength={6}
              onChange={(event) => setClaimCode(event.target.value)}
              placeholder="RF-ROVER-XXXX"
              required
              value={claimCode}
            />
          </span>
        </label>
        <Button disabled={disabled} icon={QrCode} type="submit" variant="secondary">
          Claim robot
        </Button>
      </form>
    </section>
  );
}

function Garage({
  isPending,
  onClaimRobot,
  onProgress,
  onScreen,
  progress,
  robotCode,
  theme,
}: {
  isPending?: boolean;
  onClaimRobot: (claimCode: string) => void;
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
      <GarageNextStep onScreen={onScreen} progress={progress} />
      <FleetRail selected={selectedFleet} setSelected={setSelectedFleet} />
      <ClaimRobotPanel disabled={isPending} onClaim={onClaimRobot} />
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
              <Button icon={RadioTower} onClick={() => onScreen("connect")}>
                Connect Rover
              </Button>
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

function ConnectionQuest({
  connectionSessionId,
  isPending,
  onFail,
  onFeedback,
  onScreen,
  onStart,
  onSuccess,
  progress,
  robotCode,
}: {
  connectionSessionId: string | null;
  isPending?: boolean;
  onFail: (sessionId: string, reason: string) => void;
  onFeedback: (input: { message: string; problemType?: string; rating?: number }) => void;
  onScreen: (screen: ConsoleScreen) => void;
  onStart: () => void;
  onSuccess: (sessionId: string) => void;
  progress: OwnerProgress;
  robotCode: string;
}) {
  const localCockpitUrl = "http://192.168.4.1";
  const robotSsid = useMemo(
    () => `RoboForge-${robotCode.trim().toUpperCase() || "ROVER-01"}`.slice(0, 31),
    [robotCode],
  );
  const [feedback, setFeedback] = useState("");
  const [failureReason, setFailureReason] = useState("wifi_not_found");
  const [copied, setCopied] = useState<"ssid" | "url" | null>(null);

  async function copyConnectionValue(value: string, key: "ssid" | "url") {
    if (!navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied(null);
    }
  }

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onFeedback({
      message: feedback,
      problemType: failureReason,
      rating: progress.first_connection_complete ? 4 : 2,
    });
    setFeedback("");
  }

  return (
    <main className="rf-screen rf-connection-quest">
      <section className="rf-screen-heading">
        <div>
          <span className="eyebrow">
            <RadioTower size={15} /> CONNECTION QUEST
          </span>
          <h1>Connect Rover-01</h1>
          <p>
            Lyra guides the owner from power-on to the local Cockpit without
            needing IoT knowledge.
          </p>
        </div>
        <StatusPill />
      </section>
      <section className="rf-quest-layout">
        <article className="rf-quest-card">
          <span className="eyebrow">LYRA NAVIGATOR</span>
          <h2>Spirit Link checklist</h2>
          <ol>
            <li className="is-done">Power on Rover-01</li>
            <li className={connectionSessionId ? "is-done" : ""}>
              Start a connection session
            </li>
            <li>
              Join Wi-Fi: <code>{robotSsid}</code>
            </li>
            <li>
              Open: <code>{localCockpitUrl}</code>
            </li>
            <li className={progress.first_connection_complete ? "is-done" : ""}>
              Confirm Rover status is visible
            </li>
          </ol>
          <div
            aria-label="Robot local connection details"
            className="rf-connection-details"
          >
            <div>
              <span>
                <Wifi size={17} /> Wi-Fi name
              </span>
              <strong>{robotSsid}</strong>
              <button
                onClick={() => void copyConnectionValue(robotSsid, "ssid")}
                type="button"
              >
                <Clipboard size={16} />
                {copied === "ssid" ? "Copied" : "Copy"}
              </button>
            </div>
            <div>
              <span>
                <Radio size={17} /> Local page
              </span>
              <strong>{localCockpitUrl}</strong>
              <button
                onClick={() => void copyConnectionValue(localCockpitUrl, "url")}
                type="button"
              >
                <Clipboard size={16} />
                {copied === "url" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="rf-button-row">
            <Button
              disabled={Boolean(connectionSessionId) || isPending}
              icon={RadioTower}
              onClick={onStart}
            >
              Start quest
            </Button>
            <Link
              className="button rf-button rf-button--secondary"
              href={localCockpitUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={18} />
              <span>Open local cockpit</span>
            </Link>
          </div>
        </article>
        <article className="rf-quest-card rf-quest-card--actions">
          <span className="eyebrow">BETA SIGNAL</span>
          <h2>What happened?</h2>
          <p>
            Mark the result so RoboForge can learn where early users get stuck.
          </p>
          <div className="rf-button-row">
            <Button
              disabled={!connectionSessionId || isPending}
              icon={CheckCircle}
              onClick={() => connectionSessionId && onSuccess(connectionSessionId)}
            >
              Rover found
            </Button>
            <Button
              disabled={!connectionSessionId || isPending}
              icon={Wrench}
              onClick={() =>
                connectionSessionId && onFail(connectionSessionId, failureReason)
              }
              variant="secondary"
            >
              Still stuck
            </Button>
          </div>
          <label className="rf-select-label">
            Problem type
            <select
              onChange={(event) => setFailureReason(event.target.value)}
              value={failureReason}
            >
              <option value="wifi_not_found">Wi-Fi not found</option>
              <option value="cannot_open_local_page">Cannot open 192.168.4.1</option>
              <option value="no_telemetry">No telemetry</option>
              <option value="safety_unclear">Safety step unclear</option>
              <option value="not_sure">Not sure</option>
            </select>
          </label>
          <form className="rf-feedback-form" onSubmit={submitFeedback}>
            <label>
              Feedback
              <textarea
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Tell Lyra what was confusing..."
                required
                value={feedback}
              />
            </label>
            <Button disabled={isPending} icon={Send} type="submit" variant="quiet">
              Send feedback
            </Button>
          </form>
          <Button icon={Gamepad2} onClick={() => onScreen("cockpit")} variant="quiet">
            Continue to Cockpit
          </Button>
        </article>
      </section>
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
  isPending,
  onProgress,
  onStartControl,
  onStopControl,
  onScreen,
  progress,
}: {
  isPending?: boolean;
  onProgress: (progress: OwnerProgress) => void;
  onStartControl: () => void;
  onStopControl: (summary: {
    commandCount: number;
    completedSafely: boolean;
    emergencyStopCount: number;
  }) => void;
  onScreen: (screen: ConsoleScreen) => void;
  progress: OwnerProgress;
}) {
  const [armed, setArmed] = useState(false);
  const [movementSent, setMovementSent] = useState(progress.first_drive_complete);
  const [commandCount, setCommandCount] = useState(0);
  const [emergencyStopCount, setEmergencyStopCount] = useState(0);
  const missionComplete = armed && movementSent;

  function sendDemoDrive() {
    setMovementSent(true);
    setCommandCount((current) => current + 1);
    onProgress(
      completeProgress({
        ...progress,
        battery_calibrated: true,
        first_drive_complete: true,
        setup_complete: true,
      }),
    );
  }

  function emergencyStop() {
    setArmed(false);
    setMovementSent(false);
    setEmergencyStopCount((current) => current + 1);
    onStopControl({
      commandCount,
      completedSafely: false,
      emergencyStopCount: emergencyStopCount + 1,
    });
  }

  function finishSafely() {
    setArmed(false);
    onStopControl({
      commandCount,
      completedSafely: true,
      emergencyStopCount,
    });
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
              disabled={isPending}
              onClick={() => {
                setArmed((current) => {
                  const next = !current;
                  if (next) onStartControl();
                  return next;
                });
              }}
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
            onClick={emergencyStop}
            variant="danger"
          >
            Emergency stop
          </Button>
          <Button
            disabled={!movementSent || isPending}
            icon={CheckCircle}
            onClick={finishSafely}
            variant="secondary"
          >
            End safely
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

export function OwnerConsole({ initialClaimCode, workspace }: OwnerConsoleProps) {
  const router = useRouter();
  const activeRobot = workspace.robots[0];
  const autoClaimedCode = useRef<string | null>(null);
  const initialTheme = safeTheme(activeRobot?.theme);
  const [screen, setScreen] = useState<ConsoleScreen>("garage");
  const [theme, setTheme] = useState<ThemeId>(initialTheme);
  const [progress, setProgress] = useState<OwnerProgress>(
    workspace.progress ?? defaultProgress,
  );
  const [betaInterest, setBetaInterest] =
    useState<UpgradeInterest>("Build and control Rover-01");
  const [betaOpen, setBetaOpen] = useState(false);
  const [connectionSessionId, setConnectionSessionId] = useState<string | null>(null);
  const [controlSessionId, setControlSessionId] = useState<string | null>(null);
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

  const finishClaim = useCallback(
    (result: { error: string | null; ok: boolean }) => {
      if (result.ok) {
        setMessage("Robot claimed. Garage data refreshed.");
        router.replace("/dashboard");
        router.refresh();
      } else {
        setMessage(result.error ?? "Could not claim robot.");
      }
    },
    [router],
  );

  const claimRobot = useCallback((claimCode: string) => {
    setMessage("");
    startTransition(() => {
      void claimRobotByCode(claimCode).then(finishClaim);
    });
  }, [finishClaim]);

  useEffect(() => {
    const claimCode = initialClaimCode?.trim();

    if (!claimCode || autoClaimedCode.current === claimCode) return;

    autoClaimedCode.current = claimCode;
    setScreen("garage");
    setMessage("Claiming robot from QR card...");
    startTransition(() => {
      void claimRobotByCode(claimCode).then(finishClaim);
    });
  }, [finishClaim, initialClaimCode]);

  function startConnectionQuest() {
    setMessage("");
    startTransition(() => {
      void startConnectionSession().then((result) => {
        if (result.ok && result.id) {
          setConnectionSessionId(result.id);
          setMessage("Connection quest started.");
        } else {
          setMessage(result.error ?? "Could not start connection quest.");
        }
      });
    });
  }

  function completeConnectionQuest(sessionId: string) {
    setMessage("");
    const nextProgress = completeProgress({
      ...progress,
      first_connection_complete: true,
      setup_complete: true,
    });
    setProgress(nextProgress);
    startTransition(() => {
      void finishConnectionSession({ sessionId, success: true }).then((result) => {
        if (result.ok) {
          setConnectionSessionId(null);
          setMessage("Connection saved. Rover is ready for Cockpit.");
          router.refresh();
        } else {
          setMessage(result.error ?? "Could not save connection result.");
        }
      });
    });
  }

  function failConnectionQuest(sessionId: string, reason: string) {
    setMessage("");
    startTransition(() => {
      void finishConnectionSession({
        failureReason: reason,
        sessionId,
        success: false,
      }).then((result) => {
        if (result.ok) {
          setConnectionSessionId(null);
          setMessage("Connection issue saved for beta review.");
        } else {
          setMessage(result.error ?? "Could not save connection issue.");
        }
      });
    });
  }

  function submitFeedbackReport(input: {
    message: string;
    problemType?: string;
    rating?: number;
  }) {
    setMessage("");
    startTransition(() => {
      void saveFeedbackReport(input).then((result) => {
        setMessage(
          result.ok ? "Feedback saved." : result.error ?? "Could not save feedback.",
        );
      });
    });
  }

  function startDemoControlSession() {
    if (controlSessionId) return;
    setMessage("");
    startTransition(() => {
      void startControlSession({
        connectionSessionId,
        mode: "demo",
      }).then((result) => {
        if (result.ok && result.id) {
          setControlSessionId(result.id);
          setMessage("Control session started.");
        } else {
          setMessage(result.error ?? "Could not start control session.");
        }
      });
    });
  }

  function finishDemoControlSession(summary: {
    commandCount: number;
    completedSafely: boolean;
    emergencyStopCount: number;
  }) {
    if (!controlSessionId) {
      setMessage("Control summary is local until a session starts.");
      return;
    }

    setMessage("");
    startTransition(() => {
      void finishControlSession({
        ...summary,
        sessionId: controlSessionId,
      }).then((result) => {
        if (result.ok) {
          setControlSessionId(null);
          setMessage("Control session summary saved.");
        } else {
          setMessage(result.error ?? "Could not save control summary.");
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
          <Link className="rf-sign-out" href="/admin" title="Beta Ops">
            <ShieldCheck size={18} />
          </Link>
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
          isPending={isPending}
          onClaimRobot={claimRobot}
          onProgress={persistProgress}
          onScreen={setScreen}
          progress={progress}
          robotCode={robotCode}
          theme={theme}
        />
      ) : null}
      {screen === "connect" ? (
        <ConnectionQuest
          connectionSessionId={connectionSessionId}
          isPending={isPending}
          onFail={failConnectionQuest}
          onFeedback={submitFeedbackReport}
          onScreen={setScreen}
          onStart={startConnectionQuest}
          onSuccess={completeConnectionQuest}
          progress={progress}
          robotCode={robotCode}
        />
      ) : null}
      {screen === "profile" ? <Profile onScreen={setScreen} theme={theme} /> : null}
      {screen === "cockpit" ? (
        <Cockpit
          isPending={isPending}
          onProgress={persistProgress}
          onScreen={setScreen}
          onStartControl={startDemoControlSession}
          onStopControl={finishDemoControlSession}
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
