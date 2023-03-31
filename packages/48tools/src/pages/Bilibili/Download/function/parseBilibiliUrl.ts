import { createHash, type Hash } from 'node:crypto';
import {
  requestBilibiliHtml,
  requestVideoInfo,
  requestAudioInfo,
  requestBangumiVideoInfo,
  requestWebInterfaceView
} from '../../services/download';
import type { InitialState, EpisodesItem, NextDataMediaInfo, NextData } from '../../types';
import type {
  VideoInfo,
  AudioInfo,
  BangumiVideoInfo,
  WebInterfaceViewData,
  WebInterfaceViewDataPageItem
} from '../../services/interface';

// b站请求接口需要的key
const APP_KEY: string = 'YvirImLGlLANCLvM';
const BILIBILI_KEY: string = 'JNlZNgfNGKZEpaDTkCdPQVXntXhuiJEM';

interface ParseHtmlResult {
  initialState?: InitialState;
  h1Title: string;
}

/* md5加密 */
function md5Crypto(data: string): string {
  const md5Hash: Hash = createHash('md5');

  md5Hash.update(data);

  return md5Hash.digest('hex');
}

/**
 * 解析initialState
 * @param { string } html
 */
function parseHtml(html: string): ParseHtmlResult {
  const parseDocument: Document = new DOMParser().parseFromString(html, 'text/html');
  const scripts: NodeListOf<HTMLScriptElement> = parseDocument.querySelectorAll('script');
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
    h1Title: parseDocument.querySelector('#viewbox_report .tit')?.innerHTML
      ?? parseDocument.querySelector('.media-title')?.innerHTML
      ?? ''
  };
}

/**
 * 解析nextjs的__NEXT_DATA__
 * @param { string } html
 * @param { 'ss' | 'ep' } type: 类型为ss时，取第一个
 * @param { string } id: ss id或ep id，需要根据这个来查具体信息
 */
function parseHtmlNext(html: string, type: string, id: string): ParseHtmlResult {
  const parseDocument: Document = new DOMParser().parseFromString(html, 'text/html');
  const nextData: HTMLElement | null = parseDocument.getElementById('__NEXT_DATA__');
  let initialState: InitialState | undefined = undefined;

  if (nextData) {
    const scriptStr: string = nextData.innerHTML;
    const nextDataJson: NextData = JSON.parse(scriptStr);
    const mediaInfo: NextDataMediaInfo | undefined = nextDataJson?.props?.pageProps?.dehydratedState?.queries
      ?.[0]?.state?.data?.mediaInfo;

    if (mediaInfo) {
      const epInfo: EpisodesItem = type === 'ss'
        ? mediaInfo.episodes[0]
        : (mediaInfo.episodes.find((o: EpisodesItem): boolean => o.id === Number(id)) ?? mediaInfo.episodes[0]);

      initialState = {
        aid: epInfo.aid,
        videoData: {
          aid: epInfo.aid,
          bvid: epInfo.bvid,
          pages: mediaInfo.episodes.map((o: EpisodesItem): { cid: number; part: string } => ({
            cid: o.cid,
            part: o.long_title
          })),
          title: mediaInfo.title
        },
        epInfo: {
          aid: epInfo.aid,
          cid: epInfo.cid
        }
      };
    }
  }

  return {
    initialState,
    h1Title: initialState?.videoData?.title ?? ''
  };
}

/**
 * 解析视频url。testID：1rp4y1e745
 * @param { string } type: 视频类型
 * @param { string } id: 视频id
 * @param { number } page: 分页
 * @param { string | undefined } proxy: 是否使用代理
 */
export async function parseVideoUrlV2(
  type: string,
  id: string,
  page: number = 1,
  proxy: string | undefined
): Promise<{ flvUrl: string; pic: string } | undefined> {
  const res: WebInterfaceViewData = await requestWebInterfaceView(id, type, proxy);
  let result: { flvUrl: string; pic: string } | undefined = undefined;

  if (res?.data?.pages) {
    const { cid }: WebInterfaceViewDataPageItem = res.data.pages[page - 1]; // cid
    const isAV: boolean = type === 'av';
    const searchParams: URLSearchParams = new URLSearchParams({
      appkey: APP_KEY,
      [isAV ? 'avid' : 'bvid']: `${ isAV ? '' : 'BV' }${ id }`,
      cid: `${ cid }`,
      fnval: '0',
      fnver: '0',
      fourk: '1',
      qn: '112'
    });
    const payload: string = searchParams.toString();
    const sign: string = md5Crypto(`${ payload }${ BILIBILI_KEY }`);
    const videoInfoRes: VideoInfo = await requestVideoInfo(payload, sign, proxy);

    if (videoInfoRes?.data?.durl?.length) {
      result = {
        flvUrl: videoInfoRes.data.durl[0].url,
        pic: res.data.pic
      };
    }
  }

  return result;
}

/**
 * 解析视频列表地址
 * @param { string } bvid
 */
export async function parseVideoList(bvid: string): Promise<Array<{ cid: number; part: string }> | void> {
  const videoUrl: string = `https://www.bilibili.com/video/${ bvid }`;
  const html: string = await requestBilibiliHtml(videoUrl, undefined);
  const { initialState }: ParseHtmlResult = parseHtml(html);

  if (!initialState) {
    return undefined;
  }

  return initialState.videoData.pages;
}

/**
 * 解析番剧的接口
 * 参考：https://github.com/Henryhaohao/Bilibili_video_download/blob/master/bilibili_video_download_bangumi.py
 * @param { string } type: 番剧类型
 * @param { string } id: 番剧id
 * @param { string | undefined } proxy: 是否使用代理
 */
export async function parseBangumiVideo(type: string, id: string, proxy: string | undefined): Promise<string | void> {
  const videoUrl: string = `https://www.bilibili.com/bangumi/play/${ type }${ id }`;
  const html: string = await requestBilibiliHtml(videoUrl, proxy);
  let parseHtmlResult: ParseHtmlResult = parseHtmlNext(html, type, id);

  if (!parseHtmlResult.initialState) {
    parseHtmlResult = parseHtml(html);
  }

  if (!parseHtmlResult.initialState) {
    return undefined;
  }

  const { aid, cid }: { aid: number; cid: number } = parseHtmlResult.initialState.epInfo;
  const res: BangumiVideoInfo = await requestBangumiVideoInfo(aid, cid, proxy);

  if (res.data) {
    return res.data.durl[0].url;
  } else {
    return undefined;
  }
}

/**
 * 解析音频地址
 * @param { string } id: 音频id
 * @param { string | undefined } proxy: 是否使用代理
 */
export async function parseAudioUrl(id: string, proxy: string | undefined): Promise<string | void> {
  const res: AudioInfo = await requestAudioInfo(id, proxy);

  return res.data.cdns?.[0];
}