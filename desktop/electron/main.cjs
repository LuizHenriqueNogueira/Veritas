const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Analisador IA - Veritas Desktop',
    backgroundColor: '#f4f6f9',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Remove menu padrão para visual limpo estilo aplicativo nativo
  mainWindow.setMenuBarVisibility(false);

  const startUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';

  if (process.env.NODE_ENV === 'production' || !process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch(() => {
      mainWindow.loadURL(startUrl);
    });
  } else {
    mainWindow.loadURL(startUrl);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
