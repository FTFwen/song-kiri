// shared.js - 歌单站共用的房间配置与数据归一化工具
// 本工程只有一个数据源：data/songs.json 编译出来的 data/kiri/*.json。
// 不联网、不依赖任何后端；历史/详情/音频索引全部来自本地文件。

const ROOM_CONFIGS = {
  kiri: {
    key: 'kiri',
    roomId: '',
    name: '冬雾kiri',
    title: '冬雾kiri 歌切',
    subtitle: '退烧药777 投稿的歌切 · 同名歌曲只保留最新版本',
    orderPrefix: '',
    sourceType: 'local-json',
    sourceLabel: '本地歌切数据（data/songs.json 编译）',
    songDataUrl: 'data/kiri/song_catalog.json',
    historyDataUrl: 'data/kiri/history_index.json',
    detailDataUrl: 'data/kiri/song_details.json',
    audioIndexDataUrl: 'data/kiri/audio_index.json',
    cutInfoDataUrl: 'data/kiri/song_cut_info.json',
    historyPageSize: 30,
    supportsHistory: true,
    supportsFavorites: true,
    supportsRemoteDetails: false,
    placeholder: false,
    notes: '歌切元数据由 data/songs.json 维护，音频由 tools/fetch-media.mjs 拉到本机 media/ 目录。'
  }
};

const ROOM_ORDER = ['kiri'];

// 语言标签统一口径：历史数据里写过的别名收敛到同一个标签。
// 分隔符保留，用于「日文/国语」这类复合标签。
const LANGUAGE_TAG_ALIASES = Object.freeze({ '日语': '日文' });
const LANGUAGE_SEPARATOR_RE = /([、,，/／|｜])/u;
function normalizeLanguageTag(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.split(LANGUAGE_SEPARATOR_RE).map(part => {
    if (LANGUAGE_SEPARATOR_RE.test(part)) return part;
    const token = part.trim();
    return LANGUAGE_TAG_ALIASES[token] || token;
  }).join('');
}

// 类型/标签串：按分隔符拆开、去空、去重，再用顿号拼回去。
// 「翻唱、退烧药777、歌切」这类复合标签就是靠这里保持稳定的。
const TYPE_TAG_ALIASES = Object.freeze({});
const TYPE_TAG_SEPARATOR_RE = /[、,，/／|｜]/u;
function normalizeTypeTags(value) {
  const values = Array.isArray(value) ? value : [value];
  const seen = new Set();
  return values
    .flatMap(item => String(item ?? '').split(TYPE_TAG_SEPARATOR_RE))
    .map(item => TYPE_TAG_ALIASES[item.trim()] || item.trim())
    .filter(item => item && !seen.has(item) && seen.add(item))
    .join('、');
}

function getRoomConfig(roomKey) {
  return ROOM_CONFIGS[roomKey] || ROOM_CONFIGS.kiri;
}

function getStorageKeys(roomKey) {
  const key = roomKey || 'default';
  return {
    songCache: `songCache:${key}`,
    songCacheTime: `songCacheTime:${key}`,
    favorites: `favorites:${key}`,
    callwords: `callwords:${key}`,
    historyCache: `historyCache:${key}`,
    historyCacheTime: `historyCacheTime:${key}`,
    bubblePosition: `bubblePosition:${key}`,
    settings: 'settings:global'
  };
}

function normalizeRoomSong(raw, index) {
  const songId = raw.song_id != null && raw.song_id !== '' ? Number(raw.song_id) : index + 1;
  return {
    song_id: Number.isFinite(songId) ? songId : index + 1,
    song_name: raw.song_name || raw.display_song_name || raw.row_key || '',
    display_song_name: raw.display_song_name || raw.song_name || raw.row_key || '',
    artist: raw.artist || '',
    artist_search: raw.artist_search || '',
    feat_artist: raw.feat_artist || '',
    remark: raw.remark || '',
    tone: raw.tone === undefined ? '' : raw.tone,
    language: normalizeLanguageTag(raw.language || ''),
    type: normalizeTypeTags(raw.type || ''),
    identification: raw.identification || '',
    display_version: raw.display_version || '',
    search_name: raw.search_name || '',
    cut_link: raw.cut_link || '',
    sing_count: raw.sing_count == null || raw.sing_count === '' ? 0 : Number(raw.sing_count),
    status_labels: raw.status_labels || '',
    last_sing_at: raw.last_sing_at || '',
    row_key: raw.row_key || raw.song_name || raw.display_song_name || String(songId)
  };
}

function getFavoriteKey(song) {
  if (!song) return '';
  // 收藏用「歌名」做全局键（同名歌曲在不同来源下 song_id 会不同）
  const name = String(song.display_song_name || song.song_name || song.row_key || '').trim();
  return name ? `name:${name}` : '';
}

function isLockedSong(song) {
  const identification = String(song && song.identification || '').trim();
  const type = String(song && song.type || '').trim();
  return identification === '锁定' || type === '锁定';
}

function isBannedSong(song) {
  const identification = String(song && song.identification || '').trim();
  const type = String(song && song.type || '').trim();
  return identification === '禁曲' || type === '禁曲';
}

function canFavoriteSong(song) {
  return !!getFavoriteKey(song) && !isLockedSong(song) && !isBannedSong(song);
}
