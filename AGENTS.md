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
├── 404.html               # 找不到页面时返回（Cloudflare Pages 认这个文件名，给真实 404 状态码）
├── styles.css             # 主站内联 <style> 抽出 + 中性配色变换
├── _headers               # Cloudflare Pages 响应头规则（唯一一份，见第 12 节）
├── wrangler.toml          # Cloudflare Pages 项目配置（name / pages_build_output_dir）
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
│   ├── fetch-media.mjs    # 按 songs.json 拉取缺失的音频与封面
│   ├── scan-green.mjs     # 体检：还有没有漏网的橄榄 / 黄绿色系色值
│   └── stage-deploy.mjs   # 挑出该发布的文件放进 deploy-stage/，供 Cloudflare Pages 上传
└── media/                 # 【本地生成，不入库】已被 .gitignore 忽略
    ├── <BV号>.m4a         # 音频，文件名即 BV 号
    └── covers/
        └── <BV号>.jpg     # 封面，文件名即 BV 号
```

> `deploy-stage/` 由 `tools/stage-deploy.mjs` 现生成（内含硬链接的媒体），**不入库**，已被 `.gitignore` 忽略。

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
      "tags": ["歌切"],
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
| `tags` | string[] | 否 | 自由标签，进标签筛选与徽章行。⚠️ **不要把切片man（UP 主 `退烧药777`）写进来**——用户 2026-10-12 明确要求卡片标签里不出现切片man。投稿人信息仍然完整保留在 `source.uploader` / `sourceUploader` 与 `data/SOURCES.md` 里，溯源不受影响 |
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

# 3. 生成物与 songs.json 是否同步
#    build-data 自己会做一致性自检：比对时抹掉 generatedAt（构建时刻），
#    内容没变就**连 generatedAt 都不刷新、一个文件都不写**。
#    所以重跑一遍的结果应该是「6 个生成物全部无变化 ✔（没有任何文件被改写）」，
#    并且 `git status` 干净。一旦出现「内容已更新」，就说明盘上的生成物
#    之前是陈旧的，改动请连同 data/songs.json 一起提交。
node tools/build-data.mjs

# 4. 本地素材是否齐全（缺失时退出码 1）
node tools/fetch-media.mjs --check

# 5. 确认没有任何媒体被 Git 跟踪（应输出 0）
(git ls-files media | Measure-Object).Count

# 6. 确认没有主题 / 主播 / 联网功能残留（只应剩下致谢弹窗那一句 + 已废弃规则的死 CSS）
Select-String -Path index.html,styles.css,js/*.js,css/motion.css -Pattern 'xiaosonglu|小松绿|松绿|midautumn|viridis|listen-together|rating\.js|live-status'

# 7. 确认主题表情已清干净（应无输出）
Select-String -Path index.html,styles.css,js/*.js,css/motion.css -Pattern '🌻'

# 8. 扫一遍还有没有漏网的黄绿色系（正常会退出码 1，且只报下面那 4 处已知残留）
node tools/scan-green.mjs
node tools/scan-green.mjs --list     # 只想看看、不要退出码 1 时用这个
```

逐项确认：

