#!/usr/bin/env node
/**
 * stage-deploy.mjs — 把「该发布的文件」挑出来放进 deploy-stage/，供 Cloudflare Pages 上传。
 *
 * 为什么需要这一步：
 *   `wrangler pages deploy` 是**按目录整个上传**的，不会读 .gitignore。
 *   如果直接上传仓库根目录，AGENTS.md / README.md / tools/ / .dsh-tmp/ 甚至 .git/ 都会被公开。
 *   所以这里用一个**白名单**把真正要发布的文件挑出来。
 *
 * 媒体不入库但**必须发布**（音频与封面都要给浏览器），所以是硬链接而不是复制：
 *   同一分区下 linkSync 几乎零成本、不占额外空间；跨分区或权限不允许时自动退回 copyFileSync。
 *
 * 用法：
 *   node tools/stage-deploy.mjs            # 生成 deploy-stage/
 *   node tools/stage-deploy.mjs --check    # 只做体检（素材是否齐全），不写任何文件
 *
 * 缺素材时会**以退出码 1 失败**，避免把一个「点开没声音」的站点推上去。
 */

import { existsSync, mkdirSync, rmSync, readdirSync, statSync, linkSync, copyFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'deploy-stage');
const CHECK_ONLY = process.argv.includes('--check');

/** 白名单：仓库根目录下要发布出去的条目（顺序即上传顺序，仅影响日志） */
const ENTRIES = [
  'index.html',
  '404.html',
  'styles.css',
  '_headers',
  'css',
  'js',
  'assets',
  join('data', 'kiri'),
  'media',
];

/** 故意不发布的（写在这里是为了让下一个维护者一眼看到"为什么少了它"） */
const EXCLUDED = [
  'AGENTS.md / README.md   内部维护文档',
  'data/songs.json         人写的收录清单，页面不读它（页面读 data/kiri/）',
  'data/SOURCES.md         采集台账',
  'tools/                  构建与采集脚本',
  '.git/ .dsh-tmp/ .wrangler/ deploy-stage/',
];

/** 发布目录里必须有、否则页面直接坏掉的文件 */
const REQUIRED = [
  'index.html',
  '404.html',
  'styles.css',
  'css/motion.css',
  'js/shared.js',
  'js/data.js',
  'js/app.js',
  'js/motion.js',
  'assets/kuaile-subset.woff2',
  'data/kiri/song_catalog.json',
  'data/kiri/history_index.json',
  'data/kiri/song_details.json',
  'data/kiri/audio_index.json',
  'data/kiri/song_cut_info.json',
];

const problems = [];
const log = (...a) => console.log(...a);

// ---------------------------------------------------------------- 体检素材
function checkMedia() {
  const songsPath = join(ROOT, 'data', 'songs.json');
  const audioIndexPath = join(ROOT, 'data', 'kiri', 'audio_index.json');
  const missing = [];
  let audioCount = 0;
  let coverCount = 0;

  if (existsSync(songsPath)) {
    const { songs = [] } = JSON.parse(readFileSync(songsPath, 'utf8'));
    for (const s of songs) {
      if (s.cover) {
        coverCount += 1;
        const p = join(ROOT, s.cover.replace(/^\.\//, ''));
        if (!existsSync(p)) missing.push(`${s.cover}   （${s.title} 的封面）`);
      }
    }
  } else {
    problems.push('找不到 data/songs.json');
  }

  if (existsSync(audioIndexPath)) {
    const { audios = {} } = JSON.parse(readFileSync(audioIndexPath, 'utf8'));
    for (const [song, rel] of Object.entries(audios)) {
      audioCount += 1;
      if (!existsSync(join(ROOT, rel))) missing.push(`${rel}   （${song} 的音频）`);
    }
  } else {
    problems.push('找不到 data/kiri/audio_index.json —— 先跑 node tools/build-data.mjs');
  }

  if (missing.length) {
    problems.push(`缺少 ${missing.length} 个媒体文件，先跑 node tools/fetch-media.mjs：\n    - ${missing.join('\n    - ')}`);
  }
  return { audioCount, coverCount };
}

// ---------------------------------------------------------------- 白名单校验
function checkRequired() {
  for (const rel of REQUIRED) {
    if (!existsSync(join(ROOT, rel))) problems.push(`缺少发布必需的文件：${rel}`);
  }
}

// ---------------------------------------------------------------- 收集文件
function collect(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return [rel];
  const out = [];
  for (const name of readdirSync(abs).sort()) {
    if (name === '.DS_Store' || name === 'Thumbs.db' || name === 'desktop.ini') continue;
    out.push(...collect(join(rel, name)));
  }
  return out;
}

// ---------------------------------------------------------------- 主流程
log('song-kiri → deploy-stage');
log('');

const media = checkMedia();
checkRequired();

if (problems.length) {
  log('✖ 体检未通过：');
  for (const p of problems) log(`  - ${p}`);
  process.exit(1);
}
log(`✔ 素材体检通过：音频 ${media.audioCount} 个、封面 ${media.coverCount} 个全部就位`);

const files = ENTRIES.flatMap(collect);
const totalBytes = files.reduce((n, rel) => n + statSync(join(ROOT, rel)).size, 0);

if (CHECK_ONLY) {
  log(`✔ 待发布 ${files.length} 个文件，合计 ${(totalBytes / 1024 / 1024).toFixed(2)} MB（--check：未写任何文件）`);
  process.exit(0);
}

// 重建发布目录
if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

let linked = 0;
let copied = 0;
for (const rel of files) {
  const dest = join(OUT_DIR, rel);
  mkdirSync(dirname(dest), { recursive: true });
  try {
    linkSync(join(ROOT, rel), dest); // 硬链接：零拷贝
    linked += 1;
  } catch {
    copyFileSync(join(ROOT, rel), dest); // 跨分区等情况下退回复制
    copied += 1;
  }
}

log(`✔ 已生成 deploy-stage/：${files.length} 个文件，${(totalBytes / 1024 / 1024).toFixed(2)} MB` +
    `（硬链接 ${linked}，复制 ${copied}）`);
log('');
log('  发布内容：');
for (const rel of ENTRIES) {
  const n = files.filter((f) => f === rel || f.startsWith(rel + '\\') || f.startsWith(rel + '/')).length;
  log(`    ${rel.padEnd(14)} ${n} 个文件`);
}
log('');
log('  未发布（有意）：');
for (const line of EXCLUDED) log(`    ${line}`);
log('');
log('  下一步：npx wrangler pages deploy');
