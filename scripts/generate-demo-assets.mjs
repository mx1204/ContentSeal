import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const demoOutDir = path.join(process.cwd(), "demo", "assets");
const publicOutDir = path.join(process.cwd(), "public", "demo", "assets");

function posterSvg({ date, status, accent, warning = false }) {
  return `
    <svg width="1080" height="720" viewBox="0 0 1080 720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#07100d"/>
          <stop offset="0.55" stop-color="#10251d"/>
          <stop offset="1" stop-color="#050807"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="28" stdDeviation="24" flood-color="#000000" flood-opacity="0.42"/>
        </filter>
      </defs>
      <rect width="1080" height="720" fill="url(#bg)"/>
      <g opacity="0.16" stroke="#6ee7d8" stroke-width="1">
        <path d="M80 110H1000M80 220H1000M80 330H1000M80 440H1000M80 550H1000"/>
        <path d="M180 70V650M360 70V650M540 70V650M720 70V650M900 70V650"/>
      </g>
      <rect x="74" y="64" width="932" height="592" rx="34" fill="#101c17" stroke="#2c5245" filter="url(#shadow)"/>
      <rect x="112" y="104" width="856" height="92" rx="22" fill="#07100d" stroke="#2a463c"/>
      <text x="142" y="143" fill="${accent}" font-size="22" font-family="Cascadia Code, Consolas, monospace" font-weight="700">${status}</text>
      <text x="142" y="176" fill="#b7c8c0" font-size="21" font-family="Inter, Arial, sans-serif">ContentSeal public proof linked notice</text>
      <text x="122" y="310" fill="#eef8f2" font-size="72" font-family="Space Grotesk, Inter, Arial, sans-serif" font-weight="800">ContentSeal Summit</text>
      <text x="126" y="386" fill="${warning ? "#ff6b5c" : "#6ee7d8"}" font-size="50" font-family="Space Grotesk, Inter, Arial, sans-serif" font-weight="700">${date}</text>
      <text x="130" y="442" fill="#c8d8d0" font-size="28" font-family="Inter, Arial, sans-serif">Main Hall, Singapore / 10:00 SGT</text>
      <g transform="translate(742 282)">
        <rect width="194" height="194" rx="34" fill="#eef8f2"/>
        <rect x="28" y="28" width="26" height="26" fill="#07100d"/>
        <rect x="76" y="28" width="26" height="26" fill="#07100d"/>
        <rect x="124" y="28" width="42" height="26" fill="#07100d"/>
        <rect x="28" y="76" width="58" height="26" fill="#07100d"/>
        <rect x="106" y="76" width="26" height="26" fill="#07100d"/>
        <rect x="150" y="76" width="16" height="58" fill="#07100d"/>
        <rect x="28" y="124" width="26" height="42" fill="#07100d"/>
        <rect x="76" y="124" width="58" height="26" fill="#07100d"/>
        <rect x="124" y="166" width="42" height="8" fill="#07100d"/>
      </g>
      <rect x="126" y="540" width="236" height="58" rx="18" fill="#07100d" stroke="#345b4d"/>
      <text x="154" y="576" fill="#6ee7d8" font-size="20" font-family="Cascadia Code, Consolas, monospace">sha256: 8F91...A2C</text>
      <rect x="386" y="540" width="218" height="58" rx="18" fill="#07100d" stroke="#345b4d"/>
      <text x="414" y="576" fill="#9cff63" font-size="20" font-family="Cascadia Code, Consolas, monospace">pHash: strong</text>
      <rect x="628" y="540" width="258" height="58" rx="18" fill="#07100d" stroke="#345b4d"/>
      <text x="656" y="576" fill="#eef8f2" font-size="20" font-family="Cascadia Code, Consolas, monospace">AI use: assisted</text>
    </svg>
  `;
}

function unknownSvg() {
  return `
    <svg width="1080" height="720" viewBox="0 0 1080 720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#0a1020"/>
          <stop offset="0.5" stop-color="#17224a"/>
          <stop offset="1" stop-color="#07100d"/>
        </linearGradient>
        <radialGradient id="r" cx="50%" cy="42%" r="58%">
          <stop offset="0" stop-color="#5b8cff" stop-opacity="0.95"/>
          <stop offset="0.46" stop-color="#16c8a0" stop-opacity="0.42"/>
          <stop offset="1" stop-color="#050807" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1080" height="720" fill="url(#g)"/>
      <rect width="1080" height="720" fill="url(#r)"/>
      <g fill="none" stroke="#eef8f2" stroke-opacity="0.2" stroke-width="2">
        <path d="M120 536C280 284 426 306 540 172C648 304 794 288 954 536"/>
        <path d="M172 550C310 374 428 406 540 260C650 404 766 376 910 550"/>
      </g>
      <circle cx="540" cy="336" r="122" fill="#eef8f2" opacity="0.08" stroke="#6ee7d8" stroke-width="3"/>
      <text x="118" y="120" fill="#eef8f2" font-size="34" font-family="Space Grotesk, Inter, Arial, sans-serif" font-weight="800">Unknown Visual Claim</text>
      <text x="118" y="166" fill="#b7c8c0" font-size="24" font-family="Inter, Arial, sans-serif">No matching proof receipt in local demo database</text>
      <rect x="118" y="560" width="380" height="64" rx="20" fill="#050807" opacity="0.72" stroke="#5b8cff"/>
      <text x="148" y="599" fill="#9cff63" font-size="21" font-family="Cascadia Code, Consolas, monospace">status: no_verified_origin</text>
    </svg>
  `;
}

async function pngFromSvg(svg) {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function writeAsset(name, buffer) {
  await writeFile(path.join(demoOutDir, name), buffer);
  await writeFile(path.join(publicOutDir, name), buffer);
}

await mkdir(demoOutDir, { recursive: true });
await mkdir(publicOutDir, { recursive: true });

const original = await pngFromSvg(
  posterSvg({
    date: "27 June 2026",
    status: "OFFICIAL PROOF",
    accent: "#9cff63"
  })
);
await writeAsset("01-original-proof.png", original);

const edited = await pngFromSvg(
  posterSvg({
    date: "29 June 2026",
    status: "MODIFIED COPY",
    accent: "#ff6b5c",
    warning: true
  })
);
await writeAsset("02-edited-copy.png", edited);

const screenshot = await sharp({
  create: {
    width: 1080,
    height: 820,
    channels: 4,
    background: "#050807"
  }
})
  .composite([
    {
      input: Buffer.from(`
        <svg width="1080" height="820" xmlns="http://www.w3.org/2000/svg">
          <rect width="1080" height="820" fill="#050807"/>
          <rect x="0" y="0" width="1080" height="50" fill="#101c17"/>
          <circle cx="42" cy="25" r="9" fill="#9cff63"/>
          <text x="68" y="32" fill="#eef8f2" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="700">Forwarded screenshot</text>
          <text x="800" y="32" fill="#b7c8c0" font-size="18" font-family="Inter, Arial, sans-serif">metadata stripped</text>
          <rect x="0" y="770" width="1080" height="50" fill="#101c17"/>
          <text x="68" y="802" fill="#b7c8c0" font-size="18" font-family="Inter, Arial, sans-serif">Saved from chat as PNG</text>
        </svg>
      `),
      left: 0,
      top: 0
    },
    {
      input: original,
      left: 0,
      top: 50
    }
  ])
  .png()
  .toBuffer();
await writeAsset("03-screenshot-repost.png", screenshot);

await writeAsset("04-unknown-ai-style.png", await pngFromSvg(unknownSvg()));

console.log(`Demo assets written to ${demoOutDir} and ${publicOutDir}`);
