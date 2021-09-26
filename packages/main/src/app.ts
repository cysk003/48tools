import * as process from 'node:process';
import * as path from 'node:path';
import * as remoteMain from '@electron/remote/main';
import type { BrowserWindow as BrowserWindowType } from 'electron';
import { app, BrowserWindow, Menu } from './electron';
import { isDevelopment, metaHelper, MetaHelper } from './utils';
import { ipc, removeIpc } from './ipc';
import { nodeMediaServerClose } from './nodeMediaServer/nodeMediaServer';

const { __dirname }: MetaHelper = metaHelper(import.meta.url);

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1'; // 关闭警告
remoteMain.initialize();

/* BrowserWindow窗口对象 */
let win: BrowserWindowType | null = null;

/* 初始化 */
function createWindow(): void {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false,
      contextIsolation: false
    },
    icon: isDevelopment ? undefined : path.join(__dirname, '../../titleBarIcon.png')
  });

  remoteMain.enable(win.webContents);

  if (isDevelopment) {
    win.webContents.openDevTools();
  }

  win.loadFile(
    isDevelopment
      ? path.join(__dirname, '../../48tools/dist/index.html')
      : path.join(__dirname, '../../dist/index.html')
  );

  // 去掉顶层菜单
  Menu.setApplicationMenu(null);

  ipc(win);

  win.on('closed', async function(): Promise<void> {
    await nodeMediaServerClose();
    removeIpc();
    win = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function(): void {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function(): void {
  if (win === null) {
    createWindow();
  }
});