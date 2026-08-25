// 台本の「声のある行」を JSON に吐く（焼き込みスクリプトが読む）
import { writeFileSync } from "node:fs";
import { EP1 } from "../src/lib/learn/ep1.ts";
import { allLines } from "../src/lib/learn/types.ts";
const lines = allLines(EP1).map((l) => ({ id: l.id, who: l.who, text: l.text }));
writeFileSync(new URL("../public/learn/ep1/lines.json", import.meta.url), JSON.stringify({ ep: EP1.key, lines }, null, 1));
console.log(`${lines.length} lines (teacher ${lines.filter((l) => l.who === "teacher").length} / link ${lines.filter((l) => l.who === "link").length})`);
