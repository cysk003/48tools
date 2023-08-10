import { BrowserWindow, type Session, type Cookie, ipcMain, type IpcMainEvent } from 'electron';
import { pcUserAgent } from '../utils';
import { DouyinCookieChannel } from '../channelEnum';

const douyinUrl: string = 'https://www.douyin.com/user/MS4wLjABAAAA6-qJnU8aVPJ4chZQFIyuVHSB3_K3w1rH_L_IuLjaswk';
let douyinWin: BrowserWindow | null = null;

/* 打开抖音网站并操作验证码 */
function douyinCookie(win: BrowserWindow): void {
  if (douyinWin !== null) return;

  douyinWin = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: false
    },
    title: '抖音'
  });
  douyinWin.loadURL(douyinUrl, {
    userAgent: pcUserAgent
  });

  // 关闭前获取登陆后的cookie
  douyinWin.on('close', async function(): Promise<void> {
    if (douyinWin) {
      const ses: Session = douyinWin.webContents.session;
      const winSes: Session = win.webContents.session;
      const cookies: Array<Cookie> = await ses.cookies.get({});

      win.webContents.send(DouyinCookieChannel.DouyinCookieResponse, cookies);
      await Promise.all([
        ses.clearStorageData({ storages: ['cookies'] }),
        winSes.clearStorageData({ storages: ['cookies'] })
      ]);
    }
  });

  douyinWin.on('closed', function(): void {
    douyinWin = null;
  });
}

export function douyinCaptchaCookie(win: BrowserWindow): void {
  ipcMain.on(DouyinCookieChannel.DouyinCookie, function(event: IpcMainEvent): void {
    douyinCookie(win);
  });
}