import fs from "fs";
import path from "path";

export function readOffset(file: string): number {
  try {
    const s = fs.readFileSync(file, "utf8").trim();
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

export function writeOffset(file: string, offset: number): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, `${offset}\n`, "utf8");
}