- [ ] 四个 `node --check` 全部通过
- [ ] 曲名无重复（去重规则已生效）
- [ ] 重跑 `node tools/build-data.mjs` 后打印「6 个生成物全部无变化 ✔（没有任何文件被改写）」，且 `git status` 里没有 `data/kiri/` 与 `js/data.js`
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
| `index.html` | 致谢名单入口 `#thanksBtn` 加内联 `style="display:none"` 隐藏；弹窗 `#thanksOverlay` / `#thanksCloseBtn` 与 `bindDom`、监听都**原样保留** | 用户 2026-10-12 要求去掉这个按钮。按第 2 节第 9 条「去功能只隐藏、不删元素」——`thanksBtn` 在 `bindDom`（`js/app.js:3970`），且 `dom.thanksBtn.addEventListener('click', …)`（`js/app.js:4570`）**没有 null 守卫**，删元素会直接抛错。副作用：致谢弹窗从此**不可达**，页面里唯一那句 `viridis.love` 说明也随之看不见（但仍在文件里），所以第 7 节第 6 条的 grep 口径不变 |
| `js/motion.js` | `setupPlayerBarMotion` 的「升起」由 `requestAnimationFrame` 改为 **rAF + `setTimeout(60ms)` 双保险** | 数据是异步 fetch 来的，播放条 `display:flex` 发生在 motion.js 初始化**之后**，只能走 MutationObserver + rAF 那条路；只靠 rAF 时播放条会永久停在 `opacity:0`（无头环境必现，真机后台标签页也可能遇到） |
| `js/app.js` | 黑胶中心的主题图标去掉：原来播放时 `🌱 → 🌻`，现在恒为 `🌱`（`updatePlaybackVisuals` 里的两处 `textContent` 赋值都删了） | 🌻 是主站「小松绿 / 向日葵」主题符号，属要去掉的主题元素；`🌱` 中性保留。注：该「黑胶中心」随后连同整张唱片一起被删，见下一行 |
| `js/app.js` | **删除歌曲卡片顶部左侧的拟物黑胶微封面**（`.song-vinyl-wrap` / `.song-vinyl` / `.vinyl-core` 整个模板块），并同步删掉 `syncPlayingButton` 里两处 `spinning` 切换 | 用户 2026-10-12 要求「把歌曲卡片左上角的唱片样式图标去掉」。这是**刻意偏离主站**的改动 |
| `styles.css` | 删除 `.song-vinyl-wrap` / `.song-vinyl` / `.vinyl-core` / `@keyframes vinylSpin` 及两处 media query 里的相关选择器，原位置留一段说明注释 | 上一条的配套清理，避免留下指向不存在元素的死规则 |
| `css/motion.css` | 删除唱片相关动效：`@keyframes vinyl-sound-ring` 与两道声波光环、卡片悬停缩放、`@keyframes vinyl-spin-wobble` 与旋转/脉冲、全息彩虹光泽；同步删掉两处 media query 与手机端「黑胶微封面静态」规则；第 3 节标题改为「常驻装饰特效：旋律音符」 | 同上 |
| `js/motion.js` | `.song-vinyl-wrap.spinning` 从 `isPlaying` 的两处 `querySelector` 里去掉（保留 `.song-item.now-playing` 与 `.sound-btn.playing`） | 同上。判断依据仍成立：`syncPlayingButton` 一定会给正在播放的卡片加 `.song-item.now-playing` |
| `js/app.js` | 「没有找到匹配歌曲」空态图标 `🌻` → `🔍` | 同上，换成与语义相符的中性图标 |
| `js/motion.js` | `DUST_PALETTE` 六个 `'rgba(...)'` 色值中性化（3 个绿系 → 214 蓝灰，3 个暖金/奶油按规则保留） | 见下方「配色变换的两个盲区」 |
| `js/motion.js` | `POPUP_TEXTS` 里 `'松绿发声！🌱'` → `'开唱啦！🌱'`；`DUST_PALETTE` 上方注释去掉「松绿」字样 | 这是**主题用词**残留（不在 `POPUP_TEXTS` 之外出现）。该数组只被 `initButtonShockwaves` 使用，而本站没有 `.sound-btn` / `.cat-badge` 元素，这段是死代码，改动无副作用 |
| 全部 | 删掉 `js/rating.js` / `js/live-status.js` / `js/listen-together.js` / `js/midautumn-skin.js` / `css/midautumn-skin.css` / `css/listen-together.css` | 需要联网或属于主题，且 `app.js` 里都有 `null` 守卫，去掉只少功能不报错 |

### 配色变换的两个盲区（重要）

当初把主站的橄榄 / 奶油暖色系换成中性蓝灰时，用的是 `inBand(h, s) = s > 0.12 && 48 <= h <= 95`、色相改 `214`、饱和度按明度分档的规则。事后发现两处漏网：

