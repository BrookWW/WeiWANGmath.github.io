# PersonalWeb

## English

This repository contains the split, maintainable version of Wei Wang's academic homepage. The website entry point is `index.html`; editable page content lives in `sections/` and is compiled into the entry point before publication.

### File Structure

- `index.html`: compiled static page, navigation bar, search interface, and footer.
- `sections/home.html`: profile, CV link, academic profiles, and contact information.
- `sections/cv.html`: brief CV and full CV download link.
- `sections/research.html`: research interests, collaborators, published papers, and preprints.
- `sections/teaching.html`: teaching experience.
- `sections/talks.html`: conference talks, seminar talks, and posters.
- `sections/notes.html`: notes and expository papers.
- `assets/css/site.css`: complete visual system and responsive layouts.
- `assets/js/site.js`: page switching, search, navigation, and dark mode.
- `assets/cv/`: the current full academic CV in PDF format.
- `assets/teaching/`: local teaching notes, slides, answers, and solutions grouped by course.
- `assets/notes/`: local notes and expository paper PDFs grouped by topic.
- `assets/talks/`: local talk, slide, schedule, and poster materials grouped by event.
- `scripts/build_site.py`: validates the section files and compiles them into `index.html`.
- `sitemap.xml` and `robots.txt`: search-engine hints for the public GitHub Pages URL.

### Local Preview

The published page is a static `index.html`. A local server is recommended for previewing the same behavior as GitHub Pages.

```powershell
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

### Maintenance

Update the corresponding section file directly. For example, add new papers in `sections/research.html`, new teaching records in `sections/teaching.html`, and new talks in `sections/talks.html`. Then rebuild the static entry point before committing:

```bash
python3 scripts/build_site.py
```

Only edit `assets/css/site.css` or `assets/js/site.js` when changing global layout or behavior.

The canonical public URL is:

```text
https://brookww.github.io/WeiWANGmath.github.io/
```

## 中文版

本仓库存放 Wei Wang 学术个人主页的拆分维护版。网站入口为 `index.html`；可编辑的栏目正文保存在 `sections/`，发布前由构建脚本编译进入口文件。

### 文件结构

- `index.html`：编译后的静态页面，包含导航栏、搜索界面和页脚。
- `sections/home.html`：个人简介、CV 链接、学术主页链接和联系方式。
- `sections/cv.html`：简版 CV 和完整 CV 下载链接。
- `sections/research.html`：研究兴趣、合作者、已发表论文和预印本。
- `sections/teaching.html`：教学经历。
- `sections/talks.html`：会议报告、讨论班报告和海报展示。
- `sections/notes.html`：讲义、读书笔记和综述材料。
- `assets/css/site.css`：完整的视觉系统和响应式布局。
- `assets/js/site.js`：页面切换、搜索、导航和深色模式。
- `assets/cv/`：当前完整版学术 CV PDF。
- `assets/teaching/`：按课程分组保存本地讲义、课件、答案和习题解答。
- `assets/notes/`：按主题分组保存本地 notes 和综述 PDF。
- `assets/talks/`：按报告或展示活动分组保存本地 slides、日程和 poster 材料。
- `scripts/build_site.py`：检查栏目文件并将其编译进 `index.html`。
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

更新内容时直接修改对应栏目文件。例如，新增论文请改 `sections/research.html`，新增课程请改 `sections/teaching.html`，新增报告请改 `sections/talks.html`。修改后在提交前重新生成静态入口：

```bash
python3 scripts/build_site.py
```

只有在调整全局布局或交互行为时，才需要修改 `assets/css/site.css` 或 `assets/js/site.js`。

当前规范公开地址是：

```text
https://brookww.github.io/WeiWANGmath.github.io/
```
