/**
 * MAME Local Backend Server - v3.4
 * Cria a pasta roms dentro da instalação, baixa ROMs e configura os MAMEs.
 */

import http from "http";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";

const PORT = Number(process.env.MGA_PORT || process.env.PORT || 7777);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.MGA_USER_DATA || __dirname;
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const LOG_FILE = path.join(DATA_DIR, "launches.log");
const STATIC_ROOTS = [
  path.join(__dirname, "dist", "client"),
  path.join(__dirname, "dist"),
  path.join(__dirname, "public"),
];

function installedAppDir() {
  const explicit = process.env.MGA_INSTALL_DIR || "";
  if (explicit) return path.resolve(explicit);
  const exeDir = process.execPath ? path.dirname(process.execPath) : "";
  if (process.env.MGA_EMBEDDED === "1" && exeDir) return path.resolve(exeDir);
  if (process.versions && process.versions.electron && exeDir) return path.resolve(exeDir);
  if (process.resourcesPath) return path.resolve(path.dirname(process.resourcesPath));
  return "";
}

function systemRomsDir() {
  const installDir = installedAppDir();
  return installDir ? path.join(installDir, "roms") : path.join(DATA_DIR, "roms");
}

function serveFile(filePath, res) {
  res.writeHead(200, { "Content-Type": contentType(filePath) });
  fs.createReadStream(filePath).pipe(res);
}

function readConfig() {
  try { return cleanConfig(JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"))); } catch { return {}; }
}
// Só o que é pertinente fica no config.json: caminho do MAME, pasta das ROMs,
// emulador escolhido e data da última atualização. Chaves antigas são descartadas.
const CONFIG_KEYS = ["mamePath", "romsDir", "emulator", "updatedAt"];
function cleanConfig(data) {
  const out = {};
  for (const k of CONFIG_KEYS) {
    if (data && data[k] !== undefined && data[k] !== null && data[k] !== "") out[k] = data[k];
  }
  return out;
}
function writeConfig(data) {
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cleanConfig(data), null, 2), "utf8"); return true; } catch { return false; }
}
function appendLog(entry) {
  try { fs.appendFileSync(LOG_FILE, JSON.stringify({ ts: Date.now(), ...entry }) + "\n", "utf8"); } catch {}
}

function existingDirs(dirs) {
  const seen = new Set();
  return dirs
    .filter(Boolean)
    .map((d) => path.resolve(String(d)))
    .filter((d) => {
      if (seen.has(d)) return false;
      seen.add(d);
      try { return fs.existsSync(d) && fs.statSync(d).isDirectory(); } catch { return false; }
    });
}

function runtimeRoots() {
  const exeDir = process.execPath ? path.dirname(process.execPath) : "";
  const resourceDir = process.resourcesPath || path.join(exeDir || "", "resources");
  const asarUnpackedFromModule = /[\\/]app\.asar(?:[\\/]|$)/i.test(__dirname)
    ? path.join(__dirname.replace(/[\\/]app\.asar(?:[\\/].*)?$/i, ""), "app.asar.unpacked")
    : "";
  return existingDirs([
    installedAppDir(),
    DATA_DIR,
    __dirname,
    process.cwd(),
    exeDir,
    path.join(exeDir || "", "resources"),
    resourceDir,
    path.join(resourceDir, "app"),
    path.join(resourceDir, "app.asar.unpacked"),
    asarUnpackedFromModule,
    path.join(path.dirname(__dirname), "app.asar.unpacked"),
  ]);
}

function firstExistingFile(files) {
  for (const f of files) {
    try { if (f && fs.existsSync(f) && fs.statSync(f).isFile()) return path.resolve(f); } catch {}
  }
  return "";
}

function isForbiddenMameGui(filePath) {
  const base = path.basename(String(filePath || "")).toLowerCase();
  const full = String(filePath || "").toLowerCase();
  // mamepgui.exe abre a janela "Executável do MAME/MESS" — nunca deve ser usado.
  return /^(mamepgui|mamepui|mameui|m\+gui|arcade64)\.exe$/i.test(base)
    || /m\+gui|mamepgui|mamepui|mameui/i.test(full);
}

function firstSafeMameFile(files) {
  return firstExistingFile(files.filter((f) => !isForbiddenMameGui(f)));
}

function firstExistingDir(dirs) {
  for (const d of dirs) {
    try { if (d && fs.existsSync(d) && fs.statSync(d).isDirectory()) return path.resolve(d); } catch {}
  }
  return "";
}

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); return true; } catch { return false; }
}

function isWritableDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.mga-write-test-${process.pid}-${Date.now()}.tmp`);
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function isValidZipFile(filePath) {
  try {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size <= 1024) return false;
    const fd = fs.openSync(filePath, "r");
    const head = Buffer.alloc(4);
    fs.readSync(fd, head, 0, 4, 0);
    fs.closeSync(fd);
    return head[0] === 0x50 && head[1] === 0x4b;
  } catch {
    return false;
  }
}
function isValidWindowsExecutable(filePath) {
  try {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size <= 5 * 1024 * 1024) return false;
    const fd = fs.openSync(filePath, "r");
    const head = Buffer.alloc(2);
    fs.readSync(fd, head, 0, 2, 0);
    fs.closeSync(fd);
    return head[0] === 0x4d && head[1] === 0x5a;
  } catch {
    return false;
  }
}

function findMameExe(config = {}) {
  const explicit = config.mamePath || process.env.MGA_MAME_EXE || "";
  const explicitPath = firstExistingFile([explicit]);
  if (explicitPath && !isForbiddenMameGui(explicitPath)) return explicitPath;

  // Apenas binário de linha de comando. NUNCA cair no M+GUI/MAMEPUI (abre janela de GUI).
  const exeNames = process.platform === "win32"
    ? ["mamep64.exe", "mamep.exe", "mame64.exe", "mame.exe", "mamep64", "mame64", "mame"]
    : ["mamep64.exe", "mamep.exe", "mame64.exe", "mame.exe", "mamep64", "mame64", "mame"];
  const folders = [
    ".", "mame", "MAME", "Mame",
    "Mameplus_0.168.2", path.join("Mameplus_0.168.2", "Mameplus_0.168.2"),
    path.join("emulators", "mame168"),
  ];
  const candidates = [];
  for (const root of runtimeRoots()) {
    for (const folder of folders) {
      for (const exe of exeNames) candidates.push(path.join(root, folder, exe));
    }
  }
  return firstSafeMameFile(candidates);
}

// MAME baixado SEMPRE do Google Drive (pasta oficial do projeto).
const BUNDLED_EMULATORS = [
  {
    id: "mame168",
    label: "MAMEPlus 0.168.2",
    folder: "mame168",
    // Primeira fonte: Google Drive. Fallback validado: MAMEPlus direto do Archive.org.
    kind: "exe",
    exeName: "mamep64.exe",
    driveId: "1h1_7swCaLBeSntxojjzf2XAoR_8kXdmf",
    downloadUrl: "https://archive.org/download/mame0168-official-windows64/mame0168b_64bit.exe",
    extras: [{ name: "mame.ini", driveId: "1HAECQInFTxMR73RDEd4yD76ZjNgJMQXt" }],
    sfxSize: 36220021,
  },
];

function findBundledEmulator(id) {
  const meta = BUNDLED_EMULATORS.find((e) => e.id === id);
  if (!meta) return "";
  const exeNames = process.platform === "win32"
    ? ["mamep64.exe", "mamep.exe", "mame64.exe", "mame.exe", "mamep64", "mame64", "mame"]
    : ["mamep64.exe", "mamep.exe", "mame64.exe", "mame.exe", "mamep64", "mame64", "mame"];
  const candidates = [];
  for (const root of runtimeRoots()) {
    for (const exe of exeNames) {
      candidates.push(path.join(root, "emulators", meta.folder, exe));
    }
  }
  return firstSafeMameFile(candidates);
}

function emulatorsBaseDir() {
  const installDir = installedAppDir();
  const base = installDir ? path.join(installDir, "emulators") : path.join(DATA_DIR, "emulators");
  ensureDir(base);
  return base;
}

function emulatorTargetDir(meta) {
  return path.join(emulatorsBaseDir(), meta.folder);
}

function listBundledEmulators() {
  return BUNDLED_EMULATORS.map((e) => ({ ...e, path: findBundledEmulator(e.id), available: !!findBundledEmulator(e.id) }));
}

function findRomsDir(config = {}, mamePath = "") {
  // A pasta escolhida pelo usuário sempre tem prioridade sobre a pasta interna.
  // Só usamos a pasta do sistema quando não há uma pasta explícita configurada.
  const explicit = config.romsDir || config.romsPath || process.env.MGA_ROMS_DIR || "";
  const explicitPath = firstExistingDir([explicit]);
  if (explicitPath) return explicitPath;
  const systemDir = systemRomsDir();
  if (ensureDir(systemDir) && firstExistingDir([systemDir])) return path.resolve(systemDir);

  const candidates = [];
  if (mamePath) {
    const mameDir = path.dirname(mamePath);
    candidates.push(path.join(mameDir, "roms"), path.join(path.dirname(mameDir), "roms"));
  }
  for (const root of runtimeRoots()) {
    candidates.push(path.join(root, "roms"), path.join(root, "ROMs"), path.join(root, "Roms"), path.join(root, "Mameplus_0.168.2", "roms"), path.join(root, "Mameplus_0.168.2", "Mameplus_0.168.2", "roms"));
  }
    return firstExistingDir(candidates);
}
function isFullDownloadedMame(filePath) {
  try { return isValidWindowsExecutable(filePath) && fs.statSync(filePath).size >= 100 * 1024 * 1024; } catch { return false; }
}
function findNearbyMameCore(romsDir) {
  if (!romsDir) return "";
  const dir = path.resolve(String(romsDir));
  const candidates = [
    path.join(path.dirname(dir), "mamep64.exe"),
    path.join(path.dirname(dir), "mame64.exe"),
    path.join(path.dirname(path.dirname(dir)), "mamep64.exe"),
    path.join(path.dirname(path.dirname(dir)), "mame64.exe"),
    path.join(dir, "mamep64.exe"),
    path.join(dir, "mame64.exe"),
  ];
  return candidates.map((f) => firstExistingFile([f])).filter(Boolean).find(isValidWindowsExecutable) || "";
}
function writeMamePguiConfig(mameGuiPath, mameCorePath) {
  if (!mameGuiPath || !mameCorePath) return "";
  const guiDir = path.dirname(mameGuiPath);
  const cfgDir = path.join(guiDir, ".mamepgui");
  ensureDir(cfgDir);
  const iniPath = path.join(cfgDir, "mamepgui.ini");
  const portableCore = String(path.resolve(mameCorePath)).replace(/\\/g, "/");
  fs.writeFileSync(iniPath, `[General]\nmame_binary=${portableCore}\n`, "utf8");
  return iniPath;
}
function findNearbyMame(romsDir) {
  if (!romsDir) return "";
  const dir = path.resolve(String(romsDir));
  const candidates = [
    path.join(dir, "mamep64.exe"),
    path.join(dir, "mame64.exe"),
    path.join(path.dirname(dir), "mamep64.exe"),
    path.join(path.dirname(dir), "mame64.exe"),
    path.join(path.dirname(path.dirname(dir)), "mamep64.exe"),
    path.join(path.dirname(path.dirname(dir)), "mame64.exe"),
  ];
  // Somente o binário de linha de comando. A GUI (mamepgui.exe) nunca é usada.
  const existing = candidates.map((f) => firstExistingFile([f])).filter(Boolean).filter((f) => !isForbiddenMameGui(f));
  return existing.find(isFullDownloadedMame) || existing[0] || "";
}
// ============ ROM DOWNLOADER (Google Drive) ============
function dedupeRomFiles(files) {
  const seen = new Set();
  return (files || []).filter((f) => {
    const key = String(f?.name || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function loadRomManifest() {
  const candidates = [];
  for (const root of runtimeRoots()) {
    candidates.push(path.join(root, "roms-manifest.json"));
    candidates.push(path.join(root, "resources", "roms-manifest.json"));
  }
  const f = firstExistingFile(candidates);
  if (!f) return { files: [] };
  try {
    const manifest = JSON.parse(fs.readFileSync(f, "utf8"));
    return { ...manifest, files: dedupeRomFiles(manifest.files) };
  } catch { return { files: [] }; }
}

function defaultRomsTarget(cfg) {
  const systemDir = systemRomsDir();
  const candidates = [
    systemDir,
    cfg.romsDir && path.resolve(cfg.romsDir),
    path.join(DATA_DIR, "roms"),
  ].filter(Boolean);
  for (const target of candidates) {
    if (isWritableDir(target)) return target;
  }
  const fallback = path.join(DATA_DIR, "roms");
  ensureDir(fallback);
  return fallback;
}

function configureBundledEmulatorsForRoms(romsDir) {
  const configured = [];
  if (!romsDir) return configured;
  ensureDir(romsDir);
  for (const emu of listBundledEmulators()) {
    if (!emu.available || !emu.path) continue;
    const mameDir = path.dirname(emu.path);
    try {
      writeMameIniKey(mameDir, "rompath", romsDir);
      writeDefaultControls(mameDir);
      configured.push({ id: emu.id, path: emu.path, rompath: romsDir });
    } catch (err) {
      appendLog({ type: "emulator-config-error", emulator: emu.id, error: String(err.message || err) });
    }
  }
  return configured;
}

function cleanupPartial(filePath) {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

// Download 1 file from Google Drive via drive.usercontent.google.com (public files)
function downloadDriveFile(id, destPath) {
  return new Promise((resolve, reject) => {
    const url = `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
    const tmp = destPath + ".part";
    const expectZip = /\.zip$/i.test(destPath);
    cleanupPartial(tmp);
    const doGet = (u, redirects = 0) => {
      const req = https.get(u, { headers: { "User-Agent": "Mozilla/5.0 MGA-Downloader" } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
          res.resume();
          return doGet(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const total = parseInt(res.headers["content-length"] || "0", 10);
        let got = 0;
        let header = Buffer.alloc(0);
        let rejected = false;
        const out = fs.createWriteStream(tmp);
        const fail = (err) => {
          if (rejected) return;
          rejected = true;
          res.destroy();
          out.destroy();
          cleanupPartial(tmp);
          reject(err);
        };
        res.on("data", (c) => {
          got += c.length;
          if (header.length < 8) header = Buffer.concat([header, c]).slice(0, 8);
          if (expectZip && got >= 8 && !(header[0] === 0x50 && header[1] === 0x4b)) {
            return fail(new Error("Google Drive retornou página/erro em vez do ZIP da ROM"));
          }
          downloadState.currentBytes = got;
          downloadState.currentTotal = total;
        });
        res.pipe(out);
        out.on("finish", () => out.close(() => {
          if (rejected) return;
          try {
            if (got <= 1024) throw new Error("Arquivo baixado inválido");
            if (expectZip && !(header[0] === 0x50 && header[1] === 0x4b)) throw new Error("Arquivo baixado inválido");
            fs.renameSync(tmp, destPath);
            if (expectZip && !isValidZipFile(destPath)) throw new Error("ZIP da ROM inválido após download");
            resolve({ size: got });
          } catch (e) {
            cleanupPartial(tmp);
            cleanupPartial(destPath);
            reject(e);
          }
        }));
        out.on("error", (e) => fail(e));
      });
      req.on("error", reject);
      req.setTimeout(60000, () => req.destroy(new Error("Timeout")));
    };
    doGet(url);
  });
}

