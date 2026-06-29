# PersonalWeb / 个人主页

This repository contains the split, maintainable version of Wei Wang's academic homepage. The original single-file draft is kept locally as `PersonalWeb.txt`; the website entry point is `index.html`.

本仓库存放 Wei Wang 学术个人主页的拆分维护版。原始单文件草稿在本地保留为 `PersonalWeb.txt`；网站入口文件为 `index.html`。

## File Structure / 文件结构

- `index.html`: page shell, navigation bar, search box, footer, external libraries, and shared Tailwind styles.
- `index.html`：页面外壳、导航栏、搜索框、页脚、第三方资源以及公共 Tailwind 样式。
- `sections/home.html`: profile, CV link, academic profiles, and contact information.
- `sections/home.html`：个人简介、CV 链接、学术主页链接和联系方式。
- `sections/research.html`: research interests, collaborators, published papers, and preprints.
- `sections/research.html`：研究兴趣、合作者、已发表论文和预印本。
- `sections/teaching.html`: teaching experience.
- `sections/teaching.html`：教学经历。
- `sections/talks.html`: conference talks, seminar talks, and posters.
- `sections/talks.html`：会议报告、讨论班报告和海报展示。
- `sections/notes.html`: notes and expository papers.
- `sections/notes.html`：讲义、读书笔记和综述材料。
- `assets/css/site.css`: small layout patches that should not override the original visual style.
- `assets/css/site.css`：少量布局补丁，不覆盖原始视觉风格。
- `assets/js/site.js`: section loading, page switching, search, and dark mode.
- `assets/js/site.js`：栏目加载、页面切换、搜索和深色模式。

## Local Preview / 本地预览

The split version loads files from `sections/` with JavaScript, so open it through a local server instead of double-clicking `index.html`.

拆分版会通过 JavaScript 加载 `sections/` 里的栏目文件，因此请通过本地服务器预览，不要直接双击打开 `index.html`。

```powershell
python -m http.server 8000
```

Then visit:

然后访问：

```text
http://localhost:8000
```

## Maintenance / 维护方式

Update the corresponding section file whenever possible. For example, add new papers in `sections/research.html`, new teaching records in `sections/teaching.html`, and new talks in `sections/talks.html`.

更新内容时优先修改对应栏目文件。例如，新增论文请改 `sections/research.html`，新增课程请改 `sections/teaching.html`，新增报告请改 `sections/talks.html`。

Only edit `assets/css/site.css` or `assets/js/site.js` when changing global layout or behavior.

只有在调整全局布局或交互行为时，才需要修改 `assets/css/site.css` 或 `assets/js/site.js`。
