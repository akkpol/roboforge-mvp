import {
  ArrowRight,
  Bot,
  CircuitBoard,
  Clipboard,
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

function localizePath(path: string, locale: HomeLocale) {
  if (locale !== "th") return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}lang=th`;
}

const entryIcons = [LockKeyhole, QrCode, Gamepad2] as const;
const routeIcons = [LockKeyhole, QrCode, Clipboard, Bot] as const;

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
      title: "Start on the web. Drive locally when the robot is ready.",
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
            "Live driving stays on the robot's Wi-Fi page; RoboForge Web saves outcomes.",
          label: "03 Local Cockpit",
          title: "Drive only after connection",
        },
      ],
    },
    routes: {
      eyebrow: "WHERE TO GO",
      title: "Four entry points, one product flow.",
      items: [
        {
          body: "For owners creating an account before any robot is claimed.",
          cta: "Go to login",
          href: "/login",
          label: "/login",
          title: "New owner",
        },
        {
          body: "For testers who received a QR card or claim code with a kit.",
          cta: "Open Garage",
          href: "/dashboard",
          label: "/dashboard?claim=CODE",
          title: "Claim a robot",
        },
        {
          body: "For the team creating claim kits, hardware profiles, and bench evidence.",
          cta: "Open Ops",
          href: "/admin",
          label: "/admin",
          title: "Beta Ops",
        },
        {
          body: "For visitors who want to try the RoboForge concept without signing in.",
          cta: "Open demo",
          href: "/demo/index.html",
          label: "/demo/index.html",
          title: "Public demo",
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
        "Web Garage is the starting point: create an owner account, claim a beta kit, follow Connection Quest, then open the robot's local Cockpit when real hardware is ready.",
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
      title: "เริ่มบนเว็บ แล้วค่อยขับหุ่นเมื่อเครื่องจริงพร้อม",
      steps: [
        {
          body:
            "ใช้บัญชีเดียวสำหรับ Web Garage, การสมัครเบต้า, ความเป็นเจ้าของ, ความคืบหน้า และซัพพอร์ต",
          label: "01 Web Garage",
          title: "เริ่มตรงนี้",
        },
        {
          body:
            "เมื่อได้ชุดเบต้า สแกน QR เพื่อรับสิทธิ์ แล้วให้ Lyra พาเชื่อมต่อ Wi-Fi ของหุ่นทีละขั้น",
          label: "02 รับสิทธิ์ + เชื่อมต่อ",
          title: "เพิ่มเครื่องจริง",
        },
        {
          body:
            "การขับหุ่นแบบสดอยู่บนหน้า Wi-Fi ของหุ่น ส่วน RoboForge Web เก็บผลลัพธ์และความคืบหน้า",
          label: "03 Cockpit ในหุ่น",
          title: "ขับเมื่อเชื่อมต่อแล้ว",
        },
      ],
    },
    routes: {
      eyebrow: "ต้องเข้าเว็บไหน",
      title: "มี 4 ทางเข้า แต่ใช้เส้นทางเดียวกัน",
      items: [
        {
          body: "สำหรับเจ้าของที่เริ่มสมัครหรือเข้าสู่ระบบก่อนมีหุ่นจริง",
          cta: "เข้าสู่ระบบ",
          href: "/login",
          label: "/login",
          title: "เจ้าของใหม่",
        },
        {
          body: "สำหรับคนที่ได้การ์ด QR หรือรหัสรับสิทธิ์มากับชุดเบต้า",
          cta: "เปิด Garage",
          href: "/dashboard",
          label: "/dashboard?claim=CODE",
          title: "รับสิทธิ์หุ่น",
        },
        {
          body: "สำหรับทีมที่สร้างคิต กรอกข้อมูลฮาร์ดแวร์ และเก็บผลทดสอบบนโต๊ะ",
          cta: "เปิดหน้า Ops",
          href: "/admin",
          label: "/admin",
          title: "ทีมดูแลเบต้า",
        },
        {
          body: "สำหรับคนที่อยากลองสัมผัส RoboForge ก่อน โดยยังไม่ต้องเข้าสู่ระบบ",
          cta: "เปิดเดโม",
          href: "/demo/index.html",
          label: "/demo/index.html",
          title: "เดโมสาธารณะ",
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
      title: "เริ่มจาก rover หนึ่งตัว แล้วเตรียมระบบให้รองรับเจ้าของหลายคน",
    },
    hero: {
      body:
        "Web Garage คือจุดเริ่มต้น: สร้างบัญชีเจ้าของ รับสิทธิ์ชุดเบต้า ทำตาม Connection Quest แล้วเปิด Cockpit ของหุ่นเมื่อฮาร์ดแวร์จริงพร้อม",
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
  const loginHref = localizePath("/login", locale);
  const dashboardHref = localizePath("/dashboard", locale);

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
          <Link className="quiet-link" href={loginHref}>
            {copy.cta.login}
          </Link>
          <Link className="button button-small" href={dashboardHref}>
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
            <Link className="button" href={loginHref}>
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

      <section className="route-map" aria-label="RoboForge route map">
        <div className="section-heading">
          <span className="eyebrow">
            <Globe2 size={15} /> {copy.routes.eyebrow}
          </span>
          <h2>{copy.routes.title}</h2>
        </div>
        <div className="route-map__grid">
          {copy.routes.items.map((item, index) => {
            const Icon = routeIcons[index];

            return (
              <article className="route-map__item" key={item.href}>
                <span className="route-map__icon">
                  <Icon size={20} />
                </span>
                <div>
                  <code>{item.label}</code>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <Link
                    className="text-command"
                    href={localizePath(item.href, locale)}
                  >
                    {item.cta} <ArrowRight size={17} />
                  </Link>
                </div>
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
        <Link className="text-command" href={loginHref}>
          {copy.fleet.cta} <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
