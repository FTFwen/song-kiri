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

    catalogSongs.push({
      song_id: index + 1,
      song_name: rowKey,
      show_as_song_name: '',
      display_song_name: rowKey,
      artist: song.artist || '',
      artist_search: String(song.artist || '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim(),
      feat_artist: '',
      remark: `${uploader} 投稿的冬雾kiri歌切，原视频 ${url}`,
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
    writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    console.log(`✔ data/kiri/${name}`);
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
  writeFileSync(
    DATA_JS,
    '// 由 tools/build-data.mjs 生成，请勿手改；改歌请编辑 data/songs.json 后重新生成。\n'
    + '// 用途：直接以 file:// 双击打开页面时，fetch 本地 JSON 会被浏览器拦截，回退读取这份内嵌数据。\n'
    + 'window.XSL_DATA = ' + JSON.stringify(embedded) + ';\n',
    'utf8'
  );
  console.log('✔ js/data.js（内嵌回退数据）');
  console.log(`\n共 ${catalogSongs.length} 首，日期 ${sortedDates.length} 天，最新 ${latestDate || '—'}`);
}

main();