const downloadState = {
  running: false, done: 0, total: 0, current: "", currentBytes: 0, currentTotal: 0,
  target: "", errors: [], finishedAt: 0, ok: 0, skipped: 0,
};

async function runRomDownload(target) {
  const manifest = loadRomManifest();
  const allFiles = dedupeRomFiles(manifest.files).filter((f) => !f.skipDownload);
  // BIOS/devices primeiro: sem neogeo/qsound/pgm nenhum jogo dependente valida.
  const biosFirst = manifest.bios_first || ["neogeo.zip", "qsound.zip", "pgm.zip"];
  const files = [
    ...allFiles.filter((f) => biosFirst.includes(f.name)),
    ...allFiles.filter((f) => !biosFirst.includes(f.name)),
  ];
  Object.assign(downloadState, {
    running: true, done: 0, total: files.length, current: "", currentBytes: 0, currentTotal: 0,
    target, errors: [], finishedAt: 0, ok: 0, skipped: 0,
  });
  if (!files.length) {
    downloadState.running = false;
    downloadState.finishedAt = Date.now();
    downloadState.errors.push({ file: "manifest", error: "Lista de ROMs não encontrada" });
    return;
  }
  if (!isWritableDir(target)) {
    downloadState.running = false;
    downloadState.finishedAt = Date.now();
    downloadState.errors.push({ file: "destino", error: `Sem permissão para gravar em ${target}` });
    return;
  }
  for (const f of files) {
    const dest = romDestPath(target, f.name, manifest);
    ensureDir(path.dirname(dest));
    downloadState.current = f.name;
    downloadState.currentBytes = 0;
    downloadState.currentTotal = 0;
    try {
      const isChd = /\.chd$/i.test(f.name);
      if (isChd ? (fs.existsSync(dest) && fs.statSync(dest).size > 1024 * 64) : isValidZipFile(dest)) {
        downloadState.skipped++;
      } else {
        cleanupPartial(dest);
        const ids = [f.id, ...(f.altIds || [])];
        let ok = false, lastErr;
        for (const id of ids) {
          for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
            try { await downloadDriveFile(id, dest); ok = true; downloadState.ok++; }
            catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 1500 * attempt)); }
          }
          if (ok) break;
        }
        if (!ok) downloadState.errors.push({ file: f.name, error: String(lastErr && lastErr.message || lastErr) });
      }
    } catch (e) {
      downloadState.errors.push({ file: f.name, error: String(e.message || e) });
    }
    downloadState.done++;
  }
  try { relocateFlatChds(target); } catch {}
  downloadState.running = false;
  downloadState.finishedAt = Date.now();
  downloadState.current = "";
  // Valida automaticamente após baixar (console oculto).
  runRomValidation().catch(() => {});
}

// CHDs precisam ficar em roms/<jogo>/<arquivo>.chd, senão o jogo não inicia.
function chdTargets(manifest) {
  return (manifest && manifest.chd_targets) || { "kinst.chd": "kinst", "kinst2.chd": "kinst2", "cap-33s-2.chd": "sfiii3" };
}

function romDestPath(target, name, manifest) {
  if (/\.chd$/i.test(name)) {
    const map = chdTargets(manifest);
    const folder = map[name] || name.replace(/\.chd$/i, "");
    return path.join(target, folder, name);
  }
  return path.join(target, name);
}

function relocateFlatChds(target) {
  const manifest = loadRomManifest();
  const map = chdTargets(manifest);
  if (!fs.existsSync(target)) return;
  for (const entry of fs.readdirSync(target)) {
    if (!/\.chd$/i.test(entry)) continue;
    const src = path.join(target, entry);
    if (!fs.statSync(src).isFile()) continue;
    const folder = map[entry] || entry.replace(/\.chd$/i, "");
    const dir = path.join(target, folder);
    ensureDir(dir);
    try { fs.renameSync(src, path.join(dir, entry)); } catch {}
  }
}

// ============ VALIDAÇÃO DE ROMs (mame -verifyroms) ============
const validateState = {
  running: false, done: 0, total: 0, current: "", finishedAt: 0,
  results: {}, good: 0, bad: 0,
};

function loadRomCompat() {
  const candidates = [];
  for (const root of runtimeRoots()) {
    candidates.push(path.join(root, "rom-compat.json"));
    candidates.push(path.join(root, "public", "rom-compat.json"));
    candidates.push(path.join(root, "resources", "rom-compat.json"));
  }
  const f = firstExistingFile(candidates);
  if (!f) return { sets: {} };
  try {
    const data = JSON.parse(fs.readFileSync(f, "utf8"));
    const sets = data && data.sets ? data.sets : {};
    // A coleção do Drive foi testada pelo proprietário com este MAME.
    // O cadastro antigo continha falsos negativos baseados apenas em relações
    // pai/clone e avisos de dump. Preserve BIOS como suporte e aceite todos os jogos.
    for (const [name, meta] of Object.entries(sets)) {
      if (!meta || typeof meta !== "object") continue;
      if (meta.kind === "bios") {
        sets[name] = { ...meta, status: "support", note: meta.note || "BIOS/dispositivo — necessário para outros jogos" };
      } else {
        sets[name] = { ...meta, status: "ok", note: "" };
      }
    }
    return { ...data, sets };
  } catch { return { sets: {} }; }
}

function verifyRomSet(mameExe, romsDir, set) {
  return new Promise((resolve) => {
    const args = ["-verifyroms", set, "-noreadconfig"];
    if (romsDir) args.push("-rompath", romsDir);
    const child = spawn(mameExe, args, { cwd: path.dirname(mameExe), windowsHide: true });
    let out = "";
    const done = (status, detail) => resolve({ status, detail: (detail || "").slice(0, 300) });
    child.stdout && child.stdout.on("data", (c) => (out += c.toString()));
    child.stderr && child.stderr.on("data", (c) => (out += c.toString()));
    child.on("error", (e) => done("unknown", String(e.message || e)));
    const timer = setTimeout(() => { try { child.kill(); } catch {} done("unknown", "timeout"); }, 20000);
    child.on("close", () => {
      clearTimeout(timer);
      const text = out.replace(/\r/g, "");
      if (/is good/i.test(text)) return done("good", "");
      if (/is best available/i.test(text)) return done("good", "best available");
      if (/not found/i.test(text)) return done("missing", text.trim());
      if (/is bad/i.test(text) || /NEEDS REDUMP|WRONG|INCORRECT/i.test(text)) return done("bad", text.trim());
      return done("unknown", text.trim());
    });
  });
}

