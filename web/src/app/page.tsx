import {
  ArrowRight,
  Bot,
  CircuitBoard,
  Gamepad2,
  Globe2,
  LockKeyhole,
  QrCode,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fleet, themes } from "@/lib/roboforge-data";

type HomeProps = {
  searchParams: Promise<{
    code?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
    lang?: string | string[];
    next?: string | string[];
  }>;
};

type HomeLocale = "en" | "th";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function homeLocale(value: string | string[] | undefined): HomeLocale {
  return firstParam(value)?.toLowerCase() === "th" ? "th" : "en";
}

const entryIcons = [LockKeyhole, QrCode, Gamepad2] as const;

const homeCopy = {
  en: {
    cta: {
      demo: "Try hosted demo",
      garage: "Enter Web Garage",
      login: "Login",
      webGarage: "Web Garage",
    },
    entry: {
      eyebrow: "START PATH",
      title: "One website first. Local robot control only when a unit is ready.",
      steps: [
        {
          body:
            "Use one account for Garage, beta sign-up, robot ownership, progress, and support.",
          label: "01 Web Garage",
          title: "Start here",
        },
        {
          body:
            "When a beta kit arrives, claim the QR code and let Lyra guide the Wi-Fi setup.",
          label: "02 Claim + connect",
          title: "Add the physical unit",
        },
        {
          body:
            "Live joystick commands stay on the robot Wi-Fi page; RoboForge Web saves outcomes.",
          label: "03 Local Cockpit",
          title: "Drive only after connection",
        },
      ],
    },
    fleet: {
      cta: "Create an owner account",
      eyebrow: "FLEET GARAGE",
      state: {
        active: "LIVE MVP",
        coming: "coming",
        concept: "concept",
      },
      title: "Start with one rover. Keep the system ready for many owners.",
    },
    hero: {
      body:
        "The Web Garage is the main door: create an owner account, claim a beta kit, follow Connection Quest, then open the robot local Cockpit when real hardware is ready.",
      eyebrow: "ROBOT IDENTITY PLATFORM",
      headline: "YOUR ROBOT.",
      headlineAccent: "EVOLVED.",
      signals: ["One web entry", "Owner accounts", "Local robot control"],
    },
    nav: {
      brandSub: "OWNER PLATFORM",
    },
    unit: {
      active: "ACTIVE UNIT",
    },
  },
  th: {
    cta: {
      demo: "ลองเดโมบนเว็บ",
      garage: "เข้า Web Garage",
      login: "เข้าสู่ระบบ",
      webGarage: "Web Garage",
    },
    entry: {
      eyebrow: "เส้นทางเริ่มต้น",
      title: "เริ่มจากเว็บเดียว แล้วค่อยควบคุมหุ่นเมื่อเครื่องจริงพร้อม",
      steps: [
        {
          body:
            "ใช้บัญชีเดียวสำหรับโรงรถดิจิทัล สมัครเบต้า ความเป็นเจ้าของ ความคืบหน้า และซัพพอร์ต",
          label: "01 Web Garage",
          title: "เริ่มตรงนี้",
        },
        {
          body:
            "เมื่อได้คิตเบต้า สแกน QR เพื่อ claim แล้วให้ Lyra พาเชื่อมต่อ Wi-Fi ของหุ่นทีละขั้น",
          label: "02 Claim + connect",
          title: "เพิ่มเครื่องจริง",
        },
        {
          body:
            "คำสั่ง joystick จริงอยู่บนหน้า Wi-Fi ของหุ่น ส่วน RoboForge Web เก็บผลลัพธ์และความคืบหน้า",
          label: "03 Local Cockpit",
          title: "ขับเมื่อเชื่อมต่อแล้ว",
        },
      ],
    },
    fleet: {
      cta: "สร้างบัญชีเจ้าของ",
      eyebrow: "โรงรถหุ่นยนต์",
      state: {
        active: "MVP ใช้งานได้",
        coming: "กำลังมา",
        concept: "แนวคิด",
      },
      title: "เริ่มจาก rover หนึ่งตัว แล้วเตรียมระบบไว้รองรับเจ้าของหลายคน",
    },
    hero: {
      body:
        "Web Garage คือประตูหลัก: สร้างบัญชีเจ้าของ claim คิตเบต้า ทำตาม Connection Quest แล้วเปิด Cockpit ของหุ่นเมื่อ hardware จริงพร้อม",
      eyebrow: "แพลตฟอร์มตัวตนหุ่นยนต์",
      headline: "หุ่นของคุณ.",
      headlineAccent: "พัฒนาได้.",
      signals: ["เข้าเว็บเดียว", "บัญชีเจ้าของ", "คุมหุ่นผ่าน Wi-Fi"],
    },
    nav: {
      brandSub: "OWNER PLATFORM",
    },
    unit: {
      active: "เครื่องหลัก",
    },
  },
} as const;

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const code = firstParam(params.code);
  const error = firstParam(params.error);
  const errorDescription = firstParam(params.error_description);
  const locale = homeLocale(params.lang);
  const next = firstParam(params.next);
  const copy = homeCopy[locale];

  if (code) {
    const callbackParams = new URLSearchParams({ code });
    if (next?.startsWith("/") && !next.startsWith("//")) {
      callbackParams.set("next", next);
    }
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  if (error || errorDescription) {
    const loginParams = new URLSearchParams();
    if (error) loginParams.set("error", error);
    if (errorDescription) loginParams.set("error_description", errorDescription);
    redirect(`/login?${loginParams.toString()}`);
  }

  return (
    <main className="marketing-shell">
      <nav className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <CircuitBoard size={21} />
          </span>
          <span>
            <strong>ROBOFORGE</strong>
            <small>{copy.nav.brandSub}</small>
          </span>
        </Link>
        <div className="topbar-actions">
          <div aria-label="Language" className="language-toggle">
            <Link className={locale === "en" ? "is-active" : ""} href="/">
              EN
            </Link>
            <span>|</span>
            <Link className={locale === "th" ? "is-active" : ""} href="/?lang=th">
              TH
            </Link>
          </div>
          <Link className="quiet-link" href="/login">
            {copy.cta.login}
          </Link>
          <Link className="button button-small" href="/dashboard">
            {copy.cta.webGarage}
          </Link>
        </div>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={15} /> {copy.hero.eyebrow}
          </span>
          <h1>
            {copy.hero.headline}
            <br />
            <span>{copy.hero.headlineAccent}</span>
          </h1>
          <p>{copy.hero.body}</p>
          <div className="hero-actions">
            <Link className="button" href="/login">
              <LockKeyhole size={18} /> {copy.cta.garage}
            </Link>
            <a className="button button-secondary" href="/demo/index.html">
              <Bot size={18} /> {copy.cta.demo}
            </a>
          </div>
          <div className="signal-strip">
            <span>
              <Globe2 size={16} /> {copy.hero.signals[0]}
            </span>
            <span>
              <ShieldCheck size={16} /> {copy.hero.signals[1]}
            </span>
            <span>
              <Wifi size={16} /> {copy.hero.signals[2]}
            </span>
          </div>
        </div>

        <div className="hero-visual" aria-label="RoboForge active unit">
          <Image
            src={themes.forge.image}
            alt="AEGIS-01 RoboForge rover digital form"
            fill
            preload
            sizes="(min-width: 900px) 56vw, 100vw"
            unoptimized
          />
          <div className="unit-badge">
            <span>{copy.unit.active}</span>
            <strong>{themes.forge.robotName}</strong>
            <small>{themes.forge.robotClass} / ROVER-01</small>
          </div>
        </div>
      </section>

      <section className="entry-flow" aria-label="RoboForge user path">
        <div className="section-heading">
          <span className="eyebrow">
            <RadioTower size={15} /> {copy.entry.eyebrow}
          </span>
          <h2>{copy.entry.title}</h2>
        </div>
        <div className="entry-flow__grid">
          {copy.entry.steps.map((step, index) => {
            const Icon = entryIcons[index];

            return (
              <article className="entry-flow__card" key={step.label}>
                <span>
                  <Icon size={21} />
                  {step.label}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="fleet-band" aria-label="RoboForge fleet roadmap">
        <div className="section-heading">
          <span className="eyebrow">
            <Bot size={15} /> {copy.fleet.eyebrow}
          </span>
          <h2>{copy.fleet.title}</h2>
        </div>
        <div className="fleet-grid">
          {fleet.map((item) => (
            <article className="fleet-tile" key={item.id}>
              <Image
                src={item.image}
                alt={`${item.label} robot concept`}
                width={360}
                height={210}
              />
              <div>
                <span>{copy.fleet.state[item.state]}</span>
                <strong>{item.label}</strong>
              </div>
            </article>
          ))}
        </div>
        <Link className="text-command" href="/login">
          {copy.fleet.cta} <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
