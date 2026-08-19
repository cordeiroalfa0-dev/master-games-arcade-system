import fs from "node:fs";
const file = "public/game-titles.json";
const titles = JSON.parse(fs.readFileSync(file, "utf8"));
Object.assign(titles, {
  ssf2t: "Super Street Fighter II Turbo",
  ssf2: "Super Street Fighter II",
  sfz2ald: "Street Fighter Zero 2 Alpha (Japan)",
  sftm: "Street Fighter: The Movie",
  sfiii3: "Street Fighter III 3rd Strike",
  sfiii2n: "Street Fighter III 2nd Impact (Japan)",
  sfiii2: "Street Fighter III 2nd Impact",
  sfiii: "Street Fighter III: New Generation",
  sfexpul1: "Street Fighter EX Plus Alpha",
  sfex2pa: "Street Fighter EX2 Plus",
  sfa3: "Street Fighter Alpha 3",
  sfa2u: "Street Fighter Alpha 2 (USA)",
  sfa: "Street Fighter Alpha: Warriors' Dreams",
  sf2m8: "Street Fighter II: Champion Edition (M8)",
  sf2m7: "Street Fighter II: Champion Edition (M7)",
  sf2hf: "Street Fighter II: Hyper Fighting",
  sf2: "Street Fighter II: The World Warrior"
});
fs.writeFileSync(file, `${JSON.stringify(titles, null, 2)}\n`, "utf8");
console.log(`Títulos no catálogo: ${Object.keys(titles).length}`);