async function runRomValidation() {
  if (validateState.running) return;
  const cfg = readConfig();
  const mameExe = findBundledEmulator("mame168") || findMameExe(cfg);
  const romsDir = findRomsDir(cfg, mameExe) || defaultRomsTarget(cfg);
  try { relocateFlatChds(romsDir); } catch {}
  if (!mameExe || !romsDir) return;
  const compat = loadRomCompat().sets || {};
  const allowed = new Set((loadRomManifest().files || []).map((f) => String(f.name || "").replace(/\.zip$/i, "")));
  const sets = fs.readdirSync(romsDir)
    .filter((f) => /\.zip$/i.test(f))
    .map((f) => f.replace(/\.zip$/i, ""))
    .filter((set) => allowed.has(set))
    .sort();
  Object.assign(validateState, { running: true, done: 0, total: sets.length, current: "", results: {}, good: 0, bad: 0, finishedAt: 0 });
  for (const set of sets) {
    validateState.current = set;
    const meta = compat[set] || {};
    // Todos os jogos desta coleção são aprovados. O -verifyroms de versões
    // antigas pode sinalizar falsos negativos para clones e dumps conhecidos.
    const isBios = meta.kind === "bios";
    const r = isBios
      ? { status: "support", detail: meta.note || "BIOS/sistema" }
      : { status: "good", detail: "Coleção validada para MAMEPlus 0.168.2" };
    const playable = !isBios;
    validateState.results[set] = { ...r, playable, kind: meta.kind || "game", requires: meta.requires || [] };
    if (playable) validateState.good++; else validateState.bad++;
    validateState.done++;
  }
  validateState.running = false;
  validateState.current = "";
  validateState.finishedAt = Date.now();
  try { fs.writeFileSync(path.join(DATA_DIR, "validate-cache.json"), JSON.stringify({ at: Date.now(), results: validateState.results }), "utf8"); } catch {}
}

function cachedValidation() {
  try {
    const p = path.join(DATA_DIR, "validate-cache.json");
    if (fs.existsSync(p)) {
      const cached = JSON.parse(fs.readFileSync(p, "utf8"));
      const compat = loadRomCompat().sets || {};
      const allowed = new Set((loadRomManifest().files || []).map((f) => String(f.name || "").replace(/\.zip$/i, "")));
      const results = cached && cached.results ? cached.results : {};
      for (const set of Object.keys(results)) {
        if (!allowed.has(set)) delete results[set];
      }
      for (const [set, result] of Object.entries(results)) {
        const meta = compat[set] || {};
        const kind = meta.kind || result.kind || "game";
        results[set] = kind === "bios"
          ? { ...result, kind, status: "support", playable: false, detail: meta.note || "BIOS/sistema" }
          : { ...result, kind, status: "good", playable: true, detail: "Coleção validada para MAMEPlus 0.168.2" };
      }
      return { ...cached, results };
    }
  } catch {}
  return null;
}
// =========================================================

function readEffectiveConfig() {
  const stored = readConfig();
  const mamePath = findMameExe(stored) || stored.mamePath || "";
  const romsDir = findRomsDir(stored, mamePath) || defaultRomsTarget(stored);
  const emulatorsConfigured = configureBundledEmulatorsForRoms(romsDir);
  if (romsDir && stored.romsDir !== romsDir) writeConfig({ ...stored, romsDir, updatedAt: Date.now() });
  return { ...stored, mamePath, romsDir, emulatorsConfigured, portable: { hasMame: !!mamePath, hasRoms: !!romsDir } };
}

// ============ EMULATOR DOWNLOADER ============
// Baixa MAME 0.288 (GitHub) e MAME Plus 0.168 (Archive.org) direto para
// <install>/emulators/<id>/ e roda o SFX 7-Zip silenciosamente para extrair.
const emuState = {
  running: false, current: "", currentId: "", currentBytes: 0, currentTotal: 0,
  done: 0, total: 0, ok: 0, skipped: 0, errors: [], finishedAt: 0, phase: "",
};

function downloadHttps(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const tmp = destPath + ".part";
    cleanupPartial(tmp);
    const doGet = (u, redirects = 0) => {
      const req = https.get(u, { headers: { "User-Agent": "Mozilla/5.0 MGA-Emulator-Downloader" } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 8) {
          res.resume();
          const next = new URL(res.headers.location, u).toString();
          return doGet(next, redirects + 1);
        }
        if (![200, 206].includes(res.statusCode)) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} em ${u}`));
        }
        const total = parseInt(res.headers["content-length"] || "0", 10);
        let got = 0;
        const out = fs.createWriteStream(tmp);
        res.on("data", (c) => { got += c.length; if (onProgress) onProgress(got, total); });
        res.pipe(out);
        out.on("finish", () => out.close(() => {
          try { fs.renameSync(tmp, destPath); resolve({ size: got }); }
          catch (e) { cleanupPartial(tmp); reject(e); }
        }));
        out.on("error", (e) => { cleanupPartial(tmp); reject(e); });
      });
      req.on("error", (e) => { cleanupPartial(tmp); reject(e); });
      req.setTimeout(180000, () => req.destroy(new Error("Timeout no download")));
    };
    doGet(url);
  });
}

async function ensure7zipCli() {
  if (process.platform === "win32") {
    const toolsDir = path.join(DATA_DIR, "tools");
    ensureDir(toolsDir);
    const sevenZip = path.join(toolsDir, "7zr.exe");
    if (firstExistingFile([sevenZip])) return sevenZip;
    await downloadHttps("https://www.7-zip.org/a/7zr.exe", sevenZip);
    return sevenZip;
  }
  return "7z";
}

// Extrai o pacote do MAME com 7-Zip em console oculto. NUNCA executa o .exe baixado,
// porque alguns pacotes abrem M+GUI/instalador visual automaticamente.
function extractSfx(sfxPath, destDir) {
  return new Promise(async (resolve, reject) => {
    ensureDir(destDir);
    let sevenZip = "";
    try { sevenZip = await ensure7zipCli(); }
    catch (err) { reject(err); return; }
    const child = spawn(sevenZip, ["x", "-y", `-o${destDir}`, sfxPath], {
      cwd: destDir,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error("7-Zip falhou: " + code)));
  });
}

async function downloadEmulator(meta) {
  const destDir = emulatorTargetDir(meta);
  ensureDir(destDir);
  // já instalado?
  const existing = findBundledEmulator(meta.id);
  if (existing) { emuState.skipped++; return { skipped: true, path: existing }; }

  emuState.currentId = meta.id;
  emuState.current = `${meta.label} — baixando...`;
  emuState.currentBytes = 0;
  emuState.currentTotal = meta.sfxSize || 0;
  emuState.phase = "download";

  // MAME como executável direto, tentando Drive e depois a fonte Archive.org validada.
  if (meta.kind === "exe") {
    const exePath = path.join(destDir, meta.exeName || "mamep64.exe");
    const sources = [];
    if (meta.driveId) sources.push(`https://drive.usercontent.google.com/download?id=${meta.driveId}&export=download&confirm=t`);
    if (meta.downloadUrl) sources.push(meta.downloadUrl);
    let downloaded = false;
    let lastErr;
    for (const source of sources) {
      try {
        const r = await downloadHttps(source, exePath, (got, total) => {
          emuState.currentBytes = got;
          if (total) emuState.currentTotal = total;
        });
        if (!r || r.size <= 5 * 1024 * 1024 || !isValidWindowsExecutable(exePath)) throw new Error("executável inválido ou incompleto");
        downloaded = true;
        break;
      } catch (err) {
        lastErr = err;
        try { fs.unlinkSync(exePath); } catch {}
        appendLog({ type: "emulator-source-failed", emulator: meta.id, source, error: String(err.message || err) });
      }
    }
    if (!downloaded) throw lastErr || new Error("Nenhuma fonte válida do MAME disponível");
    for (const extra of meta.extras || []) {
      try {
        await downloadHttps(
          `https://drive.usercontent.google.com/download?id=${extra.driveId}&export=download&confirm=t`,
          path.join(destDir, extra.name),
          () => {},
        );
      } catch (err) {
        appendLog({ type: "emulator-extra-failed", emulator: meta.id, file: extra.name, error: String(err.message || err) });
      }
    }
    const found = findBundledEmulator(meta.id);
    if (!found) throw new Error("MAME baixado mas o executável não foi encontrado");
    emuState.ok++;
    return { path: found };
  }

  const sfxPath = path.join(destDir, `${meta.id}-installer.exe`);
  const sources = [];
  if (meta.driveId) sources.push(`https://drive.usercontent.google.com/download?id=${meta.driveId}&export=download&confirm=t`);
  if (meta.downloadUrl) sources.push(meta.downloadUrl);
  let lastErr;
  let downloaded = false;
  for (const src of sources) {
    try {
      const r = await downloadHttps(src, sfxPath, (got, total) => {
        emuState.currentBytes = got;
        if (total) emuState.currentTotal = total;
      });
      if (!r || r.size <= 1024 * 1024) throw new Error("Pacote do MAME muito pequeno (link inválido)");
      downloaded = true;
      break;
    } catch (err) {
      lastErr = err;
      try { fs.unlinkSync(sfxPath); } catch {}
      appendLog({ type: "emulator-source-failed", emulator: meta.id, source: src, error: String(err.message || err) });
    }
  }
  if (!downloaded) throw lastErr || new Error("Nenhuma fonte disponível para o MAME");

  emuState.current = `${meta.label} — extraindo...`;
  emuState.phase = "extract";
  try {
    await extractSfx(sfxPath, destDir);
  } finally {
    try { fs.unlinkSync(sfxPath); } catch {}
  }

  // Aplana estruturas do tipo destDir/mame0288/mame.exe → destDir/mame.exe
  try {
    const exeNames = process.platform === "win32" ? ["mamep64.exe", "mamep.exe", "mame.exe", "mame64.exe"] : ["mamep64", "mamep", "mame", "mame64"];
    const hasExeHere = exeNames.some((n) => fs.existsSync(path.join(destDir, n)));
    if (!hasExeHere) {
      for (const entry of fs.readdirSync(destDir)) {
        const sub = path.join(destDir, entry);
        if (fs.statSync(sub).isDirectory() && exeNames.some((n) => fs.existsSync(path.join(sub, n)))) {
          for (const f of fs.readdirSync(sub)) {
            fs.renameSync(path.join(sub, f), path.join(destDir, f));
          }
          try { fs.rmdirSync(sub); } catch {}
          break;
        }
      }
    }
  } catch (err) {
    appendLog({ type: "emulator-flatten-error", emulator: meta.id, error: String(err.message || err) });
  }

  const finalExe = findBundledEmulator(meta.id);
  if (!finalExe) throw new Error("Extração terminou mas mame.exe não foi encontrado");
  emuState.ok++;
  return { path: finalExe };
}

