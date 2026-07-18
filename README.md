# PersonalWeb

## English

This repository contains the split, maintainable version of Wei Wang's academic homepage. The original single-file draft is kept locally as `PersonalWeb.txt`; the website entry point is `index.html`, and the page content is loaded directly from the files in `sections/`.

### File Structure

- `index.html`: static page shell, navigation bar, search box, footer, external libraries, and shared Tailwind styles.
- `sections/home.html`: profile, CV link, academic profiles, and contact information.
- `sections/cv.html`: brief CV and full CV download link.
- `sections/research.html`: research interests, collaborators, published papers, and preprints.
- `sections/teaching.html`: teaching experience.
- `sections/talks.html`: conference talks, seminar talks, and posters.
- `sections/notes.html`: notes and expository papers.
- `assets/css/site.css`: small layout patches that should not override the original visual style.
- `assets/js/site.js`: loads section files, page switching, search, and dark mode.
- `assets/teaching/`: local teaching notes, slides, answers, and solutions grouped by course.
- `assets/notes/`: local notes and expository paper PDFs grouped by topic.
- `assets/talks/`: local talk, slide, schedule, and poster materials grouped by event.
- `scripts/build_site.py`: resets the `index.html` content placeholder and checks that all section files exist.
- `sitemap.xml` and `robots.txt`: search-engine hints for the public GitHub Pages URL.

### Local Preview

The published page is a static `index.html`. A local server is still recommended for previewing the same behavior as GitHub Pages.

```powershell
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

### Maintenance

Update the corresponding section file directly. For example, add new papers in `sections/research.html`, new teaching records in `sections/teaching.html`, and new talks in `sections/talks.html`. After pushing those section files, the website reads them directly; you do not need to edit or rebuild `index.html`.

Only edit `assets/css/site.css` or `assets/js/site.js` when changing global layout or behavior.

The canonical public URL is:

```text
https://brookww.github.io/WeiWANGmath.github.io/
```

## 中文版

本仓库存放 Wei Wang 学术个人主页的拆分维护版。原始单文件草稿在本地保留为 `PersonalWeb.txt`；网站入口文件为 `index.html`，页面正文会直接从 `sections/` 里的栏目文件读取。

### 文件结构

- `index.html`：静态页面外壳，包含导航栏、搜索框、页脚、第三方资源和公共 Tailwind 样式。
- `sections/home.html`：个人简介、CV 链接、学术主页链接和联系方式。
- `sections/cv.html`：简版 CV 和完整 CV 下载链接。
- `sections/research.html`：研究兴趣、合作者、已发表论文和预印本。
- `sections/teaching.html`：教学经历。
- `sections/talks.html`：会议报告、讨论班报告和海报展示。
- `sections/notes.html`：讲义、读书笔记和综述材料。
- `assets/css/site.css`：少量布局补丁，不覆盖原始视觉风格。
- `assets/js/site.js`：读取栏目文件、页面切换、搜索和深色模式。
- `assets/teaching/`：按课程分组保存本地讲义、课件、答案和习题解答。
- `assets/notes/`：按主题分组保存本地 notes 和综述 PDF。
- `assets/talks/`：按报告或展示活动分组保存本地 slides、日程和 poster 材料。
- `scripts/build_site.py`：重置 `index.html` 的内容占位，并检查所有栏目文件是否存在。
- `sitemap.xml` 和 `robots.txt`：给搜索引擎使用的公开 GitHub Pages 地址提示。

### 本地预览

发布出来的页面是静态 `index.html`。仍然建议通过本地服务器预览，这样和 GitHub Pages 上的行为一致。

```powershell
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

### 维护方式

更新内容时直接修改对应栏目文件。例如，新增论文请改 `sections/research.html`，新增课程请改 `sections/teaching.html`，新增报告请改 `sections/talks.html`。这些栏目文件 push 之后，网页会直接读取它们；不需要再修改或重新生成 `index.html`。

只有在调整全局布局或交互行为时，才需要修改 `assets/css/site.css` 或 `assets/js/site.js`。

当前规范公开地址是：

```text
https://brookww.github.io/WeiWANGmath.github.io/
```
