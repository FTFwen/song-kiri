# 采集台账

记录 `data/songs.json` 中每一首歌切的来源与判定依据，方便任何设备上的 AI 复核或继续补充。

- **UP 主**：退烧药777
- **mid**：`141266664`
- **筛选条件**：`owner.mid = 141266664` 且标题含「歌切」
- **去重规则**：按规范化曲名去重，同名只保留 `pubdate` 最新的一条
- **素材存放**：音频与封面**不入库**（`.gitignore` 已忽略 `media/`），各设备跑 `node tools/fetch-media.mjs` 自行拉取
- **最近更新**：2026-10-07

---

## 已收录（7 首）

按发布时间倒序。

| # | 曲名 | BV 号 | 发布时间（UTC+8） | 时长 | 曲名判定依据 |
| --- | --- | --- | --- | --- | --- |
| 1 | 有点甜 | `BV17apN6KEu1` | 2026-10-07 04:21:11 | 211s | 标签 `发现《有点甜》`；标题含「有点甜」 |
| 2 | 彩色翅膀 | `BV15BpN6wEUw` | 2026-10-07 04:01:54 | 129s | 标签 `发现《彩色翅膀》` |
| 3 | 我是你的小狗 | `BV16MpK6rEMZ` | 2026-10-07 03:41:36 | 193s | 标签 `发现《我是你的小狗》` |
| 4 | 恋爱循环 | `BV1AwpK61En5` | 2026-10-07 02:56:20 | 253s | 标签 `发现《恋爱サーキュレーション》`，中文常用名「恋爱循环」 |
| 5 | 下个，路口，见 | `BV1bApA67Edv` | 2026-10-07 02:08:44 | 205s | 标签 `发现《下个，路口，见》` |
| 6 | 彩虹的微笑 | `BV1hFpA6JE2N` | 2026-10-07 02:01:17 | 171s | 标签 `发现《彩虹的微笑》`；标题含 `《彩虹的微笑》` |
| 7 | 夏天的风 | `BV1hcpA6UEcC` | 2026-10-07 01:52:29 | 223s | 标签 `发现《夏天的风》` |

> 曲名判定一律以 B 站标签里的 `发现《曲名》` 为准；标题里的 `《曲名》` 作为交叉验证。
> 若两者都无法确定曲名，**不要猜测**，先向用户确认。

上表每条的原视频标题已抄进 `data/songs.json` 的 `sourceTitle` 字段（同时记录了 `sourceUploader` /
`sourcePubdate` / `sourceDuration`），页面上的歌切外链 `title` 就是它——所以这 7 条原始标题也能直接在页面上核对。

> ⚠️ 表里的「时长」是 `songs.json` 的 `duration`；`sourceDuration` 是 B 站返回的原始时长，两者应当一致。

---

## 去重记录

### 夏天的风（保留最新）

| 版本 | BV 号 | 发布时间（UTC+8） | 处理 |
| --- | --- | --- | --- |
| 新 | `BV1hcpA6UEcC` | 2026-10-07 01:52:29 | **保留** |
| 旧 | `BV1XVax63Ea4` | 2026-09-27 03:38:39 | 丢弃；音频与封面均已删除，未入库 |

两个版本的视频标题都不是歌名本身，是靠标签 `发现《夏天的风》` 才确认属于同一首歌。这也说明**只比对标题会漏掉同名歌曲**，去重必须回到曲名。

`BV1XVax63Ea4` 的旧标题：「【冬雾kiri歌切】我看见你酷酷的笑容也有腼腆的时候」。

---

## 采集方式

1. 搜索页 `https://search.bilibili.com/video?keyword=冬雾kiri歌切&order=pubdate` 正则抠 `BV[0-9A-Za-z]{10}`
2. `https://api.bilibili.com/x/web-interface/view?bvid=<BV>` 核实 `owner.mid` 与标题
3. `python -m yt_dlp --skip-download --print "%(id)s | %(tags)j" <视频地址>` 取曲名标签
4. `https://api.bilibili.com/x/player/playurl?bvid=<BV>&cid=<cid>&fnval=16&qn=64` 取 `dash.audio` 中 `bandwidth` 最大的一条
5. 音频存 `media/<BV>.m4a`，封面（view 接口的 `data.pic`）存 `media/covers/<BV>.jpg`

> 第 4、5 步已封装在 `tools/fetch-media.mjs` 里（含归属校验、重试与限速）。
> 更新完 `songs.json` 后直接 `node tools/fetch-media.mjs` 即可，不必手写下载逻辑。
>
> 改完 `songs.json` 还要跑一次 **`node tools/build-data.mjs`**，重建 `data/kiri/*.json` 与 `js/data.js`；
> 这一步也顺带把上面抄回来的 `source*` 字段映射进页面真正读取的运行时数据里。

注意事项：

- 请求之间至少间隔 **1 秒**，否则会碰到 `HTTP Error 412`。
- 必须带 `User-Agent` 和 `Referer: https://www.bilibili.com/`。
- **B 站音频直链带签名、会过期，绝不能写进 `songs.json` 或提交进仓库。**
- **下载好的素材也不提交**：`media/` 已加入 `.gitignore`，历史里同样不含素材。只提交 `songs.json` 与本文档。

---

## 待补充

- 本次只覆盖了 2026-10-07 一批与 2026-09-27 一条重复项，**尚未穷尽**该 UP 主的全部冬雾kiri歌切。
- 后续补充时：追加到上表、更新 `data/songs.json`、并回到本文档记一行。
