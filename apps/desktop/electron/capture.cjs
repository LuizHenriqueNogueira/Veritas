const {BrowserWindow,ipcMain,desktopCapturer,screen}=require('electron');
const path=require('node:path');
function registerCapture(mainWindow,floating){let captureActive=false;
ipcMain.handle('capture-screen', async event => {
  if (!mainWindow || event.sender !== mainWindow.webContents || captureActive) throw new Error('Captura indisponível.');
  captureActive = true;
  let overlay;
  let finishListener;
  try {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    floating?.hide();
    mainWindow.hide();
    await new Promise(resolve => setTimeout(resolve, 250));
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: {
      width: Math.round(display.size.width * display.scaleFactor), height: Math.round(display.size.height * display.scaleFactor)
    } });
    const source = sources.find(s => s.display_id === String(display.id));
    if (!source || source.thumbnail.isEmpty()) throw new Error('Tela indisponível.');
    overlay = new BrowserWindow({ ...display.bounds, frame: false, alwaysOnTop: true, skipTaskbar: true,
      resizable: false, movable: false, fullscreen: true, show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'capture-preload.cjs') }
    });
    ipcMain.handle('capture-image', e => {
      if (e.sender !== overlay.webContents) throw new Error('Origem inválida.');
      return source.thumbnail.toDataURL();
    });
    const selected = new Promise(resolve => {
      finishListener = (e, r) => {
        if (e.sender !== overlay.webContents) return;
        if (!r) { resolve(null); return; }
        if (![r.x,r.y,r.width,r.height,r.viewportWidth,r.viewportHeight].every(Number.isFinite) || r.viewportWidth <= 0 || r.viewportHeight <= 0 || r.width <= 5 || r.height <= 5 || r.x < 0 || r.y < 0 || r.x+r.width > r.viewportWidth || r.y+r.height > r.viewportHeight) { resolve(null); return; }
        const size = source.thumbnail.getSize();
        const x = Math.round(r.x * size.width / r.viewportWidth), y = Math.round(r.y * size.height / r.viewportHeight);
        const width = Math.min(size.width-x, Math.round(r.width * size.width / r.viewportWidth));
        const height = Math.min(size.height-y, Math.round(r.height * size.height / r.viewportHeight));
        resolve(source.thumbnail.crop({x,y,width,height}).toDataURL());
      };
      ipcMain.on('capture-finish', finishListener);
      overlay.on('closed', () => resolve(null));
    });
    await overlay.loadFile(path.join(__dirname, 'capture.html'));
    overlay.show(); overlay.focus();
    return await selected;
  } finally {
    ipcMain.removeHandler('capture-image');
    if (finishListener) ipcMain.removeListener('capture-finish', finishListener);
    if (overlay && !overlay.isDestroyed()) overlay.close();
    if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); }
    captureActive = false; floating?.update();
  }
});

return ()=>captureActive;
}
module.exports={registerCapture};
