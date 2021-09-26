import process from 'node:process';
import path from 'node:path';
import gulp from 'gulp';
import terser from 'gulp-terser';
import typescript from 'gulp-typescript';
import modifier from 'gulp-modifier';
import changed from 'gulp-changed';
import plumber from 'gulp-plumber';
import rename from 'gulp-rename';
import { requireJson, metaHelper } from '@sweet-milktea/utils';

const { __dirname } = metaHelper(import.meta.url);
const baseTypescriptConfig = await requireJson(path.join(__dirname, '../../tsconfig.json'));
const tsConfig = await requireJson(path.join(__dirname, './tsconfig.json'));

const isDevelopment = process.env.NODE_ENV === 'development';
const isWatch = process.env.WATCH;

/* 修改为mjs文件 */
function tsFilesRename(p) {
  if (p.basename !== 'main') {
    p.extname = '.mjs';
  }
}

/* 修改js文件中import的路径 */
function addJsExt(contents, p) {
  const contentsArr = contents.split(/\n/);

  contentsArr.forEach(function(value, index) {
    if (/^import /.test(value) || /^export {/.test(value)) {
      if (/from '\./.test(value)) {
        contentsArr[index] = value.replace(/';$/, ".mjs';");
      }

      if (/from '@electron\/remote\/main/.test(value)) {
        contentsArr[index] = value.replace(/';$/, "/index.js';");
      }
    }
  });

  return contentsArr.join('\n');
}

function devTsProject() {
  const result = gulp.src('src/**/*.{ts,tsx}')
    .pipe(changed('lib'))
    .pipe(plumber())
    .pipe(typescript({
      ...baseTypescriptConfig.compilerOptions,
      ...tsConfig.compilerOptions
    }));

  return result.js
    .pipe(modifier(addJsExt))
    .pipe(rename(tsFilesRename))
    .pipe(gulp.dest('lib'));
}

function watch() {
  gulp.watch('src/**/*.{ts,tsx}', devTsProject);
}

function tsProject() {
  const result = gulp.src('src/**/*.{ts,tsx}')
    .pipe(typescript({
      ...baseTypescriptConfig.compilerOptions,
      ...tsConfig.compilerOptions
    }));

  return result.js
    .pipe(modifier(addJsExt))
    .pipe(rename(tsFilesRename))
    .pipe(terser({
      ecma: 2020,
      module: true
    }))
    .pipe(gulp.dest('lib'));
}

export default isDevelopment
  ? (isWatch ? gulp.series(devTsProject, watch) : devTsProject)
  : tsProject;