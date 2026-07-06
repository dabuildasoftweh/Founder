const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const {
  FaLeaf, FaBoxOpen, FaSyncAlt, FaBullhorn, FaUsers, FaVideo,
  FaCrosshairs, FaGift, FaChartLine, FaCheckCircle, FaPoundSign,
  FaEyeSlash, FaRegClock, FaStore, FaGhost, FaTooth, FaReceipt
} = require("react-icons/fa");

// ---- palette ----
const INK = "111311";        // near-black (dominant)
const DARK = "0E100E";       // dark slide bg
const MINT = "2EE6A8";       // sharp mint accent
const MINT_DARK = "0B9E6C";  // mint for text on light bg
const PAPER = "FFFFFF";
const MUTED = "6E7772";
const TINT = "ECF9F3";       // mint-tinted card bg
const CARD = "F6F8F7";       // neutral card bg
const F = "Arial";

const shadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 2, angle: 45, opacity: 0.12 });

function renderIconSvg(Icon, color, size = 256) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(Icon, { color, size: String(size) }));
}
async function icon(Icon, color) {
  const svg = renderIconSvg(Icon, color);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

// icon inside a colored circle (motif)
function circleIcon(slide, pres, data, x, y, d, circleColor) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: circleColor } });
  const pad = d * 0.26;
  slide.addImage({ data, x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad });
}

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Joshua";
  pres.title = "Badmouth — Pitch Deck v1";

  // pre-render icons
  const icMintOnDark = {};
  const icInk = {};
  const icMintDark = {};
  const iconDefs = { FaLeaf, FaBoxOpen, FaSyncAlt, FaBullhorn, FaUsers, FaVideo, FaCrosshairs, FaGift, FaChartLine, FaCheckCircle, FaPoundSign, FaEyeSlash, FaRegClock, FaStore, FaGhost, FaTooth, FaReceipt };
  for (const [name, Icon] of Object.entries(iconDefs)) {
    icMintOnDark[name] = await icon(Icon, "#2EE6A8");
    icInk[name] = await icon(Icon, "#111311");
    icMintDark[name] = await icon(Icon, "#0B9E6C");
  }
  const icDarkOnMint = { FaTooth: await icon(FaTooth, "#0E100E"), FaEyeSlash: await icon(FaEyeSlash, "#0E100E"), FaBullhorn: await icon(FaBullhorn, "#0E100E") };

  const W = 10, H = 5.625;

  // ---------- SLIDE 1 — cover / The Boring Aisle ----------
  {
    const s = pres.addSlide();
    s.background = { color: DARK };
    circleIcon(s, pres, icDarkOnMint.FaTooth, 0.55, 0.5, 0.62, MINT);
    s.addText("BADMOUTH", {
      x: 0.5, y: 1.35, w: 9, h: 1.15, fontFace: F, fontSize: 66, bold: true,
      color: PAPER, charSpacing: 4, margin: 0
    });
    s.addText([
      { text: "The oral care aisle is the most boring shelf in the supermarket.\n", options: { color: PAPER } },
      { text: "That's the opportunity.", options: { color: MINT, bold: true } }
    ], { x: 0.5, y: 2.6, w: 7.6, h: 1.0, fontFace: F, fontSize: 20, margin: 0, lineSpacingMultiple: 1.15 });
    s.addText("Natural toothpaste. Subscription-first. Never scrape the end of a tube again.", {
      x: 0.5, y: 3.75, w: 7.4, h: 0.4, fontFace: F, fontSize: 14, color: "9AA59F", margin: 0
    });
    s.addText("Pitch deck v1  ·  July 2026  ·  numbers are pre-launch benchmarks, flagged where real data replaces them", {
      x: 0.5, y: 4.95, w: 9, h: 0.3, fontFace: F, fontSize: 10, color: "6E7772", margin: 0
    });
  }

  // ---------- SLIDE 2 — The Insight ----------
  {
    const s = pres.addSlide();
    s.background = { color: DARK };
    s.addText("THE INSIGHT", { x: 0.5, y: 0.4, w: 9, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: MINT, charSpacing: 3, margin: 0 });
    s.addText([
      { text: "People don't want to think about toothpaste ", options: { color: PAPER } },
      { text: "more", options: { color: PAPER, italic: true } },
      { text: ".\nThey want to think about it ", options: { color: PAPER } },
      { text: "less.", options: { color: MINT, bold: true } }
    ], { x: 0.5, y: 1.0, w: 9, h: 1.6, fontFace: F, fontSize: 30, bold: true, margin: 0, lineSpacingMultiple: 1.1 });

    // two-column: cool face / boring spine
    const colY = 3.05, colH = 2.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: colY, w: 4.35, h: colH, fill: { color: "161A17" }, rectRadius: 0.08 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.15, y: colY, w: 4.35, h: colH, fill: { color: "161A17" }, rectRadius: 0.08 });
    circleIcon(s, pres, icMintOnDark.FaBullhorn, 0.8, colY + 0.28, 0.5, "0E100E");
    circleIcon(s, pres, icMintOnDark.FaEyeSlash, 5.45, colY + 0.28, 0.5, "0E100E");
    s.addText("COOL FACE", { x: 1.45, y: colY + 0.32, w: 3.2, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: MINT, margin: 0 });
    s.addText("BORING SPINE", { x: 6.1, y: colY + 0.32, w: 3.2, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: MINT, margin: 0 });
    s.addText("A brand with actual attitude in a beige category. The brand wins the first order — it makes people look, laugh, and share.", {
      x: 0.8, y: colY + 0.88, w: 3.8, h: 1.05, fontFace: F, fontSize: 12.5, color: "C9D2CC", margin: 0, lineSpacingMultiple: 1.15
    });
    s.addText("Invisible operations win every order after that. It turns up before you run out. You never think about it again.", {
      x: 5.45, y: colY + 0.88, w: 3.8, h: 1.05, fontFace: F, fontSize: 12.5, color: "C9D2CC", margin: 0, lineSpacingMultiple: 1.15
    });
  }

  // ---------- SLIDE 3 — Product ----------
  {
    const s = pres.addSlide();
    s.background = { color: PAPER };
    s.addText("One product. One promise.", { x: 0.5, y: 0.35, w: 9, h: 0.6, fontFace: F, fontSize: 32, bold: true, color: INK, margin: 0 });
    s.addText("A single hero SKU — no range, no club, no app. The whole product is the promise that you never run out.", {
      x: 0.5, y: 1.0, w: 8.6, h: 0.4, fontFace: F, fontSize: 14, color: MUTED, margin: 0
    });

    // left: big product card
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.65, w: 3.7, h: 3.4, fill: { color: TINT }, rectRadius: 0.1, shadow: shadow() });
    circleIcon(s, pres, icDarkOnMint.FaTooth, 1.85, 2.0, 1.0, MINT);
    s.addText("BADMOUTH\nNATURAL TOOTHPASTE", { x: 0.7, y: 3.15, w: 3.3, h: 0.7, fontFace: F, fontSize: 15, bold: true, color: INK, align: "center", margin: 0, lineSpacingMultiple: 1.1 });
    s.addText([
      { text: "£16 / 2 months · one tube", options: { breakLine: true } },
      { text: "£8 a month — 26p a day" }
    ], {
      x: 0.7, y: 3.95, w: 3.3, h: 0.75, fontFace: F, fontSize: 12.5, color: MINT_DARK, bold: true, align: "center", margin: 0, lineSpacingMultiple: 1.15
    });

    // right: 3 feature rows
    const rows = [
      ["FaLeaf", "Natural formula", "Clean ingredient list for the buyer who reads labels. Fluoride question resolved by user research, not guesswork."],
      ["FaBoxOpen", "Letterbox-fit", "Ships Royal Mail large letter. No missed deliveries, no depot trips — it's waiting on the doormat."],
      ["FaSyncAlt", "Timed to your tube", "~2-month cadence matched to actual usage, so a fresh tube lands just before the old one runs out."],
    ];
    let ry = 1.75;
    for (const [ic, h, b] of rows) {
      circleIcon(s, pres, icMintDark[ic], 4.65, ry, 0.55, TINT);
      s.addText(h, { x: 5.4, y: ry - 0.02, w: 4.0, h: 0.35, fontFace: F, fontSize: 15, bold: true, color: INK, margin: 0 });
      s.addText(b, { x: 5.4, y: ry + 0.33, w: 4.05, h: 0.65, fontFace: F, fontSize: 11.5, color: MUTED, margin: 0, lineSpacingMultiple: 1.12 });
      ry += 1.12;
    }
  }

  // ---------- SLIDE 4 — Positioning ----------
  {
    const s = pres.addSlide();
    s.background = { color: PAPER };
    s.addText("The brand opens. The maths closes.", { x: 0.5, y: 0.35, w: 9, h: 0.6, fontFace: F, fontSize: 32, bold: true, color: INK, margin: 0 });
    s.addText("First market: people already paying £5–7/month for natural toothpaste — not the £1.50 Tesco Colgate loyalist.", {
      x: 0.5, y: 1.0, w: 9, h: 0.4, fontFace: F, fontSize: 14, color: MUTED, margin: 0
    });

    // 3 columns: mass market / beige naturals / badmouth
    const cols = [
      ["FaStore", "The supermarket aisle", "Commodity shelf. Zero loyalty. Bought on autopilot, hated at the end of every tube.", CARD, INK],
      ["FaGhost", "The beige naturals", "Products, not brands. Undifferentiated, forgettable, bought “whatever's in front of them”.", CARD, INK],
      ["FaTooth", "BADMOUTH", "The default. Cool enough to talk about once, reliable enough to never think about again — all of it for 26p a day.", INK, PAPER],
    ];
    let cx = 0.5;
    for (const [ic, h, b, bg, fg] of cols) {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: 1.6, w: 2.93, h: 3.15, fill: { color: bg }, rectRadius: 0.09, shadow: shadow() });
      circleIcon(s, pres, bg === INK ? icDarkOnMint.FaTooth : icInk[ic], cx + 0.25, 1.9, 0.55, bg === INK ? MINT : "E4E9E6");
      s.addText(h, { x: cx + 0.25, y: 2.65, w: 2.45, h: 0.55, fontFace: F, fontSize: 13.5, bold: true, color: fg, margin: 0, lineSpacingMultiple: 1.05, valign: "top" });
      s.addText(b, { x: cx + 0.25, y: 3.25, w: 2.45, h: 1.35, fontFace: F, fontSize: 11.5, color: bg === INK ? "C9D2CC" : MUTED, margin: 0, lineSpacingMultiple: 1.15, valign: "top" });
      cx += 3.14;
    }
    s.addText("Enemy: the fake and the forgettable.", { x: 0.5, y: 4.95, w: 9, h: 0.35, fontFace: F, fontSize: 13, italic: true, color: MINT_DARK, margin: 0 });
  }

  // ---------- SLIDE 5 — Business Model ----------
  {
    const s = pres.addSlide();
    s.background = { color: PAPER };
    s.addText("Subscription-first, with margin to spend.", { x: 0.5, y: 0.35, w: 9, h: 0.6, fontFace: F, fontSize: 32, bold: true, color: INK, margin: 0 });
    s.addText("£16 per 2-month shipment (sub is the default; one-off priced ~£22 to make subscribing the obvious choice). Ex-VAT.", {
      x: 0.5, y: 1.0, w: 9, h: 0.4, fontFace: F, fontSize: 13.5, color: MUTED, margin: 0
    });

    // left: cost stack table
    const tbl = [
      [{ text: "Per shipment", options: { bold: true, color: PAPER, fill: { color: INK } } }, { text: "£", options: { bold: true, color: PAPER, fill: { color: INK }, align: "right" } }],
      ["Revenue", { text: "16.00", options: { align: "right", bold: true } }],
      ["Tube (natural formula)", { text: "1.80", options: { align: "right" } }],
      ["Carton + insert", { text: "0.40", options: { align: "right" } }],
      ["Postage (letterbox)", { text: "2.00", options: { align: "right" } }],
      ["Pick & pack", { text: "1.00", options: { align: "right" } }],
      ["Payment processing", { text: "0.50", options: { align: "right" } }],
      [{ text: "Contribution", options: { bold: true, fill: { color: TINT } } }, { text: "10.30", options: { align: "right", bold: true, fill: { color: TINT }, color: MINT_DARK } }],
    ];
    s.addTable(tbl, {
      x: 0.5, y: 1.6, w: 4.6, colW: [3.3, 1.3], fontFace: F, fontSize: 11.5, color: INK,
      border: { pt: 0.5, color: "DDE3DF" }, fill: { color: PAPER }, rowH: 0.34, valign: "middle", margin: 0.06
    });

    // right: big stats
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.5, y: 1.6, w: 4.0, h: 1.9, fill: { color: INK }, rectRadius: 0.09 });
    s.addText("64%", { x: 5.5, y: 1.78, w: 4.0, h: 1.0, fontFace: F, fontSize: 60, bold: true, color: MINT, align: "center", margin: 0 });
    s.addText("contribution margin per shipment", { x: 5.5, y: 2.85, w: 4.0, h: 0.4, fontFace: F, fontSize: 13, color: "C9D2CC", align: "center", margin: 0 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.5, y: 3.7, w: 4.0, h: 1.35, fill: { color: TINT }, rectRadius: 0.09 });
    s.addText([
      { text: "Letterbox physics do the work: ", options: { bold: true, color: INK } },
      { text: "no parcels, no missed deliveries, £2 postage — toothpaste is a near-perfect subscription object.", options: { color: MUTED } }
    ], { x: 5.75, y: 3.85, w: 3.5, h: 1.05, fontFace: F, fontSize: 12, margin: 0, lineSpacingMultiple: 1.15 });
  }

  // ---------- SLIDE 6 — Unit Economics ----------
  {
    const s = pres.addSlide();
    s.background = { color: PAPER };
    s.addText("Unit economics, stress-tested.", { x: 0.5, y: 0.35, w: 9, h: 0.6, fontFace: F, fontSize: 32, bold: true, color: INK, margin: 0 });
    s.addText("LTV figures are contribution (revenue minus £5.70 landed cost), not revenue. All ex-VAT; benchmarks until test data replaces them.", {
      x: 0.5, y: 1.0, w: 9, h: 0.4, fontFace: F, fontSize: 12.5, color: MUTED, margin: 0
    });

    // 3 stat cards
    const stats = [
      ["£85", "contribution LTV", "at 6% monthly churn — ~17-month life, ~8 shipments × £10.30"],
      ["£28", "paid CAC ceiling", "at a 3:1 LTV:CAC discipline — payback on shipment two"],
      ["4–8%", "category churn", "replenishment personal care benchmark; under 6% is strong"],
    ];
    let sx = 0.5;
    for (const [big, label, sub] of stats) {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: sx, y: 1.6, w: 2.93, h: 2.0, fill: { color: CARD }, rectRadius: 0.09, shadow: shadow() });
      s.addText(big, { x: sx, y: 1.72, w: 2.93, h: 0.75, fontFace: F, fontSize: 44, bold: true, color: MINT_DARK, align: "center", margin: 0 });
      s.addText(label, { x: sx, y: 2.5, w: 2.93, h: 0.3, fontFace: F, fontSize: 13, bold: true, color: INK, align: "center", margin: 0 });
      s.addText(sub, { x: sx + 0.2, y: 2.82, w: 2.53, h: 0.7, fontFace: F, fontSize: 10.5, color: MUTED, align: "center", margin: 0, lineSpacingMultiple: 1.1 });
      sx += 3.14;
    }

    // sensitivity strip
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 3.85, w: 9.0, h: 1.15, fill: { color: TINT }, rectRadius: 0.09 });
    s.addText([
      { text: "Stress test, shown not hidden:  ", options: { bold: true, color: INK } },
      { text: "8% churn → LTV ~£64, CAC ceiling ~£21.  VAT registration → margin ~57%, LTV ~£64.  ", options: { color: INK } },
      { text: "Both cases still clear a £15–20 CAC.", options: { bold: true, color: MINT_DARK } }
    ], { x: 0.75, y: 4.0, w: 8.5, h: 0.85, fontFace: F, fontSize: 13, margin: 0, lineSpacingMultiple: 1.2 });
  }

  // ---------- SLIDE 7 — Go-To-Market ----------
  {
    const s = pres.addSlide();
    s.background = { color: PAPER };
    s.addText("Marketing the anti-fake way.", { x: 0.5, y: 0.35, w: 9, h: 0.6, fontFace: F, fontSize: 32, bold: true, color: INK, margin: 0 });
    s.addText("No gurus, no fake before/afters. Show the whole tape — every invoice, every supplier, every mistake, in public.", {
      x: 0.5, y: 1.0, w: 9, h: 0.4, fontFace: F, fontSize: 14, color: MUTED, margin: 0
    });

    const gtm = [
      ["FaVideo", "Founder-led content", "Build-in-public in the anti-fake voice: “I haven't made this yet. £5 holds your spot and I'll show you every invoice.”"],
      ["FaUsers", "Owned audience seed", "Existing audience = near-zero CAC first customers, deposit list, and the first 100 subscribers."],
      ["FaCrosshairs", "Tested, not guessed", "£150 two-angle ad test (ingredients-led vs never-run-out-led) picks the winning message before real budget follows."],
      ["FaGift", "The letterbox moment", "The one visible moment of an invisible product — mailer designed to be worth posting the day it lands."],
    ];
    // 2x2 grid
    const gw = 4.4, gh = 1.55;
    const positions = [[0.5, 1.65], [5.1, 1.65], [0.5, 3.4], [5.1, 3.4]];
    gtm.forEach(([ic, h, b], i) => {
      const [gx, gy] = positions[i];
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: gx, y: gy, w: gw, h: gh, fill: { color: CARD }, rectRadius: 0.09, shadow: shadow() });
      circleIcon(s, pres, icMintDark[ic], gx + 0.22, gy + 0.22, 0.5, TINT);
      s.addText(h, { x: gx + 0.88, y: gy + 0.22, w: gw - 1.05, h: 0.32, fontFace: F, fontSize: 14, bold: true, color: INK, margin: 0 });
      s.addText(b, { x: gx + 0.88, y: gy + 0.56, w: gw - 1.05, h: 0.9, fontFace: F, fontSize: 10.5, color: MUTED, margin: 0, lineSpacingMultiple: 1.12 });
    });
  }

  // ---------- SLIDE 8 — Costs & The Ask ----------
  {
    const s = pres.addSlide();
    s.background = { color: PAPER };
    s.addText("Capital follows evidence — three gates.", { x: 0.5, y: 0.35, w: 9, h: 0.6, fontFace: F, fontSize: 32, bold: true, color: INK, margin: 0 });
    s.addText("Each phase has a pre-agreed kill/go line. Money is only ever risked on the next gate, never the whole vision.", {
      x: 0.5, y: 1.0, w: 9, h: 0.4, fontFace: F, fontSize: 14, color: MUTED, margin: 0
    });

    const phases = [
      ["A", "£200", "The Proof", "14-day fake-door test. £5 refundable deposits, two ad angles.", "GO: ≥50 deposits.  WALK: <20 — total loss £200."],
      ["B", "£2–4k", "White-Label Pilot", "500–1k branded tubes, real subscription, real letterboxes. CPSR/SCPN-notified supplier formula.", "GO: month-2 churn ≤8% and paid CAC ≤£25."],
      ["C", "£15–40k", "Full Monte", "Own custom formula (10k MOQ), full brand system, founding-member price lock.", "Only unlocked by B's data — never by faith."],
    ];
    let px = 0.5;
    for (const [tag, cost, name, body, gate] of phases) {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px, y: 1.6, w: 2.85, h: 3.35, fill: { color: tag === "A" ? INK : CARD }, rectRadius: 0.09, shadow: shadow() });
      const fg = tag === "A" ? PAPER : INK;
      const sub2 = tag === "A" ? "C9D2CC" : MUTED;
      s.addShape(pres.shapes.OVAL, { x: px + 0.22, y: 1.82, w: 0.5, h: 0.5, fill: { color: MINT } });
      s.addText(tag, { x: px + 0.22, y: 1.82, w: 0.5, h: 0.5, fontFace: F, fontSize: 18, bold: true, color: INK, align: "center", valign: "middle", margin: 0 });
      s.addText(cost, { x: px + 0.85, y: 1.84, w: 1.9, h: 0.45, fontFace: F, fontSize: 22, bold: true, color: tag === "A" ? MINT : MINT_DARK, margin: 0 });
      s.addText(name, { x: px + 0.22, y: 2.5, w: 2.45, h: 0.35, fontFace: F, fontSize: 15, bold: true, color: fg, margin: 0 });
      s.addText(body, { x: px + 0.22, y: 2.9, w: 2.45, h: 1.0, fontFace: F, fontSize: 10.5, color: sub2, margin: 0, lineSpacingMultiple: 1.12 });
      s.addText(gate, { x: px + 0.22, y: 4.0, w: 2.45, h: 0.85, fontFace: F, fontSize: 10, bold: true, color: tag === "A" ? MINT : MINT_DARK, margin: 0, lineSpacingMultiple: 1.12 });
      if (tag !== "C") s.addText("→", { x: px + 2.85, y: 3.0, w: 0.3, h: 0.5, fontFace: F, fontSize: 22, bold: true, color: MUTED, align: "center", margin: 0 });
      px += 3.17;
    }
  }

  // ---------- SLIDE 9 — Why Me ----------
  {
    const s = pres.addSlide();
    s.background = { color: PAPER };
    s.addText("Why me.", { x: 0.5, y: 0.35, w: 9, h: 0.6, fontFace: F, fontSize: 32, bold: true, color: INK, margin: 0 });

    const rows = [
      ["FaChartLine", "Already operating DTC", "Running Shopify brands today (Brikko) — store, payments, fulfilment, and ads infrastructure exist on day one."],
      ["FaUsers", "Audience before product", "An owned audience that already buys the taste — the launch channel most founders spend years buying."],
      ["FaReceipt", "The anti-fake voice", "“Show every invoice” isn't a slogan, it's how the brands are already run — and it's the marketing plan itself."],
      ["FaCheckCircle", "Discipline over hype", "This deck was built gate-first: the founder's own plan forbids spending £15k before 50 strangers pay £5."],
    ];
    let ry = 1.35;
    for (const [ic, h, b] of rows) {
      circleIcon(s, pres, icMintDark[ic], 0.5, ry, 0.55, TINT);
      s.addText(h, { x: 1.25, y: ry - 0.02, w: 8.2, h: 0.35, fontFace: F, fontSize: 15, bold: true, color: INK, margin: 0 });
      s.addText(b, { x: 1.25, y: ry + 0.33, w: 8.25, h: 0.5, fontFace: F, fontSize: 12, color: MUTED, margin: 0, lineSpacingMultiple: 1.1 });
      ry += 1.0;
    }
  }

  // ---------- SLIDE 10 — The Vision ----------
  {
    const s = pres.addSlide();
    s.background = { color: DARK };
    s.addText("THE VISION", { x: 0.5, y: 0.5, w: 9, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: MINT, charSpacing: 3, margin: 0 });
    s.addText([
      { text: "The default subscription brand for the boring bathroom essentials.\n", options: { color: PAPER } },
      { text: "Toothpaste is SKU one.", options: { color: MINT } }
    ], { x: 0.5, y: 1.3, w: 9, h: 1.9, fontFace: F, fontSize: 34, bold: true, margin: 0, lineSpacingMultiple: 1.15 });
    s.addText("Every product in the cupboard that people resent re-buying is a future SKU — earned one gate at a time, in public, with the receipts shown.", {
      x: 0.5, y: 3.35, w: 8.4, h: 0.7, fontFace: F, fontSize: 15, color: "9AA59F", margin: 0, lineSpacingMultiple: 1.2
    });
    circleIcon(s, pres, icDarkOnMint.FaTooth, 0.5, 4.55, 0.55, MINT);
    s.addText("BADMOUTH  ·  never think about toothpaste again", {
      x: 1.25, y: 4.63, w: 8, h: 0.4, fontFace: F, fontSize: 13, bold: true, color: PAPER, margin: 0
    });
  }

  await pres.writeFile({ fileName: "Badmouth-Deck-v1.pptx" });
  console.log("done");
}

main().catch(e => { console.error(e); process.exit(1); });
