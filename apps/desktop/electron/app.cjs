const {app,BrowserWindow,ipcMain,shell,Tray,Menu,dialog}=require('electron');
const path=require('node:path');const fs=require('node:fs');
const {startBackend}=require('./backend.cjs');
const {registerCapture}=require('./capture.cjs');
const {createFloating}=require('./floating.cjs');
app.setName('Veritas');app.setAppUserModelId('br.edu.veritas.desktop');
// Static desktop screens also work reliably on presentation PCs without GPU composition.
if(process.platform==='win32')app.disableHardwareAcceleration();
if(process.env.VERITAS_USER_DATA_DIR){fs.mkdirSync(process.env.VERITAS_USER_DATA_DIR,{recursive:true});app.setPath('userData',process.env.VERITAS_USER_DATA_DIR);}
let mainWindow,tray,floating;
function restore(){if(mainWindow && !mainWindow.isDestroyed()){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();floating?.hide();}}
const external=url=>{try{const u=new URL(url);if(['https:','http:'].includes(u.protocol) && !u.username && !u.password)void shell.openExternal(u.href);}catch{}};
if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',restore);
  app.whenReady().then(async()=>{
    const backend=await startBackend(app);
    const icon=app.isPackaged?path.join(app.getAppPath(),'assets/veritas.ico'):path.join(__dirname,'../../../assets/veritas.ico');
    mainWindow=new BrowserWindow({width:1280,height:860,minWidth:1024,minHeight:700,title:'Veritas',icon,show:false,backgroundColor:'#f4f6f9',
      webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,preload:path.join(__dirname,'preload.cjs')}});
    mainWindow.setMenuBarVisibility(false);
    mainWindow.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
    mainWindow.webContents.on('will-navigate',(e,url)=>{if(url!==mainWindow.webContents.getURL()){e.preventDefault();external(url);}});
    ipcMain.handle('backend-url',e=>{if(e.sender!==mainWindow.webContents)throw new Error('Origem inválida.');return backend.url;});
    let capturing=()=>false;
    floating=createFloating({mainWindow,app,icon,isCapturing:()=>capturing(),restore});
    capturing=registerCapture(mainWindow,floating);
    tray=new Tray(icon);tray.setToolTip('Veritas');tray.on('click',restore);
    tray.setContextMenu(Menu.buildFromTemplate([{label:'Abrir Veritas',click:restore},{label:'Ocultar botão flutuante',click:()=>floating.disable()},{type:'separator'},{label:'Encerrar Veritas',click:()=>app.quit()}]));
    mainWindow.on('closed',()=>app.quit());
    mainWindow.once('ready-to-show',restore);
    const showFallback=setTimeout(restore,1000);
    if(!app.isPackaged && process.env.VITE_DEV_SERVER_URL)await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    else await mainWindow.loadFile(path.join(__dirname,'../dist/index.html'));
    clearTimeout(showFallback);restore();app.on('activate',restore);
  }).catch(error=>{dialog.showErrorBox('Não foi possível iniciar o Veritas',error.message);app.quit();});
}
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>tray?.destroy());
