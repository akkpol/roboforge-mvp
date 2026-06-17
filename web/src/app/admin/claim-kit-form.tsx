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
import { useActionState, useState } from "react";
import {
  createClaimKitAction,
  type ClaimKitState,
} from "@/app/admin/actions";

const initialState: ClaimKitState = {
  error: null,
  kit: null,
  ok: false,
};

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
  const [state, formAction, isPending] = useActionState(
    createClaimKitAction,
    initialState,
  );

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

      <form action={formAction} className="ops-form">
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
            Board
            <input defaultValue="esp32" name="boardType" />
          </label>
        </div>
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
            Battery cells
            <select defaultValue="2" name="batteryCells">
              <option value="1">1S</option>
              <option value="2">2S</option>
            </select>
          </label>
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
