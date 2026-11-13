const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('veritasBubble',{send:data=>ipcRenderer.send('floating-action',data)});
