#!/usr/bin/env node
/**
 * tools/uploaders.mjs
 *
 * 投稿人名单的**唯一事实来源**：谁能进站、谁绝对不进站。
 * `tools/fetch-media.mjs`（下载素材时校验归属）与 `tools/build-data.mjs`（生成运行时数据时兜底）
 * 都从这里读——改收录政策**只改这一个文件**。
 *
 * 规则（对应 AGENTS.md 第 2 节第 7 条）：
 *   1. **黑名单优先**。命中 `BLOCKED_UPLOADERS` 的投稿，无论白名单以后怎么放宽，一律不收。
 *   2. **白名单放行**。只有 `ALLOWED_UPLOADERS` 里的 mid 才能下载素材、写进 `data/songs.json`。
 *
 * 这份文件是**长期政策**，不是临时参数。不要因为「黑名单里的人切了一首新歌」就把他挪进白名单；
 * 要改必须由用户明确要求，并同步更新 AGENTS.md 第 2 节第 7 条与 `data/SOURCES.md`。
 */

/**
 * 允许的投稿人白名单（B 站 mid → 名字）。
 * 视频的 owner.mid 必须命中其中之一，否则视为「混进了别人的视频」并拒绝下载。
 *   - 退烧药777：冬雾kiri 的歌切切片man（本站的主要来源）
 *   - 冬雾_kiri：主播本人（她自己也发翻唱投稿）
 */
export const ALLOWED_UPLOADERS = new Map([
  ['141266664', '退烧药777'],
  ['3707024510552805', '冬雾_kiri']
]);

/**
 * 投稿人黑名单（B 站 mid → { name, reason }）。命中即**无条件拒绝**，优先级高于白名单。
 *   - 天才美少女萨特：用户 2026-10-20 明确要求「加入黑名单，他的歌一律不收」
 *     （起因：他在 2026-10-20 发了《老公天下第一》纯享版，本站不收）。
 */
export const BLOCKED_UPLOADERS = new Map([
  ['1907298543', { name: '天才美少女萨特', reason: '用户 2026-10-20 明确要求：他的歌一律不收' }]
]);

/** 按 mid 查黑名单，命中返回 { name, reason }，否则返回 null */
export function blockedByMid(mid) {
  return BLOCKED_UPLOADERS.get(String(mid ?? '')) ?? null;
}

/** 按投稿人名字查黑名单（build-data 兜底用，songs.json 里只有名字），命中返回 { mid, name, reason } */
export function blockedByName(name) {
  const target = String(name ?? '').trim();
  if (!target) return null;
  for (const [mid, info] of BLOCKED_UPLOADERS) {
    if (info.name === target) return { mid, ...info };
  }
  return null;
}
