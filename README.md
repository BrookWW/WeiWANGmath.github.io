# PersonalWeb

## English

This repository contains Wei Wang's academic homepage and blog. The website entry point is `index.html`; editable page content lives in `sections/` and is compiled into the entry point before publication. The blog has its own static listing at `blog/` and independent article URLs at `blog/<slug>/`.

### File Structure

- `index.html`: compiled static page, navigation bar, search interface, and footer.
- `sections/home.html`: profile, CV link, academic profiles, and contact information.
- `sections/cv.html`: brief CV and full CV download link.
- `sections/research.html`: research interests, collaborators, published papers, and preprints.
- `sections/teaching.html`: teaching experience.
- `sections/talks.html`: conference talks, seminar talks, and posters.
- `sections/notes.html`: notes and expository papers.
- `blog/posts.json`: blog metadata, including titles, dates, summaries, tags, and Markdown source filenames.
- `blog/content/*.md`: editable blog article sources.
- `blog/index.html` and `blog/<slug>/index.html`: generated blog listing and individual article pages.
- `blog/feed.xml` and `blog/search-index.json`: generated RSS feed and blog search data.
- `assets/css/site.css`: the main site's visual system and responsive layouts.
- `assets/css/ocean.css`: the main site's blue-white daytime and blue-black nighttime ocean theme.
- `assets/css/blog.css`: independent, responsive blog and reading-page styles.
- `assets/js/site.js`: page switching, search, navigation, and dark mode.
- `assets/js/blog.js`: blog theme, mobile navigation, search and tag filtering, reading progress, code copying, and diagram enlargement.
- `assets/cv/`: the current full academic CV in PDF format.
- `assets/teaching/`: local teaching notes, slides, answers, and solutions grouped by course.
- `assets/notes/`: local notes and expository paper PDFs grouped by topic.
- `assets/talks/`: local talk, slide, schedule, and poster materials grouped by event.
- `assets/blog/`: blog diagrams, cover illustrations, and attached source PDFs grouped by article.
- `requirements-blog.txt`: Python dependencies used to build the blog.
- `scripts/build_site.py`: builds the blog, validates the section files, and compiles the main page and its blog search data into `index.html`.
- `scripts/build_blog.py`: converts Markdown and LaTeX mathematics into static article HTML and native MathML, and generates the blog listing, feed, search data, and sitemap.
- `scripts/check_site.py`: checks the generated static site before publication.
- `sitemap.xml` and `robots.txt`: search-engine hints for the public GitHub Pages URL.

### Local Preview

