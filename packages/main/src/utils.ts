import * as process from 'node:process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/* 判断是开发环境还是生产环境 */
export const isDevelopment: boolean = process.env.NODE_ENV === 'development';

/* 从import.meta.url中解析__filename和__dirname */
export interface MetaHelper {
  __filename: string;
  __dirname: string;
}

export function metaHelper(metaUrl: string): MetaHelper {
  const filename: string = fileURLToPath(metaUrl);
  const dirname: string = path.dirname(filename);

  return { __filename: filename, __dirname: dirname };
}