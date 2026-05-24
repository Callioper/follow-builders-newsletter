# AI Builders Digest Web

基于开源项目 `Follow Builders` 内容源构建的双语 AI Builders 在线杂志。

这个项目的目标，不是简单把一份 digest 换成 HTML，而是在 `Follow Builders` 的基础上，扩展出一套适合长期更新、归档、手机阅读与静态部署的网页刊物系统。

## TL;DR

这是一个基于 `Follow Builders` 的增强版网页项目。

它做的事情是：

- 保留 `Follow Builders` 作为原始内容源
- 把内容重组为更适合阅读的双语杂志页
- 提供首页封面、往期目录和每期详情页
- 支持中英文对照、`速读 / 原文` 切换、作者头像与主题归档
- 以静态 HTML 形式部署到 GitHub Pages，方便在手机上随时阅读

相对原始版本，它的核心增强不只是“多了一个 HTML 输出”，而是把原本偏文档型的 digest，扩展成了一套可持续生成、可归档、可部署的在线刊物系统。

最终形态是：

- 首页封面 + 往期目录
- 每期独立详情页
- 中英文对照阅读
- `速读 / 原文` 双视图
- GitHub Pages 静态托管

这样每天内容更新后，只要打开网页，就能在手机上直接阅读最新一期。

---

## 项目定位

相对原始 `Follow Builders`，本项目做的不是“外层套一个网页壳”，而是把它进一步改造成一套：

- 可持续生成
- 可归档
- 可部署
- 更适合杂志化阅读
- 更适合手机端浏览

的双语静态刊物系统。

一句话概括：

> 从内容摘要工具，升级为可持续生成、可归档、可部署、具有杂志化阅读体验的 AI Builders 双语在线杂志。

---

## 相对原始版本的增强项

### 1. Prompt 体系增强

原始 `Follow Builders` 更偏向生成摘要文本；本项目对 prompt 做了完整的内容表达优化。

目前公开可见并已参与改造的 prompt 包括：

- `digest-intro.md`
- `digest-intro-feishu-doc.md`
- `digest-intro-html.md`
- `summarize-tweets.md`
- `summarize-podcast.md`
- `translate.md`

增强方向包括：

- 把文风从“高信息密度科技摘要”升级为：
  - 有资深科技编辑的判断力
  - 但讲法更像懂行的朋友
- 强调“先讲清楚，再下判断”
- 降低抽象黑话密度
- 增强中文可读性
- 为 HTML 杂志页提供独立的输出指令

---

### 2. 输出形态增强

原始版本更偏文档型 digest；本项目扩展为完整静态网页刊物。

新增能力包括：

- 首页 `index.html`
- 每期 HTML 详情页
- 首页与详情页之间的导航关系
- 更适合浏览器和手机端的阅读结构

每期页面支持：

- 编者导语
- 按主题分区
- 作者信息展示
- 作者头像
- 中英文对照
- `速读 / 原文` 双视图切换
- 原始链接跳转

---

### 3. 阅读体验与视觉增强

项目增加了一套更接近“在线杂志”的视觉系统，而不是仅仅导出阅读文本。

增强包括：

- 首页封面设计
- 往期目录区
- 刊头、期号、统计信息
- 封面头像云
- 头像呼吸感动画
- 作者头像点击跳转
- 日报页“返回目录”导航
- 响应式布局与手机阅读优化

---

### 4. 数据结构增强

原始版本更接近“直接生成摘要结果”，本项目将内容重构为适合网页渲染的数据模型。

当前已形成结构化 JSON 输入层，例如：

- `ai-builders-digest.example.json`
- `ai-builders-digest-2026-05-20.json`
- `ai-builders-digest-2026-05-21.json`

数据结构覆盖：

- 日期 / 标题 / 期号
- 编者导语
- 主题分区
- 内容卡片
- 作者信息
- 中英文 `rewrite / original`
- 来源链接

这使得页面生成从“手工拼接”变成“数据驱动渲染”。

---

### 5. 构建链路增强

本项目新增了专门的 HTML 渲染链路。

核心脚本：

- `render-ai-builders-digest.js`

当前能力包括：

- 从 JSON 自动生成完整 HTML 页面
- 自动计算期号
- 自动生成统计栏
- 自动注入作者身份信息
- 自动映射作者头像
- 自动复制当期所需头像资源

