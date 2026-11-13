const {BrowserWindow,ipcMain,Menu,screen}=require('electron');
const fs=require('node:fs');const path=require('node:path');
function createFloating({mainWindow,app,icon,isCapturing,restore}){
  let enabled=false,quitting=false,foreground=true,loaded=false;const size=68;const file=path.join(app.getPath('userData'),'floating-position.json');
  let point;try{point=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
  const area=screen.getPrimaryDisplay().workArea;
  const clamp=(p)=>{const a=screen.getDisplayNearestPoint(p).workArea;return {x:Math.max(a.x,Math.min(a.x+a.width-size,Math.round(p.x))),y:Math.max(a.y,Math.min(a.y+a.height-size,Math.round(p.y)))};};
  point=clamp(point && Number.isFinite(point.x) && Number.isFinite(point.y)?point:{x:area.x+area.width-size-16,y:area.y+area.height-size-70});
  const bubble=new BrowserWindow({...point,width:size,height:size,frame:false,backgroundColor:'#153954',alwaysOnTop:true,skipTaskbar:true,resizable:false,show:false,hasShadow:false,icon,
    title:'Voltar ao Veritas',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,preload:path.join(__dirname,'floating-preload.cjs')}});
  bubble.setAlwaysOnTop(true,'floating');
  if(process.platform==='win32'){
    const shape=[];for(let y=4;y<64;y++){const half=Math.floor(Math.sqrt(Math.max(0,30*30-(y-34)*(y-34))));if(half)shape.push({x:34-half,y,width:half*2,height:1});}bubble.setShape(shape);
  }
  const update=()=>{if(quitting || bubble.isDestroyed())return;if(loaded && enabled && !isCapturing() && (mainWindow.isMinimized() || !foreground)){bubble.showInactive();bubble.moveTop();}else bubble.hide();};
  const log=message=>{try{fs.appendFileSync(path.join(app.getPath('userData'),'desktop.log'),new Date().toISOString()+' '+message+'\n');}catch{}};
  bubble.webContents.on('did-fail-load',()=>log('Não foi possível carregar o botão flutuante.'));
  bubble.webContents.on('render-process-gone',(_e,details)=>log('Processo do botão encerrado: '+details.reason));
  bubble.once('ready-to-show',()=>{loaded=true;update();});
  void bubble.loadFile(path.join(__dirname,'floating.html')).then(()=>{loaded=true;update();}).catch(()=>log('Falha no arquivo do botão flutuante.'));
  const disable=()=>{enabled=false;update();mainWindow.webContents.send('floating-disabled');};
  const menu=()=>Menu.buildFromTemplate([{label:'Abrir Veritas',click:restore},{label:'Ocultar botão flutuante',click:disable},{type:'separator'},{label:'Encerrar Veritas',click:()=>app.quit()}]).popup({window:bubble});
  ipcMain.handle('floating-enabled',(e,value)=>{if(e.sender!==mainWindow.webContents)throw new Error('Origem inválida.');enabled=value===true;update();});
  ipcMain.on('floating-action',(e,data)=>{
    if(e.sender!==bubble.webContents || !data)return;
    if(data.action==='restore')restore();
    if(data.action==='menu')menu();
    if(data.action==='move' && Number.isFinite(data.x) && Number.isFinite(data.y) && Math.abs(data.x)<100000 && Math.abs(data.y)<100000)bubble.setPosition(...Object.values(clamp({x:data.x,y:data.y})));
    if(data.action==='save'){try{fs.writeFileSync(file,JSON.stringify(bubble.getBounds()));}catch{}}
  });
  mainWindow.on('blur',()=>{foreground=false;setTimeout(update,80);});mainWindow.on('minimize',()=>{foreground=false;update();});mainWindow.on('focus',()=>{foreground=true;update();});
  bubble.on('focus',()=>{foreground=false;update();});
  const reposition=()=>{if(!bubble.isDestroyed()){const p=clamp(bubble.getBounds());bubble.setPosition(p.x,p.y);}};
  screen.on('display-removed',reposition);screen.on('display-metrics-changed',reposition);
  app.on('before-quit',()=>{quitting=true;screen.removeListener('display-removed',reposition);screen.removeListener('display-metrics-changed',reposition);if(!bubble.isDestroyed())bubble.destroy();});
  return {update,hide:()=>{if(!bubble.isDestroyed())bubble.hide();},disable};
}
module.exports={createFloating};
