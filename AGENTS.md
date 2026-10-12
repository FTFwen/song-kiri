# AGENTS.md — song-kiri 维护说明

> 面向**任何设备上的 AI 编程助手**。开始改动前先读完本文件。
> 这是一份**活文档**：只要页面结构、数据管线、目录布局、采集流程或验证方式发生变化，就必须在**同一次提交**里同步更新本文件。

---

## 1. 这个工程是什么

`song-kiri` 是一个**完全独立的纯静态歌单页面**，收录 B 站 UP 主 **退烧药777**（mid `141266664`）发布的 **冬雾kiri 歌切**。

页面本身是 `D:\tool\webdeploy`（`viridis.love` 主站）歌单页的**整页移植**：布局、交互、底部播放器、播放列表、高级筛选、我的歌单、中意清单、历史页签全部照搬，只做三类改动——

| 改动 | 内容 |
| --- | --- |
| **去主播 / 去主题** | 去掉 `theme-xiaosonglu`、人物背景图、中秋限定皮肤、桌宠伴侣、好运歌签 |
| **换配色** | 橄榄 / 奶油暖色系 → 中性蓝灰（HSL 色相统一到 214） |
| **去联网功能** | 去掉评分、直播状态、中意清单服务器存档与自动同步、一起听、跨页播放器交接 |

- 纯前端：`index.html` + `styles.css` + `js/*` + `css/motion.css`，**没有构建步骤、没有依赖、没有后端**。
- 数据源：`data/songs.json`（人写的收录清单）。
- 运行时数据：`tools/build-data.mjs` 由 `songs.json` 生成 `data/kiri/*.json` + `js/data.js`。
- 媒体：音频与封面**不入库**，各设备用 `tools/fetch-media.mjs` 拉到本地 `media/`，之后即可离线播放。
- 本地预览时才会用到静态服务器；页面本身不需要服务器逻辑。

---

## 2. 硬性约束（不要破坏）

1. **完全独立**：不引用父目录 `D:\tool\webdeploy`、不引用 `viridis.love` / `xiaosonglu-songlist-web` 的任何资源、样式、数据、接口或构建流程。整个 `song-kiri/` 目录复制到任何地方都必须能独立跑。
2. **纯静态**：不引入 Node 服务、数据库、登录、评分、弹幕、直播或任何后端 API。
3. **不引入构建工具**：不添加 bundler、框架、`package.json` 依赖树。原生 HTML/CSS/JS 直接用浏览器打开（经由静态服务器）就能跑。`tools/` 下的一次性脚本只用 Node 内置模块。
4. **同名歌曲只保留最新发布版本**：去重键是**规范化曲名**。发现同名多条时，按 `publishedAt`（即 B 站 `pubdate`）取最大者，并**删除**其余版本的音频与封面。
5. **媒体不入库**：音频与封面**不提交到 Git**，`media/` 已被 `.gitignore` 忽略（历史里也没有）。`songs.json` 里的 `audio` / `cover` 只能指向仓库内的相对路径（`./media/...`），不得写 B 站的直链——B 站直链带签名、会过期。素材缺失时用 `tools/fetch-media.mjs` 在本机补齐。
6. **不臆造曲名**：曲名以视频标题与 B 站标签为准（标签里 `发现《曲名》` 是可靠信号）。**无法确定曲名时不要猜**，先向用户确认。
7. **不混入非目标内容**：只收 UP 主 `退烧药777` 的、标题含「歌切」的冬雾kiri 相关视频。
8. **保持与主站的移植一致性**：`index.html` / `styles.css` / `js/app.js` / `js/motion.js` / `css/motion.css` 都源自主站，**不要把它们改写成另一套实现**。要改行为时优先做「最小外科手术」，并在提交信息里写清改了什么、为什么。主站已有的怪行为（例如播放器收藏按钮不即时刷新）属于「完全一样」的一部分，不要顺手"修好"。
9. **`bindDom` 的 id 一个都不能少**：`js/app.js` 的 `bindDom()` 会**一次性收集全部 DOM id**，缺一个就会拿到 `null` 并在后续使用时抛错。要去掉某个功能时，**只隐藏元素**（加内联 `style="display:none"`），不要删元素。

---

## 3. 目录布局

