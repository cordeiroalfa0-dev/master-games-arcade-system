import fs from "node:fs";
const file = "roms-manifest.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const removed = new Set(["adults.zip", "dinoj.zip"]);
const before = (data.files || []).length;
data.files = (data.files || []).filter((item) => !removed.has(String(item.name || "")));
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ before, after: data.files.length, removed: before - data.files.length }));
