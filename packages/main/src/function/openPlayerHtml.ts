import * as path from 'node:path';
import * as querystring from 'node:querystring';
import * as remoteMain from '@electron/remote/main';
import type { BrowserWindow as BrowserWindowType } from 'electron';
import { BrowserWindow } from '../electron';
import { isDevelopment, metaHelper, MetaHelper } from '../utils';
import { themeEvent, ThemeValue } from './ipcTheme';

const { __dirname }: MetaHelper = metaHelper(import.meta.url);

/* 记录id和窗口的关系 */
export const playerWindowMaps: Map<string, BrowserWindowType> = new Map();

/**
 * 打开播放器页面
 * @param { string } title: 窗口标题
 * @param { string } query: 字符串查询参数
 */
export function openPlayerHtml(title: string, query: string): void {
  const { id }: { id?: string } = querystring.parse(query);
  let win: BrowserWindowType | null = new BrowserWindow({
    width: 300,
    height: 680,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false,
      contextIsolation: false
    },
    title
  });

  remoteMain.enable(win.webContents);

  function handleThemeEvent(value: ThemeValue): void {
    if (win) {
      win.webContents.send('themeSource', value);
    }
  }

  if (win) {
    win.loadFile(
      isDevelopment
        ? path.join(__dirname, '../../../48tools/dist/player.html')
        : path.join(__dirname, '../../../dist/player.html'),
      { search: query }
    );

    win.on('closed', function(): void {
      themeEvent.off('themeSource', handleThemeEvent);
      id && playerWindowMaps.delete(id);
      win = null;
    });

    themeEvent.on('themeSource', handleThemeEvent);
  }

  id && playerWindowMaps.set(id, win);
}