```text
song-kiri/
├── AGENTS.md              # 本文件：AI 维护契约（活文档）
├── README.md              # 人类可读的项目说明
├── index.html             # 页面结构（主站移植版）
├── styles.css             # 主站内联 <style> 抽出 + 中性配色变换
├── css/
│   └── motion.css         # 主站动效样式（已删桌宠 / 歌签两节）
├── js/
│   ├── shared.js          # 手写：单房间配置 + 房间数据归一化
│   ├── data.js            # 【build-data.mjs 生成】window.XSL_DATA，file:// 回退用
│   ├── app.js             # 主站 app.js 移植版（房间键改为 kiri）
│   └── motion.js          # 主站动效脚本（已删桌宠 / 歌签）
├── assets/
│   └── kuaile-subset.woff2  # 标题字体子集
├── data/
│   ├── songs.json         # 唯一**手写**数据源
│   ├── SOURCES.md         # 已收录歌切的采集台账（BV 号 / 时间 / 去重记录）
│   └── kiri/              # 【build-data.mjs 生成】运行时数据，5 个 JSON
│       ├── song_catalog.json
│       ├── history_index.json
│       ├── song_details.json
│       ├── audio_index.json
│       └── song_cut_info.json
├── tools/
│   ├── build-data.mjs     # songs.json -> data/kiri/*.json + js/data.js
│   └── fetch-media.mjs    # 按 songs.json 拉取缺失的音频与封面
└── media/                 # 【本地生成，不入库】已被 .gitignore 忽略
    ├── <BV号>.m4a         # 音频，文件名即 BV 号
    └── covers/
        └── <BV号>.jpg     # 封面，文件名即 BV 号
```

命名约定：**媒体文件名一律使用 BV 号**，与 `songs.json` 的 `id` 字段保持一致。这样任何设备上的 AI 都能反查来源。

> `media/` 与 `data/kiri/` + `js/data.js` 都是**派生内容**：前者由 `tools/fetch-media.mjs` 重建，后者由 `tools/build-data.mjs` 重建。
> `data/kiri/` 与 `js/data.js` **要提交**（页面直接读它们），`media/` **不要提交**。

---

## 4. 数据格式

### 4.1 `data/songs.json`（手写，唯一数据源）