---

### 6. 静态资源与部署能力增强

为了让页面可发布到 GitHub Pages，本项目补齐了静态资源体系。

新增内容包括：

- 站点头像目录：`assets/avatars/`
- 头像同步脚本：`sync-site-avatars.js`
- 站内相对路径资源引用
- 适配静态站点部署的资源组织方式

这让页面从“本地可看”变成了“可静态托管”。

---

### 7. 归档能力增强

项目已从“单篇日报页”演进为“可连续归档的刊物站点”。

目前已接入统一模板的期数包括：

- `2026-05-19`
- `2026-05-20`
- `2026-05-21`

首页目录已经可以作为持续扩展的归档入口。

---

## 改造清单

### Prompt / 内容层

- 重写导语 prompt
- 重写 HTML 网页版导语 prompt
- 重写飞书文档版导语 prompt
- 优化推文摘要 prompt
- 优化播客摘要 prompt
- 优化翻译 prompt
- 统一整站语气为“编辑判断力 + 朋友式讲述”
- 降低中文表达中的抽象黑话密度
- 对现有期数的编者导语和正文中文进行一轮语气校准

### 页面 / 交互层

- 新增首页 `index.html`
- 新增封面视觉区
- 新增哲学说明 / 项目说明区
- 新增往期目录区
- 新增日报详情页模板
- 新增编者导语区
- 新增作者头像
- 新增作者身份标签展示
- 新增中英文双栏阅读结构
- 新增 `速读 / 原文` 双视图切换
- 新增首页与详情页之间的导航闭环
- 新增“返回目录”交互
- 新增移动端响应式优化
- 新增封面头像云与动画效果

### 数据 / 结构层

- 建立网页可消费的 JSON 数据模型
- 增加 example 数据文件
- 增加多期日报 JSON 文件
- 标准化 intro / sections / cards / bilingual content 结构
- 为多期持续生成提供统一输入格式

### 构建 / 脚本层

- 新增 `render-ai-builders-digest.js`
- 支持从 JSON 渲染完整 HTML
- 支持自动生成期号
- 支持自动生成统计栏
- 支持自动注入作者资料
- 支持自动解析与复制头像资源

### 资源 / 部署层

- 新增站点头像目录 `assets/avatars/`
- 新增 `sync-site-avatars.js`
- 将头像资源整理为站内静态资源
- 将资源路径改为适合静态站部署的相对路径
- 为 GitHub Pages 托管做好准备

### 内容归档层

- 已将多期日报接入统一模板
- 已完成多期页面重建
- 已完成首页目录接入
- 已完成编者导语重写
- 已完成一轮正文中文语气统一

---

## 当前目录结构

```text
.
├── index.html
├── assets/
│   └── avatars/
├── data/
│   └── issues/
│       ├── ai-builders-digest-2026-05-20.json
│       └── ai-builders-digest-2026-05-21.json
├── examples/
│   ├── ai-builders-digest.example.html
│   └── ai-builders-digest.example.json
├── issues/
│   ├── ai-builders-digest-2026-05-19-rerun.html
│   ├── ai-builders-digest-2026-05-20-rerun.html
│   └── ai-builders-digest-2026-05-21-rerun.html
├── launchd/
│   └── com.luolan.follow-builders-newsletter.plist.template
├── scripts/
│   ├── build-daily-newsletter-json.js
│   ├── install-launchd.sh
│   ├── publish-daily-newsletter.sh
│   ├── render-ai-builders-digest.js
│   └── update-index-archive.js
├── src/
│   ├── archive/
│   │   └── update-index-archive.js
│   └── render/
│       └── render-ai-builders-digest.js
└── sync-site-avatars.js
```

---

## 每日运行路径

这个项目计划中的日更路径是：

1. 从 `Follow Builders` 的原始 feed 数据端拉取最新内容
2. 经过一轮自动化整理与生成
3. 更新结构化 JSON / HTML 页面
4. 将最新页面发布到 GitHub
5. 通过 GitHub Pages 提供静态托管
6. 用户直接在网页端、尤其是手机端访问最新内容

也就是说，最终希望形成这样一条稳定链路：

```text
Follow Builders feed
  -> 内容整理 / 改写
  -> 结构化 JSON
  -> HTML 杂志页
  -> GitHub
  -> GitHub Pages
  -> 手机端阅读
```

