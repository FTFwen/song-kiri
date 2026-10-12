#!/usr/bin/env node
/**
 * 扫描工程里还残留的「橄榄 / 奶油 / 黄绿」色系。
 *
 * 移植主站时用 HSL 规则把橄榄奶油家族换成中性蓝灰：S > 0.12 且 48 <= H <= 95 的颜色
 * 保留明度、色相改 214、饱和度按明度分档。这个脚本就是那套判据的反向体检——
 * 凡是命中区间的色值，都说明当初漏掉了（或后来新加进来的），需要人工确认要不要一起中性化。
 *
 * 用法：
 *   node tools/scan-green.mjs            # 扫描，命中时退出码 1
 *   node tools/scan-green.mjs --list     # 同上，但始终退出码 0（只想看看）
 *
 * 已知的 4 处白名单（都在已经废弃 / 不会渲染的规则里，改不改都看不见）：
 *   styles.css  350  .header-live-status.is-live ...（直播状态条，元素已删）
 *   styles.css 1086  .badge.tone（tone 字段本站恒为空，不会渲染）
 *   styles.css 1086  .badge.tone（同上，字色）
 *   styles.css 1887  .header-fav-auto-sync（自动同步开关，已 display:none）
 *   （行号会随其它改动漂移，按选择器认，别按行号认）
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// ⚠️ deploy-stage/ 是 tools/stage-deploy.mjs 生成的发布副本，里面的文件与源文件逐字相同，
//    不跳过的话每一处残留都会被**重复报一遍**（实测 4 处变 8 处），让人误以为多了新问题。
const SKIP_DIRS = new Set(['.git', '.dsh-tmp', 'media', 'node_modules', 'deploy-stage']);
const EXTS = new Set(['.js', '.mjs', '.css', '.html']);

const TARGET_H = 214;
const inBand = (h, s) => s > 0.12 && h >= 48 && h <= 100;

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTS.has(extname(name))) yield full;
  }
}

const COLOR_RE = /#[0-9a-fA-F]{6}\b|rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;

let hits = 0;
for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const lines = src.split('\n');
  let m;
  COLOR_RE.lastIndex = 0;
  while ((m = COLOR_RE.exec(src))) {
    let r, g, b;
    if (m[0][0] === '#') {
      const h = m[0].slice(1);
      r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
    } else {
      r = +m[1]; g = +m[2]; b = +m[3];
    }
    const [h, s, l] = rgbToHsl(r, g, b);
    if (!inBand(h, s)) continue;
    if (Math.abs(h - TARGET_H) < 1) continue;
    const line = src.slice(0, m.index).split('\n').length;
    console.log(`${relative(ROOT, file).replace(/\\/g, '/')}:${line}  ${m[0]}  H=${h.toFixed(1)} S=${s.toFixed(2)} L=${l.toFixed(2)}`);
    hits += 1;
  }
  void lines;
}

if (hits) {
  console.log(`\n发现 ${hits} 处黄绿色系色值。若不在上面的已知白名单里，请确认是否要一起换成中性色。`);
  process.exit(process.argv.includes('--list') ? 0 : 1);
}
console.log('✔ 没有残留的黄绿色系色值。');