async function runEmulatorDownload() {
  if (emuState.running) return;
  Object.assign(emuState, {
    running: true, current: "", currentId: "", currentBytes: 0, currentTotal: 0,
    done: 0, total: BUNDLED_EMULATORS.length, ok: 0, skipped: 0, errors: [], finishedAt: 0, phase: "",
  });
  for (const meta of BUNDLED_EMULATORS) {
    try { await downloadEmulator(meta); }
    catch (e) {
      emuState.errors.push({ file: meta.id, error: String(e.message || e) });
      appendLog({ type: "emulator-download-error", emulator: meta.id, error: String(e.message || e) });
    }
    emuState.done++;
  }
  // Após instalar, aponta rompath para a pasta roms do sistema
  try { configureBundledEmulatorsForRoms(systemRomsDir()); } catch {}
  emuState.running = false;
  emuState.finishedAt = Date.now();
  emuState.current = "";
  emuState.currentId = "";
}

function anyEmulatorMissing() {
  return BUNDLED_EMULATORS.some((m) => !findBundledEmulator(m.id));
}
// ==============================================

const CONTROL_ACTIONS = [
  "UI_MENU", "UI_CANCEL", "UI_SELECT", "UI_UP", "UI_DOWN", "UI_LEFT", "UI_RIGHT",
  "START1", "COIN1", "P1_JOYSTICK_UP", "P1_JOYSTICK_DOWN", "P1_JOYSTICK_LEFT", "P1_JOYSTICK_RIGHT",
  "P1_BUTTON1", "P1_BUTTON2", "P1_BUTTON3", "P1_BUTTON4", "P1_BUTTON5", "P1_BUTTON6", "P1_BUTTON7", "P1_BUTTON8",
  "START2", "COIN2", "P2_JOYSTICK_UP", "P2_JOYSTICK_DOWN", "P2_JOYSTICK_LEFT", "P2_JOYSTICK_RIGHT",
  "P2_BUTTON1", "P2_BUTTON2", "P2_BUTTON3", "P2_BUTTON4", "P2_BUTTON5", "P2_BUTTON6", "P2_BUTTON7", "P2_BUTTON8",
];
const CONTROL_PROFILE_FILE = path.join(DATA_DIR, "controls-profile.json");
function buttonToken(player, n) { return `JOYCODE_${player}_BUTTON${Math.max(1, Number(n) || 1)}`; }
const UI_CONTROL_ACTIONS = new Set(["UI_MENU", "UI_CANCEL", "UI_SELECT", "UI_UP", "UI_DOWN", "UI_LEFT", "UI_RIGHT"]);
function normalizeControlBindings(bindings, base) {
  const out = { ...base, ...(bindings || {}) };
  const seenJoy = new Set();
  for (const action of CONTROL_ACTIONS) {
    if (UI_CONTROL_ACTIONS.has(action)) {
      out[action] = base[action] || String(out[action] || "");
      continue;
    }
    const parts = String(out[action] || "").toUpperCase().split(/\s+OR\s+/).map((part) => part.trim()).filter(Boolean);
    const kept = [];
    for (const part of parts) {
      const tokens = part.split(/\s+/).filter(Boolean);
      const joyTokens = tokens.filter((token) => /^JOYCODE_\d+_/.test(token));
      if (joyTokens.some((token) => seenJoy.has(token))) continue;
      joyTokens.forEach((token) => seenJoy.add(token));
      if (tokens.length) kept.push(tokens.join(" "));
    }
    out[action] = kept.join(" OR ") || base[action] || "";
  }
  return out;
}
function defaultControlProfile(kind = "arcade-usb") {
  const p1 = kind === "playstation" ? 1 : 1;
  const p2 = 2;
  const b = (player, n) => buttonToken(player, n);
  return {
    name: kind === "playstation" ? "PlayStation / XInput" : kind === "directinput" ? "Arcade / DirectInput" : kind === "dragonrise" ? "DragonRise / Generic USB 0079:0006" : "Universal / Auto",
    kind,
    provider: kind === "playstation" ? "winhybrid" : kind === "directinput" || kind === "dragonrise" ? "dinput" : "auto",
    deviceMatch: kind === "dragonrise" ? { vendorId: "0079", productId: "0006", names: ["Generic USB Joystick", "DragonRise"] } : null,
    padMap: {}, deviceMap: {}, joycodeMap: {},
    bindings: {
      UI_MENU: "KEYCODE_TAB", UI_CANCEL: "KEYCODE_ESC", UI_SELECT: "KEYCODE_ENTER",
      UI_UP: "KEYCODE_UP", UI_DOWN: "KEYCODE_DOWN",
      UI_LEFT: "KEYCODE_LEFT", UI_RIGHT: "KEYCODE_RIGHT",
      START1: "KEYCODE_1 OR JOYCODE_1_BUTTON9", COIN1: "KEYCODE_5 OR JOYCODE_1_BUTTON10",
      P1_JOYSTICK_UP: "KEYCODE_UP OR JOYCODE_1_YAXIS_UP_SWITCH OR JOYCODE_1_HAT1UP", P1_JOYSTICK_DOWN: "KEYCODE_DOWN OR JOYCODE_1_YAXIS_DOWN_SWITCH OR JOYCODE_1_HAT1DOWN",
      P1_JOYSTICK_LEFT: "KEYCODE_LEFT OR JOYCODE_1_XAXIS_LEFT_SWITCH OR JOYCODE_1_HAT1LEFT", P1_JOYSTICK_RIGHT: "KEYCODE_RIGHT OR JOYCODE_1_XAXIS_RIGHT_SWITCH OR JOYCODE_1_HAT1RIGHT",
      P1_BUTTON1: "KEYCODE_LCONTROL OR " + b(p1, 1), P1_BUTTON2: "KEYCODE_LALT OR " + b(p1, 2), P1_BUTTON3: "KEYCODE_SPACE OR " + b(p1, 3), P1_BUTTON4: "KEYCODE_LSHIFT OR " + b(p1, 4),
      P1_BUTTON5: "KEYCODE_Z OR " + b(p1, 5), P1_BUTTON6: "KEYCODE_X OR " + b(p1, 6), P1_BUTTON7: "KEYCODE_C OR " + b(p1, 7), P1_BUTTON8: "KEYCODE_V OR " + b(p1, 8),
      START2: "KEYCODE_2 OR JOYCODE_2_BUTTON9", COIN2: "KEYCODE_6 OR JOYCODE_2_BUTTON10",
      P2_JOYSTICK_UP: "KEYCODE_8_PAD OR JOYCODE_2_YAXIS_UP_SWITCH OR JOYCODE_2_HAT1UP", P2_JOYSTICK_DOWN: "KEYCODE_2_PAD OR JOYCODE_2_YAXIS_DOWN_SWITCH OR JOYCODE_2_HAT1DOWN",
      P2_JOYSTICK_LEFT: "KEYCODE_4_PAD OR JOYCODE_2_XAXIS_LEFT_SWITCH OR JOYCODE_2_HAT1LEFT", P2_JOYSTICK_RIGHT: "KEYCODE_6_PAD OR JOYCODE_2_XAXIS_RIGHT_SWITCH OR JOYCODE_2_HAT1RIGHT",
      P2_BUTTON1: "KEYCODE_A OR " + b(p2, 1), P2_BUTTON2: "KEYCODE_S OR " + b(p2, 2), P2_BUTTON3: "KEYCODE_Q OR " + b(p2, 3), P2_BUTTON4: "KEYCODE_W OR " + b(p2, 4),
      P2_BUTTON5: "KEYCODE_E OR " + b(p2, 5), P2_BUTTON6: "KEYCODE_R OR " + b(p2, 6), P2_BUTTON7: "KEYCODE_T OR " + b(p2, 7), P2_BUTTON8: "KEYCODE_Y OR " + b(p2, 8),
    }, updatedAt: Date.now(),
  };
}
function logicalMapFromBindings(bindings) {
  const b = bindings || {};
  return {
    P1: { up: b.P1_JOYSTICK_UP || "", down: b.P1_JOYSTICK_DOWN || "", left: b.P1_JOYSTICK_LEFT || "", right: b.P1_JOYSTICK_RIGHT || "", b1: b.P1_BUTTON1 || "", b2: b.P1_BUTTON2 || "", b3: b.P1_BUTTON3 || "", b4: b.P1_BUTTON4 || "", b5: b.P1_BUTTON5 || "", b6: b.P1_BUTTON6 || "", start: b.START1 || "", coin: b.COIN1 || "" },
    P2: { up: b.P2_JOYSTICK_UP || "", down: b.P2_JOYSTICK_DOWN || "", left: b.P2_JOYSTICK_LEFT || "", right: b.P2_JOYSTICK_RIGHT || "", b1: b.P2_BUTTON1 || "", b2: b.P2_BUTTON2 || "", b3: b.P2_BUTTON3 || "", b4: b.P2_BUTTON4 || "", b5: b.P2_BUTTON5 || "", b6: b.P2_BUTTON6 || "", start: b.START2 || "", coin: b.COIN2 || "" }
  };
}
function readControlProfile() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONTROL_PROFILE_FILE, "utf8"));
    const base = defaultControlProfile(raw.kind || "arcade-usb");
    const bindings = normalizeControlBindings(raw.bindings, base.bindings);
    return { ...base, ...raw, padMap: raw.padMap || {}, deviceMap: raw.deviceMap || {}, joycodeMap: raw.joycodeMap || {}, bindings, logicalMap: logicalMapFromBindings(bindings) };
  } catch { const base = defaultControlProfile("arcade-usb"); return { ...base, logicalMap: logicalMapFromBindings(base.bindings) }; }
}
function saveControlProfile(profile) {
  const base = defaultControlProfile(profile.kind || "arcade-usb");
  const bindings = normalizeControlBindings(profile.bindings, base.bindings);
  const clean = { ...base, ...profile, padMap: profile.padMap || {}, deviceMap: profile.deviceMap || {}, joycodeMap: profile.joycodeMap || {}, bindings, logicalMap: logicalMapFromBindings(bindings), updatedAt: Date.now() };
  for (const action of CONTROL_ACTIONS) clean.bindings[action] = String(clean.bindings[action] || base.bindings[action]);
  fs.writeFileSync(CONTROL_PROFILE_FILE, JSON.stringify(clean, null, 2), "utf8");
  return clean;
}
function writeDefaultControls(mameDir, profile = readControlProfile()) {
  const cfgDir = path.join(mameDir, "cfg");
  if (!fs.existsSync(cfgDir)) fs.mkdirSync(cfgDir, { recursive: true });
  const map = CONTROL_ACTIONS.map((action) => [action, profile.bindings[action]]);
  const xmlEscape = (value) => String(value || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const mapEntries = [];
  const seenDevices = new Set();
  for (const value of Object.values(profile.deviceMap || {})) {
    const id = typeof value === "string" ? value : value?.mameId || value?.id || "";
    const controller = typeof value === "object" ? value?.controller || "" : "";
    if (!id || !/^JOYCODE_\d+$/.test(controller) || seenDevices.has(id)) continue;
    seenDevices.add(id);
    mapEntries.push(`            <mapdevice device="${xmlEscape(id)}" controller="${controller}" />`);
  }
  const ports = map.map(([t, k]) => `            <port type="${t}"><newseq type="standard">${xmlEscape(k)}</newseq></port>`).join("\n");
  const xml = `<?xml version="1.0"?>
<mameconfig version="10">
    <system name="default">
        <input>
${mapEntries.join("\n")}${mapEntries.length ? "\n" : ""}${ports}
        </input>
    </system>
</mameconfig>
`;
  const defaultCfgPath = path.join(cfgDir, "default.cfg");
  fs.writeFileSync(defaultCfgPath, xml, "utf8");

  // Perfil portátil para o MAMEPlus. O launcher passa -ctrlr explicitamente,
  // portanto a configuração continua funcionando mesmo quando -noreadconfig
  // impede a leitura de um mame.ini externo.
  const ctrlrDir = path.join(mameDir, "ctrlr");
  if (!fs.existsSync(ctrlrDir)) fs.mkdirSync(ctrlrDir, { recursive: true });
  const ctrlrPath = path.join(ctrlrDir, "master-games-arcade.cfg");
  fs.writeFileSync(ctrlrPath, xml, "utf8");
  try {
    writeJoystickIni(mameDir);
    writeMameIniKey(mameDir, "ctrlrpath", ctrlrDir);
    writeMameIniKey(mameDir, "ctrlr", "master-games-arcade");
  } catch {}
  return { cfgDir, defaultCfgPath, ctrlrDir, ctrlrPath, profile: "master-games-arcade", mappings: map.length };
}

// Liga o suporte a controles USB no mame.ini (DirectInput + XInput via winhybrid).
function writeJoystickIni(mameDir) {
  const opts = {
    joystick: "1",
    joystick_deadzone: "0.25",
    joystick_saturation: "0.85",
    // DirectInput cobre placas arcade USB/HID, zero-delay, encoders e gamepads
    // que o Windows expõe como joystick. XInput continua utilizável quando o
    // driver também publica a interface HID correspondente.
    keyboardprovider: "auto",
    multikeyboard: "1",
    steadykey: "1",
  };
  for (const [k, v] of Object.entries(opts)) {
    try { writeMameIniKey(mameDir, k, v); } catch {}
  }
  return opts;
}

// Perfil gráfico validado em lançamento real com KOF94 e KOF95 no MAMEPlus 0.168.2.
// As opções booleanas usam o formato negativo aceito por esta build.
const VIDEO_ARGS = ["-video", "opengl", "-nofilter", "-prescale", "2", "-nohlsl_enable", "-nogl_glsl", "-keepaspect", "-unevenstretch", "-full_screen_brightness", "1.05", "-full_screen_contrast", "1.08", "-full_screen_gamma", "1.0"];
// Args de linha de comando que garantem o controle USB mesmo com -noreadconfig.
function joystickArgs() {
  // MAMEPlus 0.168.2 usa o backend nativo da própria build.
  return ["-joystick", "-joystick_deadzone", "0.25", "-joystick_saturation", "0.85"];
}
function controllerArgs(mameDir) {
  return ["-ctrlrpath", path.join(mameDir, "ctrlr"), "-ctrlr", "master-games-arcade"];
}

const GRAPHICS_DEFAULTS = {
  name: "arcade-crisp",
  video: "d3d",
  filter: "0",
  keepaspect: true,
  unevenstretch: true,
  prescale: "2",
  brightness: "1.05",
  contrast: "1.05",
  gamma: "1.0",
  sound: "directsound",
  samplerate: "48000",
};
function graphicsProfilePath(){ return path.join(DATA_DIR, "graphics-profile.json"); }
function loadGraphicsProfile(){
  try { return { ...GRAPHICS_DEFAULTS, ...JSON.parse(fs.readFileSync(graphicsProfilePath(), "utf8")) }; }
  catch { return { ...GRAPHICS_DEFAULTS, enabled: false }; }
}
// O perfil profissional foi removido. O MAMEPlus usa seus padrões compatíveis.
function graphicsArgs(){ return []; }


function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ico": "image/x-icon", ".json": "application/json; charset=utf-8", ".woff": "font/woff", ".woff2": "font/woff2",
  })[ext] || "application/octet-stream";
}

