import { mkdir, writeFile } from "node:fs/promises";

const base = (process.env.NEXT_PUBLIC_DATA_BASE_URL || "").replace(/\/$/, "");
const source = process.env.SEEN_IT_CATALOG_URL || (base ? `${base}/catalog.json` : "");

if (!source) {
  console.log("No remote catalog configured; keeping any existing local catalog.");
  process.exit(0);
}

const response = await fetch(source);
if (!response.ok) {
  throw new Error(`Catalog download failed with HTTP ${response.status}`);
}

const bytes = new Uint8Array(await response.arrayBuffer());
const raw = new TextDecoder().decode(bytes);
const catalog = JSON.parse(raw);

const ASCII = /^[\x20-\x7E]*$/;
const MARKS = /[\u0300-\u036f]/g;
const ARABIC_MARKS = /[ـً-ْ]/g;
const NON_WORD = /[^\p{L}\p{N}]+/gu;

function normalise(value) {
  const lower = String(value || "").toLowerCase();
  if (ASCII.test(lower)) return lower.replace(NON_WORD, " ").trim();
  return lower
    .normalize("NFKD")
    .replace(MARKS, "")
    .replace(ARABIC_MARKS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(NON_WORD, " ")
    .trim();
}

const rows = Array.isArray(catalog.t) ? catalog.t : [];
const hay = new Array(rows.length);
const fame = Array.from({ length: rows.length }, (_, index) => index);

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const en = row[2] || "";
  const ar = row[3] || en;
  const original = row[17] || "";
  hay[i] = `${normalise(en)} ${normalise(ar)} ${normalise(original)}`;
}

fame.sort((a, b) => Number(rows[b]?.[12] || 0) - Number(rows[a]?.[12] || 0));

await mkdir("public", { recursive: true });
await Promise.all([
  writeFile("public/catalog.json", bytes),
  writeFile(
    "public/catalog-search-index.json",
    JSON.stringify({ v: 1, h: hay, f: fame }),
    "utf8",
  ),
]);

console.log(`Prepared local production catalog (${bytes.byteLength} bytes, ${rows.length} titles) and search index.`);
