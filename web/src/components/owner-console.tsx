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
  firstPaidOfferInterest,
  fleet,
  themes,
  upgradeInterests,
  upgradeItems,
  type ConsoleScreen,
  type OwnerProgress,
  type ThemeId,
  type UpgradeInterest,
} from "@/lib/roboforge-data";
import type { OwnerWorkspace, RobotDevice } from "@/lib/supabase/server";

type OwnerConsoleProps = {
  initialClaimCode?: string | null;
  locale?: OwnerLocale;
  workspace: OwnerWorkspace;
};

type OwnerLocale = "en" | "th";

const ownerCopy = {
  en: {
    connection: {
      actions: {
        continueCockpit: "Continue to Cockpit",
        copy: "Copy",
        copied: "Copied",
        found: "Rover found",
        openLocal: "Open local cockpit",
        send: "Send feedback",
        start: "Start quest",
        stuck: "Still stuck",
      },
      aria: {
        details: "Robot local connection details",
        steps: "Connection steps",
      },
      body:
        "Lyra guides you from power-on to the local Cockpit without needing IoT knowledge.",
      checklistTitle: "Spirit Link checklist",
      details: {
        localPage: "Local page",
        wifiName: "Wi-Fi name",
      },
      eyebrow: "CONNECTION QUEST",
      feedback: {
        label: "Feedback",
        placeholder: "Tell Lyra what was confusing...",
        problemLabel: "Problem type",
      },
      orderedSteps: {
        confirm: "Confirm Rover status is visible",
        join: "Join Wi-Fi:",
        open: "Open:",
        power: "Power on Rover-01",
        start: "Start a connection session",
      },
      problemOptions: {
        cannot_open_local_page: "Cannot open 192.168.4.1",
        no_telemetry: "No telemetry",
        not_sure: "Not sure",
        safety_unclear: "Safety step unclear",
        wifi_not_found: "Wi-Fi not found",
      },
      resultBody:
        "Mark the result so RoboForge can learn where early users get stuck.",
      resultEyebrow: "BETA SIGNAL",
      resultTitle: "What happened?",
      steps: {
        confirm: {
          detail: "If battery and status are visible, mark Rover found.",
          label: "Confirm",
        },
        join: {
          detail: (ssid: string) =>
            `Pick ${ssid} in your phone or computer Wi-Fi list.`,
          label: "Join",
        },
        open: {
          detail: (url: string) =>
            `Open ${url} after your device joins the rover Wi-Fi.`,
          label: "Open",
        },
        power: {
          detail:
            "Turn the rover on and keep wheels off the floor for the first test.",
          label: "Power",
        },
      },
      title: "Connect Rover-01",
      navigator: "LYRA NAVIGATOR",
    },
    garage: {
      actions: {
        cockpit: "Enter cockpit",
        connect: "Connect Rover",
        profile: "Profile",
      },
      activeUnit: "ACTIVE UNIT",
      body:
        "One command center for every machine you own and every machine you will build next.",
      driveLabel: "DIFFERENTIAL DRIVE",
      eyebrow: "DIGITAL HANGAR",
      future: {
        badge: "COMING SOON",
        body:
          "This robot class is part of the RoboForge platform roadmap. Control hardware is not included in this build.",
        eyebrow: "FLEET EXPANSION",
        unitSuffix: "UNIT",
      },
      title: "My Garage",
    },
    layers: {
      digital: {
        body: "Theme, identity, missions, and learning path that stay with your account.",
        title: "Digital Form",
      },
      future: {
        body: "Sensor packs, body kits, AI guide, and new robot classes stay as demand signals until validated.",
        title: "Future Upgrade",
      },
      physical: {
        empty: "No physical kit linked yet",
        linked: "Claimed hardware kit",
        title: "Physical Unit",
      },
    },
    modular: {
      aria: "Modular robotics profile",
      body:
        "RoboForge starts as one verified Rover-01 path, then grows into module slots and cloneable robot profiles.",
      blueprint: {
        action: "Preview only",
        body:
          "The blueprint can copy the digital setup and compatible module list. It does not ship hardware, autonomy, or a marketplace listing yet.",
        clone: "Cloneable profile",
        format: "robot_profile.json",
        idLabel: "Blueprint ID",
        marketplace: "Marketplace later",
        safety: "Physical control still requires a linked kit and local Wi-Fi.",
        shareState: "Share/sell disabled until the pilot proves the kit.",
        title: "Blueprint",
      },
      eyebrow: "MODULAR ROBOTICS",
      hardware: {
        body:
          "Physical details from your linked kit. Until a kit is linked, this stays a demo setup.",
        empty: "Waiting for kit",
        rows: {
          brain: "Brain",
          comms: "Communication",
          firmware: "Firmware",
          motion: "Muscle",
          power: "Power",
          readiness: "Readiness",
        },
        safetyPending: "Switch or fuse still needs proof",
        safetyReady: "Switch and fuse/protected pack verified",
        sourceDemo: "Demo setup",
        sourceProfile: "Hardware profile",
        title: "Hardware Profile",
      },
      slots: {
        body:
          "The first version is a readable slot map, not drag-and-drop assembly.",
        empty: "Pending",
        installed: "Installed",
        items: {
          brain: "Brain",
          comms: "Communication",
          drive: "Drive muscle",
          power: "Power",
          senses: "Senses",
        },
        locked: "Roadmap",
        planned: "Demand signal",
        title: "Module Slots",
        waiting: "Claim a physical kit to bind this slot to real hardware.",
      },
      title: "Hardware Profile / Module Slots / Blueprint",
    },
    paidOffer: {
      action: "Apply for guided beta",
      body:
        "A small paid beta for people who want the first complete path: prepared Rover-01 kit, guided setup, Web Garage, and beta support.",
      eyebrow: "FIRST PAID OFFER",
      items: [
        "Rover-01 beta kit",
        "Guided setup workshop",
        "Your Web Garage account",
      ],
      note: "Payment is handled outside the app until hardware proof is complete.",
      title: "Rover-01 Beta Kit + guided setup workshop + Web Garage",
    },
    engineer: {
      body:
        "Plain hardware notes and safe firmware guidance for the current beta kit.",
      eyebrow: "HARDWARE CODEX / FIRMWARE LAB",
      map: {
        body: "A visual route into the same lessons below.",
        title: "Rover part map",
      },
      firmware: {
        body: "Understand the code on the robot before changing it.",
        compatibility:
          "Compatible with the Rover protocol draft. The real kit still needs bench proof.",
        current: "Current demo firmware",
        demoSource: "Demo setup until a physical kit is linked.",
        protocol: "Protocol",
        readiness: "Readiness",
        safety:
          "No one-click firmware update until a physical kit passes bench and raised-wheel recovery tests.",
        ssid: "Robot Wi-Fi",
        steps: [
          "Confirm the board profile in Ops",
          "Read release notes in plain language",
          "Run the protocol check with motors disabled or wheels raised",
          "Keep USB recovery ready before any real update",
        ],
        title: "Firmware Lab",
      },
      hardware: {
        body:
          "Start with the parts you can see in the kit, then reveal the technical name.",
        parts: [
          {
            detail:
              "Creates the robot Wi-Fi, serves the local Cockpit, reads status, and sends motor signals.",
            id: "learn-esp32",
            label: "Control board",
            name: "ESP32",
          },
          {
            detail:
              "Takes low-power commands from ESP32 and switches higher motor power. Good for the prototype kit, not final production proof.",
            id: "learn-motor-driver",
            label: "Motor driver",
            name: "L298N",
          },
          {
            detail:
              "Usually 7.4V nominal and 8.4V full. It needs a switch and protected pack, BMS, or fuse before floor tests.",
            id: "learn-battery",
            label: "Power source",
            name: "2S 18650 Li-ion",
          },
          {
            detail:
              "Common ground, correct left/right polarity, and raised wheels first. Unknown facts mean not ready for floor.",
            id: "learn-wiring",
            label: "Safety gate",
            name: "Wiring proof",
          },
        ],
        title: "Hardware Codex",
      },
      support: {
        safety: "Power off before changing motor or battery wiring.",
        scripts: [
          {
            body:
              "Check the configured cell count before driving. Compare the displayed voltage against a multimeter, then update the battery setting only after the pack is identified.",
            code: "battery_configuration_mismatch",
            title: "Battery gate blocked arming",
          },
          {
            body:
              "The rover rejected an old drive command. Tap Emergency stop, refresh Cockpit, then arm again so command numbering restarts cleanly.",
            code: "stale_sequence",
            title: "Drive command was rejected",
          },
          {
            body:
              "Arm the cockpit only after the wheels are raised and the area is clear. Hosted web Cockpit stays simulated; real controls live on the Rover local Wi-Fi.",
            code: "controls_not_armed",
            title: "Controls are locked",
          },
          {
            body:
              "Join the Rover Wi-Fi network and open the local device page for real hardware. The cloud workspace should never proxy live motor commands.",
            code: "network_error",
            title: "Rover link is unavailable",
          },
        ],
        title: "Lyra field notes",
      },
      title: "Learn the rover before upgrading it",
    },
    messages: {
      betaError: "Could not save beta application.",
      betaSaved: "Beta application saved.",
      claimError: "Could not add robot.",
      claimingFromQr: "Adding robot from QR card...",
      connectionIssueError: "Could not save connection issue.",
      connectionIssueSaved: "Connection issue saved for beta review.",
      connectionSaved: "Connection saved. Rover is ready for Cockpit.",
      connectionSaveError: "Could not save connection result.",
      connectionStarted: "Connection quest started.",
      connectionStartError: "Could not start connection quest.",
      controlLocal: "Control summary is local until a session starts.",
      controlSaved: "Control session summary saved.",
      controlSaveError: "Could not save control summary.",
      controlStarted: "Control session started.",
      controlStartError: "Could not start control session.",
      feedbackError: "Could not save feedback.",
      feedbackSaved: "Feedback saved.",
      interestError: "Could not save interest.",
      interestSaved: (interest: string) => `${interest} interest saved.`,
      progressSaved: "Mission progress saved.",
      robotClaimed: "Robot added. Garage data refreshed.",
      saving: "Saving...",
      themeSaved: "Theme saved to your Garage.",
    },
    nav: {
      cockpit: "Cockpit",
      engineer: "Learn",
      garage: "Garage",
      missions: "Missions",
      store: "Upgrades",
    },
    nextStep: {
      aria: "Next step",
      claim: {
        action: "Apply for guided beta",
        body:
          "Your Digital Form is ready. Link a kit code or apply for the guided beta before real connection.",
        title: "Next: add a physical kit",
      },
      cockpit: {
        action: "Enter demo Cockpit",
        body:
          "This Cockpit is hosted simulation. Real motors still open from the robot local Wi-Fi page.",
        title: "Next: finish First Drive",
      },
      connect: {
        action: "Start Connection Quest",
        body:
          "Use this path after a beta kit is powered on. No kit yet? Stay in the hosted demo while hardware is prepared.",
        title: "Next: connect the rover",
      },
      eyebrow: "START HERE",
      missions: {
        action: "Open missions",
        body:
          "The first hosted loop is saved. Missions and upgrade votes are the next beta signals.",
        title: "Next: build the habit loop",
      },
      path: {
        aria: "Setup path",
        cockpit: "Cockpit",
        connect: "Connection Quest",
        garage: "Web Garage",
      },
    },
    progress: {
      action: "Mark first drive",
      aria: "Robot progress",
      digitalBody:
        "Claim a physical kit before these readiness gates become real hardware evidence.",
      digitalTitle: "Physical kit not linked yet",
      eyebrow: "ROBOT PROGRESS",
      items: {
        batteryCalibrated: "Battery calibrated",
        firstConnection: "First connection complete",
        firstDrive: "First drive complete",
        floorTest: "Ready for floor test",
        setup: "Setup complete",
      },
      title: "Rover-01 readiness",
    },
    claim: {
      action: "Add robot",
      aria: "Add robot",
      body:
        "Enter the code from a RoboForge QR card or beta kit. The robot will be added to your Garage.",
      eyebrow: "ADD ROBOT",
      label: "Robot code",
      title: "Link a physical unit to this Garage",
    },
    topbar: {
      adminTitle: "Beta Ops",
      back: "Garage",
      brandSub: "WEB GARAGE",
      defaultOwner: "RoboForge Account",
      savedInterestPlural: "saved upgrade signals",
      savedInterestSingular: "saved upgrade signal",
      signOutTitle: "Sign out",
    },
  },
  th: {
    connection: {
      actions: {
        continueCockpit: "ไป Cockpit",
        copy: "คัดลอก",
        copied: "คัดลอกแล้ว",
        found: "พบ Rover แล้ว",
        openLocal: "เปิด Cockpit ในหุ่น",
        send: "ส่งข้อมูล",
        start: "เริ่มเชื่อมต่อ",
        stuck: "ยังติดอยู่",
      },
      aria: {
        details: "ข้อมูลสำหรับเชื่อมต่อหุ่น",
        steps: "ขั้นตอนเชื่อมต่อหุ่น",
      },
      body:
        "Lyra จะพาเปิดเครื่อง ต่อ Wi-Fi ของหุ่น และเข้า Cockpit ทีละขั้น โดยไม่ต้องรู้ IoT",
      checklistTitle: "เช็กลิสต์ก่อนขับ",
      details: {
        localPage: "หน้าควบคุมในหุ่น",
        wifiName: "ชื่อ Wi-Fi",
      },
      eyebrow: "เชื่อมต่อหุ่น",
      feedback: {
        label: "รายละเอียด",
        placeholder: "บอก Lyra ว่าตรงไหนทำให้งง...",
        problemLabel: "ปัญหาที่เจอ",
      },
      orderedSteps: {
        confirm: "ยืนยันว่าเห็นสถานะ Rover",
        join: "ต่อ Wi-Fi:",
        open: "เปิด:",
        power: "เปิด Rover-01",
        start: "เริ่มการเชื่อมต่อ",
      },
      problemOptions: {
        cannot_open_local_page: "เปิด 192.168.4.1 ไม่ได้",
        no_telemetry: "ไม่เห็นข้อมูลจากหุ่น",
        not_sure: "ไม่แน่ใจ",
        safety_unclear: "ขั้นตอนความปลอดภัยไม่ชัด",
        wifi_not_found: "หา Wi-Fi ไม่เจอ",
      },
      resultBody: "บันทึกผลเพื่อให้ทีมรู้ว่าคุณติดตรงไหน",
      resultEyebrow: "ผลทดสอบเบต้า",
      resultTitle: "เกิดอะไรขึ้น",
      steps: {
        confirm: {
          detail: "ถ้าเห็นแบตเตอรี่และสถานะ ให้กดพบ Rover แล้ว",
          label: "ยืนยัน",
        },
        join: {
          detail: (ssid: string) =>
            `เลือก ${ssid} ในรายการ Wi-Fi ของมือถือหรือคอมพิวเตอร์`,
          label: "ต่อ Wi-Fi",
        },
        open: {
          detail: (url: string) =>
            `เปิด ${url} หลังจากเครื่องของคุณต่อ Wi-Fi ของหุ่นแล้ว`,
          label: "เปิดหน้า",
        },
        power: {
          detail: "เปิด Rover แล้ววางให้ล้อไม่แตะพื้นก่อนทดสอบครั้งแรก",
          label: "เปิดเครื่อง",
        },
      },
      title: "เชื่อมต่อ Rover-01",
      navigator: "LYRA",
    },
    garage: {
      actions: {
        cockpit: "เข้า Cockpit",
        connect: "เชื่อมต่อ Rover",
        profile: "โปรไฟล์",
      },
      activeUnit: "เครื่องที่ใช้งาน",
      body: "ดูหุ่นที่เป็นของคุณ เชื่อมต่อเครื่องจริง และเก็บความคืบหน้าในที่เดียว",
      driveLabel: "ขับเคลื่อนแยกซ้ายขวา",
      eyebrow: "WEB GARAGE",
      future: {
        badge: "ยังไม่เปิดใช้",
        body:
          "รุ่นนี้ยังอยู่ในแผนของแพลตฟอร์ม RoboForge ฮาร์ดแวร์ควบคุมยังไม่รวมในชุดนี้",
        eyebrow: "หุ่นรุ่นถัดไป",
        unitSuffix: "UNIT",
      },
      title: "Garage ของฉัน",
    },
    layers: {
      digital: {
        body: "ตัวตน ธีม ภารกิจ และเส้นทางเรียนรู้ที่อยู่กับบัญชีของคุณ",
        title: "Digital Form",
      },
      future: {
        body: "ชุดเซนเซอร์ บอดี้คิต AI guide และหุ่นรุ่นถัดไปจะเปิดตามลำดับหลังชุดแรกพร้อมใช้งานจริง",
        title: "Future Upgrade",
      },
      physical: {
        empty: "ยังไม่มีคิตจริงผูกกับบัญชี",
        linked: "คิตฮาร์ดแวร์ที่เพิ่มแล้ว",
        title: "Physical Unit",
      },
    },
    modular: {
      aria: "โปรไฟล์หุ่นยนต์แบบโมดูล",
      body:
        "RoboForge เริ่มจาก Rover-01 หนึ่งชุดที่ตรวจสอบได้จริง แล้วค่อยขยายเป็นช่องโมดูลและโปรไฟล์หุ่นที่ทำสำเนาได้",
      blueprint: {
        action: "พรีวิวเท่านั้น",
        body:
          "Blueprint ทำสำเนาได้เฉพาะโปรไฟล์ดิจิทัลและรายการโมดูลที่เข้ากัน ยังไม่รวมการส่งฮาร์ดแวร์ ระบบอัตโนมัติ หรือหน้าขายใน Marketplace",
        clone: "โปรไฟล์ที่ทำสำเนาได้",
        format: "robot_profile.json",
        idLabel: "Blueprint ID",
        marketplace: "Marketplace ภายหลัง",
        safety: "การควบคุมหุ่นจริงยังต้องเพิ่มคิตเข้าบัญชีและต่อ Wi-Fi ของหุ่นก่อน",
        shareState: "ยังไม่เปิดแชร์หรือขาย จนกว่าชุดแรกจะผ่านการทดสอบจริง",
        title: "Blueprint",
      },
      eyebrow: "MODULAR ROBOTICS",
      hardware: {
        body:
          "ข้อมูลฮาร์ดแวร์จากคิตที่เพิ่มเข้าบัญชีแล้ว ถ้ายังไม่ได้เพิ่มคิต หน้านี้จะแสดงโปรไฟล์ตัวอย่าง",
        empty: "รอเพิ่มคิต",
        rows: {
          brain: "สมอง",
          comms: "การสื่อสาร",
          firmware: "เฟิร์มแวร์",
          motion: "กล้ามเนื้อ",
          power: "พลังงาน",
          readiness: "ความพร้อม",
        },
        safetyPending: "ยังต้องยืนยันสวิตช์หรือฟิวส์",
        safetyReady: "ยืนยันสวิตช์และฟิวส์หรือแบตที่มีระบบป้องกันแล้ว",
        sourceDemo: "โปรไฟล์ตัวอย่าง",
        sourceProfile: "โปรไฟล์ฮาร์ดแวร์",
        title: "โปรไฟล์ฮาร์ดแวร์",
      },
      slots: {
        body:
          "เวอร์ชันแรกเป็นแผนที่ช่องโมดูลให้อ่านได้ก่อน ยังไม่ใช่ตัวประกอบแบบลากวาง",
        empty: "รอข้อมูล",
        installed: "ติดตั้งแล้ว",
        items: {
          brain: "สมอง",
          comms: "การสื่อสาร",
          drive: "กล้ามเนื้อขับเคลื่อน",
          power: "พลังงาน",
          senses: "ประสาทสัมผัส",
        },
        locked: "Roadmap",
        planned: "วางแผนไว้",
        title: "ช่องโมดูล",
        waiting: "เพิ่มคิตจริงก่อนเพื่อผูกช่องนี้กับฮาร์ดแวร์",
      },
      title: "โปรไฟล์ฮาร์ดแวร์ / ช่องโมดูล / Blueprint",
    },
    paidOffer: {
      action: "สมัครชุดทดลองแบบมีค่าใช้จ่าย",
      body:
        "เบต้าชุดเล็กสำหรับคนที่อยากได้เส้นทางครบ: คิต Rover-01, เวิร์กช็อปตั้งค่า, Web Garage และซัพพอร์ตช่วงทดลอง",
      eyebrow: "ข้อเสนอแรกที่ขายได้",
      items: [
        "คิต Rover-01 beta",
        "เวิร์กช็อปตั้งค่า",
        "บัญชี Web Garage ของคุณ",
      ],
      note: "การชำระเงินยังทำนอกแอปจนกว่าฮาร์ดแวร์จริงผ่านหลักฐานทดสอบ",
      title: "Rover-01 Beta Kit + guided setup workshop + Web Garage",
    },
    engineer: {
      body:
        "รู้จักชิ้นส่วนในชุดเบต้า และดูแนวทางอัปเดตเฟิร์มแวร์แบบไม่เสี่ยงเกินไป",
      eyebrow: "Hardware Codex / Firmware Lab",
      map: {
        body: "แผนที่ชิ้นส่วนที่พาไปบทเรียนด้านล่าง",
        title: "แผนที่ชิ้นส่วน Rover",
      },
      firmware: {
        body: "ดูโค้ดที่อยู่ในหุ่นให้เข้าใจก่อนเปลี่ยน",
        compatibility:
          "เข้ากับ RoboForge protocol เบื้องต้น แต่หุ่นจริงยังต้องผ่าน bench test",
        current: "เฟิร์มแวร์เดโมตอนนี้",
        demoSource: "ยังเป็นโปรไฟล์ตัวอย่าง จนกว่าจะเพิ่มชุดหุ่นจริงเข้าบัญชี",
        protocol: "Protocol",
        readiness: "ความพร้อม",
        safety:
          "ยังไม่เปิดอัปเดตเฟิร์มแวร์คลิกเดียว จนกว่าชุดจริงผ่าน bench และ raised-wheel recovery test",
        ssid: "Wi-Fi ของหุ่น",
        steps: [
          "ยืนยันรุ่นบอร์ดในหน้า Ops",
          "อ่านสิ่งที่เปลี่ยนเป็นภาษาง่าย",
          "รัน protocol check โดยปิดมอเตอร์หรือยกรถขึ้น",
          "เตรียมวิธีกู้คืนผ่าน USB ก่อนอัปเดตจริง",
        ],
        title: "Firmware Lab",
      },
      hardware: {
        body:
          "เริ่มจากชิ้นส่วนที่คุณเห็นจริงในชุด แล้วค่อยบอกชื่อเทคนิคของมัน",
        parts: [
          {
            detail:
              "สร้าง Wi-Fi ของหุ่น เปิดหน้า Cockpit ในตัวหุ่น อ่านสถานะ และส่งสัญญาณไปมอเตอร์",
            id: "learn-esp32",
            label: "บอร์ดควบคุม",
            name: "ESP32",
          },
          {
            detail:
              "รับคำสั่งจาก ESP32 แล้วจ่ายไฟให้มอเตอร์ ใช้กับชุดต้นแบบได้ แต่ยังไม่ใช่คำตอบสุดท้ายของรุ่นผลิตจริง",
            id: "learn-motor-driver",
            label: "ตัวขับมอเตอร์",
            name: "L298N",
          },
          {
            detail:
              "โดยทั่วไปประมาณ 7.4V และเต็มราว 8.4V ก่อนลงพื้นต้องมีสวิตช์และระบบป้องกันที่ตรวจได้จริง",
            id: "learn-battery",
            label: "แหล่งพลังงาน",
            name: "18650 Li-ion 2S",
          },
          {
            detail:
              "GND ต้องร่วมกัน ล้อซ้ายขวาต้องหมุนถูกทิศ และยกรถขึ้นก่อนทดสอบครั้งแรก ถ้ายังไม่รู้ข้อมูลนี้ ห้ามถือว่าพร้อมลงพื้น",
            id: "learn-wiring",
            label: "ด่านความปลอดภัย",
            name: "หลักฐานการต่อสาย",
          },
        ],
        title: "Hardware Codex",
      },
      support: {
        safety: "ปิดไฟก่อนเปลี่ยนสายมอเตอร์หรือแบตเตอรี่",
        scripts: [
          {
            body:
              "เช็กจำนวนเซลล์แบตเตอรี่ก่อนขับ เทียบค่าแรงดันบนหน้าจอกับ multimeter แล้วค่อยแก้การตั้งค่าแบตเมื่อรู้ชนิด pack แล้ว",
            code: "battery_configuration_mismatch",
            title: "แบตเตอรี่ทำให้ arm ไม่ผ่าน",
          },
          {
            body:
              "Rover ปฏิเสธคำสั่งขับเก่า ให้กด Emergency stop รีเฟรช Cockpit แล้ว arm ใหม่เพื่อเริ่มเลขคำสั่งใหม่",
            code: "stale_sequence",
            title: "คำสั่งขับถูกปฏิเสธ",
          },
          {
            body:
              "กด arm หลังยกล้อขึ้นและพื้นที่รอบตัวปลอดภัยเท่านั้น Cockpit บนเว็บเป็นเดโม ส่วนมอเตอร์จริงอยู่ในหน้า Wi-Fi ของ Rover",
            code: "controls_not_armed",
            title: "ระบบควบคุมยังล็อกอยู่",
          },
          {
            body:
              "ต่อ Wi-Fi ของ Rover แล้วเปิดหน้าควบคุมในตัวหุ่นสำหรับฮาร์ดแวร์จริง cloud ไม่ควรเป็นทางผ่านของคำสั่งมอเตอร์สด",
            code: "network_error",
            title: "ติดต่อ Rover ไม่ได้",
          },
        ],
        title: "โน้ตช่วยแก้ปัญหาจาก Lyra",
      },
      title: "รู้จัก Rover ก่อนอัปเกรด",
    },
    messages: {
      betaError: "บันทึกใบสมัครเบต้าไม่สำเร็จ",
      betaSaved: "บันทึกใบสมัครเบต้าแล้ว",
      claimError: "เพิ่มหุ่นไม่สำเร็จ",
      claimingFromQr: "กำลังเพิ่มหุ่นจากการ์ด QR...",
      connectionIssueError: "บันทึกปัญหาไม่สำเร็จ",
      connectionIssueSaved: "บันทึกปัญหาไว้ให้ทีมรีวิวแล้ว",
      connectionSaved: "บันทึกการเชื่อมต่อแล้ว Rover พร้อมเข้า Cockpit",
      connectionSaveError: "บันทึกผลการเชื่อมต่อไม่สำเร็จ",
      connectionStarted: "เริ่มการเชื่อมต่อแล้ว",
      connectionStartError: "เริ่มการเชื่อมต่อไม่สำเร็จ",
      controlLocal: "สรุปการควบคุมจะอยู่ในเครื่องนี้จนกว่าจะเริ่มเซสชัน",
      controlSaved: "บันทึกสรุปการควบคุมแล้ว",
      controlSaveError: "บันทึกสรุปการควบคุมไม่สำเร็จ",
      controlStarted: "เริ่มเซสชันควบคุมแล้ว",
      controlStartError: "เริ่มเซสชันควบคุมไม่สำเร็จ",
      feedbackError: "บันทึกฟีดแบ็กไม่สำเร็จ",
      feedbackSaved: "บันทึกฟีดแบ็กแล้ว",
      interestError: "บันทึกความสนใจไม่สำเร็จ",
      interestSaved: (interest: string) => `บันทึกความสนใจเรื่อง ${interest} แล้ว`,
      progressSaved: "บันทึกความคืบหน้าแล้ว",
      robotClaimed: "เพิ่มหุ่นแล้ว กำลังโหลด Garage ใหม่",
      saving: "กำลังบันทึก...",
      themeSaved: "บันทึกสไตล์ของหุ่นแล้ว",
    },
    nav: {
      cockpit: "Cockpit",
      engineer: "เรียนรู้",
      garage: "Garage",
      missions: "Missions",
      store: "Upgrades",
    },
    nextStep: {
      aria: "ขั้นต่อไป",
      claim: {
        action: "สมัครชุดทดลองแบบมีค่าใช้จ่าย",
        body:
          "Digital Form พร้อมแล้ว ขั้นต่อไปคือเพิ่มรหัสคิตหรือสมัครชุดทดลองแบบมีค่าใช้จ่าย ก่อนเชื่อมต่อหุ่นจริง",
        title: "ขั้นต่อไป: เพิ่มคิตจริง",
      },
      cockpit: {
        action: "เข้า Cockpit เดโม",
        body:
          "หน้านี้เป็นเดโมบนเว็บ ส่วนการขับมอเตอร์จริงต้องเปิดจาก Wi-Fi ของหุ่น",
        title: "ขั้นต่อไป: ลองขับครั้งแรก",
      },
      connect: {
        action: "เริ่มเชื่อมต่อ",
        body:
          "เปิดหุ่นแล้วทำตามทีละขั้น ถ้ายังไม่มีชุดเบต้า ให้ใช้เดโมบนเว็บไปก่อน",
        title: "ขั้นต่อไป: เชื่อมต่อหุ่น",
      },
      eyebrow: "เริ่มตรงนี้",
      missions: {
        action: "เปิด Missions",
        body:
          "ระบบบันทึกการเชื่อมต่อและการขับครั้งแรกแล้ว ต่อไปใช้ Missions เพื่อพาหุ่นของคุณไปภารกิจถัดไป",
        title: "ขั้นต่อไป: ทำภารกิจแรก",
      },
      path: {
        aria: "เส้นทางเริ่มใช้งาน",
        cockpit: "Cockpit",
        connect: "เชื่อมต่อหุ่น",
        garage: "Web Garage",
      },
    },
    progress: {
      action: "บันทึกว่าขับครั้งแรกแล้ว",
      aria: "ความคืบหน้าของหุ่น",
      digitalBody:
        "เพิ่มคิตจริงก่อน แล้วด่านความพร้อมเหล่านี้ถึงจะเป็นหลักฐานของฮาร์ดแวร์จริง",
      digitalTitle: "ยังไม่ได้ผูกคิตจริง",
      eyebrow: "ความคืบหน้า",
      items: {
        batteryCalibrated: "ตรวจแบตเตอรี่แล้ว",
        firstConnection: "เชื่อมต่อครั้งแรกแล้ว",
        firstDrive: "ขับครั้งแรกแล้ว",
        floorTest: "พร้อมทดสอบบนพื้น",
        setup: "ตั้งค่าบัญชีแล้ว",
      },
      title: "ความพร้อมของ Rover-01",
    },
    claim: {
      action: "เพิ่มหุ่น",
      aria: "เพิ่มหุ่น",
      body:
        "กรอกรหัสจากการ์ด QR หรือชุดเบต้า แล้วหุ่นจะถูกเพิ่มเข้าบัญชีของคุณ",
      eyebrow: "เพิ่มหุ่น",
      label: "รหัสหุ่น",
      title: "ผูกหุ่นจริงเข้ากับ Web Garage นี้",
    },
    topbar: {
      adminTitle: "ทีมเบต้า",
      back: "Garage",
      brandSub: "WEB GARAGE",
      defaultOwner: "บัญชี RoboForge",
      savedInterestPlural: "รายการความสนใจที่บันทึกไว้",
      savedInterestSingular: "รายการความสนใจที่บันทึกไว้",
      signOutTitle: "ออกจากระบบ",
    },
  },
} as const;

