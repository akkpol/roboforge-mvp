import Link from "next/link";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const copy = {
  en: {
    cta: {
      demo: "Try the Demo",
      login: "Create Account",
      demoNote:
        "Simulated controls. Real motor power requires a Rover-01 kit + login.",
    },
    demo: {
      armed: "ARMED",
      arm: "ARM",
      battery: "Battery",
      locked: "Controls locked",
      throttle: "Throttle",
    },
    fleet: {
      title: "One platform. Many robots.",
      rover: "Rover",
      tracked: "Tracked",
      drone: "Drone",
      arm: "Arm",
      coming: "Soon",
    },
    hero: {
      eyebrow: "ROBOT IDENTITY PLATFORM",
      title: "YOUR ROBOT. EVOLVED.",
      body: "Own a robot, learn how every part works, upgrade it safely, and play through setup like a game.",
    },
    lang: "Language",
    login: "Login",
    nav: {
      brand: "ROBOFORGE",
      brandSub: "ROBOT PLATFORM",
    },
    steps: {
      eyebrow: "HOW IT WORKS",
      title: "Three steps to your first drive.",
      one: { title: "Create account", body: "One RoboForge account for your whole fleet." },
      two: { title: "Get a Rover-01 kit", body: "Our first beta kit ships with everything you need." },
      three: { title: "Connect and drive", body: "Power on, join the robot Wi-Fi, and open the local Cockpit." },
    },
    titleDesc: "RoboForge — Build a robot that grows with you",
  },
  th: {
    cta: {
      demo: "ลองเดโม",
      login: "สร้างบัญชี",
      demoNote:
        "การควบคุมแบบจำลอง ต้องมีคิต Rover-01 และเข้าสู่ระบบเพื่อควบคุมมอเตอร์จริง",
    },
    demo: {
      armed: "พร้อมขับ",
      arm: "ปลดล็อก",
      battery: "แบตเตอรี่",
      locked: "ล็อกอยู่",
      throttle: "คันเร่ง",
    },
    fleet: {
      title: "หนึ่งแพลตฟอร์ม หลายหุ่นยนต์",
      rover: "โรเวอร์",
      tracked: "สายพาน",
      drone: "โดรน",
      arm: "แขนกล",
      coming: "เร็วๆ นี้",
    },
    hero: {
      eyebrow: "แพลตฟอร์มตัวตนหุ่นยนต์",
      title: "หุ่นของคุณ พัฒนาได้",
      body: "เป็นเจ้าของหุ่น เรียนรู้ทุกชิ้นส่วน อัปเกรดอย่างปลอดภัย และเล่นผ่านการตั้งค่าเหมือนเกม",
    },
    lang: "ภาษา",
    login: "เข้าสู่ระบบ",
    nav: {
      brand: "ROBOFORGE",
      brandSub: "แพลตฟอร์มหุ่นยนต์",
    },
    steps: {
      eyebrow: "ขั้นตอนการใช้งาน",
      title: "สามขั้นตอนสู่การขับครั้งแรก",
      one: { title: "สร้างบัญชี", body: "หนึ่งบัญชี RoboForge สำหรับหุ่นยนต์ทั้งหมดของคุณ" },
      two: { title: "รับคิต Rover-01", body: "ชุดเบต้าชุดแรกของเรามาพร้อมทุกอย่างที่คุณต้องการ" },
      three: { title: "เชื่อมต่อและขับ", body: "เปิดเครื่อง เชื่อมต่อ Wi-Fi ของหุ่น และเปิด Cockpit" },
    },
    titleDesc: "RoboForge — สร้างหุ่นยนต์ที่เติบโตไปกับคุณ",
  },
} as const;

export default async function HomePage({ searchParams }: HomeProps) {
  const params = await searchParams;
  const locale = firstParam(params.lang) === "th" ? "th" : "en";
  const t = copy[locale];
  const alt = locale === "th" ? "en" : "th";

  return (
    <>
      <nav className="landing-nav">
        <span>
          <strong>{t.nav.brand}</strong>
          <small>{t.nav.brandSub}</small>
        </span>
        <span className="landing-nav-links">
          <Link href={`/?lang=${alt}`}>{t.lang}</Link>
          <Link href="/login">{t.login}</Link>
        </span>
      </nav>
      <main className="landing">
        <section className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">{t.hero.eyebrow}</span>
            <h1>{t.hero.title}</h1>
            <p>{t.hero.body}</p>
            <div className="hero-actions">
              <a className="button" href="#demo">{t.cta.demo}</a>
              <Link className="button button-secondary" href="/login">{t.cta.login}</Link>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-robot" />
          </div>
        </section>

        <section id="demo" className="demo-section">
          <span className="eyebrow">PUBLIC DEMO</span>
          <h2>Rover Cockpit</h2>
          <p>{t.cta.demoNote}</p>
          <div className="demo-cockpit">
            <div className="demo-telemetry">
              <span>
                {t.demo.battery} <strong>82%</strong>
              </span>
              <span className="demo-status">{t.demo.locked}</span>
            </div>
            <div className="demo-controls">
              <label className="demo-throttle">
                <span>{t.demo.throttle}</span>
                <input type="range" min="0" max="100" defaultValue="0" disabled />
              </label>
              <button className="button demo-arm" type="button" disabled>
                {t.demo.arm}
              </button>
            </div>
          </div>
        </section>

        <section className="steps-section">
          <span className="eyebrow">{t.steps.eyebrow}</span>
          <h2>{t.steps.title}</h2>
          <ol className="steps-list">
            <li>
              <span>1</span>
              <strong>{t.steps.one.title}</strong>
              <p>{t.steps.one.body}</p>
            </li>
            <li>
              <span>2</span>
              <strong>{t.steps.two.title}</strong>
              <p>{t.steps.two.body}</p>
            </li>
            <li>
              <span>3</span>
              <strong>{t.steps.three.title}</strong>
              <p>{t.steps.three.body}</p>
            </li>
          </ol>
        </section>

        <section className="fleet-section">
          <h2>{t.fleet.title}</h2>
          <ul className="fleet-list">
            <li>{t.fleet.rover} <span className="fleet-active">✓</span></li>
            <li>{t.fleet.tracked} <small>{t.fleet.coming}</small></li>
            <li>{t.fleet.drone} <small>{t.fleet.coming}</small></li>
            <li>{t.fleet.arm} <small>{t.fleet.coming}</small></li>
          </ul>
        </section>
      </main>
    </>
  );
}
