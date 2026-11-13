const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('captureAPI', {
  ready: () => ipcRenderer.invoke('capture-image'),
  finish: region => ipcRenderer.send('capture-finish', region)
});