type OwnerCopy = (typeof ownerCopy)[OwnerLocale];

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

function TruthStrip({
  copy,
  device,
  robotCode,
}: {
  copy: OwnerCopy;
  device: RobotDevice | null;
  robotCode: string;
}) {
  const physicalDetail = device
    ? `${copy.layers.physical.linked}: ${robotCode.toUpperCase()} / ${formatReadinessStatus(
        device.readiness_status,
      )}`
    : copy.layers.physical.empty;

  return (
    <div className="rf-truth-strip">
      <div>
        <span>
          <Sparkles size={17} />
        </span>
        <p>
          <strong>{copy.layers.digital.title}</strong>
          <small>{copy.layers.digital.body}</small>
        </p>
      </div>
      <div className={device ? "is-physical" : "is-empty"}>
        <span>
          <CircuitBoard size={17} />
        </span>
        <p>
          <strong>{copy.layers.physical.title}</strong>
          <small>{physicalDetail}</small>
        </p>
      </div>
      <div className="is-future">
        <span>
          <Wrench size={17} />
        </span>
        <p>
          <strong>{copy.layers.future.title}</strong>
          <small>{copy.layers.future.body}</small>
        </p>
      </div>
    </div>
  );
}

function ProgressPanel({
  copy,
  hasPhysicalUnit,
  onCompleteFirstDrive,
  progress,
}: {
  copy: OwnerCopy;
  hasPhysicalUnit: boolean;
  onCompleteFirstDrive: () => void;
  progress: OwnerProgress;
}) {
  const items = [
    [copy.progress.items.setup, progress.setup_complete],
    [copy.progress.items.firstConnection, progress.first_connection_complete],
    [copy.progress.items.firstDrive, progress.first_drive_complete],
    [copy.progress.items.batteryCalibrated, progress.battery_calibrated],
    [copy.progress.items.floorTest, progress.ready_for_floor_test],
  ] as const;

  return (
    <section aria-label={copy.progress.aria} className="rf-owner-progress">
      <div>
        <span className="eyebrow">
          <ShieldCheck size={15} /> {copy.progress.eyebrow}
        </span>
        <h2>{hasPhysicalUnit ? copy.progress.title : copy.progress.digitalTitle}</h2>
        {!hasPhysicalUnit ? (
          <p className="rf-progress-note">{copy.progress.digitalBody}</p>
        ) : null}
      </div>
      <div className="rf-owner-progress__items">
        {items.map(([label, complete]) => (
          <span className={complete ? "is-done" : ""} key={label}>
            <CheckCircle size={16} />
            {label}
          </span>
        ))}
      </div>
      <Button
        disabled={!hasPhysicalUnit}
        icon={Rocket}
        onClick={onCompleteFirstDrive}
        variant="secondary"
      >
        {copy.progress.action}
      </Button>
    </section>
  );
}

