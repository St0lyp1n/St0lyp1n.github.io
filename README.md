# Stolypin · 数字花园

一个基于现有 Hugo / PaperMod 仓库重新设计的个人博客 demo。

**正式地址：https://st0lyp1n.github.io/**

## 功能

- 首页、文章、随记、项目、书架、相册、友邻、关于、近况、归档。
- 中文全文搜索，支持标题、正文、标签与随记；Ctrl/Cmd+K 或 `/` 唤起。
- 分类/标签浏览、即时筛选、标题筛选、时间/标题排序。
- 文章目录、滚动进度、阅读时间、字号调节、专注模式、代码复制、公式、分享链接、相关文章。
- 阅读收藏与 JSON 导出；收藏、主题、字号保存在当前浏览器。
- 按需加载 Giscus 评论，沿用仓库原来的 GitHub Discussions 配置。
- 深浅色主题、响应式侧栏、键盘可达、原生对话框、减少动画偏好、打印样式。
- 随记分类、书架状态筛选与札记、相册灯箱。
- 实验室：25/5 分钟计时器、HEX 配色复制、Markdown 草稿预览/自动保存/下载、交互终端。
- RSS、站点地图、canonical、Open Graph 基础元数据、自定义 favicon 与 404 页。
- 核心页面不依赖外部字体或 JavaScript CDN；照片保存在仓库中。

## 本地运行

安装 Hugo **0.160.1** 或兼容版本。项目无 npm 运行依赖。

```bash
hugo server -D
```

访问终端显示的地址（默认 `http://localhost:1313`）。

```bash
hugo --gc --minify
node scripts/verify-site.mjs public
```

校验脚本检查全部生成 HTML 的本地链接、锚点、图片、搜索索引与 RSS。Node 18+ 即可执行。

## 写一篇文章

在 `content/posts/` 新建 Markdown：

```yaml
---
title: 我的新文章
date: 2026-10-07T10:00:00+08:00
description: 一句话介绍这篇文章。
categories: [技术]
tags: [Hugo, 笔记]
draft: false
math: false
---
```

正文支持标准 Markdown、代码块和表格。`math: true` 会按需加载 MathJax，支持行内 `$...$` 与块级 `$$...$$`。不要在不受信任的投稿中直接允许原始 HTML；当前内容由仓库作者维护。

演示版设置了 `buildFuture: true`，让固定演示日期在不同构建环境中都能显示。如果以后需要定时发布文章，请改为 `false`。

## 修改内容与外观

| 内容 | 文件 |
| --- | --- |
| 站名、域名、简介、评论配置 | `hugo.yaml` |
| 首页介绍和侧栏 | `layouts/index.html`、`layouts/_default/baseof.html` |
| 关于、近况 | `content/about.md`、`content/now.md` |
| 文章 | `content/posts/*.md` |
| 随记、书籍、项目、相册、友邻 | `data/garden.json` |
| 色彩、字号、响应式布局 | `assets/css/garden.css` |
| 搜索、收藏、实验室等交互 | `assets/js/garden.js` |
| 图片 | `static/images/` |

原始 Hello World 内容保留。新增 8 篇文章、6 则随记、6 本书的状态与近况均为明确标注的演示内容，请在真实使用前按需替换。没有编造学历、职业或访问统计。相册素材来自 Unsplash，页面逐一附来源，不代表原创摄影。

## 发布

现有 `.github/workflows/hugo.yaml` 会在推送 `main` 时构建并发布到 GitHub Pages。
仓库应为 `St0lyp1n/St0lyp1n.github.io`，Settings → Pages → Source 使用 **GitHub Actions**。
不要添加 CNAME；这里使用 GitHub 自带的 `st0lyp1n.github.io` 域名。

## 隐私与限制

- 本地存储不等于云备份；清除站点数据会清除收藏与草稿，不跨设备同步。
- 计时器用截止时间校正后台节流，但刷新或离开页面会重置，不发送系统通知。
- 搜索在本地静态索引执行，不上传搜索词，无跟踪脚本。
- Markdown 草稿纸为轻量子集，不是完整 CommonMark 编辑器；不执行输入的 HTML。
- Giscus 需要网络、对应 Discussions 分类及安装授权。只有手动点击后加载；评论写入由用户在 Giscus 内完成。
- 数学公式依赖 MathJax CDN；离线时显示公式原文。其余核心功能不依赖该 CDN。
- 移动端侧栏不显示时移出键盘导航；所有弹窗可按 Esc 关闭。

## 验证

完成桌面 1440px 与手机 390px 的真实浏览器检查：搜索键盘导航、筛选/排序、收藏持久化、主题持久化、文章阅读设置、书架/随记筛选、相册灯箱、计时、配色、Markdown 持久化与 HTML 转义、终端及移动导航。发布前另检查生成站点的链接与 RSS。

浏览器回归脚本为 `scripts/browser-checks.cjs`，需环境中提供 Playwright 与 Chromium（或通过 `BROWSER_EXECUTABLE` 指定 Edge/Chrome）。`BLOG_BASE_URL` 默认 `http://127.0.0.1:1313`，截图保存在忽略的 `.artifacts/` 目录。运行 `node scripts/browser-checks.cjs` 即可复现。

主题上游 PaperMod 保留在 `themes/PaperMod`，自定义模板在项目 `layouts` 中覆盖。旧扩展文件不参与新的页面样式加载，可用于回溯原版。第三方主题的许可证见其目录。
