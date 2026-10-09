# Stolypin · 数字花园

个人博客与本地 Markdown 写作台，基于 Hugo 构建，发布到 GitHub Pages。

- [访问博客](https://st0lyp1n.github.io/)
- [打开写作台](https://st0lyp1n.github.io/studio/)
- [写作与导入指南](docs/WRITING.md)
- [项目结构与维护指南](docs/ARCHITECTURE.md)

## 写作台

直接拖入一个或多个 `.md` / `.markdown` 文件，编辑正文并实时预览。支持 YAML / TOML 文章信息、标题与标签编辑、格式工具栏、撤销重做、同步滚动、手机预览和专注模式。

草稿在当前浏览器自动保存，支持搜索、复制、删除、Markdown 导出和完整 JSON 备份恢复。导入同名文件不会覆盖已有草稿；导出保留原有额外字段与未修改的时间戳。预览支持表格、任务列表和代码块，过滤危险 HTML，默认阻止远程图片请求。

**写作台是本地编辑器。** 文件不会自动上传，草稿不会跨设备同步。发布时将导出的 Markdown 放入 `content/posts/`，确认 `draft: false` 后提交仓库。清除浏览器数据前请导出备份。

## 阅读与探索

- 简洁首页、文章筛选排序、全站搜索、分类与标签。
- 阅读收藏、文章目录、进度条、字号调整、专注阅读、代码复制、分享。
- 深浅色主题、手机导航、键盘操作、减少动画偏好与打印样式。
- 随记、项目、书架、相册、友邻、近况、归档统一从“逛逛花园”进入。
- 小工具：番茄钟、配色复制、轻量草稿纸、交互终端。
- 按需加载 Giscus 评论与 MathJax 公式，RSS、站点地图与基础 SEO。

## 本地运行

需要 **Node.js 20+** 和 **Hugo 0.160.1**。将 Hugo 加入 PATH，或放在 `.tools/hugo/`；也可通过 `HUGO_BINARY` 指定路径。

```bash
npm ci
npm run dev
```

打开 `http://127.0.0.1:1313`。修改模板、样式与内容会自动刷新。

```bash
npm test                 # 导入、导出与备份模型测试
npm run build            # 构建到 public/
npm run check            # 校验生成页面、链接、图片、索引与 RSS
npx playwright install chromium
npm run test:browser     # 桌面与手机真实浏览器交互测试
npm run format:check     # 格式检查
```

浏览器测试会自动启动预览服务。可用 `BROWSER_EXECUTABLE` 指定 Edge / Chrome，用 `BLOG_BASE_URL` 指定已运行的站点。测试报告保存在 `.artifacts/playwright-report/`，不提交到仓库。

## 从哪里修改

| 内容                         | 位置                                                     |
| ---------------------------- | -------------------------------------------------------- |
| 域名、站名、评论配置         | `hugo.yaml`                                              |
| 文章与页面正文               | `content/`                                               |
| 随记、书籍、项目、照片、友邻 | `data/garden/` 下的独立 JSON                             |
| 侧栏导航                     | `data/navigation.json`                                   |
| 首页                         | `layouts/index.html`                                     |
| 页头、侧栏、页脚与弹窗       | `layouts/partials/shell/`                                |
| 各内容页面                   | `layouts/partials/pages/`                                |
| 样式与设计变量               | `assets/css/`，基础变量在 `base.css`                     |
| 搜索、收藏、阅读等交互       | `assets/js/features/`                                    |
| 写作台界面逻辑与数据模型     | `assets/js/pages/studio.js`、`assets/js/studio/model.js` |
| 图片与示例文件               | `static/images/`、`static/examples/`                     |

公共脚本与页面脚本分别打包，写作台依赖只在进入写作台时加载。PaperMod 上游保留在 `themes/PaperMod/`，自定义设计由项目内的模板覆盖。

## 部署

推送 `main` 后，GitHub Actions 安装锁定依赖，完成格式、单元、浏览器测试和静态站点检查，再部署 GitHub Pages。PR 只执行检查。

仓库为 `St0lyp1n/St0lyp1n.github.io`，Pages 的 Source 使用 **GitHub Actions**。域名已配置为 `https://st0lyp1n.github.io/`，无需 CNAME。

## 内容与限制

原始 Hello World 保留。新增文章、随记、书籍状态与近况属于已标注的演示内容，请按需替换；相册为附来源的 Unsplash 素材，不代表原创摄影。演示配置 `buildFuture: true`；需要定时发布时请改为 `false`。

搜索与草稿在本地处理，无访问跟踪。评论手动加载后连接 Giscus，公式文章使用 MathJax CDN。写作台不会运行 Hugo shortcode 或数学排版，最终效果以 Hugo 预览为准；小工具中的草稿纸保留轻量 Markdown 子集。

第三方主题许可证在主题目录，浏览器依赖许可证在 `static/licenses/`。
