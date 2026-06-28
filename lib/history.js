import fs from "node:fs";
import path from "node:path";

const MAX_SNAPSHOTS = 120;

export function readHistory(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendSnapshot(filePath, snapshot) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const history = readHistory(filePath);
  history.unshift(snapshot);
  const trimmed = history.slice(0, MAX_SNAPSHOTS);
  fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2));
  return trimmed;
}