function GarageNextStep({
  copy,
  hasPhysicalUnit,
  onPaidOffer,
  onScreen,
  progress,
}: {
  copy: OwnerCopy;
  hasPhysicalUnit: boolean;
  onPaidOffer: () => void;
  onScreen: (screen: ConsoleScreen) => void;
  progress: OwnerProgress;
}) {
  const nextStep = !hasPhysicalUnit
    ? {
        ...copy.nextStep.claim,
        icon: ShoppingBag,
        onClick: onPaidOffer,
      }
    : progress.first_connection_complete
    ? progress.first_drive_complete
      ? {
          ...copy.nextStep.missions,
          icon: Rocket,
          onClick: () => onScreen("missions"),
        }
      : {
          ...copy.nextStep.cockpit,
          icon: Gamepad2,
          onClick: () => onScreen("cockpit"),
        }
    : {
        ...copy.nextStep.connect,
        icon: RadioTower,
        onClick: () => onScreen("connect"),
      };
  const Icon = nextStep.icon;

  return (
    <section aria-label={copy.nextStep.aria} className="rf-next-step">
      <div>
        <span className="eyebrow">
          <Rocket size={15} /> {copy.nextStep.eyebrow}
        </span>
        <h2>{nextStep.title}</h2>
        <p>{nextStep.body}</p>
      </div>
      <div className="rf-next-step__path" aria-label={copy.nextStep.path.aria}>
        <span className="is-done">
          <LockKeyhole size={16} /> {copy.nextStep.path.garage}
        </span>
        <span className={hasPhysicalUnit && progress.first_connection_complete ? "is-done" : ""}>
          <Wifi size={16} /> {copy.nextStep.path.connect}
        </span>
        <span className={progress.first_drive_complete ? "is-done" : ""}>
          <Gamepad2 size={16} /> {copy.nextStep.path.cockpit}
        </span>
      </div>
      <Button icon={Icon} onClick={nextStep.onClick}>
        {nextStep.action}
      </Button>
    </section>
  );
}

