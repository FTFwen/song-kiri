# AGENTS.md — song-kiri 维护说明

> 面向**任何设备上的 AI 编程助手**。开始改动前先读完本文件。
> 这是一份**活文档**：只要数据结构、目录布局、采集流程或验证方式发生变化，就必须在**同一次提交**里同步更新本文件。

---

## 1. 这个工程是什么

`song-kiri` 是一个**完全独立的纯静态歌单页面**，收录 B 站 UP 主 **退烧药777**（mid `141266664`）发布的 **冬雾kiri 歌切**。

- 纯前端：`index.html` + `styles.css` + `app.js`，没有构建步骤、没有依赖、没有后端。
- 数据：`data/songs.json`。
- 媒体：音频与封面**不入库**，各设备用 `tools/fetch-media.mjs` 拉到本地 `media/`，之后即可离线播放。
- 本地预览时才会用到静态服务器；页面本身不需要服务器逻辑。

---

## 2. 硬性约束（不要破坏）

1. **完全独立**：不引用父目录、不引用 `viridis.love` / `xiaosonglu-songlist-web` 的任何资源、样式、数据、接口或构建流程。
2. **纯静态**：不引入 Node 服务、数据库、登录、评分、弹幕、直播或任何后端 API。
3. **不引入构建工具**：不添加 bundler、框架、`package.json` 依赖树。原生 HTML/CSS/JS 直接用浏览器打开（经由静态服务器）就能跑。
4. **同名歌曲只保留最新发布版本**：去重键是**规范化曲名**。发现同名多条时，按 `publishedAt`（即 B 站 `pubdate`）取最大者，并**删除**其余版本的音频与封面。
5. **媒体不入库**：音频与封面**不提交到 Git**，`media/` 已被 `.gitignore` 忽略（历史里也没有）。`songs.json` 里的 `audio` / `cover` 只能指向仓库内的相对路径（`./media/...`），不得写 B 站的直链——B 站直链带签名、会过期。素材缺失时用 `tools/fetch-media.mjs` 在本机补齐。
6. **不臆造曲名**：曲名以视频标题与 B 站标签为准（标签里 `发现《曲名》` 是可靠信号）。**无法确定曲名时不要猜**，先向用户确认。
7. **不混入非目标内容**：只收 UP 主 `退烧药777` 的、标题含「歌切」的冬雾kiri 相关视频。

---

## 3. 目录布局

```text
song-kiri/
├── AGENTS.md            # 本文件：AI 维护契约（活文档）
├── README.md            # 人类可读的项目说明
├── index.html           # 页面结构
├── styles.css           # 样式（含响应式断点 900px / 600px）
├── app.js               # 读取 JSON、筛选、排序、渲染、播放
├── data/
│   ├── songs.json       # 唯一数据源
│   └── SOURCES.md       # 已收录歌切的采集台账（BV 号 / 时间 / 去重记录）
├── tools/
│   └── fetch-media.mjs  # 按 songs.json 拉取缺失的音频与封面
└── media/               # 【本地生成，不入库】已被 .gitignore 忽略
    ├── <BV号>.m4a       # 音频，文件名即 BV 号
    └── covers/
        └── <BV号>.jpg   # 封面，文件名即 BV 号
```

命名约定：**媒体文件名一律使用 BV 号**，与 `songs.json` 的 `id` 字段保持一致。这样任何设备上的 AI 都能反查来源。

> `media/` 是**派生目录**：内容完全由 `data/songs.json` 决定，任何设备都能用 `tools/fetch-media.mjs` 重建。
> 仓库里只保存「收录了哪些歌」这个事实，素材本身各设备自己拉——这样仓库轻量，也不代为分发他人投稿。

---

## 4. 数据格式（`data/songs.json`）

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
      "cover": "./media/covers/BV17apN6KEu1.jpg"
    }
  ]
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | B 站 BV 号，同时是媒体文件名 |
| `title` | string | 是 | 曲名。**缺失的条目会被前端过滤掉，不会显示** |
| `artist` | string | 否 | 这里固定为 `冬雾kiri` |
| `language` | string | 否 | 用于语言筛选，如 `国语` / `日语` |
| `category` | string | 否 | 用于分类筛选，如 `翻唱` |
| `tags` | string[] | 否 | 自由标签，可被搜索命中 |
| `publishedAt` | string | 否 | `YYYY-MM-DD HH:mm:ss`，北京时间（UTC+8） |
| `duration` | number | 否 | 秒。前端显示为 `分:秒` |
| `audio` | string | 是 | 仓库内相对路径 |
| `cover` | string | 是 | 仓库内相对路径 |