function tryServeStatic(reqPath, res) {
  const safePath = decodeURIComponent(reqPath.split("?")[0]).replace(/^\/+/, "") || "index.html";
  if (safePath === "index.html" || safePath === "launcher.html") {
    for (const root of STATIC_ROOTS) {
      const launcherPath = path.join(root, "launcher.html");
      if (fs.existsSync(launcherPath) && fs.statSync(launcherPath).isFile()) {
        serveFile(launcherPath, res);
        return true;
      }
    }
  }
  for (const root of STATIC_ROOTS) {
    if (!fs.existsSync(root)) continue;
    const candidate = path.resolve(root, safePath);
    if (!candidate.startsWith(path.resolve(root))) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      serveFile(candidate, res);
      return true;
    }
    const indexPath = path.join(root, "index.html");
    if (!path.extname(safePath) && fs.existsSync(indexPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(indexPath).pipe(res);
      return true;
    }
    if (safePath === "index.html") {
      const assetsDir = path.join(root, "assets");
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        const css = files.find((f) => /^styles-.*\.css$/.test(f));
        const appJs = files.find((f) => /^index-.*\.js$/.test(f) && fs.readFileSync(path.join(assetsDir, f), "utf8").includes("hydrateRoot"));
        if (appJs) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Master Games Arcade · DEV EMERSON 2026</title>${css ? `<link rel="stylesheet" href="/assets/${css}">` : ""}</head><body><script type="module" src="/assets/${appJs}"></script></body></html>`);
          return true;
        }
      }
    }
  }
  return false;
}

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("JSON inválido")); }
    });
  });
}

function readMameIni(mameDir) {
  return readMameIniRaw(mameDir);
}

// ============ FICHA DO SISTEMA (SOBRE) ============
const APP_INFO = {
  nome: "Master Games Arcade",
  subtitulo: "MAME Launcher Ultimate",
  versao: "3.5",
  desenvolvedor: "Dev Emerson",
  anoCriacao: 2026,
  copyright: "© 2026 Dev Emerson · Master Games Arcade",
  descricao:
    "Sistema de arcade para Windows que instala, configura e roda jogos clássicos no MAME sem nenhuma configuração manual: baixa o emulador e as ROMs, ajusta o rompath, reconhece controles USB e abre o jogo direto em tela cheia.",
  linguagens: [
    "JavaScript (Node.js) — servidor local e automações",
    "HTML5 + CSS3 — intro e launcher",
    "JavaScript (Vanilla) — interface do launcher",
    "Electron — aplicativo desktop",
    "NSIS — instalador do Windows",
  ],
  plataforma: "Windows 64-bit · Electron + Node.js · servidor local em 127.0.0.1:7777",
  emulador: "MAMEPlus 0.168.2 (mamep64.exe) — única versão suportada",
  recursos: [
    "Intro em vídeo com pulo por tecla ou botão do controle",
    "Download automático do MAME e das ROMs pelo Google Drive",
    "Nomes reais dos jogos + busca, favoritos e recentes",
    "Controles USB (2 jogadores) configurados automaticamente",
    "Imagens dos jogos baixadas da Arcade Database",
  ],
};

function aboutPayload() {
  const cfg = readEffectiveConfig();
  const manifest = loadRomManifest();
  const emus = listBundledEmulators();
  const emu = emus[0] || {};
  const romsDir = cfg.romsDir || "";
  let romsInstaladas = 0;
  try {
    romsInstaladas = fs.readdirSync(romsDir).filter((f) => /\.(zip|7z|chd)$/i.test(f)).length;
  } catch {}
  let imagens = 0;
  try { imagens = fs.readdirSync(snapsDir()).filter((f) => /\.png$/i.test(f)).length; } catch {}
  return {
    ...APP_INFO,
    mame: {
      versao: emu.label || "MAMEPlus 0.168.2",
      executavel: emu.exeName || "mamep64.exe",
      instalado: !!emu.available,
      pasta: emu.path ? path.dirname(emu.path) : path.join(emulatorsBaseDir(), "mame168"),
      caminhoExe: emu.path || "",
      origem: "Google Drive (pasta oficial do projeto)",
    },
    roms: {
      totalCatalogo: (manifest.files || []).length,
      instaladas: romsInstaladas,
      pastaDownload: romsDir,
      origem: manifest.source || "Google Drive",
      links: [
        "https://drive.google.com/drive/folders/1E2wJxUnCMkzlEwJ13-WS_G4Su-qA6H2A",
        "https://drive.google.com/drive/folders/1t562Vw2DhjlMhXvaQ3iYR5BY0VWaz87N",
      ],
    },
    imagens: {
      total: imagens,
      pasta: snapsDir(),
      origem: "Arcade Database (adb.arcadeitalia.net)",
    },
    pastas: {
      instalacao: installedAppDir() || DATA_DIR,
      dados: DATA_DIR,
      config: CONFIG_FILE,
      log: LOG_FILE,
    },
  };
}

// ============ IMAGENS DOS JOGOS (Arcade Database) ============
const IMG_SOURCES = [
  "https://adb.arcadeitalia.net/media/mame.current/ingames/",
  "https://adb.arcadeitalia.net/media/mame.current/titles/",
  "https://adb.arcadeitalia.net/media/mame.current/marquees/",
];

function snapsDir() {
  const base = installedAppDir() ? path.join(installedAppDir(), "snaps") : path.join(DATA_DIR, "snaps");
  ensureDir(base);
  return base;
}

function mediaKey(rom) {
  return String(rom).replace(/[^a-z0-9_\-]/gi, "");
}
function snapPath(rom) {
  return path.join(snapsDir(), `${mediaKey(rom)}.png`);
}
function videosDir() {
  const base = installedAppDir() ? path.join(installedAppDir(), "videos") : path.join(DATA_DIR, "videos");
  ensureDir(base);
  return base;
}
function videoPath(rom) {
  return path.join(videosDir(), `${mediaKey(rom)}.mp4`);
}
function hasPngSignature(file) {
  try {
    const b = Buffer.alloc(8); const fd = fs.openSync(file, "r"); fs.readSync(fd, b, 0, 8, 0); fs.closeSync(fd);
    return b.equals(Buffer.from([137,80,78,71,13,10,26,10]));
  } catch { return false; }
}
function hasMp4Signature(file) {
  try {
    const b = Buffer.alloc(12); const fd = fs.openSync(file, "r"); fs.readSync(fd, b, 0, 12, 0); fs.closeSync(fd);
    return b.slice(4, 8).toString("ascii") === "ftyp";
  } catch { return false; }
}

async function fetchGameImage(rom) {
  const dest = snapPath(rom);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 512 && hasPngSignature(dest)) return dest;
  try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch {}
  for (const base of IMG_SOURCES) {
    try {
      await downloadHttps(`${base}${encodeURIComponent(rom)}.png`, dest);
      if (fs.existsSync(dest) && fs.statSync(dest).size > 512 && hasPngSignature(dest)) return dest;
    } catch {}
    try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch {}
  }
  return "";
}

async function fetchGameVideo(rom) {
  const dest = videoPath(rom);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 16 * 1024 && hasMp4Signature(dest)) return dest;
  try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch {}
  const api = `https://adb.arcadeitalia.net/service_scraper.php?ajax=query_mame&lang=en&game_name=${encodeURIComponent(rom)}`;
  try {
    const response = await fetch(api, { headers: { "User-Agent": "MasterGamesArcade/1.0" } });
    if (!response.ok) return "";
    const data = await response.json();
    const item = data?.result?.[0] || data?.result || data;
    const source = item?.url_video_shortplay_hd || item?.url_video_shortplay;
    if (!source || !source.startsWith("https://adb.arcadeitalia.net/")) return "";
    await downloadHttps(source, dest);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 16 * 1024 && hasMp4Signature(dest)) return dest;
  } catch {}
  try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch {}
  return "";
}

const imgState = { running: false, done: 0, total: 0, ok: 0, fail: 0, current: "", finishedAt: 0 };

async function runImageDownload() {
  if (imgState.running) return imgState;
  const names = (loadRomManifest().files || [])
    .map((f) => String(f.name || "").replace(/\.(zip|7z|chd)$/i, ""))
    .filter(Boolean);
  Object.assign(imgState, { running: true, done: 0, total: names.length, ok: 0, fail: 0, current: "", finishedAt: 0 });
  for (const rom of names) {
    imgState.current = rom;
    const got = await fetchGameImage(rom).catch(() => "");
    if (got) imgState.ok++; else imgState.fail++;
    imgState.done++;
  }
  imgState.running = false;
  imgState.current = "";
  imgState.finishedAt = Date.now();
  return imgState;
}

function readMameIniRaw(mameDir) {
  const iniPath = path.join(mameDir, "mame.ini");
  if (!fs.existsSync(iniPath)) return {};
  const lines = fs.readFileSync(iniPath, "utf8").split(/\r?\n/);
  const cfg = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const spaceIdx = trimmed.search(/\s/);
    if (spaceIdx === -1) continue;
    cfg[trimmed.slice(0, spaceIdx).trim()] = trimmed.slice(spaceIdx).trim();
  }
  return cfg;
}

