#!/usr/bin/env node
/**
 * tools/build-data.mjs
 *
 * 把人工维护的 data/songs.json 编译成网页运行时需要的 5 份数据文件：
 *   data/kiri/song_catalog.json   曲目总览（列表页 / 筛选 / 搜索）
 *   data/kiri/history_index.json  按日期分组的历史索引（历史页）
 *   data/kiri/song_details.json   每首歌的演唱明细（详情弹窗）
 *   data/kiri/audio_index.json    曲名 → 本地音频文件（播放器）
 *   data/kiri/song_cut_info.json  曲名 → 歌切原视频链接
 * 并把 5 份数据内联进 js/data.js（window.XSL_DATA），让 file:// 直接双击打开也能用。
 *
 * 用法：node tools/build-data.mjs
 * 数据字段的完整说明见 AGENTS.md。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SONGS_FILE = join(ROOT, 'data', 'songs.json');
const OUT_DIR = join(ROOT, 'data', 'kiri');
const DATA_JS = join(ROOT, 'js', 'data.js');

const ROOM_KEY = 'kiri';
const ROOM_ID = '';
const GENERATED_AT = new Date().toISOString();

const CATALOG_SOURCE = 'song-kiri-bilibili-cuts';
const HISTORY_SOURCE = 'song-kiri-bilibili-cuts';
const DETAILS_SOURCE = 'song-kiri-bilibili-cuts';
const AUDIO_SOURCE = 'song-cut-audio-download';
const CUT_SOURCE = 'song-cut-title-index';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const pad = (n) => String(n).padStart(2, '0');

/**
 * generatedAt 是构建时刻，每次跑都会变。比对新旧内容时先把它抹成同一个占位符，
 * 这样「重跑一遍」就能当作一次真正的一致性自检：只要打印「无变化」，
 * 就说明盘上的生成物确实已经反映了当前的 data/songs.json。
 *
 * 内容没变时**连 generatedAt 都不刷新、直接不落盘**：这样重跑之后 `git status`
 * 是干净的，verification 清单第 3 条（重跑后应无 diff）才真的成立。
 */
const maskStamps = (text) => text.replace(/"generatedAt":\s*"[^"]*"/g, '"generatedAt":"<stamp>"');
const writeStats = { changed: 0, same: 0 };

function writeIfChanged(file, content, label) {
  let prev = null;
  try {
    prev = readFileSync(file, 'utf8');
  } catch {
    prev = null; // 首次生成
  }
  if (prev !== null && maskStamps(prev) === maskStamps(content)) {
    writeStats.same += 1;
    console.log(`· ${label}  无变化`);
    return;
  }
  writeFileSync(file, content, 'utf8');
  writeStats.changed += 1;
  console.log(`✔ ${label}  内容已更新`);
}

/** '2026-10-07 04:21:11' → { date:'2026-10-07', year:'2026', month:'10', day:'07' } */
function splitPublishedAt(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return { date: '', year: '', month: '', day: '' };
  return { date: `${m[1]}-${m[2]}-${m[3]}`, year: m[1], month: m[2], day: m[3] };
}

const cutUrl = (id) => `https://www.bilibili.com/video/${id}/`;