修改 `songs.json` 后把所有歌按 `publishedAt` **倒序**排列，保持最新在前。

---

## 5. 常用命令

```powershell
# 本地预览（任选其一）。不要直接双击 index.html：file:// 下 fetch 会被浏览器拦住
python -m http.server 49152 --bind localhost
python -m http.server 8080

# 补齐本地素材（新设备 clone 后先跑这个）
node tools/fetch-media.mjs           # 只补缺失的
node tools/fetch-media.mjs --force   # 全部重新下载
node tools/fetch-media.mjs --check   # 只检查，不下载（缺失时退出码 1）

# 语法与数据校验
node --check app.js
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('data/songs.json','utf8'));"
```

---

## 6. 采集新歌切（B 站）

B 站的搜索接口和 yt-dlp 的搜索很容易返回 **412**，元数据则相对稳定。可靠的流程是：

1. **拿候选 BV 号**：抓 `https://search.bilibili.com/video?keyword=冬雾kiri歌切&order=pubdate`，用正则 `BV[0-9A-Za-z]{10}` 抠出全部 BV 号。
2. **逐个核实归属**：`https://api.bilibili.com/x/web-interface/view?bvid=<BV>`，只保留同时满足 `data.owner.mid -eq 141266664` 且标题含「歌切」的条目。
3. **取曲名**：`python -m yt_dlp --skip-download --print "%(id)s | %(tags)j" <视频地址>`。标签里的 `发现《曲名》` 是权威曲名来源；标题里的 `《曲名》` 也可用。
4. **取音频直链**：`https://api.bilibili.com/x/player/playurl?bvid=<BV>&cid=<cid>&fnval=16&qn=64`，取 `dash.audio` 中 `bandwidth` 最大的一条。
   - 请求之间**至少间隔 1 秒**，否则容易触发 412。
   - 需要带 `User-Agent` 与 `Referer: https://www.bilibili.com/`。
5. **下载**：音频存 `media/<BV>.m4a`，封面存 `media/covers/<BV>.jpg`（封面地址来自 view 接口的 `data.pic`）。
   - 这一步可以直接交给 `node tools/fetch-media.mjs`：它读 `songs.json`，只补缺失的文件，并校验 `owner.mid`。
   - 所以**推荐顺序**是：先更新 `songs.json`，再跑这个脚本，而不是手动 `curl`。
6. **去重**：按规范化曲名比对，同名只留 `pubdate` 最新的，**删掉旧版本的两个媒体文件**。
7. **写回**：更新 `data/songs.json`，并运行第 7 节的验证清单。
8. **记账**：把这次采集的 BV 号、发布时间、去重结论写进 `data/SOURCES.md`。

> 依赖：脚本只需要 **Node 18+**（用内置 `fetch`，无第三方依赖）。第 3 步的曲名识别需要 `python` + `yt_dlp`。
> 这两者都只用于**采集**，页面运行时完全不需要。

---

## 7. 验证清单（提交前必跑）

```powershell
# 1. JS 语法
node --check app.js

# 2. 曲名唯一
node -e "const j=JSON.parse(require('fs').readFileSync('data/songs.json','utf8'));const t=j.songs.map(s=>s.title);if(new Set(t).size!==t.length)throw Error('存在同名歌曲');console.log('uniqueness ok',j.songs.length);"

# 3. 本地素材是否齐全（缺失时退出码 1）
node tools/fetch-media.mjs --check

# 4. 确认没有任何媒体被 Git 跟踪（应输出 0）
git ls-files media | Measure-Object | Select-Object -ExpandProperty Count
```

逐项确认：

- [ ] `node --check app.js` 无输出（通过）
- [ ] 曲名无重复（去重规则已生效）
- [ ] 本机 `media/` 里每首歌的 `audio` 与 `cover` 都存在
- [ ] `media/` 里**没有**未被 `songs.json` 引用的孤儿文件
- [ ] **`git ls-files media` 为空**——媒体绝不进版本控制
- [ ] 页面在浏览器中能列出全部歌曲、能播放、能筛选与排序
- [ ] 没有引入任何外部 HTTP 引用（可用 `grep` 搜 `http://` / `https://`）

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
3. 新增歌曲时，**`data/songs.json` 与 `data/SOURCES.md` 一起提交**，素材留在本地。
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
