const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mgaWindow", {
  minimize: () => ipcRenderer.invoke("mga-window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("mga-window:toggle-maximize"),
  close: () => ipcRenderer.invoke("mga-window:close"),
  isMaximized: () => ipcRenderer.invoke("mga-window:is-maximized"),
  toggleFullscreen: () => ipcRenderer.invoke("mga-window:toggle-fullscreen"),
  isFullscreen: () => ipcRenderer.invoke("mga-window:is-fullscreen"),
  openDriveFolder: () => ipcRenderer.invoke("mga-drive:open-folder"),
});