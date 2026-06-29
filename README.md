# PersonalWeb

这是 Wei Wang 个人主页的拆分版。原始单文件保留在 `PersonalWeb.txt`，新版入口是 `index.html`。

## 文件结构

- `index.html`：页面外壳、导航栏、搜索框、页脚、第三方资源。
- `sections/home.html`：个人简介、CV、联系方式。
- `sections/research.html`：研究兴趣、合作者、论文和预印本。
- `sections/teaching.html`：教学经历。
- `sections/talks.html`：报告和海报。
- `sections/notes.html`：讲义和读书笔记。
- `assets/css/site.css`：公共视觉样式。
- `assets/js/site.js`：栏目加载、页面切换、搜索、深色模式。

## 本地预览

拆分版会用 JavaScript 加载 `sections/` 里的栏目文件，所以不要直接双击打开 `index.html`。在当前目录运行：

```powershell
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

## 维护建议

更新内容时优先只改对应栏目文件。例如新增论文就改 `sections/research.html`，新增课程就改 `sections/teaching.html`。只有改整体视觉或交互时才需要动 `assets/css/site.css` 或 `assets/js/site.js`。