---

## 当前内容更新方式

当前项目已经具备下面这条核心生成链：

```bash
node sync-site-avatars.js
node scripts/render-ai-builders-digest.js <input.json> <output.html>
```

示例：

```bash
node scripts/render-ai-builders-digest.js data/issues/ai-builders-digest-2026-05-20.json issues/ai-builders-digest-2026-05-20-rerun.html
node scripts/render-ai-builders-digest.js data/issues/ai-builders-digest-2026-05-21.json issues/ai-builders-digest-2026-05-21-rerun.html
```

为了让项目结构更清楚：

- `src/` 放核心 JavaScript 逻辑
- `scripts/` 放运行入口与自动化命令
- `data/issues/` 放每日结构化 JSON 数据
- `issues/` 放最终发布到 GitHub Pages 的 HTML 页面
- `examples/` 放示例输入与示例输出
- 首页 `index.html` 只负责封面和目录跳转

---

## 自动发布链路（V1）

目前已经补上本机自动发布的第一版链路，思路是：

```text
08:00 / 08:30 / 08:50 / 10:00 / 11:00 / 12:00 / 16:00 launchd 多次触发
  -> scripts/run-scheduled-newsletter-publisher.sh
  -> 自动补跑最近缺失日期
  -> 自动重试瞬时失败
  -> 成功后后续触发自动跳过
  -> scripts/publish-daily-newsletter.sh
  -> OpenClaw 读取最新 Follow Builders feed
  -> 生成当天 ai-builders-digest-YYYY-MM-DD.json
  -> render-ai-builders-digest.js 渲染 HTML
  -> sync-site-avatars.js 同步站内头像资源
  -> scripts/update-index-archive.js 更新首页目录
  -> git commit
  -> git push origin main
  -> GitHub Pages 自动刷新
```

这意味着，后续的日更不再只是“生成内容”，而是直接走到“生成页面并发布上线”。

### 相关脚本

- `scripts/build-daily-newsletter-json.js`  
  负责调用 OpenClaw，根据最新 Follow Builders feed 生成当天的结构化 issue JSON。

- `scripts/publish-daily-newsletter.sh`  
  每日总控脚本。负责拉最新 feed、调用 agent 生成 JSON、渲染 HTML、更新首页、提交并推送。

- `scripts/run-scheduled-newsletter-publisher.sh`  
  定时调度包装脚本。负责早间尝试、白天补跑、失败重试，以及成功后的自动跳过。

- `scripts/update-index-archive.js`  
  根据现有 issue JSON 自动重建首页 archive 列表；已有旧条目也会被保留。

- `scripts/install-launchd.sh`  
  将 `launchd` 模板安装到 `~/Library/LaunchAgents/`，注册早间尝试与白天补跑任务。

- `launchd/com.luolan.follow-builders-newsletter.plist.template`  
  本机定时任务模板。安装时会自动替换成本地仓库路径。

### 手动试跑

如果想先手动跑一遍当天链路：

```bash
bash scripts/publish-daily-newsletter.sh
```

如果只想验证渲染和归档更新，不触发 agent、不推送 GitHub：

```bash
SKIP_AGENT=1 SKIP_PUSH=1 SKIP_GIT_PULL=1 NEWSLETTER_DATE=2026-05-21 bash scripts/publish-daily-newsletter.sh
```

### 安装自动发布定时任务

```bash
bash scripts/install-launchd.sh
```

安装完成后，系统会在每天 `08:00 / 08:30 / 08:50 / 10:00 / 11:00 / 12:00 / 16:00`（`Asia/Shanghai`）自动执行发布脚本，并在开机/登录后立即补跑一次。

---

## 部署目标

本项目接下来的部署目标是：

- 将增强版 `Follow Builders` 项目推送到 GitHub
- 将 HTML 页面和静态资源一起托管到 GitHub
- 使用 GitHub Pages 提供公开静态访问
- 让日报更新后，可以直接通过网页查看最新内容

这也是本项目相比原始版本最重要的一步：  
从“生成内容”走向“持续发布与访问”。

---

## 后续方向

- 接入更多日期与连续期数
- 持续优化每日选题和摘要质量
- 将本机定时链路继续抽象为更易迁移的发布方案
- 视需要补充失败告警与运行日志观察