function ClaimRobotPanel({
  copy,
  disabled,
  onClaim,
}: {
  copy: OwnerCopy;
  disabled?: boolean;
  onClaim: (claimCode: string) => void;
}) {
  const [claimCode, setClaimCode] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onClaim(claimCode);
  }

  return (
    <section aria-label={copy.claim.aria} className="rf-claim-panel">
      <div className="rf-claim-panel__copy">
        <span className="eyebrow">
          <QrCode size={15} /> {copy.claim.eyebrow}
        </span>
        <h2>{copy.claim.title}</h2>
        <p>{copy.claim.body}</p>
      </div>
      <form className="rf-claim-form" onSubmit={submit}>
        <label>
          {copy.claim.label}
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
          {copy.claim.action}
        </Button>
      </form>
    </section>
  );
}

const paidOfferIcons = [Bot, RadioTower, Home] as const;

function PaidOfferPanel({
  copy,
  onApply,
}: {
  copy: OwnerCopy;
  onApply: () => void;
}) {
  return (
    <section className="rf-paid-offer">
      <div className="rf-paid-offer__copy">
        <span className="eyebrow">
          <ShoppingBag size={15} /> {copy.paidOffer.eyebrow}
        </span>
        <h2>{copy.paidOffer.title}</h2>
        <p>{copy.paidOffer.body}</p>
      </div>
      <div className="rf-paid-offer__items">
        {copy.paidOffer.items.map((item, index) => {
          const Icon = paidOfferIcons[index] ?? ShieldCheck;

          return (
            <span key={item}>
              <Icon size={17} />
              {item}
            </span>
          );
        })}
      </div>
      <div className="rf-paid-offer__action">
        <small>{copy.paidOffer.note}</small>
        <Button icon={Send} onClick={onApply}>
          {copy.paidOffer.action}
        </Button>
      </div>
    </section>
  );
}

