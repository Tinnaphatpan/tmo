import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EN } from "./en";
import { TH } from "./th";

const SRC = path.resolve(__dirname, "../..");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.|[\\/]i18n[\\/]/.test(p) ? [p] : [];
  });
}

/** Every literal key passed to t("…") in the app source. */
function usedKeys(): Map<string, string> {
  const keys = new Map<string, string>();
  for (const file of sourceFiles(SRC)) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
      keys.set(JSON.parse(`"${m[1]}"`), path.relative(SRC, file));
    }
  }
  return keys;
}

describe("i18n dictionaries (th.ts / en.ts)", () => {
  it("has the same keys in th.ts and en.ts", () => {
    const th = Object.keys(TH);
    const en = Object.keys(EN);
    expect(th.filter((k) => !(k in EN))).toEqual([]); // missing English
    expect(en.filter((k) => !(k in TH))).toEqual([]); // missing Thai
  });

  it("defines every t(\"key\") used in the app in both files", () => {
    const missing = [...usedKeys()]
      .filter(([key]) => !(key in TH) || !(key in EN))
      .map(([key, file]) => `${file}: ${key}`);
    expect(missing).toEqual([]);
  });

  it("keeps placeholders identical between Thai and English text", () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const bad = Object.keys(TH).filter(
      (key) => JSON.stringify(placeholders(TH[key])) !== JSON.stringify(placeholders(EN[key] ?? "")),
    );
    expect(bad).toEqual([]);
  });
});
