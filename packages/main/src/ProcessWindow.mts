import { execArgv } from 'node:process';
import { BrowserWindow, Menu, nativeTheme } from 'electron';
import { isDevelopment, isServe, isTest, titleBarIcon, createHtmlFilePath, createHtmlUrl, createInitialState, packageJson } from './utils.mjs';
import { storeInit, getStore } from './store.mjs';
import { commandLineOptions } from './commend.mjs';
import logProtocol from './logProtocol/logProtocol.mjs';
import { ipc, removeIpc } from './ipc.mjs';
import webRequest from './webRequest/webRequest.mjs';
import ipcRemoteHandle from './ipcHandle/ipcRemoteHandle.mjs';
import pocket48LiveRemoteHandle from './ipcHandle/pocket48LiveRemoteHandle.mjs';
import { nodeNimCleanup, nodeNimHandleLogin } from './ipcHandle/nodeNimHandleLogin.mjs';
import helpHandle from './ipcHandle/helpHandle.mjs';
import { nodeMediaServerClose } from './nodeMediaServer/nodeMediaServer.mjs';
import type { ThemeValue } from './ipcListener/themeChange.mjs';

export let processWindow: BrowserWindow | null = null;

/* 窗口关闭事件 */
async function handleProcessWindowClosed(): Promise<void> {
  await nodeMediaServerClose();
  removeIpc();
  nodeNimCleanup();
  processWindow = null;
}

/* 初始化窗口 */
export function createWindow(): void {
  execArgv.push('--experimental-require-module');
  storeInit();

  /* 初始化主题 */
  const themeSource: ThemeValue | undefined = getStore().get('theme');

  if (themeSource) nativeTheme.themeSource = themeSource;

  /* 初始化日志 */
  logProtocol();

  /* 初始化窗口 */
  processWindow = new BrowserWindow({
    width: 1_000,
    height: 830,
    minWidth: 1_000,
    minHeight: 830,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false,
      contextIsolation: false
    },
    title: `48tools - ${ packageJson.version }`,
    icon: titleBarIcon,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#000000' : undefined
  });

  if (isDevelopment && !isTest) {
    processWindow.webContents.openDevTools();
  }

  // initialState
  const initialStateQs: string = createInitialState({
    theme: themeSource ?? 'system',
    commandLineOptions,
    isTest
  });

  if (isDevelopment && isServe) {
    processWindow.loadURL(createHtmlUrl('', initialStateQs));
  } else {
    processWindow.loadFile(createHtmlFilePath('index'), { search: initialStateQs });
  }

  Menu.setApplicationMenu(null); // 去掉顶层菜单

  /* 事件监听和拦截协议的绑定 */
  ipc();

  try {
    ipcRemoteHandle();
    pocket48LiveRemoteHandle();
    nodeNimHandleLogin();
    helpHandle();
  } catch {}

  processWindow.on('closed', handleProcessWindowClosed);

  webRequest();
}