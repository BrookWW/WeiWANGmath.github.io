"""Check generated pages, local destinations, mathematics, and publication indexes."""

import json
import re
from collections import Counter, deque
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://brookww.github.io/WeiWANGmath.github.io/"
BASE_PATH = "/WeiWANGmath.github.io/"


class Document(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.ids = set()
        self.links = []
        self.duplicates = []
        self.math_error = False
        self.search_parts = []
        self.post_links = []
        self._capture_search = False
        self.source = path.read_text(encoding="utf-8")
        self.feed(self.source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            if attrs["id"] in self.ids:
                self.duplicates.append(attrs["id"])
            self.ids.add(attrs["id"])
        if tag == "merror" or "katex-error" in attrs.get("class", "").split():
            self.math_error = True
        if tag == "script" and attrs.get("id") == "blog-search-data":
            self._capture_search = True
        if tag == "a" and "post-card-link" in attrs.get("class", "").split():
            self.post_links.append(attrs.get("href", ""))
        for key in ("href", "src"):
            if attrs.get(key):
                self.links.append(attrs[key])

    def handle_data(self, data):
        if self._capture_search:
            self.search_parts.append(data)

    def handle_endtag(self, tag):
        if tag == "script":
            self._capture_search = False


def validate_site(root: Path) -> list[str]:
    root = root.resolve()
    errors = []

    def read_json(path):
        try:
            return json.loads((root / path).read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            errors.append(f"{path}: invalid or missing JSON: {error}")

    def read_xml(path):
        try:
            return ElementTree.parse(root / path)
        except (OSError, ElementTree.ParseError) as error:
            errors.append(f"{path}: invalid or missing XML: {error}")

    posts = read_json("blog/posts.json")
    if not isinstance(posts, list) or not posts or any(
        not isinstance(post, dict) or any(key not in post for key in ("slug", "title", "summary", "tags"))
        or not isinstance(post["slug"], str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", post["slug"])
        for post in posts
    ):
        return errors + ["blog/posts.json: expected published article metadata with valid slugs"]
    if len({post["slug"] for post in posts}) != len(posts):
        errors.append("blog/posts.json: duplicate article slugs")

    paths = [root / "index.html", root / "blog/index.html"]
    paths.extend(root / "blog" / post["slug"] / "index.html" for post in posts)
    paths.extend((root / "assets/blog").glob("*/*.html"))
    documents = {}
    pending = deque(paths)
    visited = set()

    def document(path):
        if path not in documents:
            try:
                documents[path] = Document(path)
            except (OSError, UnicodeError) as error:
                errors.append(f"{path.relative_to(root)}: missing or unreadable page: {error}")
                documents[path] = None
        return documents[path]

    while pending:
        path = pending.popleft().resolve()
        if path in visited:
            continue
        visited.add(path)
        current = document(path)
        if current is None:
            continue
        label = path.relative_to(root)
        errors.extend(f"{label}: duplicate id {value}" for value in current.duplicates)
        if current.math_error or "BLOGMATHPLACEHOLDER" in current.source:
            errors.append(f"{label}: unresolved mathematical expression or KaTeX error")
        for link in current.links:
            url = urlsplit(link)
            absolute_internal = url.scheme in {"http", "https"} and url.netloc == urlsplit(BASE_URL).netloc and (
                url.path.startswith(BASE_PATH) or url.path == BASE_PATH.rstrip("/")
            )
            if (url.scheme or url.netloc) and not absolute_internal:
                continue
            local = unquote(url.path)
            if local == BASE_PATH.rstrip("/"):
                target = root
            elif local.startswith(BASE_PATH):
                target = root / local[len(BASE_PATH):]
            elif local.startswith("/"):
                target = root / local.lstrip("/")
            else:
                target = path.parent / local if local else path
            if target.is_dir():
                target /= "index.html"
            target = target.resolve()
            if not target.is_relative_to(root) or not target.is_file():
                errors.append(f"{label}: missing local target {link}")
                continue
            if target.suffix == ".html":
                pending.append(target)
                destination = document(target)
                if destination and url.fragment:
                    fragment = unquote(url.fragment)
                    is_main_route = target == root / "index.html" and f"{fragment}-page" in destination.ids
                    if fragment not in destination.ids and not is_main_route:
                        errors.append(f"{label}: missing anchor {link}")

    expected_urls = [BASE_URL + f"blog/{post['slug']}/" for post in posts]
    listing = document(root / "blog/index.html")
    if listing and Counter(urljoin(BASE_URL + "blog/", link) for link in listing.post_links) != Counter(expected_urls):
        errors.append("Blog listing article links do not match blog/posts.json")
    feed = read_xml("blog/feed.xml")
    if feed is not None:
        items = feed.findall("./channel/item")
        if Counter(item.findtext("link") for item in items) != Counter(expected_urls):
            errors.append("RSS feed article URLs do not match blog/posts.json")
        metadata = dict(zip(expected_urls, posts))
        for item in items:
            post = metadata.get(item.findtext("link"))
            if post and (item.findtext("title") != post["title"]
                         or item.findtext("description") != post["summary"]
                         or [node.text for node in item.findall("category")] != post["tags"]
                         or item.findtext("guid") != item.findtext("link")):
                errors.append(f"RSS feed metadata differs for {post['slug']}")

    sitemap = read_xml("sitemap.xml")
    if sitemap is not None:
        locations = sitemap.findall("./{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
        if Counter(node.text for node in locations) != Counter([BASE_URL, BASE_URL + "blog/", *expected_urls]):
            errors.append("Sitemap URLs do not match the homepage, blog, and published articles")

    search = read_json("blog/search-index.json")
    if not isinstance(search, list):
        errors.append("Blog search index must be a list")
    else:
        expected_search = {f"blog/{post['slug']}/": post for post in posts}
        if any(not isinstance(entry, dict) or not isinstance(entry.get("url"), str) for entry in search):
            errors.append("Blog search index has invalid article entries")
        else:
            if Counter(entry["url"] for entry in search) != Counter(expected_search.keys()):
                errors.append("Blog search index URLs do not match blog/posts.json")
            for entry in search:
                post = expected_search.get(entry["url"])
                if post and (any(entry.get(key) != post[key] for key in ("title", "summary", "tags"))
                             or not isinstance(entry.get("text"), str) or not entry["text"].strip()):
                    errors.append(f"Blog search index metadata differs for {post['slug']}")
        homepage = document(root / "index.html")
        if homepage:
            try:
                inline = json.loads("".join(homepage.search_parts))
                if inline != search:
                    errors.append("Homepage embedded blog search data differs from the blog search index")
            except ValueError:
                errors.append("Homepage embedded blog search data is missing or invalid JSON")

    katex_css = root / "assets/vendor/katex/katex.min.css"
    try:
        css = katex_css.read_text(encoding="utf-8")
        for resource in re.findall(r"url\(([^)]+)\)", css):
            if not (katex_css.parent / resource.strip('"\'')).is_file():
                errors.append(f"Missing KaTeX font: {resource}")
    except OSError as error:
        errors.append(f"Missing KaTeX stylesheet: {error}")
    for post in posts:
        if post.get("source_pdf"):
            pdf = (root / post["source_pdf"]).resolve()
            if not pdf.is_relative_to(root) or not pdf.is_file():
                errors.append(f"Missing PDF: {post['source_pdf']}")
            elif not pdf.read_bytes().startswith(b"%PDF-"):
                errors.append(f"Not a PDF: {post['source_pdf']}")
    return errors


def main():
    errors = validate_site(ROOT)
    if errors:
        raise SystemExit("\n".join(errors))
    print("Content validation passed: local links and anchors, mathematics, RSS, sitemap, search indexes, KaTeX fonts, and PDF signatures.")


if __name__ == "__main__":
    main()