The published site consists of static HTML and local assets, with no runtime framework. Article mathematics is rendered as native MathML at build time; readers do not need a mathematics-rendering script. A local server is recommended for previewing the same behavior as GitHub Pages.

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
http://localhost:8000/blog/
```

### Maintenance

Update the corresponding section file directly. For example, add new papers in `sections/research.html`, new teaching records in `sections/teaching.html`, and new talks in `sections/talks.html`.

For a blog article, write its Markdown source in `blog/content/`, add an entry in `blog/posts.json` with a unique `slug` and the source filename, and place any diagrams or source PDFs in `assets/blog/<slug>/`. Update these sources rather than editing generated article HTML. The build generates the single-column listing, independent article pages, RSS feed, and search data from this collection.

Install the build dependencies, then rebuild and check the site before committing:

```bash
python3 -m pip install -r requirements-blog.txt
python3 scripts/build_site.py
python3 scripts/check_site.py
```

Commit the content sources, generated pages, feed and search data, sitemap, and any required assets together. The generated pages can be served directly by GitHub Pages, including under the repository's URL prefix.

Change `assets/css/site.css`, `assets/css/ocean.css`, or `assets/js/site.js` for main-site layout and behavior; change `assets/css/blog.css` or `assets/js/blog.js` for blog presentation and interactions. The main site and blog share the saved light/dark theme. Blog content and links remain available without JavaScript.

The canonical public URL is:

```text
https://brookww.github.io/WeiWANGmath.github.io/
```

## 中文版

本仓库存放 Wei Wang 的学术个人主页与博客。网站入口为 `index.html`；可编辑的栏目正文保存在 `sections/`，发布前由构建脚本编译进入口文件。博客使用独立的静态列表页 `blog/`，每篇文章具有 `blog/<slug>/` 形式的真实路径。

### 文件结构

- `index.html`：编译后的静态页面，包含导航栏、搜索界面和页脚。
- `sections/home.html`：个人简介、CV 链接、学术主页链接和联系方式。
- `sections/cv.html`：简版 CV 和完整 CV 下载链接。
- `sections/research.html`：研究兴趣、合作者、已发表论文和预印本。
- `sections/teaching.html`：教学经历。
- `sections/talks.html`：会议报告、讨论班报告和海报展示。
- `sections/notes.html`：讲义、读书笔记和综述材料。
- `blog/posts.json`：博客元数据，包括标题、日期、摘要、标签及 Markdown 源文件名。
- `blog/content/*.md`：可编辑的博客正文源文件。
- `blog/index.html` 和 `blog/<slug>/index.html`：生成后的博客列表页与独立文章页。
- `blog/feed.xml` 和 `blog/search-index.json`：生成后的 RSS 订阅源与博客搜索数据。
- `assets/css/site.css`：主站视觉系统和响应式布局。
- `assets/css/ocean.css`：主站蓝白日间、蓝黑夜间的海洋主题。
- `assets/css/blog.css`：独立的博客列表、文章阅读页及响应式样式。
- `assets/js/site.js`：页面切换、搜索、导航和深色模式。
- `assets/js/blog.js`：博客主题、移动端导航、搜索与标签筛选、阅读进度、代码复制和图示放大。
- `assets/cv/`：当前完整版学术 CV PDF。
- `assets/teaching/`：按课程分组保存本地讲义、课件、答案和习题解答。
- `assets/notes/`：按主题分组保存本地 notes 和综述 PDF。
- `assets/talks/`：按报告或展示活动分组保存本地 slides、日程和 poster 材料。
- `assets/blog/`：按文章分组保存博客图示、封面和附带的原始 PDF。
- `requirements-blog.txt`：构建博客所需的 Python 依赖。
- `scripts/build_site.py`：构建博客、检查栏目文件，并将主站内容及博客搜索数据编译进 `index.html`。
- `scripts/build_blog.py`：将 Markdown 与 LaTeX 公式转换为静态 HTML 和原生 MathML，并生成博客列表、订阅源、搜索数据及站点地图。
- `scripts/check_site.py`：发布前检查生成后的静态站点。
- `sitemap.xml` 和 `robots.txt`：给搜索引擎使用的公开 GitHub Pages 地址提示。

### 本地预览

发布后的站点由静态 HTML 与本地资源组成，不依赖运行时框架。正文公式在构建时转换为原生 MathML，读者无需加载公式渲染脚本。建议通过本地服务器预览，使行为与 GitHub Pages 保持一致。

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000
http://localhost:8000/blog/
```

### 维护方式

更新内容时直接修改对应栏目文件。例如，新增论文请改 `sections/research.html`，新增课程请改 `sections/teaching.html`，新增报告请改 `sections/talks.html`。

新增博客时，在 `blog/content/` 编写 Markdown 正文，在 `blog/posts.json` 添加包含唯一 `slug` 和源文件名的条目，并将图示或原始 PDF 放入 `assets/blog/<slug>/`。维护这些源文件，不直接修改生成后的文章 HTML。构建脚本会根据文章集合生成单列列表、独立正文页、RSS 订阅源和搜索数据。

安装构建依赖后，在提交前重新构建并检查：

```bash
python3 -m pip install -r requirements-blog.txt
python3 scripts/build_site.py
python3 scripts/check_site.py
```

将内容源文件、生成后的页面、订阅源与搜索数据、站点地图和所需资源一起提交。生成结果可以直接由 GitHub Pages 托管，并兼容仓库名称作为 URL 前缀的部署方式。

主站布局与交互由 `assets/css/site.css`、`assets/css/ocean.css` 和 `assets/js/site.js` 维护；博客样式与交互由 `assets/css/blog.css` 和 `assets/js/blog.js` 维护。主站与博客共用已保存的明暗主题设置。即使禁用 JavaScript，博客正文及链接仍然可用。

当前规范公开地址是：

```text
https://brookww.github.io/WeiWANGmath.github.io/
```
