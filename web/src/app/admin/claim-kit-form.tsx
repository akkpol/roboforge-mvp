"use client";

import {
  CheckCircle,
  Copy,
  FileCode2,
  type LucideIcon,
  PackagePlus,
  QrCode,
  Terminal,
} from "lucide-react";
import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import {
  createClaimKitAction,
  type ClaimKitState,
} from "@/app/admin/actions";

const initialState: ClaimKitState = {
  error: null,
  kit: null,
  ok: false,
};

const roverCandidateNotes = [
  "Candidate from photos: ESP32 DevKit V1 / ESP32-WROOM-32, L298N dual H-bridge, 2S 18650 Li-ion holder, TT DC motors.",
  "Firmware pin map: ENA=GPIO25, IN1=GPIO26, IN2=GPIO27, ENB=GPIO33, IN3=GPIO32, IN4=GPIO14, battery ADC=GPIO34.",
  "Keep ENA/ENB jumpers removed for PWM speed control. Confirm left/right polarity with wheels raised.",
  "Do not mark ready until power switch and fuse/protected pack are physically verified.",
].join("\n");

function setFormControl(form: HTMLFormElement, name: string, value: string) {
  const field = form.elements.namedItem(name);

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
  ) {
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <button className="ops-copy-button" onClick={copy} type="button">
      {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CopyBlock({
  icon: Icon,
  label,
  text,
}: {
  icon: LucideIcon;
  label: string;
  text: string;
}) {
  return (
    <section className="ops-code-block">
      <div>
        <span>
          <Icon size={15} />
          {label}
        </span>
        <CopyButton text={text} />
      </div>
      <pre>{text}</pre>
    </section>
  );
}

export function ClaimKitForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    createClaimKitAction,
    initialState,
  );

  function applyRoverCandidatePreset() {
    if (!formRef.current) return;

    setFormControl(formRef.current, "robotType", "rover");
    setFormControl(formRef.current, "boardType", "ESP32 DevKit V1 (ESP32-WROOM-32)");
    setFormControl(formRef.current, "motorDriver", "L298N dual H-bridge");
    setFormControl(formRef.current, "batteryChemistry", "li-ion");
    setFormControl(formRef.current, "batteryCells", "2");
    setFormControl(formRef.current, "motorChannels", "differential_drive");
    setFormControl(formRef.current, "wiringStatus", "photo_received");
    setFormControl(formRef.current, "wiringNotes", roverCandidateNotes);
  }

  return (
    <article className="ops-panel ops-claim-panel">
      <span className="eyebrow">
        <PackagePlus size={15} /> CLAIM KIT
      </span>
      <h2>Create Robot Kit</h2>
      <p>
        Generate one physical robot, one claim code, and one QR link for a beta
        tester. The database stores only the hashed code.
      </p>

      <form action={formAction} className="ops-form" ref={formRef}>
        <section className="ops-preset-card" aria-label="Likely rover hardware preset">
          <div>
            <strong>Likely Rover-01 preset</strong>
            <button
              className="ops-copy-button"
              onClick={applyRoverCandidatePreset}
              type="button"
            >
              Use candidate
            </button>
          </div>
          <p>
            Fills ESP32 DevKit, L298N, 2S Li-ion, and differential drive from
            the prototype photos. It does not verify switch, fuse, BMS, or motor
            polarity.
          </p>
        </section>
        <label>
          Unit code
          <input name="unitCode" placeholder="RF-RV-0001" required />
        </label>
        <label>
          Display name
          <input name="displayName" placeholder="Lumina Rover" />
        </label>
        <div className="ops-form-row">
          <label>
            Robot type
            <select defaultValue="rover" name="robotType">
              <option value="rover">Rover</option>
              <option value="tracked">Tracked</option>
              <option value="drone">Drone</option>
              <option value="arm">Arm</option>
            </select>
          </label>
          <label>
            Board model
            <input name="boardType" placeholder="ESP32 DevKit V1" required />
          </label>
        </div>
        <label>
          Motor driver
          <input name="motorDriver" placeholder="L298N / TB6612FNG / BTS7960" required />
        </label>
        <div className="ops-form-row">
          <label>
            Firmware
            <input defaultValue="0.1.0" name="firmwareVersion" />
          </label>
          <label>
            Expires
            <input name="expiresAt" type="datetime-local" />
          </label>
        </div>
        <div className="ops-form-row">
          <label>
            Battery
            <select defaultValue="" name="batteryChemistry" required>
              <option disabled value="">
                Choose chemistry
              </option>
              <option value="li-ion">Li-ion</option>
              <option value="lipo">LiPo</option>
              <option value="nimh">NiMH</option>
              <option value="alkaline">AA/alkaline</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label>
            Battery cells
            <select defaultValue="2" name="batteryCells">
              <option value="1">1S</option>
              <option value="2">2S</option>
            </select>
          </label>
        </div>
        <div className="ops-form-row">
          <label>
            Motor channels
            <select defaultValue="" name="motorChannels" required>
              <option disabled value="">
                Choose drive type
              </option>
              <option value="differential_drive">Differential drive</option>
              <option value="tracked_drive">Tracked drive</option>
              <option value="single_motor">Single motor</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label>
            Wiring status
            <select defaultValue="" name="wiringStatus" required>
              <option disabled value="">
                Choose status
              </option>
              <option value="draft">Pin list drafted</option>
              <option value="photo_received">Photo received</option>
              <option value="bench_verified">Bench verified</option>
            </select>
          </label>
        </div>
        <label>
          Wiring notes
          <textarea
            name="wiringNotes"
            placeholder="Paste a wiring photo link, pin list, or left/right motor mapping"
            required
          />
        </label>
        <div className="ops-toggle-row">
          <label>
            <input name="hasPowerSwitch" required type="checkbox" />
            Power switch present
          </label>
          <label>
            <input name="hasFuse" required type="checkbox" />
            Fuse or protected pack present
          </label>
        </div>
        <div className="ops-form-row">
          <label>
            AP password
            <input
              autoComplete="off"
              name="apPassword"
              placeholder="auto-generate"
            />
          </label>
        </div>
        <button className="button" disabled={isPending} type="submit">
          <QrCode size={17} />
          {isPending ? "Creating..." : "Create code"}
        </button>
      </form>

      {state.error ? <p className="ops-error">{state.error}</p> : null}

      {state.kit ? (
        <section className="ops-claim-card" aria-label="Generated claim kit">
          <Image
            alt={`QR claim link for ${state.kit.unitCode}`}
            height={180}
            src={state.kit.qrDataUrl}
            unoptimized
            width={180}
          />
          <div>
            <small>READY TO PRINT</small>
            <strong>{state.kit.unitCode}</strong>
            <code>{state.kit.claimCode}</code>
            <div className="ops-copy-row">
              <CopyButton text={state.kit.claimCode} />
              <CopyButton text={state.kit.claimUrl} />
            </div>
            <p>{state.kit.claimUrl}</p>
          </div>
        </section>
      ) : null}

      {state.kit ? (
        <section className="ops-manifest-grid">
          <CopyBlock
            icon={FileCode2}
            label="firmware/include/config.h"
            text={state.kit.firmwareConfig}
          />
          <CopyBlock
            icon={Terminal}
            label="kit manifest"
            text={state.kit.kitManifest}
          />
          <CopyBlock
            icon={Terminal}
            label="non-driving check"
            text={state.kit.localCheckCommand}
          />
          <CopyBlock
            icon={Terminal}
            label="raised-wheel drive check"
            text={state.kit.raisedWheelCheckCommand}
          />
        </section>
      ) : null}
    </article>
  );
}
