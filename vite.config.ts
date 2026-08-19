import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

// Pure Vite SPA config para empacotar com Electron.
// base: './' é OBRIGATÓRIO para o build funcionar via file:// no Electron.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: { host: "::", port: 8080, strictPort: false },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
