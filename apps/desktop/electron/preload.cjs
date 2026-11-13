const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true, plataforma: process.platform,
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  backendUrl: () => ipcRenderer.invoke('backend-url'),
  setFloatingEnabled: enabled => ipcRenderer.invoke('floating-enabled',enabled === true),
  onFloatingDisabled: handler => {const listener=()=>handler();ipcRenderer.on('floating-disabled',listener);return ()=>ipcRenderer.removeListener('floating-disabled',listener);}
});