```json
{
  "source": {
    "uploader": "退烧药777",
    "mid": "141266664",
    "deduplicatedBy": "歌曲名；同名仅保留最新发布版本",
    "updatedAt": "2026-10-07"
  },
  "songs": [
    {
      "id": "BV17apN6KEu1",
      "title": "有点甜",
      "artist": "冬雾kiri",
      "language": "国语",
      "category": "翻唱",
      "tags": ["退烧药777", "歌切"],
      "publishedAt": "2026-10-07 04:21:11",
      "duration": 211,
      "audio": "./media/BV17apN6KEu1.m4a",
      "cover": "./media/covers/BV17apN6KEu1.jpg",
      "sourceTitle": "【冬雾kiri歌切】依旧一半麦克风交给wff的有点甜",
      "sourceUploader": "退烧药777",
      "sourcePubdate": 1791000000,
      "sourceDuration": 211
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | B 站 BV 号，同时是媒体文件名 |
| `title` | string | 是 | 曲名。**缺失的条目会被前端过滤掉，不会显示** |
| `artist` | string | 否 | 这里固定为 `冬雾kiri` |
| `language` | string | 否 | 用于语言筛选，`国语` / `日语`；会被 `shared.js` 归一化（`日语`→`日文`） |
| `category` | string | 否 | 用于分类筛选，这里固定 `翻唱` |
| `tags` | string[] | 否 | 自由标签，进标签筛选与徽章行 |
| `publishedAt` | string | 否 | `YYYY-MM-DD HH:mm:ss`，北京时间（UTC+8） |
| `duration` | number | 否 | 秒 |
| `audio` / `cover` | string | 是 | 仓库内相对路径 |
| `sourceTitle` / `sourceUploader` / `sourcePubdate` / `sourceDuration` | — | 否 | 采集时从 B 站 view 接口抄回的**原始事实**，用于溯源与去重核对 |

改完 `songs.json` 后把所有歌按 `publishedAt` **倒序**排列，然后**必须**跑一次 `node tools/build-data.mjs`。

### 4.2 `data/kiri/*.json`（生成，页面真正读的数据）

页面通过 `js/shared.js` 的 `ROOM_CONFIGS.kiri` 指向这 5 个文件，字段契约与主站一致：

| 文件 | 结构 | 本工程怎么填 |
| --- | --- | --- |
| `song_catalog.json` | `{ songs: [...] }` | `row_key`/`song_name`/`display_song_name`=曲名；`artist`=`冬雾kiri`；`type`=`分类、标签…`（顿号分隔，前端按此拆标签筛选）；`language` 同上；`status_labels`=标签串；`cut_link`=B站视频页；`sing_count`=1；`last_sing_at`=发布日 |
| `audio_index.json` | `{ audios: { [曲名]: "media/<BV>.m4a" }, verificationTargets: [] }` | **音频必须走这里**：`normalizeRoomSong` 会丢掉 `song.audio` 字段 |
| `song_details.json` | `{ bySongKey: { [曲名]: {..., entries: [...] } } }` | 用 `songs.json` 的 `publishedAt` / `duration` / 原视频标题填一条 entry |
| `song_cut_info.json` | `{ cuts: { [曲名]: { title, kind: "single", url } } }` | 歌切外链 |
| `history_index.json` | `{ latest, dateTree, byDate }` | 按 `publishedAt` 的日期分组 |

`js/data.js` 把同样 5 份数据塞进 `window.XSL_DATA`，供 `file://` 直接打开时回退（`fetch` 在 `file://` 下会被浏览器拦住）。

---

## 5. 常用命令

```powershell
# 本地预览（不要直接双击 index.html：file:// 下 fetch 会被拦住，虽然 data.js 能兜底）
python -m http.server 49152 --bind localhost

# 改完 songs.json 之后重建运行时数据
node tools/build-data.mjs

# 补齐本地素材（新设备 clone 后先跑这个）
node tools/fetch-media.mjs           # 只补缺失的
node tools/fetch-media.mjs --force   # 全部重新下载
node tools/fetch-media.mjs --check   # 只检查，不下载（缺失时退出码 1）

# 语法校验
node --check js/app.js
node --check js/shared.js
node --check js/motion.js
node --check js/data.js
```

---

## 6. 采集新歌切（B 站）

B 站的搜索接口和 yt-dlp 的搜索很容易返回 **412**，元数据则相对稳定。可靠的流程是：

1. **拿候选 BV 号**：抓 `https://search.bilibili.com/video?keyword=冬雾kiri歌切&order=pubdate`，用正则 `BV[0-9A-Za-z]{10}` 抠出全部 BV 号。
2. **逐个核实归属**：`https://api.bilibili.com/x/web-interface/view?bvid=<BV>`，只保留同时满足 `data.owner.mid -eq 141266664` 且标题含「歌切」的条目。
3. **取曲名**：标签里的 `发现《曲名》` 或标题里的 `《曲名》` 是权威信号。**判不出来就问用户**。
4. **取音频直链**：`https://api.bilibili.com/x/player/playurl?bvid=<BV>&cid=<cid>&fnval=16&qn=64`，取 `dash.audio` 中 `bandwidth` 最大的一条。
   - 请求之间**至少间隔 1 秒**，否则容易触发 412。
   - 需要带 `User-Agent` 与 `Referer: https://www.bilibili.com/`。
5. **下载**：音频存 `media/<BV>.m4a`，封面存 `media/covers/<BV>.jpg`（封面地址来自 view 接口的 `data.pic`）。
   - 这一步直接交给 `node tools/fetch-media.mjs`：它读 `songs.json`，只补缺失的文件，并校验 `owner.mid`。
   - 所以**推荐顺序**是：先更新 `songs.json`，再跑这个脚本，而不是手动 `curl`。
6. **去重**：按规范化曲名比对，同名只留 `pubdate` 最新的，**删掉旧版本的两个媒体文件**。
   - ⚠️ 只比标题会**漏判**：本站《夏天的风》两条投稿标题里都没有歌名，是靠标签认出来的。
7. **重建 + 写回**：`node tools/build-data.mjs`，然后运行第 7 节的验证清单。
8. **记账**：把这次采集的 BV 号、发布时间、去重结论写进 `data/SOURCES.md`。

> 依赖：两个脚本都只需要 **Node 18+**（内置 `fetch`，无第三方依赖）。
> 手工核曲名时可能用到 `python` + `yt_dlp`，但那只是**辅助**，页面运行时完全不需要。

---

## 7. 验证清单（提交前必跑）

```powershell
# 1. JS 语法
node --check js/app.js; node --check js/shared.js; node --check js/motion.js; node --check js/data.js

# 2. 曲名唯一
node -e "const j=JSON.parse(require('fs').readFileSync('data/songs.json','utf8'));const t=j.songs.map(s=>s.title);if(new Set(t).size!==t.length)throw Error('存在同名歌曲');console.log('uniqueness ok',j.songs.length);"

# 3. 生成物与 songs.json 同步（重新生成后应无 diff）
node tools/build-data.mjs; git diff --stat data/kiri js/data.js

# 4. 本地素材是否齐全（缺失时退出码 1）
node tools/fetch-media.mjs --check

# 5. 确认没有任何媒体被 Git 跟踪（应输出 0）
(git ls-files media | Measure-Object).Count

# 6. 确认没有主题 / 主播 / 联网功能残留（应无输出）
Select-String -Path index.html,styles.css,js/*.js,css/motion.css -Pattern 'xiaosonglu|小松绿|midautumn|viridis|listen-together|rating\.js|live-status'
```

逐项确认：

- [ ] 四个 `node --check` 全部通过
- [ ] 曲名无重复（去重规则已生效）
- [ ] `node tools/build-data.mjs` 重跑后 `data/kiri/` 与 `js/data.js` **没有变化**
- [ ] 本机 `media/` 里每首歌的 `audio` 与 `cover` 都存在
- [ ] `media/` 里**没有**未被 `songs.json` 引用的孤儿文件
- [ ] **`git ls-files media` 为空**——媒体绝不进版本控制
- [ ] 第 6 条 grep 无输出（`viridis` 只允许出现在 `index.html` 致谢弹窗那一句说明里）
- [ ] 页面在浏览器中能列出全部歌曲、能播放、能切歌、能筛选、能收藏、能看历史
- [ ] 播放条真的**看得见**（见第 10 节）

---

## 8. 提交约定

- 分支：`main`。
- 提交信息用中文，带前缀：`feat(data):` / `feat(ui):` / `fix:` / `docs:` / `chore:`。
- 一次提交只做一件事：**新增歌曲**和**改样式**不要混在一起。
- 采集类提交请写清数量，例如：`feat(data): 新增 3 首歌切（歌切合计 10 首）`。
- 改动了本文件描述的规则时，**同一次提交**必须包含 `AGENTS.md` 的更新。

---

## 9. 跨设备同步约定

- **远程仓库**：<https://github.com/FTFwen/song-kiri>（公开）
- **默认分支**：`main`
- **与 `viridis.love` 的关系**：无。本仓库是独立仓库，不是 `xiaosonglu-songlist-web` 的子目录或子模块，也**不要**把它合并回去。

新设备上手：

```powershell
git clone https://github.com/FTFwen/song-kiri
cd song-kiri
node tools/fetch-media.mjs --check    # 看看缺什么（全新 clone 必然全缺）
node tools/fetch-media.mjs            # 把音频与封面拉到本地
python -m http.server 49152 --bind localhost
```

日常流程：

1. 开工前先 `git pull`。**媒体不在仓库里**，所以 pull 之后跑一次 `node tools/fetch-media.mjs` 补齐新增歌曲的素材。
2. 收工前运行第 7 节的验证清单，然后 `git add -A && git commit && git push`。
3. 新增歌曲时，**`data/songs.json`、`data/kiri/*`、`js/data.js`、`data/SOURCES.md` 一起提交**，素材留在本地。
4. 如果确认素材缺失，不要 `git add -f media`——先确认 `songs.json` 里的路径与 BV 号写对了，再重跑脚本。
5. 新增或修改规则后，更新本文件与 `README.md`，让下一台设备上的 AI 直接照着做。

### 推送失败的排查

如果推送或 `git ls-remote` 报下面这类错误：

```text
error: unable to rewind rpc post data - try increasing http.postBuffer
error: RPC failed; curl 65 Recv failure: Connection was reset
```

按顺序试这两条（本仓库 `.git/config` 里已经设好）：

```powershell
git config http.version HTTP/1.1
git config http.postBuffer 524288000
```

如果 `git ls-remote` 直接报 `Recv failure: Connection was reset`，通常也是 HTTP/2 的问题，改用 `HTTP/1.1` 即可。

---

## 10. 无 GUI 环境下的自检手法

改动页面后如果手边没有能看图的工具，用**无头浏览器 + 注入探针**验证，别只靠"看起来应该没问题"。

```powershell
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$prof = "D:\tmp\ep-$(Get-Random)"
$args = @('--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
          '--disable-extensions','--virtual-time-budget=30000',"--user-data-dir=$prof",
          '--window-size=1440,1400','--dump-dom','http://localhost:49152/')
Start-Process -FilePath $edge -ArgumentList $args -Wait -NoNewWindow `
  -RedirectStandardOutput 'dom.html' -RedirectStandardError 'err.txt'
```

要点与坑：

- **每次换一个全新的 `--user-data-dir`**。复用同一个目录会 `exit 21` 且不产出任何文件。
- `--dump-dom` 抓的是 **JS 跑完之后的 DOM**，可以 grep 卡片数、`#songMetaText`、`#playerBar` 的 class 等。
- 想看交互后的状态：把 `index.html` 复制成仓库根下的 `_probe.html`，在 `</body>` 前注入一段脚本（点击按钮、等一会、把结果写进 `<pre id="PROBE_OUT">`），再 `--dump-dom` 那个地址，最后**记得删掉 `_probe.html`**。
- ⚠️ **无头模式下 `requestAnimationFrame` 几乎不触发**（实测 3 次里只跑了 1 次）。任何"靠 rAF 才会生效"的逻辑在无头里都会假死——第 11 节那个播放条 bug 就是这么被发现、也是这么被误判过的。判断这类问题时，看 `getComputedStyle()` 的实际值，不要只看 class。
- 探针脚本里读全局量时注意：`js/app.js` 用的是顶层 `const`，所以 `state` / `player` **能按名字直接读**，但 `window.state` 是 `undefined`。写 `window.state` 会静默拿到假结果。

---

## 11. 已知的移植改动与陷阱

| 位置 | 改动 | 为什么 |
| --- | --- | --- |
| `js/shared.js` | 重写为单房间 `kiri`；删掉 `getRoomKeyById` / `detectRoomFromUrl` / `SUPPORTED_ROOM_IDS` / `BILIBILI_ROOM_RE` | 本站只有一个房间；这些函数 `app.js` 不引用（已核实） |
| `js/shared.js` | **保留** `LANGUAGE_TAG_ALIASES = { '日语': '日文' }` | `js/app.js` 判断 `=== '日文'` 才给 `lang-ja` 徽章 |
| `js/app.js` | `xiaosonglu` → `kiri`（房间键、存储键 `playlist:kiri` / `songlists:kiri`、`EMBEDDED_DATA_MAP` 五个路径） | 与主站 localStorage 隔离 |
| `js/app.js` | 二创曲目表清空（`DERIVATIVE_TRACK_SHEET = []`） | 本站没有二创曲目 |
| `index.html` | 内联 `<style>`（3900 行）换成 `<link href="styles.css">` | 便于配色变换与维护 |
| `index.html` | 去功能时**只加 `style="display:none"`，不删元素** | `bindDom` 一次性收集全部 id，删了会 null 崩 |
| `index.html` | `#playerRatingHost` **必须保留**（空着） | 它是 `.player-bar` 栅格里的 `grid-row:2 / grid-column:5/7`，删了播放器会重排 |
| `js/motion.js` | `setupPlayerBarMotion` 的「升起」由 `requestAnimationFrame` 改为 **rAF + `setTimeout(60ms)` 双保险** | 数据是异步 fetch 来的，播放条 `display:flex` 发生在 motion.js 初始化**之后**，只能走 MutationObserver + rAF 那条路；只靠 rAF 时播放条会永久停在 `opacity:0`（无头环境必现，真机后台标签页也可能遇到） |
| 全部 | 删掉 `js/rating.js` / `js/live-status.js` / `js/listen-together.js` / `js/midautumn-skin.js` / `css/midautumn-skin.css` / `css/listen-together.css` | 需要联网或属于主题，且 `app.js` 里都有 `null` 守卫，去掉只少功能不报错 |
