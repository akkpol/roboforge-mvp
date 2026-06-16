"use client";

import {
  BatteryCharging,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleStop,
  Cpu,
  Gamepad2,
  Gauge,
  Hand,
  House,
  LockKeyhole,
  Paintbrush,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { fleet, themes, type RobotType, type ThemeId } from "@/lib/roboforge-data";
import type { OwnerRobot } from "@/lib/supabase/server";

type ConsoleTab = "garage" | "profile" | "cockpit";

type OwnerConsoleProps = {
  ownerName: string;
  robots: OwnerRobot[];
};

const fallbackRobot: OwnerRobot = {
  created_at: "",
  display_name: "AEGIS-01",
  id: "pending",
  owner_id: "",
  robot_type: "rover",
  status: "offline",
  theme: "forge",
  unit_code: "ROVER-01",
  updated_at: "",
};

function getTheme(theme: string | null | undefined) {
  return theme === "neo" ? themes.neo : themes.forge;
}

function getRobotType(robotType: string | null | undefined): RobotType {
  return robotType === "tracked" || robotType === "drone" || robotType === "arm"
    ? robotType
    : "rover";
}

function getRobotLabel(robotType: string | null | undefined) {
  const matched = fleet.find((item) => item.id === robotType);
  return matched?.label ?? "Rover";
}

export function OwnerConsole({ ownerName, robots }: OwnerConsoleProps) {
  const activeRobot = robots[0] ?? fallbackRobot;
  const [tab, setTab] = useState<ConsoleTab>("garage");
  const [theme, setTheme] = useState<ThemeId>(getTheme(activeRobot.theme).id);
  const [selectedFleet, setSelectedFleet] = useState<RobotType>(getRobotType(activeRobot.robot_type));
  const [armed, setArmed] = useState(false);
  const [speedLimit, setSpeedLimit] = useState(30);
  const [drive, setDrive] = useState({ steering: 0, throttle: 0 });
  const [mission, setMission] = useState({
    armed: false,
    movementSent: false,
    zeroReleased: false,
  });

  const activeTheme = themes[theme];
  const missionComplete = mission.armed && mission.movementSent && mission.zeroReleased;
  const isRegisteredUnit = selectedFleet === getRobotType(activeRobot.robot_type);
  const setupCount = [true, robots.length > 0, mission.armed, missionComplete].filter(Boolean).length;
  const telemetry = useMemo(
    () => ({
      battery: armed ? 82 : 76,
      firmware: "RF-MVP-0.1",
      wifi: armed ? "strong" : "standby",
    }),
    [armed],
  );

  function toggleArmed() {
    setArmed((current) => {
      const next = !current;
      if (next) {
        setMission((state) => ({ ...state, armed: true }));
      } else {
        stopDrive();
      }
      return next;
    });
  }

  function move(throttle: number, steering: number) {
    if (!armed) return;
    setDrive({ steering, throttle });
    setMission((state) => ({ ...state, movementSent: true }));
  }

  function stopDrive() {
    setDrive({ steering: 0, throttle: 0 });
    setMission((state) =>
      state.movementSent ? { ...state, zeroReleased: true } : state,
    );
  }

  return (
    <>
      <section className="console-toolbar">
        <div className="console-tabs" aria-label="Owner console">
          <button
            className={tab === "garage" ? "is-active" : ""}
            onClick={() => setTab("garage")}
            type="button"
          >
            <House size={17} /> Garage
          </button>
          <button
            className={tab === "cockpit" ? "is-active" : ""}
            onClick={() => setTab("cockpit")}
            type="button"
          >
            <Gamepad2 size={17} /> Cockpit
          </button>
          <button
            className={tab === "profile" ? "is-active" : ""}
            onClick={() => setTab("profile")}
            type="button"
          >
            <SlidersHorizontal size={17} /> Profile
          </button>
        </div>
        <div className="theme-switch" aria-label="Robot theme">
          <button
            className={theme === "forge" ? "is-active" : ""}
            onClick={() => setTheme("forge")}
            type="button"
          >
            Forge
          </button>
          <button
            className={theme === "neo" ? "is-active" : ""}
            onClick={() => setTheme("neo")}
            type="button"
          >
            Neo
          </button>
        </div>
      </section>

      {tab === "garage" ? (
        <main className="console-screen">
          <section className="screen-heading">
            <div>
              <span className="eyebrow">
                <House size={15} /> DIGITAL HANGAR
              </span>
              <h1>My Garage</h1>
              <p>{ownerName} controls one registered unit now and can expand into the full RoboForge fleet.</p>
            </div>
            <span className={`status-pill ${armed ? "is-online" : ""}`}>
              {armed ? "ONLINE" : "OFFLINE"}
            </span>
          </section>

          <section className="progress-strip">
            <article>
              <CheckCircle2 size={19} />
              <span>Owner account</span>
              <strong>Ready</strong>
            </article>
            <article>
              <Bot size={19} />
              <span>Registered units</span>
              <strong>{robots.length}</strong>
            </article>
            <article>
              <ShieldCheck size={19} />
              <span>RLS isolation</span>
              <strong>Enabled</strong>
            </article>
            <article>
              <BrainCircuit size={19} />
              <span>Setup score</span>
              <strong>{setupCount}/4</strong>
            </article>
          </section>

          <section className="fleet-rail" aria-label="Robot fleet">
            {fleet.map((item) => (
              <button
                className={`fleet-card ${selectedFleet === item.id ? "is-selected" : ""}`}
                key={item.id}
                onClick={() => setSelectedFleet(item.id)}
                type="button"
              >
                <Image src={item.image} alt={`${item.label} robot concept`} width={260} height={180} />
                <span>{item.label}</span>
                <small>{item.id === getRobotType(activeRobot.robot_type) ? activeRobot.unit_code : item.state}</small>
              </button>
            ))}
          </section>

          {isRegisteredUnit ? (
            <section className="garage-feature">
              <div className="robot-hero">
                <Image
                  src={activeTheme.image}
                  alt={`${activeRobot.display_name} digital form`}
                  fill
                  priority
                  sizes="(min-width: 900px) 52vw, 100vw"
                />
                <span className="robot-hero__serial">
                  {`RF // ${activeRobot.unit_code} // DIGITAL FORM`}
                </span>
                <div className="robot-hero__identity">
                  <strong>{activeRobot.display_name}</strong>
                  <span>{activeTheme.robotClass}</span>
                  <small className={armed ? "" : "is-offline"}>{armed ? "ONLINE" : activeRobot.status.toUpperCase()}</small>
                </div>
              </div>
              <div className="garage-feature__info">
                <span className="unit-label">ACTIVE UNIT // {activeRobot.unit_code}</span>
                <h2>{activeRobot.display_name}</h2>
                <p>{getRobotLabel(activeRobot.robot_type)} / {activeTheme.label} / differential drive</p>
                <TelemetryGrid battery={telemetry.battery} firmware={telemetry.firmware} wifi={telemetry.wifi} />
                <TruthStrip />
                <div className="button-row">
                  <button className="button" onClick={() => setTab("cockpit")} type="button">
                    <Gamepad2 size={18} /> Cockpit
                  </button>
                  <button className="button button-secondary" onClick={() => setTab("profile")} type="button">
                    <SlidersHorizontal size={18} /> Profile
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="future-unit">
              <Bot size={70} />
              <span className="eyebrow">FLEET EXPANSION</span>
              <h2>{selectedFleet.toUpperCase()} UNIT</h2>
              <p>This robot class is in the RoboForge roadmap. It stays locked until a real owner unit is registered.</p>
              <strong>COMING SOON</strong>
            </section>
          )}
        </main>
      ) : null}

      {tab === "cockpit" ? (
        <main className="console-screen">
          <section className="screen-heading">
            <div>
              <span className="eyebrow">
                <Gamepad2 size={15} /> FLEET DECK
              </span>
              <h1>Rover Cockpit</h1>
              <p>Demo control loop for {activeRobot.unit_code}. Hardware API pairing comes after owner events are stable.</p>
            </div>
            <span className={`status-pill ${armed ? "is-online" : ""}`}>
              {armed ? "ARMED" : "DISARMED"}
            </span>
          </section>

          <TelemetryGrid battery={telemetry.battery} firmware={telemetry.firmware} wifi={telemetry.wifi} />

          <section className="cockpit-grid">
            <article className="control-panel">
              <div className="panel-heading">
                <span>
                  {armed ? <Zap size={20} /> : <LockKeyhole size={20} />}
                  <strong>{armed ? "Armed" : "Disarmed"}</strong>
                </span>
                <button
                  className={`arm-switch ${armed ? "is-on" : ""}`}
                  onClick={toggleArmed}
                  type="button"
                >
                  <span />
                  {armed ? "ARMED" : "ARM"}
                </button>
              </div>
              <div className={`joystick ${armed ? "is-armed" : ""}`} aria-label="Virtual robot joystick">
                <span>FORWARD</span>
                <div className="joystick-pad">
                  <button onClick={() => move(1, 0)} type="button">↑</button>
                  <button onClick={() => move(0, -1)} type="button">←</button>
                  <button onClick={stopDrive} type="button">•</button>
                  <button onClick={() => move(0, 1)} type="button">→</button>
                  <button onClick={() => move(-1, 0)} type="button">↓</button>
                </div>
                <small>RELEASE RETURNS ZERO</small>
              </div>
              <div className="drive-readout">
                <span>THROTTLE <strong>{drive.throttle * speedLimit}</strong></span>
                <span>STEERING <strong>{drive.steering * speedLimit}</strong></span>
              </div>
            </article>
            <aside className="mission-panel">
              <span className="eyebrow">MISSION 01</span>
              <h2>First drive loop</h2>
              <ol>
                <li className="is-done">Connect owner workspace</li>
                <li className={mission.armed ? "is-done" : ""}>Arm local controls</li>
                <li className={mission.movementSent ? "is-done" : ""}>Send a movement command</li>
                <li className={mission.zeroReleased ? "is-done" : ""}>Release joystick to zero</li>
              </ol>
              <label className="speed-control">
                <span>SPEED LIMIT <strong>{speedLimit}%</strong></span>
                <input
                  max="45"
                  min="15"
                  onChange={(event) => setSpeedLimit(Number(event.target.value))}
                  step="5"
                  type="range"
                  value={speedLimit}
                />
              </label>
              <button className="button danger-button" onClick={stopDrive} type="button">
                <CircleStop size={18} /> Emergency stop
              </button>
              {missionComplete ? (
                <div className="mission-success">
                  <CheckCircle2 size={25} />
                  <span><strong>Mission complete</strong><small>Demo driving loop verified.</small></span>
                </div>
              ) : null}
            </aside>
          </section>
        </main>
      ) : null}

      {tab === "profile" ? (
        <main className="console-screen">
          <section className="profile-hero">
            <div className="robot-hero robot-hero--compact">
              <Image src={activeTheme.image} alt={`${activeRobot.display_name} profile`} fill sizes="(min-width: 900px) 45vw, 100vw" />
            </div>
            <div className="profile-hero__copy">
              <span className="eyebrow">ROVER PROFILE // EVOLUTION 01</span>
              <h1>{activeRobot.display_name}</h1>
              <p>{activeTheme.robotClass} built on the Rover-01 base. Its digital identity can evolve before every physical upgrade is available.</p>
              <div className="capability-list">
                <span><CheckCircle2 size={17} /> Manual drive</span>
                <span><CheckCircle2 size={17} /> Wi-Fi cockpit</span>
                <span><CheckCircle2 size={17} /> Battery telemetry</span>
              </div>
              <button className="button" onClick={() => setTab("cockpit")} type="button">
                <Gamepad2 size={18} /> Cockpit
              </button>
            </div>
          </section>
          <section className="evolution-track">
            <article className="is-current">
              <span>01</span>
              <Cpu size={29} />
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
          </section>
        </main>
      ) : null}
    </>
  );
}

function TelemetryGrid({
  battery,
  firmware,
  wifi,
}: {
  battery: number;
  firmware: string;
  wifi: string;
}) {
  return (
    <div className="telemetry-grid">
      <span>
        <BatteryCharging size={20} />
        <strong>{battery}%</strong>
        Battery
      </span>
      <span>
        <Wifi size={20} />
        <strong>{wifi}</strong>
        Wi-Fi
      </span>
      <span>
        <Gauge size={20} />
        <strong>{firmware}</strong>
        Firmware
      </span>
    </div>
  );
}

function TruthStrip() {
  return (
    <div className="truth-strip">
      <span><ShieldCheck size={16} /> Owner-only rows</span>
      <span><Wrench size={16} /> Manual control first</span>
      <span><Hand size={16} /> 45% speed cap</span>
    </div>
  );
}