1. **JS 里的 `'rgba(...)'` 字符串没被处理。** 当初的 JS 侧变换只认带引号的 6 位 `'#rrggbb'`，所以 `js/motion.js` 的 `DUST_PALETTE`（鼠标粉尘粒子颜色）六个色值原样留了下来，鼠标一动就会飘出**绿色和金色**的尘埃。已用同一套算法补上，并把色相上界从 95 放宽到 **100**（95~100 仍是黄绿，肉眼看就是绿）——放宽后 3 个绿系色值被换成蓝灰，另外 3 个暖金 / 奶油（`H≈37~44`）按规则**刻意保留**，作为暖色点缀。
2. **已知的 4 处不可见残留。** `tools/scan-green.mjs` 现在还会报出这 4 处，它们都在**已废弃或不会渲染**的规则里，改不改都看不见：

   | 位置 | 选择器 | 为什么不显示 |
   | --- | --- | --- |
   | `styles.css:350` | `.header-live-status.is-live .live-status-badge` | 直播状态条元素已在移植时删除 |
   | `styles.css:1086` | `.badge.tone`（底色 `#eef5ea`） | `tools/build-data.mjs` 写的 `tone` 恒为空串，不会渲染 |
   | `styles.css:1086` | `.badge.tone`（字色 `#4e733b`） | 同上 |
   | `styles.css:1887` | `.header-fav-auto-sync` 的 `box-shadow` | 该元素在 `index.html` 里已 `display:none` |

   行号会随其它改动漂移（删唱片样式后就整体上移了 47 行），**按选择器认，别按行号认**。以 `node tools/scan-green.mjs --list` 的当前输出为准。

   用户 2026-10-12 明确表示**先不删这些死规则**，所以保留原样。若以后要清，记得同步更新 `tools/scan-green.mjs` 顶部的白名单注释。
   ⚠️ `.badge.tone` 是其中唯一**结构上还可能活过来**的一条：哪天给某首歌补了 `tone` 字段，蓝色的页面上就会冒出一个绿徽章。

---

## 12. 部署（Cloudflare Pages）

### 12.1 现状

| 项 | 值 |
| --- | --- |
| 托管 | **Cloudflare Pages**（项目名 `song-kiri`，直接上传，**未接 Git 自动构建**） |
| 线上地址 | <https://song-kiri.pages.dev> |
| 自定义域名 | `dwkr.live` + `www.dwkr.live`（已挂到项目上，**等待 NS 生效**，见 12.6） |
| Cloudflare 账号 | `Ftfwen@gmail.com's Account`，Account ID `93dba8a5c9a9ef865311c1c8c8abee99` |
| 域名注册商 | **阿里云 / 万网**（HiChina）。NS 已于 2026-10-12 从 `dns1/dns2.hichina.com` 改为 Cloudflare 的 `garret/suzanne.ns.cloudflare.com` |
| 仓库 | <https://github.com/FTFwen/song-kiri>（与 Pages **没有**关联，部署靠手动命令） |

### 12.2 部署命令（每次改完页面都走这三步）

```powershell
cd D:\tool\webdeploy\song-kiri

# 1. 生成发布目录（白名单挑文件 + 素材体检，缺素材会退出码 1）
node tools/stage-deploy.mjs
node tools/stage-deploy.mjs --check     # 只想体检、不写文件

# 2. ⚠️ 必须先修掉一个环境变量坑（见 12.4）
$env:CLOUDFLARE_ACCOUNT_ID = '93dba8a5c9a9ef865311c1c8c8abee99'
Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue

# 3. 上传（目录来自 wrangler.toml 的 pages_build_output_dir，不要重复传参）
npx wrangler pages deploy --project-name song-kiri --branch main --commit-dirty=true
```

### 12.3 发布什么、不发布什么

`wrangler pages deploy` 是**按目录整个上传**的，**不读 `.gitignore`**，所以绝不能直接上传仓库根目录（否则 `.git/`、`AGENTS.md`、`.dsh-tmp/` 全会被公开）。`tools/stage-deploy.mjs` 用白名单生成 `deploy-stage/`：

- **发布**：`index.html`、`404.html`、`styles.css`、`_headers`、`css/`、`js/`（4 个）、`assets/`（标题字体）、`data/kiri/`（5 个 JSON）、`media/`（音频 + 封面，**共约 34 MB**）。
- **不发布**：`AGENTS.md`、`README.md`、`data/songs.json`、`data/SOURCES.md`、`tools/`、`.git/`、`.dsh-tmp/`、`.wrangler/`。
- 媒体是**硬链接**（同分区零拷贝）而不是复制；跨分区时自动退回 `copyFileSync`。

