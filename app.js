const elements = {
  songTotal: document.querySelector('#songTotal'),
  searchInput: document.querySelector('#searchInput'),
  languageFilter: document.querySelector('#languageFilter'),
  categoryFilter: document.querySelector('#categoryFilter'),
  sortSelect: document.querySelector('#sortSelect'),
  resetButton: document.querySelector('#resetButton'),
  resultText: document.querySelector('#resultText'),
  songList: document.querySelector('#songList'),
  emptyState: document.querySelector('#emptyState'),
  emptyTitle: document.querySelector('#emptyTitle'),
  emptyDescription: document.querySelector('#emptyDescription')
};

const state = { songs: [], activeAudio: null };

function normalizeSong(song, index) {
  return {
    id: String(song.id ?? `song-${index + 1}`),
    title: String(song.title ?? '').trim(),
    artist: String(song.artist ?? '').trim(),
    language: String(song.language ?? '').trim(),
    category: String(song.category ?? '').trim(),
    tags: Array.isArray(song.tags) ? song.tags.map(String).filter(Boolean) : [],
    publishedAt: String(song.publishedAt ?? '').trim(),
    duration: Number(song.duration) || 0,
    audio: String(song.audio ?? '').trim(),
    cover: String(song.cover ?? '').trim()
  };
}

function fillFilter(select, values) {
  const fragment = document.createDocumentFragment();
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN')).forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    fragment.append(option);
  });
  select.append(fragment);
}

function songSearchText(song) {
  return [song.title, song.artist, song.language, song.category, ...song.tags]
    .join(' ')
    .toLocaleLowerCase('zh-CN');
}

function getVisibleSongs() {
  const query = elements.searchInput.value.trim().toLocaleLowerCase('zh-CN');
  const language = elements.languageFilter.value;
  const category = elements.categoryFilter.value;
  const sort = elements.sortSelect.value;

  const songs = state.songs.filter(song => {
    return (!query || songSearchText(song).includes(query))
      && (!language || song.language === language)
      && (!category || song.category === category);
  });

  if (sort === 'title') songs.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
  if (sort === 'artist') songs.sort((a, b) => a.artist.localeCompare(b.artist, 'zh-CN'));
  return songs;
}

function makeTag(text) {
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = text;
  return tag;
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function missingNote(song) {
  const note = document.createElement('p');
  note.className = 'song-missing';
  note.textContent = `本地还没有 ${song.title} 的音频，运行 node tools/fetch-media.mjs 补齐素材`;
  return note;
}

function makeSongCard(song, index) {
  const card = document.createElement('article');
  card.className = 'song-card';

  const cover = document.createElement('img');
  cover.className = 'song-cover';
  cover.src = song.cover;
  cover.alt = '';
  cover.loading = 'lazy';
  // 仓库不含媒体素材，新设备补齐前会缺封面；此时退回占位样式而不是破图
  cover.addEventListener('error', () => {
    cover.removeAttribute('src');
    cover.classList.add('is-missing');
  });

  const main = document.createElement('div');
  main.className = 'song-main';
  const title = document.createElement('h2');
  title.className = 'song-name';
  title.textContent = song.title || '未命名歌曲';
  const artist = document.createElement('p');
  artist.className = 'song-artist';
  artist.textContent = `${song.artist || '未知歌手'} · ${song.publishedAt || '发布时间未知'} · ${formatDuration(song.duration)}`;
  const meta = document.createElement('div');
  meta.className = 'song-meta';
  [song.language, song.category, ...song.tags].filter(Boolean).forEach(value => meta.append(makeTag(value)));
  main.append(title, artist, meta);

  const audio = document.createElement('audio');
  audio.className = 'song-audio';
  audio.controls = true;
  audio.preload = 'metadata';
  audio.src = song.audio;
  audio.setAttribute('aria-label', `播放 ${song.title}`);
  // 媒体未补齐时，禁用播放器并给出提示
  audio.addEventListener('error', () => {
    audio.controls = false;
    card.classList.add('is-media-missing');
    audio.replaceWith(missingNote(song));
  });
  audio.addEventListener('play', () => {
    if (state.activeAudio && state.activeAudio !== audio) state.activeAudio.pause();
    state.activeAudio = audio;
    card.classList.add('is-playing');
  });
  audio.addEventListener('pause', () => card.classList.remove('is-playing'));

  const number = document.createElement('span');
  number.className = 'song-index';
  number.textContent = String(index + 1).padStart(2, '0');

  card.append(cover, main, audio, number);
  return card;
}

function render() {
  const songs = getVisibleSongs();
  elements.songList.replaceChildren(...songs.map(makeSongCard));
  elements.resultText.textContent = state.songs.length
    ? `显示 ${songs.length} / ${state.songs.length} 首歌曲`
    : '当前歌单为空';
  elements.emptyState.hidden = songs.length > 0;

  if (!state.songs.length) {
    elements.emptyTitle.textContent = '歌单还没有内容';
    elements.emptyDescription.textContent = '之后把新的歌曲数据写入 data/songs.json，就会显示在这里。';
  } else if (!songs.length) {
    elements.emptyTitle.textContent = '没有找到符合条件的歌曲';
    elements.emptyDescription.textContent = '换个关键词或清除筛选条件试试看。';
  }
}

function resetFilters() {
  elements.searchInput.value = '';
  elements.languageFilter.value = '';
  elements.categoryFilter.value = '';
  elements.sortSelect.value = 'default';
  render();
}

async function start() {
  try {
    const response = await fetch('./data/songs.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const source = Array.isArray(payload) ? payload : payload.songs;
    state.songs = (Array.isArray(source) ? source : [])
      .map(normalizeSong)
      .filter(song => song.title);

    elements.songTotal.textContent = String(state.songs.length);
    fillFilter(elements.languageFilter, state.songs.map(song => song.language));
    fillFilter(elements.categoryFilter, state.songs.map(song => song.category));
    render();
  } catch (error) {
    console.error('读取歌单数据失败：', error);
    elements.resultText.textContent = '歌单数据读取失败';
    elements.emptyState.hidden = false;
    elements.emptyTitle.textContent = '暂时无法读取歌单';
    elements.emptyDescription.textContent = '请通过本地静态服务器打开页面，并确认 data/songs.json 存在。';
  }
}

[elements.searchInput, elements.languageFilter, elements.categoryFilter, elements.sortSelect]
  .forEach(control => control.addEventListener('input', render));
elements.resetButton.addEventListener('click', resetFilters);

start();
