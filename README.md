# song-kiri

一个**完全独立**的纯静态歌单页面，收录 B 站 UP 主 **冬雾kiri** 的唱歌投稿，来自五个账号：切片man **退烧药778**（原名退烧药777，2026-11 改名，mid `141266664` 不变，主要来源）、**奥小姐拜托了**（mid `17458321`，2026-11-03 加入）与 **训练木偶**（mid `449428560`，2026-11-10 加入）的歌切、主播**本人** `冬雾_kiri`（mid `3707024510552805`）发布的翻唱，以及 **冬雾家的Melu7ne**（原名冬雾kiri单推蝠，2026-11 改名，mid `3546666873391261` 不变，仅《グルグル》1 首的单首授权）。

不依赖任何后端、构建工具或外部资源。

投稿人名单（白名单 + 黑名单）集中在 [`tools/uploaders.mjs`](./tools/uploaders.mjs)：只有上述五个账号能进站，另外还有一份**黑名单**（优先级更高，命中即一律不收）。两份名单的来由、以及两道代码拦截，见 [`AGENTS.md`](./AGENTS.md) 第 11 节的「新增投稿人」「投稿人黑名单」。

> 🤖 **用 AI 维护本工程，请先读 [`AGENTS.md`](./AGENTS.md)。**
> 它记录了硬性约束、数据管线、采集流程、无 GUI 自检手法和提交前验证清单，是跨设备协作的入口。

---

## 当前功能

页面是 `viridis.love` 歌单页的**整页移植**，功能对齐，只去掉主播元素、主题与必须联网的部分。

保留：

- 三个页签：**总览 / 历史 / 中意**
- 底部悬浮播放器：上一首 / 播放暂停 / 下一首、进度条、音量、播放模式（顺序 / 随机 / 单曲）、睡眠定时、收藏按钮
- 播放列表面板与「我的歌单」面板（可拖动、可新建歌单、可加入歌单）
- 高级筛选抽屉：语言筛选、标签筛选、次数预设、天数预设、重置
- 搜索（综合 / 歌名 / 歌手三种模式）、活跃筛选条、回到顶部、手机端悬浮按钮
- 歌曲详情弹窗、TXT 导入导出
- 全站动效体系（环境光晕、卡片 3D 倾斜、光标尘埃、播放器麦浪频谱、点击波纹、和纸胶带角标…）

去掉：

- 主播相关：`theme-xiaosonglu` 主题类、人物背景图、桌宠伴侣、好运歌签弹窗
- 卡片上的**切片man标签**（原来徽章行与状态行里各有一个 `退烧药777`，现已从 `songs.json` 的 `tags` 里移除）
- 顶栏的**「致谢名单」按钮**（入口用 `style="display:none"` 隐藏；弹窗本身按「去功能只隐藏、不删元素」的约定保留，详见 `AGENTS.md` 第 11 节）
- 主题符号：空态里的 🌻（换成 🔍）、动效文案里的「松绿」字样
- 歌曲卡片左上角的**拟物黑胶微封面**（连同它的旋转 / 声波光环 / 悬停缩放动效一起删除）。播放按钮由卡片右侧的 `.song-actions` 承担，功能不受影响
- 联网功能：歌曲评分（`/api/rating/song`）、直播状态轮询、中意清单服务器存档与自动同步（`/api/fav/`）、一起听（WebSocket）、跨页播放器交接
- 中秋限定皮肤
- 跨页导航（按钮墙 / 24点 / 标本馆的入口）

配色从原来的橄榄 / 奶油暖色系换成**中性蓝灰**（HSL 色相统一到 214），氛围图与人物背景全部删除，页面背景只剩渐变。
色盘里刻意保留了少量暖金 / 奶油色的点缀；`node tools/scan-green.mjs` 可以体检还有没有漏网的橄榄色值（当前会报出 4 处，都在不会渲染的死规则里，详见 `AGENTS.md` 第 11 节）。

## 当前收录

共 **74 首**，同名歌曲已按规则只保留最新发布版本：

