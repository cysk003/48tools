import { createRequire } from 'node:module';
import type {
  App,
  BrowserWindow as BrowserWindowType,
  IpcMain,
  Menu as MenuType,
  NativeTheme
} from 'electron';

const require: NodeRequire = createRequire(import.meta.url);

/**
 * 使用commonjs的方式导出electron方法
 */

export interface ElectronModule {
  app: App;
  BrowserWindow: typeof BrowserWindowType;
  ipcMain: IpcMain;
  Menu: typeof MenuType;
  nativeTheme: NativeTheme;
}

export const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeTheme
}: ElectronModule = require('electron');