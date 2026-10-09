# 项目结构

网站继续使用 Hugo。内容、模板、样式、交互和验证分别维护，不需要切换到新的前端框架。

```text
assets/
  css/                   按布局与页面组织的样式
    base.css             色彩变量、字体与基础元素
    navigation.css       侧栏
    home.css             首页与共享卡片
    writing.css          文章列表
    article.css          正文、目录、阅读工具
    collections.css      书架、相册、随记等
    dialogs.css          搜索、终端、照片弹窗
    responsive.css       原有响应式规则
    refinements.css      第二版导航与阅读界面调整
    studio.css           仅写作台加载的样式
  js/
    main.js              全站功能入口
    core/                DOM、存储、下载、文件读取、Markdown 渲染
    features/            搜索、导航、收藏、筛选、阅读、终端、相册
    pages/               独立页面入口：lab / studio
    studio/model.js      不依赖 DOM 的导入、导出、校验与数据模型
content/
  posts/                 Markdown 文章
  *.md                   栏目元信息
data/
  navigation.json        侧栏分组和链接
  garden/
    books.json           书架
    links.json           友邻
    notes.json           随记
    photos.json          相册
    projects.json        项目
layouts/
  _default/baseof.html   页面骨架
  _default/studio.html   写作台页面结构
  _default/single.html   文章详情
  _default/list.html     文章列表、分类与标签内容
  partials/shell/        head / sidebar / topbar / footer / dialogs
  partials/pages/        各独立栏目的内容模板
static/
  images/                本地图片
  examples/              可导入的 Markdown 示例
  licenses/              浏览器依赖的许可文本
scripts/
  hugo.mjs               跨平台 Hugo 启动器
  verify-site.mjs        静态产物完整性校验
tests/
  unit/                  文章解析、导出、备份与输入安全
  browser/               桌面、手机上的真实用户流程
docs/                    架构与写作说明
themes/PaperMod/         保留的上游主题文件
```

## 数据和构建流程

Hugo 读取 `content` 和 `data`，通过 `layouts` 输出 HTML。Hugo 自带的 esbuild 将 `assets/js/main.js` 打包，依赖版本由 `package-lock.json` 锁定。

`lab.js` 只在小工具页加载，`studio.js` 只在写作台加载。Markdown、YAML/TOML 和 HTML 清理依赖不会加入普通文章页的脚本。样式使用 Hugo Resources 合并、压缩和指纹，不需要额外的 Sass/Go 工具链。

## 写作台数据流

1. 文件选择或拖放 → `readTextFile` 检查扩展名、大小和 UTF-8 编码。
2. `importMarkdown` 解析 YAML/TOML，将正文与文章信息分离，保留其他 front matter 字段。
3. 当前草稿保存在内存，输入事件更新模型；350ms 后尝试保存到 `garden-studio-v1`。
4. 预览通过 Marked 转换，再通过 DOMPurify 白名单清理。外部图片不会请求网络，原始 Markdown 不会被执行。
5. 导出前校验标题、日期、文件名与正文；生成 YAML front matter 的 `.md` 文件。

写作台不具备 GitHub 令牌、不上传草稿、不能直接修改仓库。导出、复制草稿、备份和恢复都是浏览器本地操作。所有恢复均采用合并方式，不替换已有草稿。同名导入采用独立 ID，文件名相同不意味着覆盖。

## 失败处理

- 存储配额不足：保留内存内容，显式提示导出，不显示“已保存”。
- 旧数据损坏：不覆盖原存储，当前会话仍可编辑并导出。
- 另一个标签页更新：暂停当前标签页自动保存，提示先备份再刷新。
- 批量导入部分失败：成功项保留，错误项逐项列出。
- 过长正文：完整保存与导出；预览只渲染前 150,000 字符，界面说明截断。

## 修改约定

- 普通栏目内容优先修改 Markdown 或 `data/garden`；不要把内容写进 JS。
- 增加交互放进 `features/`，页面专属逻辑放进 `pages/`。
- 解析/序列化逻辑放进 `studio/model.js` 并用单元测试验证。
- `npm run build && npm run check` 检查最终产物；`npm run test:browser` 检查真实交互。
- 未使用的旧自定义扩展已清理；主题上游文件保持独立，不与新样式混在一起。
