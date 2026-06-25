// app/welcome/page.tsx — HappiWell Telemed pre-login landing page
import Link from "next/link";
import Image from "next/image";
import { Kanit, Sarabun } from "next/font/google";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-kanit",
  display: "swap",
});

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

const LOGO_SRC = "/logo-hc.png";
const BOOKING_HREF = "/doctors";

export default function WelcomePage() {
  return (
    <div className={`hw-page ${kanit.variable} ${sarabun.variable}`}>
      <Nav />
      <Hero />
      <HowItWorks />
      <Doctors />
      <TrustStrip />
      <FAQ />
      <FinalCTA />
      <Footer />
      <Styles />
    </div>
  );
}

function Nav() {
  return (
    <nav className="hw-nav">
      <div className="hw-wrap hw-nav-inner">
        <div className="hw-brand">
          <Image src={LOGO_SRC} alt="HappiWell" width={114} height={40} style={{ objectFit: "contain" }} />
        </div>
        <Link href={BOOKING_HREF} className="hw-nav-cta">
          นัดพบแพทย์
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header className="hw-hero">
      <div className="hw-wrap hw-hero-grid">
        <div>
          <div className="hw-eyebrow hw-eyebrow-mint">
            พบแพทย์ออนไลน์ผ่านวิดีโอคอล
          </div>
          <h1>
            ปรึกษาแพทย์ได้จาก
            <br />
            ที่ไหนก็ได้ <span className="hw-accent">ไม่ต้องรอคิว</span>
          </h1>
          <p className="hw-lead">
            HappiWell Telemed เชื่อมคุณกับแพทย์ของคลินิกแฮปปี้เวลล์ ผ่านวิดีโอคอลที่ปลอดภัย
            พร้อมประวัติการรักษาและใบสั่งยาในที่เดียว
          </p>
          <div className="hw-cta-row">
            <Link href={BOOKING_HREF} className="hw-btn-primary">
              นัดพบแพทย์เลย
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <a href="#how" className="hw-btn-ghost">
              ดูวิธีใช้งาน
            </a>
          </div>
          <div className="hw-trust-line">
            <div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2 3 6v6c0 5 4 8 9 10 5-2 9-5 9-10V6l-9-4z" />
              </svg>
              ข้อมูลเข้ารหัส ตามมาตรฐาน PDPA
            </div>
            <div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
              แพทย์ผู้เชี่ยวชาญยืนยันตัวตน
            </div>
          </div>
        </div>

        <div className="hw-hero-visual">
          <svg className="hw-ribbon-bg" viewBox="0 0 500 460" fill="none">
            <path
              d="M60 60 C 220 60, 200 230, 360 230 S 480 400, 420 420"
              stroke="url(#hwg1)"
              strokeWidth="34"
              strokeLinecap="round"
              opacity="0.16"
            />
            <defs>
              <linearGradient id="hwg1" x1="0" y1="0" x2="500" y2="460">
                <stop offset="0%" stopColor="#4A63E0" />
                <stop offset="55%" stopColor="#22C7A0" />
                <stop offset="100%" stopColor="#E94B5C" />
              </linearGradient>
            </defs>
          </svg>

          <div className="hw-chip hw-chip-one">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            ยืนยันนัดสำเร็จ
          </div>
          <div className="hw-chip hw-chip-two">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            คิวถัดไป 5 นาที
          </div>

          <div className="hw-hero-card">
            <div className="hw-doc-row">
              <div className="hw-avatar">พญ.</div>
              <div>
                <div className="hw-doc-name">พญ. ใจดี รักษ์ผู้ป่วย</div>
                <div className="hw-doc-role">อายุรแพทย์ทั่วไป</div>
              </div>
              <div className="hw-live-pill">กำลังคุย</div>
            </div>
            <div className="hw-call-frame">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="6" width="13" height="12" rx="2" />
                <path d="M16 10l5-3v10l-5-3" />
              </svg>
              <div className="hw-timer">04:12</div>
            </div>
            <div className="hw-actions">
              <button className="hw-chat" type="button">
                ส่งข้อความ
              </button>
              <button className="hw-end" type="button">
                วางสาย
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

const STEPS = [
  { n: 1, title: "เลือกแพทย์", desc: "เลือกแพทย์ตามอาการ หรือความเชี่ยวชาญที่ต้องการ" },
  { n: 2, title: "นัดเวลา", desc: "จองเวลาที่ว่าง ยืนยันนัดผ่าน LINE ทันที" },
  { n: 3, title: "วิดีโอคอล", desc: "พบแพทย์แบบเห็นหน้า ปลอดภัย ไม่มีบุคคลที่สามเข้าถึง" },
  { n: 4, title: "รับใบสั่งยา", desc: "รับสรุปการรักษาและใบสั่งยา พร้อมติดตามจัดส่ง" },
];

function HowItWorks() {
  return (
    <section id="how">
      <div className="hw-wrap">
        <div className="hw-section-head">
          <div className="hw-eyebrow hw-eyebrow-blue">ขั้นตอนการใช้งาน</div>
          <h2>พบแพทย์ใน 4 ขั้นตอน</h2>
          <p>จากเลือกแพทย์จนถึงรับใบสั่งยา ทุกขั้นตอนอยู่ในระบบเดียว ติดตามได้ตลอดการรักษา</p>
        </div>
        <div className="hw-steps-wrap">
          <svg className="hw-ribbon-connector" viewBox="0 0 1180 6" preserveAspectRatio="none">
            <line x1="0" y1="3" x2="1180" y2="3" stroke="url(#hwg2)" strokeWidth="3" strokeDasharray="2 10" />
            <defs>
              <linearGradient id="hwg2" x1="0" y1="0" x2="1180" y2="0">
                <stop offset="0%" stopColor="#4A63E0" />
                <stop offset="55%" stopColor="#22C7A0" />
                <stop offset="100%" stopColor="#E94B5C" />
              </linearGradient>
            </defs>
          </svg>
          <div className="hw-steps-row">
            {STEPS.map((s) => (
              <div className="hw-step-card" key={s.n}>
                <div className={`hw-step-num hw-step-num-${s.n}`}>{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const DOCTORS = [
  { initials: "นพ.", name: "นพ. สมชาย เวชกุล", spec: "อายุรกรรมทั่วไป", rating: "4.9", slot: "ว่าง 10:00" },
  { initials: "พญ.", name: "พญ. กานดา ใจเย็น", spec: "กุมารเวชศาสตร์", rating: "4.8", slot: "ว่าง 11:30" },
  { initials: "นพ.", name: "นพ. ธีระ สุขสันต์", spec: "ผิวหนัง", rating: "4.9", slot: "ว่าง 13:00" },
  { initials: "พญ.", name: "พญ. มาลี วงศ์สุข", spec: "สุขภาพจิต", rating: "5.0", slot: "ว่าง 14:30" },
];

function Doctors() {
  return (
    <section className="hw-section-white">
      <div className="hw-wrap">
        <div className="hw-section-head">
          <div className="hw-eyebrow hw-eyebrow-red">แพทย์ของเรา</div>
          <h2>แพทย์ผู้เชี่ยวชาญพร้อมให้คำปรึกษา</h2>
          <p>ทุกท่านผ่านการยืนยันตัวตนและใบอนุญาตประกอบวิชาชีพ</p>
        </div>
        <div className="hw-doc-scroll">
          {DOCTORS.map((d) => (
            <div className="hw-doc-card" key={d.name}>
              <div className="hw-doc-photo">
                <div className="hw-avatar">{d.initials}</div>
              </div>
              <div className="hw-doc-info">
                <div className="hw-name">{d.name}</div>
                <div className="hw-spec">{d.spec}</div>
                <div className="hw-meta">
                  <span>⭐ {d.rating}</span>
                  <span>{d.slot}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TRUST_ITEMS = [
  { title: "ปลอดภัยตาม PDPA", desc: "ข้อมูลสุขภาพเข้ารหัส เก็บตามระยะที่กฎหมายกำหนด" },
  { title: "แพทย์ยืนยันตัวตน", desc: "ตรวจสอบใบอนุญาตประกอบวิชาชีพทุกท่าน" },
  { title: "บันทึกการให้คำปรึกษา", desc: "เก็บประวัติไว้ตรวจสอบย้อนหลังได้ทุกครั้ง" },
  { title: "เชื่อมประวัติคลินิก", desc: "ข้อมูลเชื่อมกับเวชระเบียนของแฮปปี้เวลล์" },
];

function TrustStrip() {
  return (
    <section>
      <div className="hw-wrap">
        <div className="hw-trust-strip">
          <div className="hw-trust-grid">
            {TRUST_ITEMS.map((t) => (
              <div className="hw-trust-item" key={t.title}>
                <h4>{t.title}</h4>
                <p>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "ต้องเตรียมอะไรก่อนพบแพทย์ออนไลน์?",
    a: "เตรียมโทรศัพท์หรือคอมพิวเตอร์ที่มีกล้องและไมโครโฟน อินเทอร์เน็ตที่เสถียร และบัตรประชาชนสำหรับยืนยันตัวตนครั้งแรก",
  },
  {
    q: "ข้อมูลการรักษาของฉันปลอดภัยไหม?",
    a: "ข้อมูลทั้งหมดเข้ารหัสและเก็บตามมาตรฐาน PDPA เข้าถึงได้เฉพาะแพทย์ผู้ดูแลและตัวคุณเท่านั้น",
  },
  {
    q: "หากต้องใช้ยา จะได้รับยาอย่างไร?",
    a: "แพทย์จะออกใบสั่งยาในระบบ คุณเลือกรับยาที่คลินิก หรือให้จัดส่งถึงบ้านได้",
  },
  {
    q: "ใช้สิทธิบัตรทอง/ประกันได้หรือไม่?",
    a: "รองรับบางสิทธิ ขึ้นอยู่กับแพ็กเกจการตรวจ กรุณาตรวจสอบกับเจ้าหน้าที่ก่อนนัดหมาย",
  },
];

function FAQ() {
  return (
    <section className="hw-section-white">
      <div className="hw-wrap">
        <div className="hw-section-head">
          <div className="hw-eyebrow hw-eyebrow-mint">คำถามที่พบบ่อย</div>
          <h2>ก่อนเริ่มใช้งาน</h2>
        </div>
        <div className="hw-faq-list">
          {FAQS.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  return (
    <details className="hw-faq-item" open={defaultOpen}>
      <summary className="hw-faq-q">
        <span>{q}</span>
        <span className="hw-faq-icon">+</span>
      </summary>
      <p className="hw-faq-a">{a}</p>
    </details>
  );
}

function FinalCTA() {
  return (
    <section id="book">
      <div className="hw-wrap">
        <div className="hw-final-cta">
          <h2>พร้อมพบแพทย์แล้ววันนี้?</h2>
          <p>นัดหมายใช้เวลาไม่ถึง 2 นาที เลือกแพทย์และเวลาที่สะดวกได้เลย</p>
          <Link href={BOOKING_HREF} className="hw-btn-primary">
            เข้าสู่ระบบนัดหมาย
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="hw-footer">
      <div className="hw-wrap">
        HappiWell Clinic แฮปปี้เวลล์ คลินิกเวชกรรม · ใบอนุญาตเลขที่ 10101035068
        <br />
        193/195 ถนนประชาอุทิศ บางมด ทุ่งครุ กรุงเทพมหานคร
      </div>
    </footer>
  );
}

const css = `
      .hw-page {
        --hw-blue: #4a63e0;
        --hw-blue-deep: #2f3fa8;
        --hw-red: #e94b5c;
        --hw-mint: #22c7a0;
        --hw-ink: #1b2240;
        --hw-ink-soft: #5a6080;
        --hw-bg: #f6f8fd;
        --hw-card: #ffffff;
        --hw-line: #e6eaf7;
        font-family: var(--font-sarabun), sans-serif;
        color: var(--hw-ink);
        background: var(--hw-bg);
        overflow-x: hidden;
      }
      .hw-page h1,
      .hw-page h2,
      .hw-page h3 {
        font-family: var(--font-kanit), sans-serif;
      }
      .hw-wrap {
        max-width: 1180px;
        margin: 0 auto;
        padding: 0 24px;
      }
      .hw-nav {
        position: sticky;
        top: 0;
        z-index: 50;
        background: rgba(246, 248, 253, 0.85);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--hw-line);
      }
      .hw-nav-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 76px;
      }
      .hw-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .hw-brand span {
        font-family: var(--font-kanit);
        font-weight: 700;
        font-size: 19px;
        color: var(--hw-blue-deep);
      }
      .hw-brand span b {
        color: var(--hw-red);
        font-weight: 700;
      }
      .hw-nav-cta {
        background: var(--hw-blue);
        color: #fff;
        font-family: var(--font-kanit);
        font-weight: 600;
        padding: 10px 22px;
        border-radius: 99px;
        font-size: 15px;
        box-shadow: 0 6px 16px rgba(74, 99, 224, 0.28);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .hw-nav-cta:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 22px rgba(74, 99, 224, 0.35);
      }
      .hw-hero {
        position: relative;
        padding: 72px 0 96px;
        overflow: hidden;
      }
      .hw-hero-grid {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 48px;
        align-items: center;
      }
      .hw-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-kanit);
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.04em;
        padding: 7px 16px;
        border-radius: 99px;
        margin-bottom: 22px;
      }
      .hw-eyebrow::before {
        content: "";
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }
      .hw-eyebrow-mint {
        color: var(--hw-mint);
        background: rgba(34, 199, 160, 0.1);
      }
      .hw-eyebrow-mint::before {
        background: var(--hw-mint);
        box-shadow: 0 0 0 4px rgba(34, 199, 160, 0.18);
      }
      .hw-eyebrow-blue {
        color: var(--hw-blue);
        background: rgba(74, 99, 224, 0.1);
      }
      .hw-eyebrow-blue::before {
        background: var(--hw-blue);
      }
      .hw-eyebrow-red {
        color: var(--hw-red);
        background: rgba(233, 75, 92, 0.1);
      }
      .hw-eyebrow-red::before {
        background: var(--hw-red);
      }
      .hw-hero h1 {
        font-size: 50px;
        line-height: 1.16;
        font-weight: 700;
        letter-spacing: -0.01em;
        margin-bottom: 22px;
      }
      .hw-accent {
        background: linear-gradient(100deg, var(--hw-blue) 10%, var(--hw-red) 90%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .hw-lead {
        font-size: 18px;
        line-height: 1.7;
        color: var(--hw-ink-soft);
        max-width: 480px;
        margin-bottom: 34px;
      }
      .hw-cta-row {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        align-items: center;
      }
      .hw-btn-primary {
        background: linear-gradient(120deg, var(--hw-blue), var(--hw-blue-deep));
        color: #fff;
        font-family: var(--font-kanit);
        font-weight: 600;
        font-size: 16px;
        padding: 16px 32px;
        border-radius: 14px;
        box-shadow: 0 14px 30px rgba(47, 63, 168, 0.32);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }
      .hw-btn-primary:hover {
        transform: translateY(-3px);
        box-shadow: 0 18px 36px rgba(47, 63, 168, 0.4);
      }
      .hw-btn-ghost {
        font-family: var(--font-kanit);
        font-weight: 600;
        font-size: 15px;
        color: var(--hw-ink);
        padding: 16px 8px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-bottom: 2px solid transparent;
        transition: border-color 0.2s ease;
      }
      .hw-btn-ghost:hover {
        border-color: var(--hw-ink);
      }
      .hw-trust-line {
        display: flex;
        gap: 26px;
        margin-top: 38px;
        flex-wrap: wrap;
      }
      .hw-trust-line div {
        font-size: 13.5px;
        color: var(--hw-ink-soft);
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .hw-trust-line svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        color: var(--hw-mint);
      }
      .hw-hero-visual {
        position: relative;
        height: 460px;
      }
      .hw-ribbon-bg {
        position: absolute;
        inset: -40px -20px;
        z-index: 0;
        opacity: 0.9;
      }
      .hw-hero-card {
        position: relative;
        z-index: 2;
        background: var(--hw-card);
        border-radius: 28px;
        padding: 30px;
        box-shadow: 0 30px 60px -20px rgba(27, 34, 64, 0.22);
        max-width: 340px;
        margin: 0 auto;
        border: 1px solid var(--hw-line);
      }
      .hw-doc-row {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 18px;
      }
      .hw-avatar {
        width: 54px;
        height: 54px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--hw-blue), var(--hw-blue-deep));
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-family: var(--font-kanit);
        font-weight: 600;
        font-size: 18px;
      }
      .hw-doc-name {
        font-family: var(--font-kanit);
        font-weight: 600;
        font-size: 15px;
      }
      .hw-doc-role {
        font-size: 12.5px;
        color: var(--hw-ink-soft);
      }
      .hw-live-pill {
        margin-left: auto;
        background: rgba(34, 199, 160, 0.12);
        color: var(--hw-mint);
        font-size: 11px;
        font-family: var(--font-kanit);
        font-weight: 600;
        padding: 5px 10px;
        border-radius: 99px;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .hw-live-pill::before {
        content: "";
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--hw-mint);
        animation: hw-pulse 1.6s infinite;
      }
      @keyframes hw-pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.3;
        }
      }
      .hw-call-frame {
        background: linear-gradient(150deg, #eef1fc, #fdf0f1);
        border-radius: 18px;
        height: 160px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 18px;
        position: relative;
        overflow: hidden;
      }
      .hw-call-frame svg {
        width: 64px;
        height: 64px;
        color: var(--hw-blue);
        opacity: 0.85;
      }
      .hw-timer {
        font-size: 12px;
        color: var(--hw-ink-soft);
        position: absolute;
        bottom: 10px;
        right: 14px;
        font-family: var(--font-kanit);
      }
      .hw-actions {
        display: flex;
        gap: 10px;
      }
      .hw-actions button {
        flex: 1;
        border: none;
        padding: 12px;
        border-radius: 12px;
        font-family: var(--font-kanit);
        font-weight: 600;
        font-size: 13.5px;
        cursor: default;
      }
      .hw-end {
        background: #fce9eb;
        color: var(--hw-red);
      }
      .hw-chat {
        background: #eef1fc;
        color: var(--hw-blue-deep);
      }
      .hw-chip {
        position: absolute;
        z-index: 3;
        background: #fff;
        border-radius: 14px;
        padding: 12px 16px;
        box-shadow: 0 16px 30px -10px rgba(27, 34, 64, 0.2);
        font-family: var(--font-kanit);
        font-size: 12.5px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--hw-line);
      }
      .hw-chip svg {
        width: 14px;
        height: 14px;
      }
      .hw-chip-one {
        top: 18px;
        right: 0;
        color: var(--hw-blue-deep);
      }
      .hw-chip-two {
        bottom: 30px;
        left: -10px;
        color: var(--hw-red);
      }
      .hw-page section {
        padding: 90px 0;
      }
      .hw-section-white {
        background: #fff;
      }
      .hw-section-head {
        text-align: center;
        max-width: 620px;
        margin: 0 auto 56px;
      }
      .hw-section-head h2 {
        font-size: 36px;
        font-weight: 700;
        margin-bottom: 14px;
      }
      .hw-section-head p {
        color: var(--hw-ink-soft);
        font-size: 16px;
        line-height: 1.7;
      }
      .hw-steps-wrap {
        position: relative;
      }
      .hw-steps-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 28px;
        position: relative;
        z-index: 2;
      }
      .hw-step-card {
        background: var(--hw-card);
        border: 1px solid var(--hw-line);
        border-radius: 20px;
        padding: 30px 24px;
        position: relative;
      }
      .hw-step-num {
        font-family: var(--font-kanit);
        font-weight: 800;
        font-size: 15px;
        color: #fff;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 18px;
      }
      .hw-step-num-1 {
        background: var(--hw-blue);
      }
      .hw-step-num-2 {
        background: linear-gradient(135deg, var(--hw-blue), var(--hw-mint));
      }
      .hw-step-num-3 {
        background: linear-gradient(135deg, var(--hw-mint), var(--hw-red));
      }
      .hw-step-num-4 {
        background: var(--hw-red);
      }
      .hw-step-card h3 {
        font-size: 17px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .hw-step-card p {
        font-size: 14px;
        color: var(--hw-ink-soft);
        line-height: 1.6;
      }
      .hw-ribbon-connector {
        position: absolute;
        top: 38px;
        left: 0;
        width: 100%;
        height: 6px;
        z-index: 1;
      }
      .hw-doc-scroll {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 22px;
      }
      .hw-doc-card {
        background: var(--hw-card);
        border: 1px solid var(--hw-line);
        border-radius: 20px;
        overflow: hidden;
        transition: transform 0.25s ease, box-shadow 0.25s ease;
      }
      .hw-doc-card:hover {
        transform: translateY(-6px);
        box-shadow: 0 20px 40px -16px rgba(27, 34, 64, 0.18);
      }
      .hw-doc-photo {
        height: 150px;
        background: linear-gradient(135deg, #dde4fb, #fbe3e6);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .hw-doc-photo .hw-avatar {
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, var(--hw-blue), var(--hw-red));
        font-size: 22px;
      }
      .hw-doc-info {
        padding: 18px 18px 22px;
      }
      .hw-doc-info .hw-name {
        font-family: var(--font-kanit);
        font-weight: 600;
        font-size: 15px;
        margin-bottom: 4px;
      }
      .hw-doc-info .hw-spec {
        font-size: 12.5px;
        color: var(--hw-mint);
        font-weight: 600;
        margin-bottom: 10px;
      }
      .hw-doc-info .hw-meta {
        font-size: 12px;
        color: var(--hw-ink-soft);
        display: flex;
        justify-content: space-between;
        border-top: 1px dashed var(--hw-line);
        padding-top: 10px;
      }
      .hw-trust-strip {
        background: linear-gradient(120deg, var(--hw-blue-deep), var(--hw-blue) 60%, var(--hw-red));
        border-radius: 28px;
        padding: 50px 40px;
        color: #fff;
      }
      .hw-trust-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 30px;
      }
      .hw-trust-item h4 {
        font-family: var(--font-kanit);
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 10px;
      }
      .hw-trust-item p {
        font-size: 13px;
        opacity: 0.85;
        line-height: 1.6;
      }
      .hw-faq-list {
        max-width: 720px;
        margin: 0 auto;
      }
      .hw-faq-item {
        border-bottom: 1px solid var(--hw-line);
        padding: 22px 4px;
      }
      .hw-faq-q {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        font-family: var(--font-kanit);
        font-weight: 600;
        font-size: 15.5px;
        list-style: none;
      }
      .hw-faq-q::-webkit-details-marker {
        display: none;
      }
      .hw-faq-icon {
        width: 22px;
        height: 22px;
        flex-shrink: 0;
        border-radius: 50%;
        background: var(--hw-bg);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.25s ease, background 0.25s ease, color 0.25s ease;
      }
      .hw-faq-item[open] .hw-faq-icon {
        transform: rotate(45deg);
        background: var(--hw-blue);
        color: #fff;
      }
      .hw-faq-a {
        font-size: 14px;
        color: var(--hw-ink-soft);
        line-height: 1.7;
        margin-top: 12px;
        padding-right: 30px;
      }
      .hw-final-cta {
        background: var(--hw-ink);
        border-radius: 32px;
        padding: 64px 50px;
        text-align: center;
        color: #fff;
        position: relative;
        overflow: hidden;
      }
      .hw-final-cta h2 {
        font-size: 32px;
        margin-bottom: 14px;
      }
      .hw-final-cta p {
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 30px;
        font-size: 15.5px;
      }
      .hw-footer {
        padding: 50px 0 30px;
        text-align: center;
        color: var(--hw-ink-soft);
        font-size: 13px;
      }
      @media (max-width: 880px) {
        .hw-hero-grid {
          grid-template-columns: 1fr;
        }
        .hw-hero h1 {
          font-size: 36px;
        }
        .hw-steps-row,
        .hw-doc-scroll,
        .hw-trust-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .hw-ribbon-connector {
          display: none;
        }
        .hw-page section {
          padding: 60px 0;
        }
      }
      @media (max-width: 540px) {
        .hw-steps-row,
        .hw-doc-scroll,
        .hw-trust-grid {
          grid-template-columns: 1fr;
        }
        .hw-hero h1 {
          font-size: 30px;
        }
        .hw-final-cta {
          padding: 44px 24px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .hw-page * {
          animation: none !important;
          transition: none !important;
        }
      }
`

function Styles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
