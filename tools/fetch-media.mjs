#!/usr/bin/env node
/**
 * 拉取本地媒体素材（音频 + 封面）。
 *
 * 本仓库**不包含**任何歌曲素材，media/ 已被 .gitignore 忽略。
 * 新设备 clone 之后，先运行本脚本把素材补齐，页面才有声音和封面。
 *
 *   node tools/fetch-media.mjs            # 只补缺失的文件
 *   node tools/fetch-media.mjs --force    # 全部重新下载
 *   node tools/fetch-media.mjs --check    # 只检查，不下载
 *
 * 仅依赖 Node 18+ 自带的 fetch，无需安装任何依赖。
 */

import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SONGS_FILE = join(ROOT, 'data', 'songs.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': UA,
  Referer: 'https://www.bilibili.com/',
  Origin: 'https://www.bilibili.com'
};

// B 站风控很敏感：请求之间必须留间隔，否则会返回 412
const API_DELAY_MS = 1200;
const MAX_RETRY = 3;

/**
 * 允许的投稿人白名单（B 站 mid → 名字）。
 * 视频的 owner.mid 必须命中其中之一，否则视为「混进了别人的视频」并拒绝下载。
 *   - 退烧药777：冬雾kiri 的歌切切片man（本站的主要来源）
 *   - 冬雾_kiri：主播本人（她自己也发翻唱投稿）
 * 新增投稿人时**必须**同时更新这里和 AGENTS.md 第 2 节第 7 条。
 */
const ALLOWED_UPLOADERS = new Map([
  ['141266664', '退烧药777'],
  ['3707024510552805', '冬雾_kiri']
]);

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const CHECK_ONLY = args.has('--check');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function exists(path) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

/** 带重试的 B 站 JSON 接口请求，遇到 412 会退避重试 */
async function apiJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRY; attempt += 1) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (response.status === 412) throw new Error('HTTP 412（触发了风控，稍后重试）');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.code !== 0) throw new Error(`B站返回 code=${payload.code} ${payload.message ?? ''}`.trim());
      return payload.data;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRY) await sleep(API_DELAY_MS * attempt * 2);
    }
  }
  throw lastError;
}

async function download(url, destination) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new Error('下载到 0 字节');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, buffer);
  return buffer.length;
}

/** 从 songs.json 的相对路径解析成本机绝对路径，并防止跳出仓库 */
function localPath(relative) {
  const absolute = resolve(ROOT, relative.replace(/^\.\//, ''));
  if (!absolute.startsWith(ROOT)) throw new Error(`路径越界：${relative}`);
  return absolute;
}

function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function collectStreams(bvid) {
  const view = await apiJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
  const owner = String(view.owner?.mid ?? '');
  if (!ALLOWED_UPLOADERS.has(owner)) {
    const allowed = [...ALLOWED_UPLOADERS].map(([mid, name]) => `${name}(${mid})`).join('、');
    throw new Error(`归属不符：owner=${view.owner?.name ?? '未知'}(mid=${owner})，只接受 ${allowed}`);
  }
  await sleep(API_DELAY_MS);

  const play = await apiJson(
    `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${view.cid}&fnval=16&qn=64`
  );
  const audio = (play.dash?.audio ?? [])
    .slice()
    .sort((a, b) => b.bandwidth - a.bandwidth)[0];
  if (!audio?.baseUrl) throw new Error('没有取到 dash.audio 音轨');

  return { audioUrl: audio.baseUrl, coverUrl: view.pic, duration: view.duration };
}

async function main() {
  const payload = JSON.parse(await readFile(SONGS_FILE, 'utf8'));
  const songs = Array.isArray(payload) ? payload : payload.songs ?? [];

  if (!songs.length) {
    console.log('data/songs.json 里没有歌曲，无需下载。');
    return;
  }

  let downloaded = 0;
  let skipped = 0;
  const failures = [];

  for (const song of songs) {
    const audioPath = localPath(song.audio);
    const coverPath = localPath(song.cover);
    const label = `${song.title || song.id} (${song.id})`;

    const hasAudio = await exists(audioPath);
    const hasCover = await exists(coverPath);

    if (!FORCE && hasAudio && hasCover) {
      console.log(`跳过  ${label} —— 音频与封面均已就位`);
      skipped += 1;
      continue;
    }

    if (CHECK_ONLY) {
      console.log(`缺失  ${label} —— 音频${hasAudio ? '有' : '无'} / 封面${hasCover ? '有' : '无'}`);
      failures.push(`${label} 素材不完整`);
      continue;
    }

    // songs.json 里没有 cid，只能回源查询
    try {
      console.log(`查询  ${label} …`);
      const streams = await collectStreams(song.id);

      if (FORCE || !hasAudio) {
        const size = await download(streams.audioUrl, audioPath);
        console.log(`音频  ${label} → ${formatSize(size)}`);
        downloaded += 1;
      } else {
        console.log(`跳过  ${label} 的音频（已存在）`);
      }

      if (FORCE || !hasCover) {
        await sleep(API_DELAY_MS);
        const size = await download(streams.coverUrl, coverPath);
        console.log(`封面  ${label} → ${formatSize(size)}`);
      } else {
        console.log(`跳过  ${label} 的封面（已存在）`);
      }

      await sleep(API_DELAY_MS);
    } catch (error) {
      console.error(`失败  ${label} —— ${error.message}`);
      failures.push(`${label}：${error.message}`);
    }
  }

  console.log('');
  console.log(`完成：新下载 ${downloaded} 个文件，跳过 ${skipped} 首已完整的歌曲。`);
  if (failures.length) {
    console.error(`有 ${failures.length} 项未完成：`);
    failures.forEach(item => console.error(`  - ${item}`));
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(`未预期的错误：${error.message}`);
  process.exitCode = 1;
});