type ModuleSlotStatus = "installed" | "pending" | "planned" | "locked";

const hardwareProfileIcons = [
  CircuitBoard,
  Wrench,
  BatteryCharging,
  RadioTower,
  Clipboard,
  ShieldCheck,
] as const;
const moduleSlotIcons = [
  CircuitBoard,
  Wrench,
  BatteryCharging,
  Gauge,
  RadioTower,
] as const;

function formatHardwareValue(value: string | null | undefined) {
  return value?.trim().replaceAll("_", " ") || null;
}

function hasHardwareFlag(device: RobotDevice | null, key: string) {
  return device?.hardware_profile?.[key] === true;
}

function moduleStatusLabel(copy: OwnerCopy, status: ModuleSlotStatus) {
  if (status === "installed") return copy.modular.slots.installed;
  if (status === "planned") return copy.modular.slots.planned;
  if (status === "locked") return copy.modular.slots.locked;
  return copy.modular.slots.empty;
}

function getModularProfile(device: RobotDevice | null) {
  const motorChannels = formatHardwareValue(
    recordText(device?.hardware_profile, "motorChannels"),
  );
  const board = deviceHardwareName(device, "board", "ESP32 Rover-01 demo");
  const motorDriver = deviceHardwareName(
    device,
    "motorDriver",
    "Differential drive demo",
  );
  const power = deviceHardwareName(device, "battery", "2S Li-ion candidate");
  const firmware = `${device?.firmware_version ?? demoTelemetry.firmwareVersion} / ${
    device?.protocol_version ?? "v1"
  }`;
  const communication = device?.ap_ssid ?? "RoboForge local Wi-Fi";

  return {
    board,
    communication,
    firmware,
    motion: motorChannels ? `${motorDriver} / ${motorChannels}` : motorDriver,
    power,
    readiness: formatReadinessStatus(device?.readiness_status),
  };
}

function HardwareProfilePanel({
  copy,
  device,
  robotCode,
}: {
  copy: OwnerCopy;
  device: RobotDevice | null;
  robotCode: string;
}) {
  const profile = getModularProfile(device);
  const profileSource = device
    ? copy.modular.hardware.sourceProfile
    : copy.modular.hardware.sourceDemo;
  const safetyDetail =
    device && hasHardwareFlag(device, "hasPowerSwitch") && hasHardwareFlag(device, "hasFuse")
      ? copy.modular.hardware.safetyReady
      : copy.modular.hardware.safetyPending;
  const rows = [
    {
      detail: profileSource,
      label: copy.modular.hardware.rows.brain,
      value: profile.board,
    },
    {
      detail: profileSource,
      label: copy.modular.hardware.rows.motion,
      value: profile.motion,
    },
    {
      detail: device ? safetyDetail : profileSource,
      label: copy.modular.hardware.rows.power,
      value: profile.power,
    },
    {
      detail: profileSource,
      label: copy.modular.hardware.rows.comms,
      value: profile.communication,
    },
    {
      detail: profileSource,
      label: copy.modular.hardware.rows.firmware,
      value: profile.firmware,
    },
    {
      detail: device ? profileSource : copy.modular.hardware.empty,
      label: copy.modular.hardware.rows.readiness,
      value: profile.readiness,
    },
  ];

  return (
    <article className="rf-modular-card rf-hardware-profile-panel">
      <span className="eyebrow">{copy.modular.hardware.title}</span>
      <p>{copy.modular.hardware.body}</p>
      <div className="rf-profile-matrix">
        {rows.map((row, index) => {
          const Icon = hardwareProfileIcons[index] ?? CircuitBoard;

          return (
            <div className="rf-profile-row" key={row.label}>
              <span>
                <Icon size={18} />
              </span>
              <p>
                <small>{row.label}</small>
                <strong>{row.value}</strong>
                <em>{row.detail}</em>
              </p>
            </div>
          );
        })}
      </div>
      <small className="rf-blueprint-id">{robotCode.toUpperCase()}</small>
    </article>
  );
}

