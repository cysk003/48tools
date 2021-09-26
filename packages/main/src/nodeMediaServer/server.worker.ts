import { workerData } from 'node:worker_threads';
import { addAsarToLookupPaths, register } from 'asar-node';
import type * as NodeMediaServer from 'node-media-server';
import type { NodeMediaServerArg } from './nodeMediaServer';

interface WorkerData extends NodeMediaServerArg {
  isDevelopment: boolean;
}

/* 新线程启动服务，将rtmp转换成flv */
const { ffmpeg, rtmpPort, httpPort, isDevelopment }: WorkerData = workerData;

// 根据不同的环境加载node-media-server模块
let NodeMediaServerModule: typeof NodeMediaServer;

if (isDevelopment) {
  NodeMediaServerModule = (await import('node-media-server')).default;
} else {
  register();
  addAsarToLookupPaths();

  // @ts-ignore
  // eslint-disable-next-line import/no-unresolved
  NodeMediaServerModule = (await import('../../../../app.asar/node_modules/node-media-server/src/node_media_server.js')).default;
}

// node-medie-server
const server: NodeMediaServer = new NodeMediaServerModule({
  logType: isDevelopment ? 3 : 1,
  rtmp: {
    port: rtmpPort,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: httpPort,
    allow_origin: '*'
  },
  trans: {
    ffmpeg
  }
});

server.run();