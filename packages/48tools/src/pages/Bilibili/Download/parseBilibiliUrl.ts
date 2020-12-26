import { JSDOM, DOMWindow } from 'jsdom';
import * as md5 from 'md5';
import { requestBilibiliHtml, requestVideoInfo, requestAudioInfo } from '../services/download';
import type { InitialState } from '../types';
import type { VideoInfo, AudioInfo } from '../services/interface';

// b站请求接口需要的key
const APP_KEY: string = 'iVGUTjsxvpLeuDCf';
const BILIBILI_KEY: string = 'aHRmhWMLkdeMuILqORnYZocwMBpMEOdt';

// 查询参数
const QUERY_ARRAY: [string, string] = ['qn=80&quality=80&type=', 'quality=2&type=mp4'];

interface ParseHtmlResult {
  initialState?: InitialState;
  h1Title: string;
}

/**
 * 解析initialState
 * @param { string } html
 */
function parseHtml(html: string): ParseHtmlResult {
  const dom: JSDOM = new JSDOM(html);
  const { document }: DOMWindow = dom.window;
  const scripts: NodeListOf<HTMLScriptElement> = document.querySelectorAll('script');
  let initialState: InitialState | undefined = undefined;

  for (const script of scripts) {
    const scriptStr: string = script.innerHTML;

    if (/^window\._{2}INITIAL_STATE_{2}\s*=\s*.+$/.test(scriptStr)) {
      const str: string = scriptStr
        .replace(/window\._{2}INITIAL_STATE_{2}\s*=\s*/, '') // 剔除"="前面的字符串
        .replace(/;\(function\(\){var s;.+$/i, '');          // 剔除后面可能存在的函数

      initialState = JSON.parse(str);
      break;
    }
  }

  return {
    initialState,
    h1Title: document.querySelector('#viewbox_report .tit')?.innerHTML ?? ''
  };
}

/**
 * 解析视频url
 * @param { string } type: 视频类型
 * @param { string } id: 视频id
 * @param { number } page: 分页
 */
export async function parseVideoUrl(type: string, id: string, page: number = 1): Promise<string | void> {
  const videoUrl: string = `https://www.bilibili.com/video/${ type === 'av' ? 'av' : 'BV' }${ id }?p=${ page }`;
  const html: string = await requestBilibiliHtml(videoUrl);
  const { initialState }: ParseHtmlResult = parseHtml(html);

  if (!initialState) {
    return undefined;
  }

  const { cid }: { cid: number; part: string } = initialState.videoData.pages[page - 1]; // cid
  let flvUrl: string | undefined = undefined; // 视频地址

  for (const query of QUERY_ARRAY) {
    const payload: string = `appkey=${ APP_KEY }&cid=${ cid }&otype=json&page=${ page }&${ query }`;
    const sign: string = md5(`${ payload }${ BILIBILI_KEY }`);
    const videoInfoRes: VideoInfo = await requestVideoInfo(payload, sign);

    if (videoInfoRes?.durl?.length) {
      flvUrl = videoInfoRes.durl[0].url;
      break;
    }
  }

  return flvUrl;
}

/**
 * 解析音频地址
 * @param { string } id: 音频id
 */
export async function parseAudioUrl(id: string): Promise<string | void> {
  const res: AudioInfo = await requestAudioInfo(id);

  return res.data.cdns?.[0];
}