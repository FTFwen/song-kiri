# song-kiri

一个**完全独立**的纯静态歌单页面，收录 B 站 UP 主 **退烧药777** 发布的 **冬雾kiri 歌切**。

不依赖任何后端、构建工具或外部资源；音频与封面都放在仓库内，**离线也能播放**。

> 🤖 **用 AI 维护本工程，请先读 [`AGENTS.md`](./AGENTS.md)。**
> 它记录了硬性约束、数据结构、采集流程和提交前验证清单，是跨设备协作的入口。

---

## 当前功能

- 歌曲列表：封面、曲名、投稿时间、时长
- 本地音频播放，切换歌曲时自动暂停上一首
- 按歌曲名、歌手、标签搜索
- 按语言、分类筛选
- 按歌名、歌手排序
- 手机与桌面端自适应

## 当前收录

共 **7 首**，同名歌曲已按规则只保留最新发布版本：

有点甜 · 彩色翅膀 · 我是你的小狗 · 恋爱循环 · 下个，路口，见 · 彩虹的微笑 · 夏天的风

采集来源与去重记录见 [`data/SOURCES.md`](./data/SOURCES.md)。

## 本地运行

页面通过 `fetch` 读取 JSON，所以**不要直接双击 `index.html`**，请启动任意静态服务器：

```powershell
python -m http.server 8080
```

然后访问 <http://localhost:8080/>。

也可以使用 Node.js：

```powershell
npx serve .
```

## 目录结构

```text
song-kiri/
├── AGENTS.md         # AI 维护契约（活文档）
├── index.html        # 页面结构
├── styles.css        # 样式
├── app.js            # 读取数据、筛选、排序、渲染、播放
├── data/
│   ├── songs.json    # 唯一数据源
│   └── SOURCES.md    # 采集与去重台账
└── media/            # 音频与封面，文件名即 BV 号
```

## 数据结构

编辑 `data/songs.json`：

```json
{
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

- `id`：B 站 BV 号，同时是媒体文件名。
- `title`：曲名，必填；没有歌名的记录不会显示。
- `artist` / `language` / `category` / `tags`：用于展示、筛选和搜索。
- `publishedAt` / `duration`：投稿时间与时长（秒）。
- `audio` / `cover`：仓库内相对路径，**不能写外部直链**。

## 独立性

本工程不引用父目录资源，也不依赖 `viridis.love` / `xiaosonglu-songlist-web` 的脚本、样式、数据、接口或构建流程。复制 `song-kiri` 整个目录即可单独保存、运行和推送。
