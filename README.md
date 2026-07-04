# PersonalWeb

## English

This repository contains the split, maintainable version of Wei Wang's academic homepage. The original single-file draft is kept locally as `PersonalWeb.txt`; the website entry point is `index.html`.

### File Structure

- `index.html`: generated static page, navigation bar, search box, footer, external libraries, shared Tailwind styles, and embedded section content.
- `sections/home.html`: profile, CV link, academic profiles, and contact information.
- `sections/research.html`: research interests, collaborators, published papers, and preprints.
- `sections/teaching.html`: teaching experience.
- `sections/talks.html`: conference talks, seminar talks, and posters.
- `sections/notes.html`: notes and expository papers.
- `assets/css/site.css`: small layout patches that should not override the original visual style.
- `assets/js/site.js`: page switching, search, and dark mode.
- `scripts/build_site.py`: rebuilds `index.html` from the files in `sections/`.
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

Update the corresponding section file whenever possible. For example, add new papers in `sections/research.html`, new teaching records in `sections/teaching.html`, and new talks in `sections/talks.html`.

After editing any file in `sections/`, rebuild `index.html`:

```powershell
python scripts/build_site.py
```

Only edit `assets/css/site.css` or `assets/js/site.js` when changing global layout or behavior.

The canonical public URL is:

```text
https://brookww.github.io/WeiWANGmath.github.io/
```

## 中文版

本仓库存放 Wei Wang 学术个人主页的拆分维护版。原始单文件草稿在本地保留为 `PersonalWeb.txt`；网站入口文件为 `index.html`。

### 文件结构

- `index.html`：生成后的静态页面，包含导航栏、搜索框、页脚、第三方资源、公共 Tailwind 样式和内嵌栏目内容。
- `sections/home.html`：个人简介、CV 链接、学术主页链接和联系方式。
- `sections/research.html`：研究兴趣、合作者、已发表论文和预印本。
- `sections/teaching.html`：教学经历。
- `sections/talks.html`：会议报告、讨论班报告和海报展示。
- `sections/notes.html`：讲义、读书笔记和综述材料。
- `assets/css/site.css`：少量布局补丁，不覆盖原始视觉风格。
- `assets/js/site.js`：页面切换、搜索和深色模式。
- `scripts/build_site.py`：根据 `sections/` 里的栏目文件重新生成 `index.html`。
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

更新内容时优先修改对应栏目文件。例如，新增论文请改 `sections/research.html`，新增课程请改 `sections/teaching.html`，新增报告请改 `sections/talks.html`。

修改 `sections/` 里的任意文件后，请重新生成 `index.html`：

```powershell
python scripts/build_site.py
```

只有在调整全局布局或交互行为时，才需要修改 `assets/css/site.css` 或 `assets/js/site.js`。

当前规范公开地址是：

```text
https://brookww.github.io/WeiWANGmath.github.io/
```
