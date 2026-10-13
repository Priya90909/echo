import sharp from "sharp";
import { createHash } from "node:crypto";
const escape = (s) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
const palettes = [
  ["#111c2d", "#649faa", "#edb77e"],
  ["#261832", "#aa6da0", "#f0c9b6"],
  ["#152e27", "#679b72", "#dcc999"],
  ["#1a2041", "#737ed0", "#eca693"],
  ["#542c24", "#be754c", "#f6d19d"],
  ["#162b3b", "#518ca9", "#dce6d1"],
  ["#3c2537", "#b45979", "#edc986"],
  ["#242a25", "#95a183", "#e8dec0"],
];
/** Original editorial artwork, not an artist's official album cover. */
export async function catalogCover(title, genre, index) {
  const hash = createHash("sha256").update(title).digest();
  const [dark, color, light] = palettes[hash[0] % palettes.length];
  const variant = hash[1] % 5;
  const sunX = 140 + hash[2],
    sunY = 110 + hash[3] / 2;
  const stars = Array.from(
    { length: 32 },
    (_, i) =>
      `<circle cx="${30 + ((hash[i % 32] * 2.3) % 580)}" cy="${35 + ((hash[(i + 5) % 32] * 1.1) % 265)}" r="${i % 3 === 0 ? 1.8 : 1}" fill="${light}" opacity=".45"/>`,
  ).join("");
  const landscape = `<circle cx="${sunX}" cy="${sunY}" r="88" fill="${light}" opacity=".8"/><path d="M-20 365L75 235L170 300L280 160L420 310L530 250L690 345V650H-20Z" fill="${color}"/><path d="M-20 440L150 325L290 435L455 285L690 445V650H-20Z" fill="${dark}" opacity=".75"/>`;
  const circles = `<g transform="translate(320 270) rotate(-28)"><ellipse rx="155" ry="155" fill="url(#sphere)"/><ellipse rx="245" ry="50" fill="none" stroke="${light}" stroke-width="3"/><ellipse rx="210" ry="37" fill="none" stroke="${color}" stroke-width="9" opacity=".65"/></g>${stars}`;
  const waves = Array.from(
    { length: 13 },
    (_, i) =>
      `<path d="M-20 ${180 + i * 24}Q130 ${20 + i * 25} 320 ${180 + i * 24}T660 ${180 + i * 24}" fill="none" stroke="${i % 2 ? light : color}" stroke-width="${i % 3 === 0 ? 12 : 2}" opacity="${0.2 + i * 0.025}"/>`,
  ).join("");
  const city = Array.from({ length: 15 }, (_, i) => {
    const h = 90 + hash[i % 32];
    return (
      `<rect x="${i * 47 - 20}" y="${440 - h}" width="42" height="${h + 120}" fill="${i % 2 ? dark : color}" opacity=".8"/>` +
      Array.from(
        { length: 5 },
        (_, j) =>
          `<rect x="${i * 47 - 9}" y="${455 - h + j * 27}" width="4" height="8" fill="${light}" opacity="${j % 2 ? 0.4 : 0.8}"/>`,
      ).join("")
    );
  }).join("");
  const vinyl = `<circle cx="320" cy="275" r="188" fill="${dark}"/>${Array.from({ length: 14 }, (_, i) => `<circle cx="320" cy="275" r="${62 + i * 8}" fill="none" stroke="${color}" stroke-width="1" opacity=".5"/>`).join("")}<circle cx="320" cy="275" r="64" fill="${light}"/><circle cx="320" cy="275" r="8" fill="${dark}"/><path d="M130 100L475 430" stroke="white" stroke-width="100" opacity=".04"/>`;
  const lines = [];
  for (const word of title.split(" ")) {
    if (!lines.length || lines.at(-1).length + word.length > 22)
      lines.push(word);
    else lines[lines.length - 1] += " " + word;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><defs><linearGradient id="bg" x2=".8" y2="1"><stop stop-color="${dark}"/><stop offset="1" stop-color="${color}"/></linearGradient><radialGradient id="sphere" cx=".3" cy=".25"><stop stop-color="${light}"/><stop offset=".45" stop-color="${color}"/><stop offset="1" stop-color="${dark}"/></radialGradient><linearGradient id="shade" x2="0" y2="1"><stop stop-color="${dark}" stop-opacity="0"/><stop offset="1" stop-color="${dark}" stop-opacity=".95"/></linearGradient><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".10"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter></defs><rect width="640" height="640" fill="url(#bg)"/>${[landscape, circles, waves, city, vinyl][variant]}<rect y="350" width="640" height="290" fill="url(#shade)"/><rect width="640" height="640" fill="transparent" filter="url(#grain)"/><text x="38" y="51" fill="${light}" font-family="sans-serif" font-size="12" letter-spacing="4">ECHO SELECTS / ${String(index + 1).padStart(2, "0")}</text><text x="38" y="450" fill="${light}" font-family="sans-serif" font-size="12" letter-spacing="3">${escape(genre.toUpperCase())}</text>${lines
    .slice(0, 3)
    .map(
      (line, i) =>
        `<text x="36" y="${500 + i * 40}" fill="#fff6e9" font-family="sans-serif" font-weight="700" font-size="34">${escape(line)}</text>`,
    )
    .join(
      "",
    )}<text x="38" y="608" fill="${light}" font-family="sans-serif" font-size="13" letter-spacing="2">KEVIN MACLEOD</text></svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 88 }).toBuffer();
}
