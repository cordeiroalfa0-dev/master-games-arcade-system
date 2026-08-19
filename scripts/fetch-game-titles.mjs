import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("roms-manifest.json", "utf8"));
const existing = JSON.parse(fs.readFileSync("public/game-titles.json", "utf8"));
const names = (manifest.files || [])
  .map((f) => String(f.name || "").replace(/\.(zip|7z|chd)$/i, ""))
  .filter(Boolean);
const out = { ...existing };
const report = [];

for (let i = 0; i < names.length; i++) {
  const rom = names[i];
  process.stdout.write(`[${i + 1}/${names.length}] ${rom} ... `);
  try {
    const url = `https://adb.arcadeitalia.net/service_scraper.php?ajax=query_mame&lang=en&game_name=${encodeURIComponent(rom)}`;
    const response = await fetch(url, { headers: { "User-Agent": "MasterGamesArcade-title-updater/1.0" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const result = data?.result;
    const item = Array.isArray(result) ? result[0] : result;
    const title = String(item?.title || item?.name || "").trim();
    if (title) {
      out[rom] = title;
      report.push({ rom, title, source: "Arcade Database" });
      console.log(title);
    } else {
      report.push({ rom, title: out[rom] || rom, source: out[rom] ? "existing" : "fallback" });
      console.log(out[rom] || rom);
    }
  } catch (error) {
    report.push({ rom, title: out[rom] || rom, source: out[rom] ? "existing" : "fallback", error: String(error.message || error) });
    console.log(`fallback: ${out[rom] || rom}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 160));
}

fs.writeFileSync("public/game-titles.json", `${JSON.stringify(out, null, 2)}\n`, "utf8");
fs.writeFileSync("scripts/game-title-report.json", `${JSON.stringify({ total: names.length, updated: report.filter((r) => r.source === "Arcade Database").length, report }, null, 2)}\n`, "utf8");
console.log(`Concluído: ${names.length} ROMs processadas.`);
