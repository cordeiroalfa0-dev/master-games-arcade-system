const { app, BrowserWindow, dialog, shell, ipcMain, screen } = require("electron");
const http = require("http");
const path = require("path");

// A introdução inicia com áudio automaticamente; não há mais tela intermediária.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

let mainWindow;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

function waitForBackend(retries = 80) {
  return new Promise((resolve, reject) => {
    const tick = (left) => {
      const req = http.get("http://127.0.0.1:7777/api/health", (res) => {
        res.resume();
        if (res.statusCode === 200) resolve(true);
        else if (left <= 0) reject(new Error("Backend não respondeu"));
        else setTimeout(() => tick(left - 1), 250);
      });
      req.on("error", () => {
        if (left <= 0) reject(new Error("Backend offline"));
        else setTimeout(() => tick(left - 1), 250);
      });
      req.setTimeout(1000, () => req.destroy());
    };
    tick(retries);
  });
}

async function startLocalServer() {
  try {
    await waitForBackend(2);
    return;
  } catch {
    // Nenhum backend ativo ainda; inicia o servidor embutido abaixo.
  }
  process.env.MGA_USER_DATA = app.getPath("userData");
  process.env.MGA_EMBEDDED = "1";
  process.env.MGA_INSTALL_DIR = path.dirname(process.execPath);
  await import("../mame-server.js");
  await waitForBackend();
}

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const safeMargin = 40;
  const width = Math.max(320, Math.min(1280, workArea.width - safeMargin));
  const height = Math.max(220, Math.min(720, workArea.height - safeMargin));

  mainWindow = new BrowserWindow({
    width,
    height,
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    minWidth: 320,
    minHeight: 220,
    maxWidth: workArea.width,
    maxHeight: workArea.height,
    resizable: true,
    maximizable: true,
    minimizable: true,
    fullscreenable: true,
    fullscreen: true,
    frame: false,
    backgroundColor: "#000000",
    icon: path.join(__dirname, "..", "build", "app-icon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setFullScreen(true);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Persiste o perfil de controles antes de aceitar o fechamento da janela.
  mainWindow.on("close", (event) => {
    if (mainWindow.__mgaPersistingControls) return;
    event.preventDefault();
    mainWindow.__mgaPersistingControls = true;
    mainWindow.webContents.executeJavaScript("window.__mgaPersistControls && window.__mgaPersistControls()")
      .catch(() => {})
      .finally(() => { try { mainWindow.close(); } catch {} });
  });

  // Carrega a INTRO primeiro; ela redireciona para o launcher
  mainWindow.loadURL("http://127.0.0.1:7777/intro.html");
}

ipcMain.handle("mga-window:minimize", () => mainWindow && mainWindow.minimize());
ipcMain.handle("mga-window:toggle-maximize", () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle("mga-window:close", () => mainWindow && mainWindow.close());
ipcMain.handle("mga-window:is-maximized", () => Boolean(mainWindow && mainWindow.isMaximized()));
ipcMain.handle("mga-window:toggle-fullscreen", () => {
  if (!mainWindow) return false;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
  return mainWindow.isFullScreen();
});
ipcMain.handle("mga-window:is-fullscreen", () => Boolean(mainWindow && mainWindow.isFullScreen()));
ipcMain.handle("mga-drive:open-folder", async () => {
  const driveFolderUrl = "https://drive.google.com/drive/folders/1WdYP36QIdnxxhFhpZOJf0ly6zd9mAGzo?usp=drive_link";
  await shell.openExternal(driveFolderUrl);
  return { ok: true, url: driveFolderUrl };
});

app.whenReady().then(async () => {
  try {
    await startLocalServer();
    createWindow();
  } catch (err) {
    console.error(err);
    createWindow();
    dialog.showErrorBox("Master Games Arcade", `Falha ao iniciar o servidor local.\n\n${String((err && err.message) || err)}`);
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<body style="background:#000;color:#00e5ff;font-family:monospace;padding:32px"><h1>Master Games Arcade</h1><p>Falha ao iniciar servidor local.</p><pre>${String(err && err.stack || err)}</pre></body>`)}`);
  }
});

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});