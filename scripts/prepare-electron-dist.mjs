import fs from "fs";
import path from "path";

// O runtime usa apenas dist/client. Limpar apenas esse destino evita apagar o build do Vite.
const publicDir = path.resolve("public");
const distDir = path.resolve("dist");
const dstDir = path.join(distDir, "client");
fs.rmSync(dstDir, { recursive: true, force: true });
fs.mkdirSync(dstDir, { recursive: true });

function copyRec(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) copyRec(path.join(src, name), path.join(dst, name));
  } else {
    fs.copyFileSync(src, dst);
  }
}

if (!fs.existsSync(path.join(publicDir, "launcher.html"))) throw new Error("public/launcher.html ausente");
if (!fs.existsSync(path.join(publicDir, "intro.html"))) throw new Error("public/intro.html ausente");
copyRec(publicDir, dstDir);
console.log(`Conteúdo de public/ copiado para ${dstDir}`);