已实测：`https://song-kiri.pages.dev/AGENTS.md`、`/README.md`、`/data/songs.json`、`/.git/config` 全部返回 **404**（加了 `404.html` 之后不再是软 404）。

### 12.4 环境变量坑（本机必踩）

本机进程环境里有一个**占位符** `CLOUDFLARE_ACCOUNT_ID=你的 Cloudflare Account ID`，会让每条 wrangler 命令直接失败：

```text
X [ERROR] Invalid account ID "你的 Cloudflare Account ID" set in the `CLOUDFLARE_ACCOUNT_ID` environment variable.
```

它只存在于**进程**作用域（不是 User / Machine 级），所以部署前覆盖掉即可（见 12.2 第 2 步）。
另外 User 级有一个 **长度为 1 的 `CLOUDFLARE_API_TOKEN`**（等于空值），会让 wrangler 优先走 token 鉴权，也要先 `Remove-Item` 掉。

**鉴权走的是 OAuth**（`npx wrangler login`），凭据在 `%APPDATA%\xdg.config\.wrangler\config\default.toml`。该 token 的权限**只有 `zone (read)`，没有 `zone:write`**——所以**加站点（Add a site / 创建 zone）必须去 Cloudflare 后台做**，命令行做不了。

### 12.5 `_headers` 与 `404.html`

- `_headers` 是**仓库根目录唯一一份**，`stage-deploy.mjs` 会把它拷进发布目录。分 5 组：`/assets/*` 86400、`/css/*` 3600、`/js/*` 3600、`/data/*` 3600、`/media/*` 604800。
  ⚠️ Cloudflare 对同时命中的规则是**合并响应头**的，所以这 5 组**刻意互不重叠**——别再加一条 `/media/*` 去覆盖封面类型，否则会和音频规则打架。
- `.m4a` 的 `Content-Type` 由 Cloudflare 自动识别为 `audio/mp4`，**不需要**手工指定。
- `404.html` 放在根目录，Cloudflare Pages 会用它作为找不到页面时的响应，并返回**真正的 404 状态码**。没有它时 Pages 会把 `index.html` 以 **200** 返回（软 404）。

### 12.6 自定义域名的解析（截至 2026-10-12，NS 已切换、等待生效）

`dwkr.live` 在**阿里云 / 万网**注册（2026-10-12 注册），默认 NS 是 `dns1/dns2.hichina.com`。

**为什么必须换 NS**：Cloudflare Pages 官方文档明确要求，用**根域名（apex）**做自定义域名时必须把 NS 指到 Cloudflare——外部 DNS 只能托管**子域名**（加 CNAME）。所以不能只靠阿里云解析加一条 `@` 的 CNAME。

**已完成的步骤（2026-10-12 当天做完）**：

1. Cloudflare 后台 **Add a site** 添加 `dwkr.live`（Free 计划）→ zone `id = ecc2d9ba7853e4696873cc737f70ec74`，分配到的 NS 是
   **`garret.ns.cloudflare.com`** / **`suzanne.ns.cloudflare.com`**（和本账号里 `viridis.love` 用的是同一对）。
2. 在该 zone 的 DNS 表里手工加了**两条 Proxied CNAME**，Content 都是 `song-kiri.pages.dev`：一条 Name `dwkr.live`（apex，走 Cloudflare 的 CNAME flattening），一条 Name `www`。
3. 阿里云控制台「域名 → DNS 管理 → DNS修改 → 修改DNS服务器」把 NS 换成上面两个。
   ⚠️ 提交时会弹**「请确认该操作」的手机短信验证**（`156*****324`），需要账号持有人提供验证码，**agent 自己过不去这一步**。
4. 阿里云面板的「当前DNS服务器」已显示成 `garret.ns.cloudflare.com` / `suzanne.ns.cloudflare.com`。

**当时的状态**：Cloudflare 侧 zone `status = pending`；Pages 的两个自定义域名 `dwkr.live` / `www.dwkr.live` 仍是 `status=pending`、`error_message = "CNAME record not set"`。

