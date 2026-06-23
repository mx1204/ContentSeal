import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outDir = path.join(process.cwd(), "demo", "assets");

function posterSvg({ title, date, accent = "#d89a35" }) {
  return `
    <svg width="900" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="600" fill="#f7f5ef"/>
      <rect x="60" y="60" width="780" height="480" rx="8" fill="#345144"/>
      <rect x="95" y="95" width="710" height="410" rx="6" fill="#17211c" opacity="0.24"/>
      <text x="120" y="185" font-size="72" fill="#ffffff" font-family="Arial" font-weight="700">${title}</text>
      <text x="120" y="288" font-size="48" fill="#dbeade" font-family="Arial">${date}</text>
      <text x="120" y="365" font-size="34" fill="#f7f5ef" font-family="Arial">Main Hall, Singapore</text>
      <circle cx="718" cy="392" r="82" fill="${accent}"/>
      <text x="676" y="408" font-size="34" fill="#17211c" font-family="Arial" font-weight="700">OS</text>
    </svg>
  `;
}

function unknownAiStyleSvg() {
  return `
    <svg width="900" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#274c77"/>
          <stop offset="0.5" stop-color="#6096ba"/>
          <stop offset="1" stop-color="#e7ecef"/>
        </linearGradient>
      </defs>
      <rect width="900" height="600" fill="url(#sky)"/>
      <path d="M0 520 C120 420 230 455 350 380 C490 290 620 340 900 190 L900 600 L0 600 Z" fill="#17211c"/>
      <path d="M90 500 C220 420 330 455 450 360 C570 268 720 310 900 245 L900 600 L90 600 Z" fill="#345144" opacity="0.86"/>
      <circle cx="670" cy="150" r="70" fill="#f7f5ef" opacity="0.9"/>
      <path d="M230 420 Q450 220 665 420" fill="none" stroke="#d89a35" stroke-width="26" opacity="0.86"/>
      <path d="M250 454 Q450 270 650 454" fill="none" stroke="#ffffff" stroke-width="11" opacity="0.72"/>
    </svg>
  `;
}

async function pngFromSvg(svg) {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

await mkdir(outDir, { recursive: true });

const original = await pngFromSvg(
  posterSvg({
    title: "ContentSeal Summit",
    date: "27 June 2026"
  })
);
await writeFile(path.join(outDir, "01-original-proof.png"), original);

const edited = await pngFromSvg(
  posterSvg({
    title: "ContentSeal Summit",
    date: "29 June 2026",
    accent: "#b95f43"
  })
);
await writeFile(path.join(outDir, "02-edited-copy.png"), edited);

const screenshot = await sharp({
  create: {
    width: 900,
    height: 720,
    channels: 4,
    background: "#202020"
  }
})
  .composite([
    {
      input: original,
      left: 0,
      top: 58
    },
    {
      input: Buffer.from(`
        <svg width="900" height="720" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="900" height="58" fill="#101010"/>
          <rect x="0" y="658" width="900" height="62" fill="#101010"/>
          <text x="28" y="38" font-size="24" fill="#ffffff" font-family="Arial">Chat screenshot</text>
          <text x="28" y="698" font-size="22" fill="#bdbdbd" font-family="Arial">Forwarded image</text>
        </svg>
      `),
      left: 0,
      top: 0
    }
  ])
  .png()
  .toBuffer();
await writeFile(path.join(outDir, "03-screenshot-repost.png"), screenshot);

const unknown = await pngFromSvg(unknownAiStyleSvg());
await writeFile(path.join(outDir, "04-unknown-ai-style.png"), unknown);

console.log(`Demo assets written to ${outDir}`);