- **2026-11-22（2 首）** 甜蜜蜜 · 月亮代表我的心（奥小姐拜托了；月亮代表我的心是 11-08 合集 P1 版的重唱，按「同名只留最新」替换）
- **2026-11-19（1 首）** 棠梨煎雪（重唱，替换 10-18 版）
- **2026-11-15（1 首）** 东京不太热（重唱，替换 10-18 版）
- **2026-11-14（4 首）** 我是你的小狗 · 恶作剧 · 荷塘月色 · 日不落（小狗是 11-08 合集 P5 版的重唱替换）
- **2026-11-08（4 首）** 遇见 · 罐装啤酒 · Letting Go · 蠢货（训练木偶 6 分P 歌切合集的剩余 4 首，曲名由用户听辨提供；合集里的月亮代表我的心与我是你的小狗已被 11-22 / 11-14 的重唱替换，遇见按规则替换了 10-10 旧版）
- **2026-11-03（8 首）** 爱人呢 · 繁花 · Love Love Love · 青花瓷 · 第一次爱的人（未完成版） · 公主殿下 · 半壶纱 · 光
- **2026-11-02（1 首）** グルグル
- **2026-11-01（3 首）** 多幸运 · 虚拟 · 下个，路口，见（后两首是 10-22 / 10-07 版的重唱，按「同名只留最新」替换了旧版）
- **2026-10-30（7 首）** 恋爱频率 · 现在那边是几点 · 眉间雪 · 帅的人 · Happy Halloween · 宝贝 · 童话镇
- **2026-10-22（5 首）** One Last Kiss · 我的一个道姑朋友 · 小手拉大手 · 客官不可以 · 那么骄傲
- **2026-10-18（5 首）** 干物女 · 锦鲤抄 · 牵丝戏 · 人是猫 · 坏女孩（东京不太热与棠梨煎雪已被 11-15 / 11-19 的重唱替换）
- **2026-10-17（1 首）** 我的悲伤是水做的
- **2026-10-10（15 首）** 好想你 · 普通朋友 · 我只在乎你 · 风月 · 欧若拉 · 晚安喵 · だんご大家族 (团子大家族) · 要抱抱 · 心跳叮叮咚 · 寄り酔い · 拼图爱 · 爱的魔法 · 写给我第一个喜欢的女孩的歌 · 只对你有感觉 · 美人鱼
- **2026-10-07（5 首）** 有点甜 · 彩色翅膀 · 恋爱循环 · 彩虹的微笑 · 夏天的风
- **2026-09-27（8 首）** 月が綺麗ねと言われたい！ · 太聪明 · 给我一个吻 · 吵架歌 · 陶然四季 · 素颜 · 屑屑 · 讲真的
- **2026-09-17（2 首）** チルノのパーフェクトさんすう教室 · 勾指起誓
- **2026-09-16（1 首）** 虫儿飞
- **2026-09-09（1 首）** mosi mosi?（主播本人投稿的 24 秒【新v翻唱】）

采集来源、去重记录与刻意跳过的投稿见 [`data/SOURCES.md`](./data/SOURCES.md)。

## 关于素材

**本仓库不包含任何歌曲素材。** 音频与封面在 `.gitignore` 里被忽略，需要在本机自行拉取：

```powershell
node tools/fetch-media.mjs           # 只补缺失的（新设备 clone 后跑这个）
node tools/fetch-media.mjs --force   # 全部重新下载
node tools/fetch-media.mjs --check   # 只检查缺什么
```

脚本只需要 **Node 18+**（用内置 `fetch`，零第三方依赖）。它会读 `data/songs.json`，校验视频归属，
然后把音频存到 `media/<BV号>.m4a`、封面存到 `media/covers/<BV号>.jpg`。

这样做的原因：`media/` 是完全由 `songs.json` 推导出来的**派生目录**，随时可重建；
仓库只保存「收录了哪些歌」这个事实，既轻量，也不代为分发他人投稿。

素材没补齐时页面仍能打开，会显示占位封面，并在播放器位置提示运行上面的命令。

## 本地运行

页面通过 `fetch` 读取 JSON，所以**推荐**启动一个静态服务器而不是直接双击：

```powershell
python -m http.server 49152 --bind localhost
```

然后访问 <http://localhost:49152/>。

> 直接双击 `index.html`（`file://`）也能看到歌单——`js/data.js` 里内嵌了同一份数据作为回退——
> 但 `file://` 下浏览器会拦截 `fetch`，属于降级模式，日常请用静态服务器。

## 部署

托管在 **Cloudflare Pages**，直接上传、不接 Git 自动构建：

| | |
| --- | --- |
| **线上地址（正式）** | <https://dwkr.live> |
| 备用地址 | <https://www.dwkr.live> / <https://song-kiri.pages.dev> |
| 自定义域名 | `dwkr.live` + `www.dwkr.live`，**2026-10-12 已生效**（Cloudflare zone `active`，证书由 Google Trust Services 签发） |
| Pages 项目名 | `song-kiri` |
| DNS | 域名在**阿里云**注册；NS 已于 2026-10-12 改为 Cloudflare 的 `garret.ns.cloudflare.com` / `suzanne.ns.cloudflare.com` |

> ⚠️ `dwkr.live` 是**根域名**，Cloudflare Pages 要求根域名必须把 NS 指到 Cloudflare（外部 DNS 只能托管子域名），所以不能只加一条 CNAME。NS 切换要在域名注册商（阿里云）后台做，并需要**手机短信验证**。
> 改完 NS 后注册局（Identity Digital）发布区文件还有一段延迟——面板显示生效不等于全网生效，判断办法见 `AGENTS.md` 第 12.6 节。

```powershell
# 1. 生成发布目录（白名单挑文件；缺素材会直接失败）
node tools/stage-deploy.mjs

# 2. 修掉本机一个环境变量坑（详见 AGENTS.md 第 12 节）
$env:CLOUDFLARE_ACCOUNT_ID = '93dba8a5c9a9ef865311c1c8c8abee99'
Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue

# 3. 上传
npx wrangler pages deploy --project-name song-kiri --branch main --commit-dirty=true
```

