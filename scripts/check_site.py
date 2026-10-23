"""Check generated pages, local destinations, article assets, and feed metadata."""

import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
BASE_PATH = "/WeiWANGmath.github.io/"


class Document(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.ids = set()
        self.links = []
        self.duplicates = []
        self.math_count = 0
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            if attrs["id"] in self.ids:
                self.duplicates.append(attrs["id"])
            self.ids.add(attrs["id"])
        if tag == "math":
            self.math_count += 1
        for key in ("href", "src"):
            if attrs.get(key):
                self.links.append(attrs[key])


def main():
    posts = json.loads((ROOT / "blog/posts.json").read_text())
    pages = [ROOT / "index.html", ROOT / "blog/index.html"]
    pages += [ROOT / "blog" / post["slug"] / "index.html" for post in posts]
    pages += list((ROOT / "assets/blog").glob("*/*.html"))
    documents = {path.resolve(): Document(path) for path in pages}
    errors = []
    checked = 0
    for path, document in list(documents.items()):
        label = path.relative_to(ROOT)
        errors.extend(f"{label}: duplicate id {value}" for value in document.duplicates)
        source = path.read_text(encoding="utf-8")
        if "BLOGMATHPLACEHOLDER" in source or "<merror" in source or 'class="katex-error"' in source:
            errors.append(f"{label}: unresolved mathematical expression")
        for link in document.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            local = unquote(url.path)
            if local.startswith(BASE_PATH):
                target = ROOT / local[len(BASE_PATH):]
            elif local.startswith("/"):
                target = ROOT / local.lstrip("/")
            else:
                target = path.parent / local if local else path
            if target.is_dir():
                target /= "index.html"
            target = target.resolve()
            checked += 1
            if not target.is_relative_to(ROOT) or not target.is_file():
                errors.append(f"{label}: missing local target {link}")
            elif url.fragment and target.suffix == ".html":
                if target not in documents:
                    documents[target] = Document(target)
                fragment = unquote(url.fragment)
                is_main_route = target == ROOT / "index.html" and f"{fragment}-page" in documents[target].ids
                if fragment not in documents[target].ids and not is_main_route:
                    errors.append(f"{label}: missing anchor {link}")
    feed = ElementTree.parse(ROOT / "blog/feed.xml")
    if len(feed.findall("./channel/item")) != len(posts):
        errors.append("RSS article count does not match blog/posts.json")
    ElementTree.parse(ROOT / "sitemap.xml")
    search = json.loads((ROOT / "blog/search-index.json").read_text())
    if len(search) != len(posts):
        errors.append("Search article count does not match blog/posts.json")
    katex_css = ROOT / "assets/vendor/katex/katex.min.css"
    for resource in re.findall(r"url\(([^)]+)\)", katex_css.read_text()):
        if not (katex_css.parent / resource.strip('"\'')).is_file():
            errors.append(f"Missing KaTeX font: {resource}")
    for post in posts:
        if post.get("source_pdf"):
            pdf = ROOT / post["source_pdf"]
            if not pdf.read_bytes().startswith(b"%PDF-"):
                errors.append(f"Not a PDF: {post['source_pdf']}")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Checked {len(pages)} pages, {checked} local links, RSS, sitemap, search data, and PDF signatures.")


if __name__ == "__main__":
    main()