function main() {
  const source = readJson(SONGS_FILE);
  const uploader = source.source?.uploader || '';
  const songs = Array.isArray(source.songs) ? source.songs.slice() : [];
  if (!songs.length) throw new Error('data/songs.json 里没有歌曲');

  // 按发布时间倒序，最新的排最前
  songs.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));

  const seen = new Set();
  for (const song of songs) {
    if (!song.title) throw new Error(`缺少 title：${JSON.stringify(song)}`);
    if (!song.id) throw new Error(`缺少 id（B 站 BV 号）：${song.title}`);
    // 同名只保留最新：songs.json 已手工去重，这里再做一次兜底，防止手滑
    const key = String(song.title).trim();
    if (seen.has(key)) throw new Error(`曲名重复（同名应只保留最新的一个）：${key}`);
    seen.add(key);
  }

  const catalogSongs = [];
  const bySongKey = {};
  const byDate = {};
  const cuts = {};
  const audios = {};

  songs.forEach((song, index) => {
    const rowKey = String(song.title).trim();
    const { date, year, month, day } = splitPublishedAt(song.publishedAt);
    const url = cutUrl(song.id);
    const tags = Array.isArray(song.tags) ? song.tags.filter(Boolean) : [];
    const labels = [song.category, ...tags].filter(Boolean);
    // 投稿人按歌曲各自记录（歌切来自切片man，本人投稿来自主播自己）
    const songUploader = song.sourceUploader || uploader || '投稿者';
    // 措辞跟着标签走：带「歌切」标签的是直播切片，其余按翻唱投稿描述
    const songKind = tags.includes('歌切') ? '歌切' : '翻唱';

    catalogSongs.push({
      song_id: index + 1,
      song_name: rowKey,
      show_as_song_name: '',
      display_song_name: rowKey,
      artist: song.artist || '',
      artist_search: String(song.artist || '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim(),
      feat_artist: '',
      remark: `${songUploader} 投稿的冬雾kiri${songKind}，原视频 ${url}`,
      tone: '',
      language: song.language || '',
      type: labels.join('、'),
      identification: '',
      display_version: '',
      search_name: rowKey,
      cut_link: url,
      sing_count: 1,
      status_labels: tags.join('、'),
      last_sing_at: date,
      row_key: rowKey
    });

    bySongKey[rowKey] = {
      row_key: rowKey,
      song_name: rowKey,
      display_song_name: rowKey,
      artist: song.artist || '',
      cut_link: url,
      total_count: 1,
      entries: [{
        date,
        time: '',
        end_time: '',
        status: tags.join('、'),
        artist: song.artist || '',
        replay_id: song.id,
        replay_title: song.sourceTitle || '',
        replay_url: url,
        remark: '',
        lyric_excerpt: '',
        song_resolution_method: 'song-cut-title',
        cut_link: url
      }]
    };

    (byDate[date] ||= []).push({
      song_name: rowKey,
      sing_time: '',
      statuses: tags,
      artist: song.artist || '',
      replay_id: song.id,
      replay_title: song.sourceTitle || '',
      replay_url: url,
      start_time: '',
      end_time: '',
      row_key: rowKey,
      lyric_excerpt: '',
      song_resolution_method: 'song-cut-title',
      cut_link: url
    });

    cuts[rowKey] = {
      title: song.sourceTitle || rowKey,
      kind: 'single',
      url
    };

    // 音频路径从 songs.json 直接透传，保持与 tools/fetch-media.mjs 一致
    audios[rowKey] = String(song.audio || '').replace(/^\.\//, '');
  });

  // 日期倒序（新的在前），同一天内按发布时间倒序
  const sortedDates = Object.keys(byDate).sort().reverse();
  const sortedByDate = {};
  sortedDates.forEach((d) => { sortedByDate[d] = byDate[d]; });

  const dateTree = {};
  sortedDates.forEach((d) => {
    const [y, m, day] = d.split('-');
    ((dateTree[y] ||= {})[m] ||= {})[day] = sortedByDate[d].length;
  });

  const latestDate = sortedDates[0] || '';
  const [ly, lm, ld] = latestDate ? latestDate.split('-') : ['', '', ''];

  const base = { roomKey: ROOM_KEY, roomId: ROOM_ID, generatedAt: GENERATED_AT };

  const songCatalog = { ...base, source: CATALOG_SOURCE, songs: catalogSongs };
  const historyIndex = {
    ...base,
    source: HISTORY_SOURCE,
    latest: { year: ly, month: lm, day: ld },
    dateTree,
    byDate: sortedByDate
  };
  const songDetails = { ...base, source: DETAILS_SOURCE, bySongKey };
  const audioIndex = {
    ...base,
    source: AUDIO_SOURCE,
    description: '每首歌对应的翻唱切片音频（从 B 站歌切视频下载），供网页在线播放。',
    count: Object.keys(audios).length,
    audios,
    verificationTargets: []
  };
  const songCutInfo = {
    ...base,
    source: CUT_SOURCE,
    description: '每首歌对应的歌切切片标题（单曲歌切视频标题），供前端歌切链接显示。',
    count: Object.keys(cuts).length,
    cuts
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outputs = [
    ['song_catalog.json', songCatalog],
    ['history_index.json', historyIndex],
    ['song_details.json', songDetails],
    ['audio_index.json', audioIndex],
    ['song_cut_info.json', songCutInfo]
  ];
  for (const [name, payload] of outputs) {
    const file = join(OUT_DIR, name);
    writeIfChanged(file, JSON.stringify(payload, null, 2) + '\n', `data/kiri/${name}`);
  }

  // file:// 回退用的内嵌数据（紧凑输出，省体积）
  const embedded = {
    song_catalog: songCatalog,
    history_index: historyIndex,
    song_details: songDetails,
    audio_index: audioIndex,
    song_cut_info: songCutInfo
  };
  mkdirSync(dirname(DATA_JS), { recursive: true });
  writeIfChanged(
    DATA_JS,
    '// 由 tools/build-data.mjs 生成，请勿手改；改歌请编辑 data/songs.json 后重新生成。\n'
    + '// 用途：直接以 file:// 双击打开页面时，fetch 本地 JSON 会被浏览器拦截，回退读取这份内嵌数据。\n'
    + 'window.XSL_DATA = ' + JSON.stringify(embedded) + ';\n',
    'js/data.js（内嵌回退数据）'
  );
  console.log(`\n共 ${catalogSongs.length} 首，日期 ${sortedDates.length} 天，最新 ${latestDate || '—'}`);
  if (writeStats.changed === 0) {
    console.log(`一致性自检：${writeStats.same} 个生成物全部无变化 ✔（没有任何文件被改写）`);
  } else {
    console.log(`一致性自检：${writeStats.changed} 个生成物内容已更新，${writeStats.same} 个无变化 —— 改动请连同 data/songs.json 一起提交。`);
  }
}

main();