**注意**：`wrangler pages deploy` 是整目录上传、**不读 `.gitignore`**，所以不能直接传仓库根目录。
`tools/stage-deploy.mjs` 用白名单生成 `deploy-stage/`，只放页面真正需要的文件（含 74 首的音频与封面，约 373 MB，用硬链接，不额外占空间）。
`AGENTS.md` / `README.md` / `tools/` / `.dsh-tmp/` / `.git/` 都不会被发布出去。

部署细节、环境变量坑、`_headers` 与自定义域名的解析步骤，都写在 [`AGENTS.md` 第 12 节](./AGENTS.md)。

## 目录结构

```text
song-kiri/
├── AGENTS.md              # AI 维护契约（活文档）
├── index.html             # 页面结构
├── 404.html               # 找不到页面时的响应（让 Pages 返回真实 404）
├── styles.css             # 样式（中性配色）
├── _headers               # Cloudflare Pages 响应头规则
├── wrangler.toml          # Cloudflare Pages 项目配置
├── css/motion.css         # 动效样式
├── js/
│   ├── shared.js          # 单房间配置 + 数据归一化
│   ├── data.js            # 【生成】file:// 回退数据
│   ├── app.js             # 页面逻辑
│   └── motion.js          # 动效脚本
├── assets/kuaile-subset.woff2
├── data/
│   ├── songs.json         # 唯一手写数据源
│   ├── SOURCES.md         # 采集与去重台账
│   └── kiri/              # 【生成】页面实际读取的 5 个 JSON
├── tools/
│   ├── build-data.mjs     # songs.json -> data/kiri/* + js/data.js
│   ├── fetch-media.mjs    # 拉取缺失的音频与封面
│   ├── scan-green.mjs     # 体检：还有没有漏网的橄榄 / 黄绿色系色值
│   └── stage-deploy.mjs   # 生成 deploy-stage/（发布白名单 + 素材体检）
└── media/                 # 【不入库】音频与封面，文件名即 BV 号
```

## 数据管线

```
data/songs.json  ──(node tools/build-data.mjs)──▶  data/kiri/*.json + js/data.js  ──▶  页面
                 ──(node tools/fetch-media.mjs)─▶  media/<BV>.m4a + media/covers/<BV>.jpg
```

**改了 `data/songs.json` 之后必须重跑 `node tools/build-data.mjs`**，否则页面读到的还是旧数据。

编辑 `data/songs.json`：

```json
{
  "source": {
    "uploader": "退烧药778",
    "mid": "141266664",
    "uploaders": [
      { "name": "退烧药778", "mid": "141266664", "role": "歌切切片man（主要来源；原名退烧药777，2026-11 改名，mid 不变）" },
      { "name": "冬雾_kiri", "mid": "3707024510552805", "role": "主播本人（自己发布的翻唱投稿）" },
      { "name": "奥小姐拜托了", "mid": "17458321", "role": "歌切切片man（2026-11-03 用户点头加入白名单）" },
      { "name": "冬雾家的Melu7ne", "mid": "3546666873391261", "role": "歌切切片man（原名冬雾kiri单推蝠，2026-11 改名，mid 不变；仅《グルグル》1 首，用户单首点头）" },
      { "name": "训练木偶", "mid": "449428560", "role": "歌切切片man（2026-11-10 用户点头加入白名单）" }
    ],
    "deduplicatedBy": "歌曲名；同名仅保留最新发布版本",
    "updatedAt": "2026-11-23"
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
      "sourceTitle": "【冬雾kiri歌切】依旧一半麦克风交给wff的有点甜"
    }
  ]
}
```

- `id`：B 站 BV 号，同时是媒体文件名；**多分P 视频用「BV 号_p分P 序号」**（如 `BV1ow4s6wETd_p3`），每个分P 是独立音轨、独立文件，播放页链接会生成 `?p=序号`。
- `title`：曲名，必填；没有歌名的记录不会显示。
- `artist` / `language` / `category` / `tags`：用于展示、筛选和搜索。
  **`tags` 里不要写切片man（UP 主 `退烧药777`）** —— 卡片标签只展示歌曲本身的信息；投稿人信息保留在每首歌的 `sourceUploader` 与 `data/SOURCES.md` 里。
  `本人投稿` 这个标签专给主播自己发的翻唱（目前 1 首），用来和「歌切」区分。
- `publishedAt` / `duration`：投稿时间与时长（秒）。
- `audio` / `cover`：仓库内相对路径，**不能写外部直链**。
- `source*`：采集时抄回的 B 站原始事实，用于溯源。

## 独立性

本工程不引用父目录资源，也不依赖 `viridis.love` / `xiaosonglu-songlist-web` 的脚本、样式、数据、接口或构建流程。复制 `song-kiri` 整个目录即可单独保存、运行和推送。

（唯一的例外是 `index.html` 致谢弹窗里有一句「页面与播放器能力参照 viridis.love 歌单页实现」的版权说明，纯文字，不产生任何网络请求。）

远程仓库：<https://github.com/FTFwen/song-kiri>