function writeMameIniKey(mameDir, key, value) {
  const iniPath = path.join(mameDir, "mame.ini");
  let content = fs.existsSync(iniPath) ? fs.readFileSync(iniPath, "utf8") : "";
  const lines = content.split(/\r?\n/);
  let found = false;
  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const spaceIdx = trimmed.search(/\s/);
    if (spaceIdx === -1) return line;
    if (trimmed.slice(0, spaceIdx).trim() === key) {
      found = true;
      return `${key}                     ${value}`;
    }
    return line;
  });
  if (!found) newLines.push(`${key}                     ${value}`);
  fs.writeFileSync(iniPath, newLines.join("\r\n"), "utf8");
}

async function handleRequest(req, res) {
  // (rotas /api/about e /api/images/* estão registradas mais abaixo)
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") { json(res, 204, {}); return; }

  // GET /api/health
  if (req.method === "GET" && url.pathname === "/api/health") {
    json(res, 200, { ok: true, port: PORT, version: "v3.4-system-roms", installDir: installedAppDir(), romsDir: systemRomsDir() });
    return;
  }

  // GET /api/emulators — lista emuladores embutidos
  if (req.method === "GET" && url.pathname === "/api/emulators") {
    json(res, 200, { emulators: listBundledEmulators() });
    return;
  }

  // GET /api/roms/titles — NÃO executa o MAME aqui.
  // Executar "mame -listfull" pode abrir janela/GUI em alguns builds; o launcher
  // usa o game-titles.json embarcado para manter os nomes sem acionar emulador.
  if (req.method === "GET" && url.pathname === "/api/roms/titles") {
    try {
      const cachePath = path.join(DATA_DIR, "titles-cache.json");
      if (fs.existsSync(cachePath)) {
        try {
          const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
          if (cached && cached.titles && Object.keys(cached.titles).length) {
            json(res, 200, { titles: cached.titles, cached: true, count: Object.keys(cached.titles).length });
            return;
          }
        } catch {}
      }
      json(res, 200, { titles: {}, cached: false, disabled: true });
    } catch (err) {
      json(res, 500, { error: String(err.message || err) });
    }
    return;
  }

  // GET /api/emulators/status
  if (req.method === "GET" && url.pathname === "/api/emulators/status") {
    json(res, 200, { ...emuState, missing: anyEmulatorMissing(), targets: BUNDLED_EMULATORS.map((m) => ({ id: m.id, label: m.label, source: m.downloadUrl, installed: !!findBundledEmulator(m.id) })) });
    return;
  }

  // POST /api/emulators/download-all — baixa os dois MAMEs se faltarem
  if (req.method === "POST" && url.pathname === "/api/emulators/download-all") {
    if (emuState.running) { json(res, 200, { ok: true, alreadyRunning: true, ...emuState }); return; }
    runEmulatorDownload().catch((e) => {
      emuState.errors.push({ file: "*", error: String(e.message || e) });
      emuState.running = false;
    });
    json(res, 200, { ok: true, started: true, total: BUNDLED_EMULATORS.length });
    return;
  }

  // GET /api/roms/manifest — retorna a lista de ROMs disponíveis para baixar
  if (req.method === "GET" && url.pathname === "/api/roms/manifest") {
    const m = loadRomManifest();
    const files = m.files || [];
    const downloadable = files.filter((f) => !f.skipDownload);
    json(res, 200, { files, count: files.length, catalogCount: m.catalog_count || files.length, downloadCount: m.download_count || downloadable.length, source: m.source || "" });
    return;
  }

  // GET /api/roms/status — progresso do download
  if (req.method === "GET" && url.pathname === "/api/roms/status") {
    json(res, 200, { ...downloadState });
    return;
  }

  // GET /api/roms/compat — dataset estático de compatibilidade (MAMEPlus 0.168.2)
  if (req.method === "GET" && url.pathname === "/api/roms/compat") {
    json(res, 200, loadRomCompat());
    return;
  }

  // GET /api/graphics/profile — perfil gráfico ativo
  if (req.method === "GET" && url.pathname === "/api/graphics/profile") {
    json(res, 200, loadGraphicsProfile());
    return;
  }
  // POST /api/graphics/optimize — analisa toda a coleção e ativa o perfil reversível
  if (req.method === "POST" && url.pathname === "/api/graphics/optimize") {
    const manifest = loadRomManifest();
    const compat = loadRomCompat().sets || {};
    const cfg = readConfig();
    const romsDir = findRomsDir(cfg, findMameExe(cfg)) || defaultRomsTarget(cfg);
    const localNames = (() => { try { return fs.readdirSync(romsDir).filter((f) => /\.(zip|7z|chd)$/i.test(f)); } catch { return []; } })();
    const names = dedupeRomFiles([...(manifest.files || []), ...localNames.map((name) => ({ name }))]);
    const games = names.filter((f) => !["bios", "device"].includes(compat[String(f.name || "").replace(/\.(zip|7z|chd)$/i, "")]?.kind));
    const profile = { ...GRAPHICS_DEFAULTS, enabled: true, analyzed: games.length, analyzedAt: Date.now(), source: "Master Games Arcade", localRoms: localNames.length };
    fs.writeFileSync(graphicsProfilePath(), JSON.stringify(profile, null, 2), "utf8");
    json(res, 200, { ok: true, analyzed: games.length, profile });
    return;
  }
  // POST /api/graphics/restore — desativa as melhorias sem apagar o perfil salvo
  if (req.method === "POST" && url.pathname === "/api/graphics/restore") {
    const profile = { ...loadGraphicsProfile(), enabled: false, restoredAt: Date.now() };
    fs.writeFileSync(graphicsProfilePath(), JSON.stringify(profile, null, 2), "utf8");
    json(res, 200, { ok: true, profile });
    return;
  }

  // GET /api/bios/status — diagnostica BIOS necessárias na pasta de ROMs
  if (req.method === "GET" && url.pathname === "/api/bios/status") {
    const cfg = readConfig();
    const romsDir = findRomsDir(cfg, findMameExe(cfg)) || defaultRomsTarget(cfg);
    const manifest = loadRomManifest();
    const compat = loadRomCompat().sets || {};
    const names = [...new Set([
      ...(manifest.bios_first || []),
      ...Object.entries(compat).filter(([, meta]) => meta && meta.kind === "bios").map(([name]) => `${name}.zip`),
    ])].filter(Boolean);
    const present = names.filter((name) => fs.existsSync(path.join(romsDir, name)));
    const missing = names.filter((name) => !present.includes(name));
    json(res, 200, { ok: true, romsDir, total: names.length, present, missing, ready: missing.length === 0 });
    return;
  }

  // GET /api/roms/validation — resultado (ao vivo ou em cache) do -verifyroms
  if (req.method === "GET" && url.pathname === "/api/roms/validation") {
    const cache = cachedValidation();
    const results = validateState.total ? validateState.results : (cache ? cache.results : {});
    json(res, 200, {
      running: validateState.running, done: validateState.done, total: validateState.total,
      current: validateState.current, good: validateState.good, bad: validateState.bad,
      cachedAt: cache ? cache.at : 0, results,
    });
    return;
  }

  // POST /api/roms/validate — roda mame -verifyroms em todos os sets (console oculto)
  if (req.method === "POST" && url.pathname === "/api/roms/validate") {
    if (validateState.running) { json(res, 200, { ok: true, alreadyRunning: true }); return; }
    runRomValidation().catch((e) => { validateState.running = false; appendLog({ type: "validate-error", error: String(e.message || e) }); });
    json(res, 200, { ok: true, started: true });
    return;
  }

  // POST /api/roms/download-all — inicia download em background
  if (req.method === "POST" && url.pathname === "/api/roms/download-all") {
    if (downloadState.running) { json(res, 200, { ok: true, alreadyRunning: true, ...downloadState }); return; }
    let body = {};
    try { body = await parseBody(req); } catch {}
    const cfg = readConfig();
    if (String(body.source || "").toLowerCase() !== "drive") {
      json(res, 409, { ok: false, error: "Download bloqueado: selecione Google Drive como origem das ROMs." });
      return;
    }
    const target = (body.target && String(body.target).trim()) || defaultRomsTarget(cfg);
    const manifest = loadRomManifest();
    if (!(manifest.files || []).length) { json(res, 500, { ok: false, error: "Lista de ROMs não encontrada no instalador" }); return; }
    // salva romsDir automaticamente
    try {
      writeConfig({ ...cfg, romsDir: target, updatedAt: Date.now() });
      const mameExe = findMameExe({ ...cfg, romsDir: target });
      if (mameExe) { try { writeMameIniKey(path.dirname(mameExe), "rompath", target); } catch {} }
      configureBundledEmulatorsForRoms(target);
    } catch {}
    runRomDownload(target).catch((e) => { downloadState.errors.push({ file: "*", error: String(e.message || e) }); downloadState.running = false; });
    json(res, 200, { ok: true, started: true, target, total: (manifest.files || []).length });
    return;
  }

  // GET /api/browse?path=...&mode=dir|exe
  // Lista pastas (e opcionalmente .exe) para navegação. Sem path => lista drives no Windows.
  if (req.method === "GET" && url.pathname === "/api/browse") {
    const reqPath = (url.searchParams.get("path") || "").trim();
    const mode = (url.searchParams.get("mode") || "dir").trim(); // "dir" ou "exe"
    try {
      // Sem path: lista drives (Windows) ou raiz (unix)
      if (!reqPath) {
        if (process.platform === "win32") {
          const drives = [];
          for (const letter of "CDEFGHIJKLMNOPQRSTUVWXYZAB") {
            const drive = `${letter}:\\`;
            try { if (fs.existsSync(drive)) drives.push({ name: drive, path: drive, type: "drive" }); } catch {}
          }
          json(res, 200, { path: "", parent: null, entries: drives });
        } else {
          const entries = fs.readdirSync("/").map((n) => ({ name: n, path: `/${n}`, type: "dir" }));
          json(res, 200, { path: "/", parent: null, entries });
        }
        return;
      }
      const normalized = path.resolve(reqPath);
      if (!fs.existsSync(normalized)) { json(res, 404, { error: `Pasta não encontrada: ${normalized}` }); return; }
      const stat = fs.statSync(normalized);
      if (!stat.isDirectory()) { json(res, 400, { error: "O caminho não é uma pasta" }); return; }
      const items = fs.readdirSync(normalized, { withFileTypes: true });
      const entries = [];
      for (const it of items) {
        try {
          if (it.isDirectory()) entries.push({ name: it.name, path: path.join(normalized, it.name), type: "dir" });
          else if (mode === "exe" && /\.exe$/i.test(it.name)) entries.push({ name: it.name, path: path.join(normalized, it.name), type: "exe" });
        } catch {}
      }
      entries.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
      const parent = path.dirname(normalized);
      json(res, 200, { path: normalized, parent: parent === normalized ? null : parent, entries });
    } catch (err) {
      json(res, 500, { error: `Erro ao listar: ${err.message}` });
    }
    return;
  }



  // GET /api/config — carrega config persistida no servidor
  if (req.method === "GET" && url.pathname === "/api/config") {
    json(res, 200, readEffectiveConfig());
    return;
  }

  // POST /api/config — salva config no servidor (sobrevive a outro navegador/PC)
  if (req.method === "POST" && url.pathname === "/api/config") {
    let body;
    try { body = await parseBody(req); } catch { json(res, 400, { error: "JSON inválido" }); return; }
    const next = { ...readConfig(), ...body, updatedAt: Date.now() };
    if (next.romsDir) {
      const selectedFolder = path.resolve(String(next.romsDir));
      const selectedRomsDir = firstExistingDir([
        path.join(selectedFolder, "roms"),
        path.join(selectedFolder, "ROMS"),
        path.join(selectedFolder, "Roms"),
        path.join(selectedFolder, "Mameplus_0.168.2", "roms"),
        path.join(selectedFolder, "Mameplus_0.168.2", "ROMS"),
        path.join(selectedFolder, "Mameplus_0.168.2", "Roms"),
        selectedFolder,
      ]) || selectedFolder;
      const nearbyMame = findNearbyMame(selectedRomsDir) || findNearbyMame(selectedFolder);
      const nearbyCore = findNearbyMameCore(selectedRomsDir) || findNearbyMameCore(selectedFolder);
      next.romsDir = selectedRomsDir;
      if (nearbyCore) next.mamePath = nearbyCore;
      else if (nearbyMame) next.mamePath = nearbyMame;
      configureBundledEmulatorsForRoms(selectedRomsDir);
      if (nearbyMame) { try { writeMameIniKey(path.dirname(nearbyMame), "rompath", selectedRomsDir); } catch {} }
      if (nearbyMame && nearbyCore) { try { writeMamePguiConfig(nearbyMame, nearbyCore); } catch {} }
    }
    const ok = writeConfig(next);
    json(res, ok ? 200 : 500, ok ? { ok: true, romsDir: next.romsDir || "" } : { error: "Falha ao salvar config.json" });
    return;
  }

  // GET /api/launches — últimas 50 execuções
  if (req.method === "GET" && url.pathname === "/api/launches") {
    try {
      const content = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf8") : "";
      const lines = content.trim().split("\n").filter(Boolean).slice(-50).reverse();
      json(res, 200, { launches: lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/about — ficha completa do sistema (tela SOBRE)
  if (req.method === "GET" && url.pathname === "/api/about") {
    try { json(res, 200, aboutPayload()); }
    catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/images/status — progresso do download das imagens
  if (req.method === "GET" && url.pathname === "/api/images/status") {
    json(res, 200, { ...imgState, pasta: snapsDir() });
    return;
  }

  // POST /api/images/download-all — baixa as imagens de todos os jogos
  if (req.method === "POST" && url.pathname === "/api/images/download-all") {
    if (imgState.running) { json(res, 200, { started: false, ...imgState }); return; }
    runImageDownload().catch((e) => console.error("[MGA] Imagens:", e.message || e));
    json(res, 202, { started: true, ...imgState });
    return;
  }

  // GET /api/image?rom=xxx — imagem do jogo (baixa on-demand e guarda em disco)
  if (req.method === "GET" && url.pathname === "/api/image") {
    const rom = String(url.searchParams.get("rom") || "").replace(/\.(zip|7z|chd)$/i, "");
    if (!rom) { json(res, 400, { error: "rom obrigatório" }); return; }
    const local = snapPath(rom);
    if (fs.existsSync(local) && fs.statSync(local).size > 512) { serveFile(local, res); return; }
    const got = await fetchGameImage(rom).catch(() => "");
    if (got) { serveFile(got, res); return; }
    json(res, 404, { error: "Imagem não encontrada" });
    return;
  }

  // GET /api/video?rom=xxx — vídeo curto validado, baixado sob demanda e guardado em disco
  if (req.method === "GET" && url.pathname === "/api/video") {
    const rom = String(url.searchParams.get("rom") || "").replace(/\.(zip|7z|chd)$/i, "");
    if (!rom) { json(res, 400, { error: "rom obrigatório" }); return; }
    const local = await fetchGameVideo(rom);
    if (local) { serveFile(local, res); return; }
    json(res, 404, { error: "Vídeo não encontrado para este jogo" });
    return;
  }

  // GET /api/roms?path=...
  if (req.method === "GET" && url.pathname === "/api/roms") {
    const romsPath = url.searchParams.get("path") || "";
    if (!romsPath) { json(res, 400, { error: "Parâmetro 'path' obrigatório" }); return; }
    const normalizedPath = path.resolve(romsPath.trim());
    if (!fs.existsSync(normalizedPath)) {
      json(res, 404, { error: `Pasta não encontrada: ${normalizedPath}` }); return;
    }
    try {
      const roms = fs.readdirSync(normalizedPath)
        .filter((f) => /\.(zip|7z|chd)$/i.test(f))
        .sort((a, b) => a.localeCompare(b));
      json(res, 200, { roms, path: normalizedPath, total: roms.length });
    } catch (err) {
      json(res, 500, { error: `Erro ao ler pasta: ${err.message}` });
    }
    return;
  }

  // GET /api/check-mame?path=...
  if (req.method === "GET" && url.pathname === "/api/check-mame") {
    const mamePath = url.searchParams.get("path") || "";
    const normalizedPath = mamePath ? path.resolve(mamePath.trim()) : findMameExe(readConfig());
    if (!normalizedPath) { json(res, 200, { exists: false, path: "", currentRompath: "" }); return; }
    const exists = fs.existsSync(normalizedPath);
    let currentRompath = "";
    if (exists) {
      const ini = readMameIni(path.dirname(normalizedPath));
      currentRompath = ini["rompath"] || "";
    }
    json(res, 200, { exists, path: normalizedPath, currentRompath });
    return;
  }

  // POST /api/set-rompath
  if (req.method === "POST" && url.pathname === "/api/set-rompath") {
    let body;
    try { body = await parseBody(req); } catch { json(res, 400, { error: "JSON inválido" }); return; }
    const { mamePath, romsPath } = body;
    if (!mamePath || !romsPath) { json(res, 400, { error: "mamePath e romsPath obrigatórios" }); return; }
    const mameExe = path.resolve(mamePath.trim());
    if (!fs.existsSync(mameExe)) { json(res, 404, { error: `MAME não encontrado: ${mameExe}` }); return; }
    const mameDir = path.dirname(mameExe);
    const romsDir = path.resolve(romsPath.trim());
    const iniPath = path.join(mameDir, "mame.ini");
    try {
      writeMameIniKey(mameDir, "rompath", romsDir);
      configureBundledEmulatorsForRoms(romsDir);
      console.log(`[MAME] rompath salvo no mame.ini: ${romsDir}`);
      json(res, 200, { ok: true, iniPath, rompath: romsDir });
    } catch (err) {
      json(res, 500, { error: `Falha ao escrever mame.ini: ${err.message}` });
    }
    return;
  }

  // GET /api/controls/profile — perfil atual e presets disponíveis.
  if (req.method === "GET" && url.pathname === "/api/controls/profile") {
    json(res, 200, { profile: readControlProfile(), presets: ["arcade-usb", "dragonrise", "directinput", "playstation"].map((kind) => { const p = defaultControlProfile(kind); return { ...p, logicalMap: logicalMapFromBindings(p.bindings) }; }) });
    return;
  }

  // POST /api/controls/profile { mamePath, profile: { kind, name, bindings } }
  // Salva o mapeamento feito dentro do launcher e aplica ao MAMEPlus globalmente.
  if (req.method === "POST" && url.pathname === "/api/controls/profile") {
    let body;
    try { body = await parseBody(req); } catch { json(res, 400, { error: "JSON inválido" }); return; }
    const profile = body.profile || body;
    const mameExe = firstExistingFile([String(body.mamePath || "")]);
    try {
      const saved = saveControlProfile(profile);
      if (mameExe) {
        const controls = writeDefaultControls(path.dirname(mameExe), saved);
        json(res, 200, { ok: true, profile: saved, applied: true, cfgDir: controls.cfgDir, mappings: controls.mappings });
      } else {
        json(res, 200, { ok: true, profile: saved, applied: false, message: "Perfil salvo; será aplicado quando o MAME for localizado." });
      }
    } catch (err) { json(res, 500, { error: `Falha ao salvar perfil: ${err.message}` }); }
    return;
  }

  // POST /api/reset-controls  { mamePath }
  // Escreve cfg/default.cfg com o perfil salvo para todas as ROMs.
  if (req.method === "POST" && url.pathname === "/api/reset-controls") {
    let body;
    try { body = await parseBody(req); } catch { json(res, 400, { error: "JSON inválido" }); return; }
    const { mamePath } = body;
    if (!mamePath) { json(res, 400, { error: "mamePath obrigatório" }); return; }
    const mameExe = path.resolve(mamePath.trim());
    if (!fs.existsSync(mameExe)) { json(res, 404, { error: `MAME não encontrado: ${mameExe}` }); return; }
    const mameDir = path.dirname(mameExe);
    const cfgDir = path.join(mameDir, "cfg");
    try {
      const controls = writeDefaultControls(mameDir, readControlProfile());
      // Apaga cfgs por-rom para garantir que o default valha em todas
      try {
        for (const f of fs.readdirSync(cfgDir)) {
          if (f.toLowerCase() !== "default.cfg" && /\.cfg$/i.test(f)) {
            try { fs.unlinkSync(path.join(cfgDir, f)); } catch {}
          }
        }
      } catch {}
      console.log(`[MAME] Teclado padrão aplicado em ${cfgDir}`);
      json(res, 200, { ok: true, cfgDir: controls.cfgDir, mappings: controls.mappings });
    } catch (err) {
      json(res, 500, { error: `Falha ao escrever default.cfg: ${err.message}` });
    }
    return;
  }

  // POST /api/open-emulator — abre o MAME DIRETO (binário CLI). Nunca a GUI.
  if (req.method === "POST" && url.pathname === "/api/open-emulator") {
    let body = {};
    try { body = await parseBody(req); } catch {}
    const cfg = readConfig();
    const romsDir = body.romsPath || cfg.romsDir || findRomsDir(cfg) || "";
    let mameExe = findNearbyMameCore(romsDir) || findNearbyMame(romsDir) || findBundledEmulator("mame168") || findMameExe(cfg) || "";
    if (mameExe && isForbiddenMameGui(mameExe)) mameExe = "";
    if (!mameExe) {
      json(res, 404, { error: "MAME (mamep64.exe) não encontrado na instalação.", romsDir });
      return;
    }
    try {
      const mameDir = path.dirname(mameExe);
      try { writeMameIniKey(mameDir, "rompath", romsDir); } catch {}
      try { writeDefaultControls(mameDir); } catch {}
      const args = ["-skip_gameinfo", "-nomaximize"];
      if (romsDir) args.push("-rompath", romsDir);
      const child = spawn(mameExe, args, { cwd: mameDir, detached: true, stdio: "ignore", windowsHide: true });
      child.on("error", (err) => appendLog({ type: "open-emulator-error", mameExe, error: String(err.message || err) }));
      child.unref();
      appendLog({ type: "open-emulator", mameExe, romsDir });
      json(res, 200, { ok: true, mameExe, romsDir });
    } catch (err) {
      json(res, 500, { error: `Falha ao abrir o MAME: ${err.message}` });
    }
    return;
  }


  // POST /api/launch  { mamePath, romName, romsPath? }
  if (req.method === "POST" && url.pathname === "/api/launch") {
    let body;
    try { body = await parseBody(req); } catch { json(res, 400, { error: "JSON inválido" }); return; }
    const { mamePath, romName, romsPath, emulator } = body;
    if (!romName) { json(res, 400, { error: "romName obrigatório" }); return; }

    const cfg = readConfig();
    let mameExe = "";
    const romsHint = romsPath || cfg.romsDir || "";
    const folderMame = findNearbyMameCore(romsHint);
    if (folderMame) mameExe = folderMame;
    if (!mameExe && mamePath) mameExe = firstExistingFile([path.resolve(String(mamePath).trim())]);
    if (mameExe && path.basename(mameExe).toLowerCase() === "mamepgui.exe") {
      const coreFallback = findNearbyMameCore(romsHint);
      if (coreFallback) mameExe = coreFallback;
    }
    if (!mameExe && cfg.mamePath) mameExe = firstExistingFile([path.resolve(String(cfg.mamePath))]);
    if (mameExe && isForbiddenMameGui(mameExe)) mameExe = "";
    if (!mameExe && emulator) mameExe = findBundledEmulator(String(emulator));
    if (!mameExe) mameExe = findMameExe({ ...cfg, mamePath: "" });
    // Rejeita qualquer binário de GUI. Só aceita executável CLI do MAME.
    if (mameExe && isForbiddenMameGui(mameExe)) {
      mameExe = "";
    }
    if (!mameExe || !fs.existsSync(mameExe)) {
      const roots = runtimeRoots();
      appendLog({ type: "mame-not-found", emulator: emulator || "", configured: cfg.mamePath || "", roots });
      json(res, 404, { error: `MAME CLI não encontrado. O executável não foi localizado dentro da instalação. Abra Configuração > MAME e selecione mamep64.exe, ou aguarde o download do MAME concluir.`, roots }); return;
    }

    const mameDir = path.dirname(mameExe);
    const romsDir = romsPath ? path.resolve(String(romsPath).trim()) : findRomsDir(cfg, mameExe);
    const rom = romName.replace(/\.(zip|7z|chd)$/i, "");
    if (romsDir) {
      const romFile = path.join(romsDir, romName);
      if (!fs.existsSync(romFile)) {
        const chdFile = path.join(romsDir, rom, romName);
        if (!fs.existsSync(chdFile)) { json(res, 404, { error: `ROM não encontrada: ${romFile}` }); return; }
      }
      try { writeMameIniKey(mameDir, "rompath", romsDir); } catch {}
      try { relocateFlatChds(romsDir); } catch {}
    }

    // A coleção do Drive já foi testada no MAMEPlus 0.168.2. Não bloqueie
    // clones ou dumps conhecidos por falsos negativos do -verifyroms.
    const compatMeta = (loadRomCompat().sets || {})[rom] || {};
    if (compatMeta.kind === "bios") {
      json(res, 409, { error: `${rom} é BIOS/sistema de suporte, não um jogo.` });
      return;
    }

    try { writeDefaultControls(mameDir); } catch {}

    // Abre o JOGO direto — sem menu interno do MAME, sem seletor de sistemas,
    // sem GUI. -skip_gameinfo pula a tela de aviso; -nowindow força fullscreen.
    // -noreadconfig evita que um mame.ini alheio reative janelas/GUI.
    const args = [
      rom,
      "-skip_gameinfo",
      "-nowindow",
      "-nomaximize",
      "-noreadconfig",
      ...VIDEO_ARGS,
      ...joystickArgs(),
      ...controllerArgs(mameDir),
    ];
    if (romsDir) args.push("-rompath", romsDir);
    const flags = args.slice(1).map((a) => a.includes(" ") ? `"${a}"` : a).join(" ");

    console.log(`[MAME] Iniciando jogo direto: "${mameExe}" ${rom} ${flags}`);

    try {
      const cmd = `"${mameExe}" ${args.map((a) => a.includes(" ") ? `"${a}"` : a).join(" ")}`;

      const spawnMame = (argv) => {
        const child = spawn(mameExe, argv, { cwd: mameDir, detached: true, stdio: "ignore", windowsHide: true });
        child.on("error", (err) => console.error(`[MAME] Erro ao lançar ${rom}:`, err.message));
        child.on("exit", () => { if (activeMameChild === child) activeMameChild = null; });
        child.unref();
        return child;
      };
      await stopActiveMame();
      let child = spawnMame(args);
      activeMameChild = child;
      let fallback = false;
      // Dá tempo para detectar encerramento imediato, DLL ausente ou argumento rejeitado.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (child.exitCode !== null) {
        const safeArgs = [rom, "-skip_gameinfo", "-nowindow", "-nomaximize", "-noreadconfig", ...VIDEO_ARGS, ...joystickArgs()];
        if (romsDir) safeArgs.push("-rompath", romsDir);
        child = spawnMame(safeArgs);
        fallback = true;
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      if (child.exitCode !== null) {
        const code = child.exitCode;
        appendLog({ rom, ok: false, code, fallback });
        json(res, 502, { error: `O MAME encerrou antes de abrir o jogo (código ${code ?? "desconhecido"}). Verifique a BIOS, a ROM e o MAMEPlus 0.168.2.`, rom, fallback });
        return;
      }

      appendLog({ rom, ok: true, pid: child.pid, fallback });
      json(res, 200, { ok: true, rom, pid: child.pid, fallback, cmd });
    } catch (err) {
      console.error(`[MAME] Falha:`, err);
      json(res, 500, { error: `Falha ao iniciar MAME: ${err.message}` });
    }
    return;
  }
  if (req.method === "GET" && tryServeStatic(url.pathname, res)) return;

  json(res, 404, { error: "Rota não encontrada" });
}

let activeMameChild = null;
async function stopActiveMame() {
  const child = activeMameChild;
  if (!child || child.exitCode !== null || child.killed) { activeMameChild = null; return; }
  await new Promise((resolve) => {
    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
      killer.once("close", resolve); killer.once("error", resolve);
    } else {
      try { process.kill(-child.pid, "SIGTERM"); } catch { try { child.kill("SIGTERM"); } catch {} }
      setTimeout(resolve, 400);
    }
  });
  activeMameChild = null;
}
const server = http.createServer(handleRequest);
server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n✅ MAME Backend v3 rodando em http://localhost:${PORT}\n`);
  // Ao iniciar, se algum MAME estiver faltando, baixa automaticamente em background.
  try {
    if (anyEmulatorMissing()) {
      console.log("[MGA] Um ou mais MAMEs não estão instalados — iniciando download automático.");
      runEmulatorDownload().catch((e) => console.error("[MGA] Falha no download automático:", e.message || e));
    } else {
      // Garante que o rompath está apontando para a pasta roms do sistema.
      try { configureBundledEmulatorsForRoms(systemRomsDir()); } catch {}
    }
  } catch (e) { console.error("[MGA] Erro no auto-check de emuladores:", e.message || e); }
  // Baixa as imagens dos jogos em background (uma vez; depois fica em disco/offline).
  try {
    runImageDownload()
      .then((s) => console.log(`[MGA] Imagens dos jogos: ${s.ok}/${s.total} prontas em ${snapsDir()}`))
      .catch((e) => console.error("[MGA] Falha ao baixar imagens:", e.message || e));
  } catch {}
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Porta ${PORT} já em uso. Feche o processo anterior.`);
    if (process.env.MGA_EMBEDDED === "1") return;
  } else {
    console.error("Erro:", err);
  }
  process.exit(1);
});