function ModuleSlotsPanel({
  copy,
  device,
}: {
  copy: OwnerCopy;
  device: RobotDevice | null;
}) {
  const profile = getModularProfile(device);
  const hasPhysicalUnit = Boolean(device);
  const slots: Array<{
    detail: string;
    label: string;
    status: ModuleSlotStatus;
    value: string;
  }> = [
    {
      detail: hasPhysicalUnit ? profile.board : copy.modular.slots.waiting,
      label: copy.modular.slots.items.brain,
      status: hasPhysicalUnit ? "installed" : "pending",
      value: profile.board,
    },
    {
      detail: hasPhysicalUnit ? profile.motion : copy.modular.slots.waiting,
      label: copy.modular.slots.items.drive,
      status: hasPhysicalUnit ? "installed" : "pending",
      value: profile.motion,
    },
    {
      detail: hasPhysicalUnit ? profile.power : copy.modular.slots.waiting,
      label: copy.modular.slots.items.power,
      status: hasPhysicalUnit ? "installed" : "pending",
      value: profile.power,
    },
    {
      detail: copy.modular.blueprint.marketplace,
      label: copy.modular.slots.items.senses,
      status: "planned",
      value: copy.modular.slots.planned,
    },
    {
      detail: profile.communication,
      label: copy.modular.slots.items.comms,
      status: hasPhysicalUnit ? "installed" : "pending",
      value: profile.communication,
    },
  ];

  return (
    <article className="rf-modular-card">
      <span className="eyebrow">{copy.modular.slots.title}</span>
      <p>{copy.modular.slots.body}</p>
      <div className="rf-module-slots">
        {slots.map((slot, index) => {
          const Icon = moduleSlotIcons[index] ?? CircuitBoard;

          return (
            <div className={`rf-module-slot is-${slot.status}`} key={slot.label}>
              <span>
                <Icon size={18} />
              </span>
              <p>
                <small>{slot.label}</small>
                <strong>{slot.value}</strong>
                <em>{slot.detail}</em>
              </p>
              <b>{moduleStatusLabel(copy, slot.status)}</b>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function BlueprintPanel({
  copy,
  device,
  robotCode,
}: {
  copy: OwnerCopy;
  device: RobotDevice | null;
  robotCode: string;
}) {
  const profile = getModularProfile(device);
  const blueprintId = `rf.blueprint.${robotCode
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.v0`;
  const blueprintRows = [
    [copy.modular.hardware.rows.brain, profile.board],
    [copy.modular.hardware.rows.motion, profile.motion],
    [copy.modular.hardware.rows.power, profile.power],
    [copy.modular.hardware.rows.comms, profile.communication],
  ] as const;

  return (
    <article className="rf-modular-card rf-blueprint-card">
      <span className="eyebrow">{copy.modular.blueprint.title}</span>
      <p>{copy.modular.blueprint.body}</p>
      <div className="rf-blueprint-header">
        <span>
          <Clipboard size={20} />
          <small>{copy.modular.blueprint.idLabel}</small>
          <strong>{blueprintId}</strong>
        </span>
        <b>{copy.modular.blueprint.action}</b>
      </div>
      <div className="rf-blueprint-lines">
        {blueprintRows.map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </span>
        ))}
      </div>
      <div className="rf-blueprint-state">
        <span>{copy.modular.blueprint.format}</span>
        <span>{copy.modular.blueprint.clone}</span>
        <span>{copy.modular.blueprint.shareState}</span>
      </div>
      <small className="rf-blueprint-safety">{copy.modular.blueprint.safety}</small>
    </article>
  );
}

function ModularRoboticsPanel({
  copy,
  device,
  robotCode,
}: {
  copy: OwnerCopy;
  device: RobotDevice | null;
  robotCode: string;
}) {
  return (
    <section aria-label={copy.modular.aria} className="rf-modular-panel">
      <div className="rf-section-title">
        <span className="eyebrow">
          <CircuitBoard size={15} /> {copy.modular.eyebrow}
        </span>
        <h2>{copy.modular.title}</h2>
        <p>{copy.modular.body}</p>
      </div>
      <div className="rf-modular-grid">
        <HardwareProfilePanel copy={copy} device={device} robotCode={robotCode} />
        <ModuleSlotsPanel copy={copy} device={device} />
        <BlueprintPanel copy={copy} device={device} robotCode={robotCode} />
      </div>
    </section>
  );
}

function Garage({
  copy,
  device,
  isPending,
  onPaidOffer,
  onClaimRobot,
  onProgress,
  onScreen,
  progress,
  robotCode,
  theme,
}: {
  copy: OwnerCopy;
  device: RobotDevice | null;
  isPending?: boolean;
  onPaidOffer: () => void;
  onClaimRobot: (claimCode: string) => void;
  onProgress: (progress: OwnerProgress) => void;
  onScreen: (screen: ConsoleScreen) => void;
  progress: OwnerProgress;
  robotCode: string;
  theme: ThemeId;
}) {
  const [selectedFleet, setSelectedFleet] = useState("rover");
  const selectedTheme = themes[theme];
  const hasPhysicalUnit = Boolean(device);

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
            <Home size={15} /> {copy.garage.eyebrow}
          </span>
          <h1>{copy.garage.title}</h1>
          <p>{copy.garage.body}</p>
        </div>
        <StatusPill />
      </section>
      <GarageNextStep
        copy={copy}
        hasPhysicalUnit={hasPhysicalUnit}
        onPaidOffer={onPaidOffer}
        onScreen={onScreen}
        progress={progress}
      />
      <PaidOfferPanel copy={copy} onApply={onPaidOffer} />
      <FleetRail selected={selectedFleet} setSelected={setSelectedFleet} />
      <ClaimRobotPanel copy={copy} disabled={isPending} onClaim={onClaimRobot} />
      {selectedFleet === "rover" ? (
        <section className="rf-garage-feature">
          <RobotHero theme={theme} />
          <div className="rf-garage-feature__info">
            <span className="rf-unit-label">
              {copy.garage.activeUnit} / {robotCode.toUpperCase()}
            </span>
            <h2>{selectedTheme.robotName}</h2>
            <p className="rf-class-label">
              {selectedTheme.robotClass} · {copy.garage.driveLabel}
            </p>
            <TelemetryGrid />
            <TruthStrip copy={copy} device={device} robotCode={robotCode} />
            <div className="rf-button-row">
              <Button
                disabled={!hasPhysicalUnit}
                icon={RadioTower}
                onClick={() => onScreen("connect")}
              >
                {copy.garage.actions.connect}
              </Button>
              <Button icon={Gamepad2} onClick={() => onScreen("cockpit")}>
                {copy.garage.actions.cockpit}
              </Button>
              <Button
                icon={Settings2}
                onClick={() => onScreen("profile")}
                variant="secondary"
              >
                {copy.garage.actions.profile}
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rf-future-unit">
          <span className="rf-future-unit__icon">
            <Bot size={76} />
          </span>
          <span className="eyebrow">{copy.garage.future.eyebrow}</span>
          <h2>
            {selectedFleet.toUpperCase()} {copy.garage.future.unitSuffix}
          </h2>
          <p>{copy.garage.future.body}</p>
          <span className="rf-concept-badge">{copy.garage.future.badge}</span>
        </section>
      )}
      <ModularRoboticsPanel copy={copy} device={device} robotCode={robotCode} />
      <ProgressPanel
        copy={copy}
        hasPhysicalUnit={hasPhysicalUnit}
        onCompleteFirstDrive={completeFirstDrive}
        progress={progress}
      />
    </main>
  );
}

function ConnectionQuest({
  connectionSessionId,
  copy,
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
  copy: OwnerCopy;
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
  const localCockpitReady =
    Boolean(connectionSessionId) || progress.first_connection_complete;
  const connectionSteps = [
    {
      detail: copy.connection.steps.power.detail,
      done: true,
      icon: BatteryCharging,
      label: copy.connection.steps.power.label,
    },
    {
      detail: copy.connection.steps.join.detail(robotSsid),
      done: Boolean(connectionSessionId),
      icon: Wifi,
      label: copy.connection.steps.join.label,
    },
    {
      detail: copy.connection.steps.open.detail(localCockpitUrl),
      done: localCockpitReady,
      icon: ExternalLink,
      label: copy.connection.steps.open.label,
    },
    {
      detail: copy.connection.steps.confirm.detail,
      done: progress.first_connection_complete,
      icon: CheckCircle,
      label: copy.connection.steps.confirm.label,
    },
  ];

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
            <RadioTower size={15} /> {copy.connection.eyebrow}
          </span>
          <h1>{copy.connection.title}</h1>
          <p>{copy.connection.body}</p>
        </div>
        <StatusPill />
      </section>
      <section className="rf-quest-layout">
        <article className="rf-quest-card">
          <span className="eyebrow">{copy.connection.navigator}</span>
          <h2>{copy.connection.checklistTitle}</h2>
          <div
            className="rf-connection-guide"
            aria-label={copy.connection.aria.steps}
          >
            {connectionSteps.map((step, index) => {
              const StepIcon = step.icon;

              return (
                <span className={step.done ? "is-done" : ""} key={step.label}>
                  <i>{String(index + 1).padStart(2, "0")}</i>
                  <StepIcon size={18} />
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </span>
              );
            })}
          </div>
          <ol>
            <li className="is-done">{copy.connection.orderedSteps.power}</li>
            <li className={connectionSessionId ? "is-done" : ""}>
              {copy.connection.orderedSteps.start}
            </li>
            <li>
              {copy.connection.orderedSteps.join} <code>{robotSsid}</code>
            </li>
            <li>
              {copy.connection.orderedSteps.open} <code>{localCockpitUrl}</code>
            </li>
            <li className={progress.first_connection_complete ? "is-done" : ""}>
              {copy.connection.orderedSteps.confirm}
            </li>
          </ol>
          <div
            aria-label={copy.connection.aria.details}
            className="rf-connection-details"
          >
            <div>
              <span>
                <Wifi size={17} /> {copy.connection.details.wifiName}
              </span>
              <strong>{robotSsid}</strong>
              <button
                onClick={() => void copyConnectionValue(robotSsid, "ssid")}
                type="button"
              >
                <Clipboard size={16} />
                {copied === "ssid"
                  ? copy.connection.actions.copied
                  : copy.connection.actions.copy}
              </button>
            </div>
            <div>
              <span>
                <Radio size={17} /> {copy.connection.details.localPage}
              </span>
              <strong>{localCockpitUrl}</strong>
              <button
                onClick={() => void copyConnectionValue(localCockpitUrl, "url")}
                type="button"
              >
                <Clipboard size={16} />
                {copied === "url"
                  ? copy.connection.actions.copied
                  : copy.connection.actions.copy}
              </button>
            </div>
          </div>
          <div className="rf-button-row">
            <Button
              disabled={Boolean(connectionSessionId) || isPending}
              icon={RadioTower}
              onClick={onStart}
            >
              {copy.connection.actions.start}
            </Button>
            <Link
              aria-disabled={!localCockpitReady}
              className={`button rf-button rf-button--secondary ${
                localCockpitReady ? "" : "is-disabled"
              }`}
              href={localCockpitUrl}
              onClick={(event) => {
                if (!localCockpitReady) event.preventDefault();
              }}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={18} />
              <span>{copy.connection.actions.openLocal}</span>
            </Link>
          </div>
        </article>
        <article className="rf-quest-card rf-quest-card--actions">
          <span className="eyebrow">{copy.connection.resultEyebrow}</span>
          <h2>{copy.connection.resultTitle}</h2>
          <p>{copy.connection.resultBody}</p>
          <div className="rf-button-row">
            <Button
              disabled={!connectionSessionId || isPending}
              icon={CheckCircle}
              onClick={() => connectionSessionId && onSuccess(connectionSessionId)}
            >
              {copy.connection.actions.found}
            </Button>
            <Button
              disabled={!connectionSessionId || isPending}
              icon={Wrench}
              onClick={() =>
                connectionSessionId && onFail(connectionSessionId, failureReason)
              }
              variant="secondary"
            >
              {copy.connection.actions.stuck}
            </Button>
          </div>
          <label className="rf-select-label">
            {copy.connection.feedback.problemLabel}
            <select
              onChange={(event) => setFailureReason(event.target.value)}
              value={failureReason}
            >
              <option value="wifi_not_found">
                {copy.connection.problemOptions.wifi_not_found}
              </option>
              <option value="cannot_open_local_page">
                {copy.connection.problemOptions.cannot_open_local_page}
              </option>
              <option value="no_telemetry">
                {copy.connection.problemOptions.no_telemetry}
              </option>
              <option value="safety_unclear">
                {copy.connection.problemOptions.safety_unclear}
              </option>
              <option value="not_sure">
                {copy.connection.problemOptions.not_sure}
              </option>
            </select>
          </label>
          <form className="rf-feedback-form" onSubmit={submitFeedback}>
            <label>
              {copy.connection.feedback.label}
              <textarea
                onChange={(event) => setFeedback(event.target.value)}
                placeholder={copy.connection.feedback.placeholder}
                required
                value={feedback}
              />
            </label>
            <Button disabled={isPending} icon={Send} type="submit" variant="quiet">
              {copy.connection.actions.send}
            </Button>
          </form>
          <Button icon={Gamepad2} onClick={() => onScreen("cockpit")} variant="quiet">
            {copy.connection.actions.continueCockpit}
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

function recordText(
  record: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function recordNumber(
  record: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatReadinessStatus(status: string | null | undefined) {
  return (status ?? "needs_details").replaceAll("_", " ");
}

function deviceBatteryName(device: RobotDevice | null) {
  const profile = device?.hardware_profile;
  const battery = device?.battery_config;
  const chemistry =
    recordText(profile, "batteryChemistry") ?? recordText(battery, "chemistry");
  const cells = recordNumber(profile, "batteryCells") ?? recordNumber(battery, "cells");

  if (chemistry && cells) return `${chemistry} ${cells}S`;
  if (chemistry) return chemistry;
  if (cells) return `${cells}S battery`;
  return null;
}

function deviceHardwareName(
  device: RobotDevice | null,
  key: "board" | "battery" | "motorDriver" | "wiring",
  fallback: string,
) {
  if (!device) return fallback;

  const profile = device.hardware_profile;

  if (key === "board") {
    return recordText(profile, "boardModel") ?? device.board_type ?? fallback;
  }

  if (key === "battery") {
    return deviceBatteryName(device) ?? fallback;
  }

  if (key === "motorDriver") {
    return recordText(profile, "motorDriver") ?? fallback;
  }

  return recordText(profile, "wiringStatus") ?? fallback;
}

const codexIcons = [CircuitBoard, Wrench, BatteryCharging, ShieldCheck] as const;
const hardwarePartKeys = ["board", "motorDriver", "battery", "wiring"] as const;
const hotspotPositions = [
  { left: "49%", top: "39%" },
  { left: "54%", top: "58%" },
  { left: "40%", top: "70%" },
  { left: "66%", top: "75%" },
] as const;

function RoverPartMap({
  copy,
  device,
  theme,
}: {
  copy: OwnerCopy;
  device: RobotDevice | null;
  theme: ThemeId;
}) {
  const selectedTheme = themes[theme];

  return (
    <div className="rf-part-map">
      <div>
        <span className="eyebrow">{copy.engineer.map.title}</span>
        <p>{copy.engineer.map.body}</p>
      </div>
      <div className="rf-part-map__visual">
        <Image
          alt={`${selectedTheme.robotName} hardware learning map`}
          fill
          sizes="(min-width: 900px) 48vw, 100vw"
          src={selectedTheme.image}
          unoptimized
        />
        {copy.engineer.hardware.parts.map((part, index) => {
          const learnedName = deviceHardwareName(
            device,
            hardwarePartKeys[index] ?? "board",
            part.name,
          );

          return (
            <a
              aria-label={`${part.label}: ${learnedName}`}
              className="rf-part-hotspot"
              href={`#${part.id}`}
              key={part.id}
              style={hotspotPositions[index]}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{part.label}</strong>
              <small>{learnedName}</small>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function Engineer({
  copy,
  device,
  theme,
}: {
  copy: OwnerCopy;
  device: RobotDevice | null;
  theme: ThemeId;
}) {
  const [selected, setSelected] = useState(0);
  const script =
    copy.engineer.support.scripts[selected] ?? copy.engineer.support.scripts[0];

  return (
    <main className="rf-screen">
      <section className="rf-screen-heading">
        <div>
          <span className="eyebrow">
            <CircuitBoard size={15} /> {copy.engineer.eyebrow}
          </span>
          <h1>{copy.engineer.title}</h1>
          <p>{copy.engineer.body}</p>
        </div>
      </section>

      <section className="rf-engineer-layout rf-engineer-layout--learning">
        <article className="rf-codex-panel">
          <span className="eyebrow">{copy.engineer.hardware.title}</span>
          <p>{copy.engineer.hardware.body}</p>
          <RoverPartMap copy={copy} device={device} theme={theme} />
          <nav className="rf-learning-map" aria-label={copy.engineer.hardware.title}>
            {copy.engineer.hardware.parts.map((part) => (
              <a href={`#${part.id}`} key={part.id}>
                {part.label}
              </a>
            ))}
          </nav>
          <div className="rf-hardware-codex">
            {copy.engineer.hardware.parts.map((part, index) => {
              const Icon = codexIcons[index] ?? CircuitBoard;
              const learnedName = deviceHardwareName(
                device,
                hardwarePartKeys[index] ?? "board",
                part.name,
              );

              return (
                <div id={part.id} key={part.id}>
                  <Icon size={24} />
                  <span>{part.label}</span>
                  <h2>{learnedName}</h2>
                  <p>{part.detail}</p>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rf-firmware-lab">
          <span className="eyebrow">{copy.engineer.firmware.title}</span>
          <h2>{copy.engineer.firmware.body}</h2>
          <div className="rf-firmware-version">
            <span>{copy.engineer.firmware.current}</span>
            <strong>{device?.firmware_version ?? demoTelemetry.firmwareVersion}</strong>
            <small>
              {copy.engineer.firmware.protocol}:{" "}
              {device?.protocol_version ?? "v1"} / {copy.engineer.firmware.readiness}:{" "}
              {formatReadinessStatus(device?.readiness_status)}
            </small>
            <small>
              {device?.ap_ssid
                ? `${copy.engineer.firmware.ssid}: ${device.ap_ssid}`
                : copy.engineer.firmware.demoSource}
            </small>
            <small>{copy.engineer.firmware.compatibility}</small>
          </div>
          <ol>
            {copy.engineer.firmware.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="rf-safety-note">
            <ShieldCheck size={21} /> {copy.engineer.firmware.safety}
          </div>
        </article>
      </section>

      <section className="rf-engineer-layout">
        <div className="rf-engineer-prompts">
          {copy.engineer.support.scripts.map((item, index) => (
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
          <span className="eyebrow">{copy.engineer.support.title}</span>
          <h2>{script.title}</h2>
          <p>{script.body}</p>
          <div className="rf-safety-note">
            <ShieldCheck size={21} /> {copy.engineer.support.safety}
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
        <Button icon={Send} onClick={() => onBeta(firstPaidOfferInterest)}>
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
        <span className="eyebrow">PAID PILOT APPLICATION</span>
        <h2>Rover-01 Beta Kit + guided setup workshop</h2>
        <p>
          Tell us what you want to build. We will invite the first small paid
          batch after the hardware proof gates are clear.
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
          <small>Limited guided beta. Final price follows hardware validation.</small>
        </form>
      </section>
    </div>
  );
}

function BottomNav({
  copy,
  screen,
  setScreen,
}: {
  copy: OwnerCopy;
  screen: ConsoleScreen;
  setScreen: (screen: ConsoleScreen) => void;
}) {
  const items: Array<[ConsoleScreen, string, React.ComponentType<{ size?: number }>]> = [
    ["garage", copy.nav.garage, Home],
    ["cockpit", copy.nav.cockpit, Gamepad2],
    ["missions", copy.nav.missions, Rocket],
    ["engineer", copy.nav.engineer, CircuitBoard],
    ["store", copy.nav.store, ShoppingBag],
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

export function OwnerConsole({
  initialClaimCode,
  locale = "en",
  workspace,
}: OwnerConsoleProps) {
  const copy = ownerCopy[locale];
  const router = useRouter();
  const activeRobot = workspace.robots[0];
  const autoClaimedCode = useRef<string | null>(null);
  const dashboardHref = locale === "th" ? "/dashboard?lang=th" : "/dashboard";
  const initialTheme = safeTheme(activeRobot?.theme);
  const [screen, setScreen] = useState<ConsoleScreen>("garage");
  const [theme, setTheme] = useState<ThemeId>(initialTheme);
  const [progress, setProgress] = useState<OwnerProgress>(
    workspace.progress ?? defaultProgress,
  );
  const [betaInterest, setBetaInterest] =
    useState<UpgradeInterest>(firstPaidOfferInterest);
  const [betaOpen, setBetaOpen] = useState(false);
  const [connectionSessionId, setConnectionSessionId] = useState<string | null>(null);
  const [controlSessionId, setControlSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const robotCode = activeRobot?.unit_code ?? "ROVER-01";
  const activeDevice =
    workspace.devices.find((device) => device.robot_id === activeRobot?.id) ?? null;
  const ownerName = workspace.profile?.display_name ?? copy.topbar.defaultOwner;
  const savedInterestCount = workspace.interests.length;

  const statusMessage = useMemo(() => {
    if (isPending) return copy.messages.saving;
    return message;
  }, [copy.messages.saving, isPending, message]);

  function persistTheme(nextTheme: ThemeId) {
    setTheme(nextTheme);
    setMessage("");
    startTransition(() => {
      void updateRobotTheme(nextTheme).then((result) => {
        setMessage(result.ok ? copy.messages.themeSaved : result.error ?? "");
      });
    });
  }

  function persistProgress(nextProgress: OwnerProgress) {
    setProgress(nextProgress);
    setMessage("");
    startTransition(() => {
      void updateRobotProgress(nextProgress).then((result) => {
        setMessage(result.ok ? copy.messages.progressSaved : result.error ?? "");
      });
    });
  }

  function persistInterest(interest: UpgradeInterest) {
    setMessage("");
    startTransition(() => {
      void saveRobotInterest(interest).then((result) => {
        setMessage(
          result.ok
            ? copy.messages.interestSaved(interest)
            : result.error ?? copy.messages.interestError,
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
          setMessage(copy.messages.betaSaved);
        } else {
          setMessage(result.error ?? copy.messages.betaError);
        }
      });
    });
  }

  const finishClaim = useCallback(
    (result: { error: string | null; ok: boolean }) => {
      if (result.ok) {
        setMessage(copy.messages.robotClaimed);
        router.replace(dashboardHref);
        router.refresh();
      } else {
        setMessage(result.error ?? copy.messages.claimError);
      }
    },
    [
      copy.messages.claimError,
      copy.messages.robotClaimed,
      dashboardHref,
      router,
    ],
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
    setMessage(copy.messages.claimingFromQr);
    startTransition(() => {
      void claimRobotByCode(claimCode).then(finishClaim);
    });
  }, [copy.messages.claimingFromQr, finishClaim, initialClaimCode]);

  function startConnectionQuest() {
    setMessage("");
    startTransition(() => {
      void startConnectionSession().then((result) => {
        if (result.ok && result.id) {
          setConnectionSessionId(result.id);
          setMessage(copy.messages.connectionStarted);
        } else {
          setMessage(result.error ?? copy.messages.connectionStartError);
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
          setMessage(copy.messages.connectionSaved);
          router.refresh();
        } else {
          setMessage(result.error ?? copy.messages.connectionSaveError);
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
          setMessage(copy.messages.connectionIssueSaved);
        } else {
          setMessage(result.error ?? copy.messages.connectionIssueError);
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
          result.ok ? copy.messages.feedbackSaved : result.error ?? copy.messages.feedbackError,
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
          setMessage(copy.messages.controlStarted);
        } else {
          setMessage(result.error ?? copy.messages.controlStartError);
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
      setMessage(copy.messages.controlLocal);
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
          setMessage(copy.messages.controlSaved);
        } else {
          setMessage(result.error ?? copy.messages.controlSaveError);
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
            <small>{copy.topbar.brandSub}</small>
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
          <Link className="rf-sign-out" href="/admin" title={copy.topbar.adminTitle}>
            <ShieldCheck size={18} />
          </Link>
          <Link className="rf-sign-out" href="/dashboard/settings" title="Profile settings">
            <Settings2 size={18} />
          </Link>
          <Link
            className="rf-sign-out"
            href="/auth/sign-out"
            title={copy.topbar.signOutTitle}
          >
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
          {copy.topbar.back}
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
          {savedInterestCount}{" "}
          {savedInterestCount === 1
            ? copy.topbar.savedInterestSingular
            : copy.topbar.savedInterestPlural}
        </div>
      ) : null}
      {screen === "garage" ? (
        <Garage
          copy={copy}
          device={activeDevice}
          isPending={isPending}
          onClaimRobot={claimRobot}
          onPaidOffer={() => openBeta(firstPaidOfferInterest)}
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
          copy={copy}
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
      {screen === "engineer" ? (
        <Engineer copy={copy} device={activeDevice} theme={theme} />
      ) : null}
      {screen === "store" ? (
        <Store onBeta={openBeta} onInterest={persistInterest} />
      ) : null}
      <BottomNav copy={copy} screen={screen} setScreen={setScreen} />
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