**怎么判断卡在哪一步（2026-10-12 实测的重要区分）**：

- **注册局数据库**已经记下了新 NS：`Invoke-RestMethod 'https://rdap.org/domain/dwkr.live'` 的 `nameservers` 返回 `garret.ns.cloudflare.com` / `suzanne.ns.cloudflare.com`。
- 但 **注册局的权威 DNS 区文件还没重新发布**：直接向 `.live` 的六个权威服务器（`v0n0~v0n3.nic.live` = `65.22.20.1`/`.21.1`/`.22.1`/`161.232.10.1`，`v2n0/v2n1.nic.live` = `65.22.23.1`/`161.232.11.1`）发**原始 UDP 查询**，六个全部仍返回 `dns1.hichina.com` / `dns2.hichina.com`，**TTL 3600**。
- 也就是说：**卡在注册局发布区文件这一步，跟 Cloudflare、阿里云面板、我们的代码都无关**。委派 TTL 只有 1 小时，所以注册局一发布，各递归解析器最多再 1 小时就全线跟上。

诊断脚本：`node .dsh-tmp/dns-raw.mjs <TLD权威IP> [...]`（一次性工具，不入库；本机 DNS 被代理劫持成 `198.18.x.x` fake-IP，`nslookup <域名> <服务器>` 拿不到真实结果，必须用原始 UDP 绕过）。

**接下来会自动发生**：注册局发布新委派 → 递归解析器缓存过期 → Cloudflare 检测到 → zone 转 `active` → `dwkr.live` / `www.dwkr.live` 转 `active`，由 Google CA 自动签发证书。阿里云面板自己写的是「24-48 小时」，实际通常快得多。

**怎么查进度**（OAuth token 从 `%APPDATA%\xdg.config\.wrangler\config\default.toml` 的 `oauth_token` 取，注意该 token 只有 `zone (read)`）：

```powershell
# NS 有没有传播
Resolve-DnsName dwkr.live -Type NS -Server 223.5.5.5
Resolve-DnsName dwkr.live -Type NS -Server 8.8.8.8

# Cloudflare 侧 zone / 自定义域名状态
$h = @{ Authorization = "Bearer $tok" }
Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones?name=dwkr.live" -Headers $h | % result | ft id,name,status
Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/93dba8a5c9a9ef865311c1c8c8abee99/pages/projects/song-kiri/domains" -Headers $h | % result | ft name,status
```

另外提醒：`virdis.live`（少一个 `w`）也是本账号名下的域名，**不是**这个站要用的，别搞混。

### 12.7 用浏览器技能（bsk）操作后台的备忘

本机装了 `bsk`（browser-skill，可执行文件 `c:\users\taihexiongdi251215\.local\bin\bsk.exe`），可以直接驱动已登录的 Edge 操作 Cloudflare / 阿里云后台。踩过的坑：

- `bsk status` 有可能**永久挂住**（daemon IPC 不可达）；`bsk doctor` 报 `FAIL daemon running`、`bsk daemon restart` 报 `restart failed during stop phase`。这些**都不影响使用**——直接 `bsk browsers --json` 拿到已连接的 Edge instance id，再 `bsk session start --browser <id> --json`。
- 所有会话级子命令都要 `--session <id>`（`snapshot` / `click` / `fill` / `evaluate` …），`navigate` 不用。`wait-ms` **不接受** `--session`。
- `fill` 必须写 `--value <v>`，位置参数会被拒。
- `@eN` ref **每次 snapshot/observe 后都会重排**，用完要重新取。
- 会话可能中途失效（报 `requested resource does not exist`），重开一个 session 再 `navigate` 回原地址即可。
- PowerShell **执行策略禁止直接跑 `.ps1`**（未数字签名）；本仓库用 `D:\tool\webdeploy\.dsh-tmp\bsk.ps1` 作环境变量驱动的包装脚本，靠 `Invoke-Expression (Get-Content ... -Raw)` 调。
- 阿里云控制台的中文在 PowerShell 控制台里是 GBK 乱码，但域名、NS、URL、`@eN` ref 都是 ASCII，判断靠这些就够。
