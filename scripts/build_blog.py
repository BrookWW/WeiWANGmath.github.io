"""Build static blog pages, LaTeX HTML, diagram pages, feeds, and search data."""

from __future__ import annotations

import html
import json
import math
import os
import re
import shutil
import subprocess
from datetime import date, datetime, time, timedelta, timezone
from email.utils import format_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, urlparse
from xml.sax.saxutils import escape as xml_escape

try:
    import markdown
except ImportError as error:
    raise SystemExit(
        "Blog dependencies are missing. Install requirements-blog.txt before building."
    ) from error


ROOT = Path(__file__).resolve().parents[1]
BLOG = ROOT / "blog"
BASE_URL = "https://brookww.github.io/WeiWANGmath.github.io/"
ASSET_VERSION = "20261028-nav-search"


class TextContent(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.skip = 0
        self.hidden_math_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag == "span":
            if self.hidden_math_depth or "katex-html" in dict(attrs).get("class", "").split():
                self.hidden_math_depth += 1
        if tag in {"annotation", "script", "style"}:
            self.skip += 1

    def handle_endtag(self, tag):
        if tag == "span" and self.hidden_math_depth:
            self.hidden_math_depth -= 1
        if tag in {"annotation", "script", "style"}:
            self.skip = max(0, self.skip - 1)

    def handle_data(self, data):
        if not self.skip and not self.hidden_math_depth:
            self.parts.append(data)


def plain_text(source: str) -> str:
    parser = TextContent()
    parser.feed(source)
    return " ".join(" ".join(parser.parts).split())


def text(value: object) -> str:
    return html.escape(str(value), quote=True)


def read_posts() -> list[dict]:
    posts = json.loads((BLOG / "posts.json").read_text(encoding="utf-8"))
    if not isinstance(posts, list):
        raise ValueError("blog/posts.json must be a list")
    seen: set[str] = set()
    for post in posts:
        for field in ("slug", "title", "summary", "date", "author", "category", "tags", "source"):
            if field not in post:
                raise ValueError(f"Missing blog metadata: {field}")
        slug = post["slug"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or slug in seen:
            raise ValueError(f"Invalid or duplicate post slug: {slug}")
        seen.add(slug)
        date.fromisoformat(post["date"])
        if post.get("updated"):
            date.fromisoformat(post["updated"])
        source = (BLOG / "content" / post["source"]).resolve()
        if not source.is_relative_to((BLOG / "content").resolve()) or not source.is_file():
            raise ValueError(f"Missing or invalid article source: {post['source']}")
        if not isinstance(post["tags"], list) or not all(isinstance(tag, str) for tag in post["tags"]):
            raise ValueError(f"Invalid tags for {slug}")
        for resource in ("source_pdf", "image"):
            if post.get(resource):
                path = (ROOT / post[resource]).resolve()
                if not path.is_relative_to(ROOT) or not path.is_file():
                    raise ValueError(f"Missing article resource: {post[resource]}")
        for repository in post.get("repositories", []):
            if urlparse(repository["url"]).scheme != "https":
                raise ValueError("Repository links must use HTTPS")
    return sorted(posts, key=lambda post: post["date"], reverse=True)


MATH_OR_CODE = re.compile(
    r"(?P<code>^```[^\n]*\n.*?^```[^\n]*$|^~~~[^\n]*\n.*?^~~~[^\n]*$|`+[^`\n]*`+)"
    r"|(?P<display>(?<!\\)\$\$[\s\S]*?(?<!\\)\$\$)"
    r"|(?P<inline>(?<![\\$])\$(?!\$)(?:\\.|[^$\n])+?(?<!\\)\$(?!\$))",
    re.MULTILINE | re.DOTALL,
)
DIAGRAM_LINK = re.compile(r'<a class="figure-link" href="(?P<href>[^"]+\.svg)"[^>]*><img[^>]*></a>')


def diagram_resource(href: str) -> Path:
    resource = (BLOG / "content" / href).resolve()
    if not resource.is_relative_to((ROOT / "assets/blog").resolve()):
        raise ValueError(f"Invalid diagram path: {href}")
    return resource


def generated_files() -> list[Path]:
    """Return the outputs written by the site builder for the published posts."""
    paths = {ROOT / "index.html", BLOG / "index.html", BLOG / "feed.xml",
             BLOG / "search-index.json", ROOT / "sitemap.xml"}
    for post in read_posts():
        paths.add(BLOG / post["slug"] / "index.html")
        source = (BLOG / "content" / post["source"]).read_text(encoding="utf-8")
        for match in DIAGRAM_LINK.finditer(source):
            resource = diagram_resource(match["href"])
            paths.update((resource, resource.with_suffix(".html")))
    return sorted(paths)


def protect_math(source: str) -> tuple[str, list[tuple[str, str, bool]]]:
    equations = []

    def replace_math(match):
        if match.group("code"):
            return match.group(0)
        block = bool(match.group("display"))
        delimiter = 2 if block else 1
        latex = html.unescape(match.group(0)[delimiter:-delimiter].strip())
        token = f"BLOGMATHPLACEHOLDER{len(equations):05d}END"
        equations.append((token, latex, block))
        return token

    protected = MATH_OR_CODE.sub(replace_math, source)
    if not equations:
        return protected, []
    node = os.environ.get("BLOG_NODE") or shutil.which("node")
    if not node:
        raise SystemExit("Node.js is required to build LaTeX HTML. Set BLOG_NODE if node is not on PATH.")
    result = subprocess.run(
        [node, str(ROOT / "scripts/render_math.cjs")],
        input=json.dumps([{"latex": latex, "display": block} for _, latex, block in equations]),
        text=True, capture_output=True, check=True,
    )
    rendered_equations = []
    markup_list = json.loads(result.stdout)
    if len(markup_list) != len(equations):
        raise ValueError("Mathematical renderer returned an unexpected equation count")
    for (token, _, block), markup in zip(equations, markup_list):
        if block:
            rendered = f'<div class="math-display" tabindex="0" aria-label="Mathematical expression">{markup}</div>'
        else:
            rendered = f'<span class="math-inline">{markup}</span>'
        rendered_equations.append((token, rendered, block))
    return protected, rendered_equations


def render_article(source: str) -> tuple[str, str]:
    source = inline_diagrams(source)
    protected, equations = protect_math(source)
    parser = markdown.Markdown(
        extensions=["extra", "sane_lists", "toc"],
        extension_configs={"toc": {"toc_depth": "2-3", "permalink": False}},
        output_format="html",
    )
    body = parser.convert(protected)
    toc = parser.toc
    for token, rendered, block in equations:
        if block:
            body = body.replace(f"<p>{token}</p>", rendered)
        body = body.replace(token, rendered)
        toc = toc.replace(token, rendered)
    if "BLOGMATHPLACEHOLDER" in body or "BLOGMATHPLACEHOLDER" in toc:
        raise ValueError("Unresolved mathematical expression")
    return body, toc


def inline_diagrams(source: str) -> str:
    def replace(match):
        resource = diagram_resource(match["href"])
        diagram_source = BLOG / "diagrams" / resource.parent.name / resource.name
        svg = diagram_source.read_text(encoding="utf-8")
        title = re.search(r'<title[^>]*>(.*?)</title>', svg).group(1)
        identifier = "diagram-" + resource.stem
        svg = svg.replace('<svg ', f'<svg id="{identifier}" class="diagram-canvas" ', 1)
        svg = re.sub(r'<style>(.*?)</style>', lambda style: '<style>' + re.sub(
            r'([^{}]+)\{', lambda rule: ', '.join(f'#{identifier} {selector.strip()}' for selector in rule[1].split(',')) + ' {',
            style[1],
        ) + '</style>', svg, flags=re.DOTALL)
        protected, equations = protect_math(svg)
        for token, markup, _ in equations:
            protected = protected.replace(token, markup)
        svg_assets = '<style>@import url("../../vendor/katex/katex.min.css"); .math-inline > .katex { font-size:1.05em; } foreignObject > div { column-gap:0.22em; }</style>'
        # Place document styles at the outer SVG level, after any nested math SVGs.
        exported_svg = protected.rsplit('</svg>', 1)[0] + svg_assets + '</svg>'
        resource.write_text(exported_svg, encoding="utf-8")
        original = resource.with_suffix(".html")
        original.write_text(f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | Wei Wang</title><link rel="stylesheet" href="../../vendor/katex/katex.min.css"><link rel="stylesheet" href="../../css/blog.css?v={ASSET_VERSION}"></head>
<body class="diagram-page"><main><a class="diagram-return" href="../../../blog/{resource.parent.name}/">← Back to article</a>{protected}</main></body></html>''', encoding="utf-8")
        return f'<a class="figure-link" href="{match["href"][:-4]}.html" target="_blank" rel="noopener" aria-label="Enlarge diagram: {text(html.unescape(title))}">{protected}</a>'

    return DIAGRAM_LINK.sub(replace, source)


def long_date(value: str) -> str:
    d = date.fromisoformat(value)
    return f"{d.strftime('%B')} {d.day}, {d.year}"


def header(root: str, blog_home: str) -> str:
    links = [("Home", "#home"), ("CV", "#cv"), ("Research", "#research"),
             ("Blog", None), ("Teaching", "#teaching"), ("Talks", "#talks"), ("Notes", "#notes")]
    nav = "\n".join(
        f'<a class="nav-link{" active" if target is None else ""}" href="{blog_home if target is None else root + target}"'
        + (' aria-current="page"' if target is None else "")
        + f'>{label}</a>' for label, target in links
    )
    return f'''<a class="skip-link" href="#main-content">Skip to content</a>
<div id="reading-progress" aria-hidden="true"></div>
<header class="blog-header">
  <div class="blog-shell header-inner">
    <a class="brand" href="{root}#home" aria-label="Wei Wang, academic homepage">Wei Wang</a>
    <div class="header-actions">
      <div class="blog-search-area js-only" data-search-source="{root}index.html">
        <button id="blog-search-toggle" class="icon-button" type="button" aria-label="Open search" aria-expanded="false" aria-controls="blog-search-shell"><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 5 5"></path></svg></button>
        <div class="blog-search-shell" id="blog-search-shell">
          <svg class="nav-icon blog-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 5 5"></path></svg>
          <input type="search" id="blog-site-search" placeholder="Search the site" autocomplete="off" spellcheck="false" aria-label="Search the site" role="combobox" aria-autocomplete="list" aria-controls="blog-search-results" aria-expanded="false">
          <div class="blog-search-results" id="blog-search-results" role="listbox" aria-label="Search results"></div>
          <div class="sr-only" id="blog-search-status" role="status" aria-live="polite"></div>
        </div>
      </div>
      <nav class="blog-nav" id="blog-nav" aria-label="Main navigation">{nav}</nav>
      <button id="blog-theme-toggle" class="icon-button" type="button" aria-label="Switch to day mode">
        <svg class="nav-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg>
        <svg class="nav-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.9 13.1A9 9 0 0 1 10.9 3.1a9 9 0 1 0 10 10Z"></path></svg>
      </button>
      <button id="blog-menu-toggle" class="icon-button" type="button" aria-label="Open navigation" aria-controls="blog-nav" aria-expanded="false"><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"></path></svg></button>
    </div>
  </div>
</header>'''


def page(title: str, description: str, canonical: str, root: str, blog_home: str,
         body: str, kind: str, structured: dict | None = None) -> str:
    structured_script = ""
    if structured:
        structured_script = '<script type="application/ld+json">' + json.dumps(structured, ensure_ascii=False).replace("<", "\\u003c") + "</script>"
    return f'''<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{text(description)}">
  <meta name="theme-color" content="#020912">
  <title>{text(title)} | Wei Wang</title>
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="{'article' if kind == 'blog-article' else 'website'}">
  <meta property="og:title" content="{text(title)}">
  <meta property="og:description" content="{text(description)}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:site_name" content="Wei Wang · AI &amp; Mathematics">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="{root}assets/favicon.svg" type="image/svg+xml">
  <link rel="alternate" type="application/rss+xml" title="Wei Wang — Blog" href="{blog_home}feed.xml">
  <script>(()=>{{let theme='dark';try{{theme=localStorage.getItem('theme')==='light'?'light':'dark';}}catch(error){{}}document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#020912':'#eaf6fa';}})();</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{root}assets/vendor/katex/katex.min.css">
  <link rel="stylesheet" href="{root}assets/css/blog.css?v={ASSET_VERSION}">
  {structured_script}
</head>
<body class="{kind}">
{header(root, blog_home)}
{body}
<footer class="blog-footer">
  <div class="blog-shell"><p>© {max(date.fromisoformat(post['date']).year for post in read_posts())} Wei Wang <span>Mathematics &amp; formalization</span></p>
  <nav aria-label="Footer"><a href="{root}#home">Academic homepage</a><a href="{blog_home}feed.xml">RSS</a><a href="https://github.com/BrookWW">GitHub</a><a href="mailto:wwmath166@outlook.com">Contact</a></nav></div>
</footer>
<script src="{root}assets/js/blog.js?v={ASSET_VERSION}" defer></script>
</body>
</html>
'''


def render_listing(posts: list[dict]) -> str:
    cards = []
    tags = sorted({tag for post in posts for tag in post["tags"]})
    for number, post in enumerate(posts, start=1):
        search = " ".join([post["title"], post["summary"], post["body_text"], *post["tags"]])
        tag_markup = "".join(f"<span>{text(tag)}</span>" for tag in post["tags"])
        cards.append(f'''<article class="post-card" data-search="{text(search)}" data-tags="{text(json.dumps(post['tags']))}">
  <a class="post-card-link" href="{post['slug']}/">
    <div class="post-content">
      <div class="post-kicker"><span>{number:02d} / {text(post['category'])}</span><time datetime="{post['date']}">{long_date(post['date'])}</time></div>
      <h2 class="post-title">{text(post['title'])}</h2>
      <p class="post-summary">{text(post['summary'])}</p>
      <div class="post-tags">{tag_markup}</div>
      <div class="post-footer"><span>About {post['reading_minutes']} min read</span><span class="post-arrow">Read article <span aria-hidden="true">↗</span></span></div>
    </div>
  </a>
</article>''')
    filters = '<button type="button" data-blog-tag="" aria-pressed="true">All articles</button>' + "".join(
        f'<button type="button" data-blog-tag="{text(tag)}" aria-pressed="false">{text(tag)}</button>' for tag in tags)
    singular = "article" if len(posts) == 1 else "articles"
    body = f'''<main class="blog-shell" id="main-content">
  <section class="blog-hero" aria-labelledby="blog-title">
    <p class="blog-eyebrow">Field notes / AI &amp; Mathematics</p>
    <h1 id="blog-title">Thinking through<br><em>proofs &amp; programs.</em></h1>
    <p class="blog-intro">Notes on mathematical ideas, formalization, and working with AI. The results, the choices behind them, and the details that make a proof work.</p>
  </section>
  <div class="blog-toolbar js-only">
    <div class="blog-search"><label for="blog-search">Search articles</label><input id="blog-search" type="search" placeholder="Search ideas, results, or tools…" autocomplete="off"></div>
    <div class="blog-filters" aria-label="Filter by topic">{filters}</div>
  </div>
  <div class="listing-heading"><p>Latest writing</p><span id="blog-result-count" role="status" aria-live="polite">{len(posts)} {singular}</span></div>
  <div class="post-list">{''.join(cards)}</div>
  <div id="blog-empty" class="blog-empty" hidden><h2>No matching articles</h2><p>Try a shorter phrase or choose another topic.</p></div>
  <div class="blog-endnote"><span aria-hidden="true">∴</span><p>Long-form explanations, with the mathematics and source material close at hand.</p><a href="feed.xml">Follow by RSS <span aria-hidden="true">↗</span></a></div>
</main>'''
    return page("Blog", "Research notes on AI for mathematics, Lean, and geometric analysis by Wei Wang.", BASE_URL + "blog/", "../", "./", body, "blog-index")


def render_post(post: dict) -> str:
    repositories = "".join(f'<a href="{text(repo["url"])}">{text(repo["label"])} <span aria-hidden="true">↗</span></a>' for repo in post.get("repositories", []))
    source_link = f'<a href="#original-article">Original article <span aria-hidden="true">↓</span></a>' if post.get("source_pdf") else ""
    tag_markup = "".join(f'<a href="../?tag={quote(tag, safe="")}">{text(tag)}</a>' for tag in post["tags"])
    body = f'''<main class="blog-shell" id="main-content">
  <a class="article-back" href="../"><span aria-hidden="true">←</span> Back to blog</a>
  <header class="article-header">
    <p class="article-kicker">{text(post['category'])} <span>/ AI &amp; Mathematics</span></p>
    <h1>{text(post['title'])}</h1>
    <p class="article-deck">{text(post['summary'])}</p>
    <div class="article-meta"><span>{text(post['author'])}</span><time datetime="{post['date']}">{long_date(post['date'])}</time><span>About {post['reading_minutes']} min read</span></div>
    <div class="article-tags">{tag_markup}</div>
    <div class="article-links">{repositories}{source_link}</div>
  </header>
  <div class="reading-layout">
    <aside class="article-toc" aria-label="Article contents"><details open><summary>On this page</summary><nav>{post['toc']}</nav></details></aside>
    <article class="article-body">{post['body']}</article>
  </div>
  <nav class="article-bottom-nav" aria-label="Article navigation"><a href="../">← All articles</a><a href="#main-content">Back to top ↑</a></nav>
</main>'''
    structured = {
        "@context": "https://schema.org", "@type": "BlogPosting", "headline": post["title"],
        "description": post["summary"], "author": {"@type": "Person", "name": post["author"], "url": BASE_URL},
        "datePublished": post["date"], "dateModified": post.get("updated", post["date"]),
        "inLanguage": "en", "mainEntityOfPage": BASE_URL + f"blog/{post['slug']}/",
        "keywords": ", ".join(post["tags"]),
    }
    return page(post["title"], post["summary"], BASE_URL + f"blog/{post['slug']}/", "../../", "../", body, "blog-article", structured)


def render_feed(posts: list[dict]) -> str:
    items = []
    for post in posts:
        stamp = datetime.combine(date.fromisoformat(post["date"]), time(), timezone(timedelta(hours=8)))
        url = BASE_URL + f"blog/{post['slug']}/"
        categories = "".join(f"<category>{xml_escape(tag)}</category>" for tag in post["tags"])
        items.append(f"<item><title>{xml_escape(post['title'])}</title><link>{url}</link><guid isPermaLink=\"true\">{url}</guid><pubDate>{format_datetime(stamp)}</pubDate><description>{xml_escape(post['summary'])}</description>{categories}</item>")
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>Wei Wang — AI &amp; Mathematics</title><link>{BASE_URL}blog/</link>
<description>Research notes on mathematics, formalization, and working with AI.</description><language>en</language>
<atom:link href="{BASE_URL}blog/feed.xml" rel="self" type="application/rss+xml"/>
{''.join(items)}
</channel></rss>
'''


def build_blog() -> list[dict]:
    posts = read_posts()
    if not posts:
        raise ValueError("The blog requires at least one published article")
    for post in posts:
        source = (BLOG / "content" / post["source"]).read_text(encoding="utf-8")
        post["body"], post["toc"] = render_article(source)
        post["body"] = post["body"].replace("<p>", '<p class="lead">', 1)
        post["body_text"] = plain_text(post["body"])
        post["reading_minutes"] = max(1, math.ceil(len(post["body_text"].split()) / 200))
        target = BLOG / post["slug"]
        target.mkdir(parents=True, exist_ok=True)
        (target / "index.html").write_text(render_post(post), encoding="utf-8", newline="\n")
    (BLOG / "index.html").write_text(render_listing(posts), encoding="utf-8", newline="\n")
    (BLOG / "feed.xml").write_text(render_feed(posts), encoding="utf-8", newline="\n")
    search_data = [{"title": p["title"], "summary": p["summary"], "text": p["body_text"], "tags": p["tags"], "url": f"blog/{p['slug']}/"} for p in posts]
    (BLOG / "search-index.json").write_text(json.dumps(search_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lastmod = max(p.get("updated", p["date"]) for p in posts)
    urls = [(BASE_URL, lastmod), (BASE_URL + "blog/", lastmod)] + [(BASE_URL + f"blog/{p['slug']}/", p.get("updated", p["date"])) for p in posts]
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(f"  <url><loc>{xml_escape(url)}</loc><lastmod>{modified}</lastmod></url>" for url, modified in urls) + "\n</urlset>\n"
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8", newline="\n")
    return search_data


if __name__ == "__main__":
    documents = build_blog()
    print(f"Built {len(documents)} blog article(s), index, feed, and sitemap.")
