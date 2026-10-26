"""Regression checks for published content, rendering, and generated outputs."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from contextlib import contextmanager
from html.parser import HTMLParser
from pathlib import Path
from unittest.mock import patch


PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "scripts"))

import build_blog
import check_generated
import check_site


BASE_URL = "https://brookww.github.io/WeiWANGmath.github.io/"


class SiteFixture:
    """A complete one-article site whose metadata agrees across its outputs."""

    def __init__(self, root: Path):
        self.root = root
        self.post = {
            "slug": "sample-post",
            "title": "Regularity in Lean",
            "summary": "A proof and its formal interface.",
            "date": "2026-10-23",
            "author": "Wei Wang",
            "category": "Research notes",
            "tags": ["Lean", "Geometric analysis"],
            "source": "sample-post.md",
            "source_pdf": "assets/blog/sample-post/original-article.pdf",
        }
        self.search = [{
            "title": self.post["title"],
            "summary": self.post["summary"],
            "text": "A small-energy estimate gives regularity.",
            "tags": self.post["tags"],
            "url": "blog/sample-post/",
        }]
        self.write_json("blog/posts.json", [self.post])
        self.write("blog/content/sample-post.md", "A small-energy estimate gives regularity.\n")
        self.write_json("blog/search-index.json", self.search)
        self.write_home()
        self.write("blog/index.html", """<!doctype html><html><head>
<link rel="canonical" href="https://brookww.github.io/WeiWANGmath.github.io/blog/">
</head><body><main id="main-content"><h1>Blog</h1>
<article class="post-card"><a class="post-card-link" href="sample-post/">
<h2 class="post-title">Regularity in Lean</h2></a></article>
<a href="feed.xml">RSS</a></main></body></html>""")
        self.write("blog/sample-post/index.html", """<!doctype html><html><head>
<link rel="canonical" href="https://brookww.github.io/WeiWANGmath.github.io/blog/sample-post/">
<link rel="stylesheet" href="../../assets/vendor/katex/katex.min.css">
</head><body><main id="main-content"><header class="article-header">
<h1>Regularity in Lean</h1></header><article class="article-body">
<h2 id="estimate">Estimate</h2><p>A small-energy estimate gives regularity.</p>
<a href="#estimate">This estimate</a>
<a href="../../assets/blog/sample-post/original-article.pdf">Original PDF</a>
</article></main></body></html>""")
        self.write("assets/vendor/katex/katex.min.css", '@font-face{src:url("fonts/KaTeX_Main.woff2")}')
        self.write("assets/vendor/katex/fonts/KaTeX_Main.woff2", b"font fixture")
        self.write(self.post["source_pdf"], b"%PDF-1.7\noriginal article fixture\n%%EOF\n")
        self.write("blog/feed.xml", f"""<?xml version="1.0"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>Wei Wang — AI &amp; Mathematics</title><link>{BASE_URL}blog/</link>
<atom:link href="{BASE_URL}blog/feed.xml" rel="self" type="application/rss+xml"/>
<item><title>{self.post['title']}</title><link>{BASE_URL}blog/sample-post/</link>
<guid isPermaLink="true">{BASE_URL}blog/sample-post/</guid>
<pubDate>Fri, 23 Oct 2026 00:00:00 +0800</pubDate>
<description>{self.post['summary']}</description>
<category>Lean</category><category>Geometric analysis</category>
</item></channel></rss>""")
        self.write("sitemap.xml", f"""<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>{BASE_URL}</loc><lastmod>2026-10-23</lastmod></url>
<url><loc>{BASE_URL}blog/</loc><lastmod>2026-10-23</lastmod></url>
<url><loc>{BASE_URL}blog/sample-post/</loc><lastmod>2026-10-23</lastmod></url>
</urlset>""")

    def write(self, name: str, content: str | bytes):
        destination = self.root / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, bytes):
            destination.write_bytes(content)
        else:
            destination.write_text(content, encoding="utf-8")

    def write_json(self, name: str, value):
        self.write(name, json.dumps(value, ensure_ascii=False))

    def write_home(self, search=None):
        data = json.dumps(self.search if search is None else search, ensure_ascii=False)
        self.write("index.html", f"""<!doctype html><html><body>
<main id="home-page"><a href="blog/">Blog</a></main>
<script id="blog-search-data" type="application/json">{data}</script>
</body></html>""")

    def replace(self, name: str, old: str, new: str):
        path = self.root / name
        source = path.read_text(encoding="utf-8")
        if old not in source:
            raise AssertionError(f"Fixture does not contain {old!r}: {name}")
        path.write_text(source.replace(old, new), encoding="utf-8")


@contextmanager
def example_site():
    with tempfile.TemporaryDirectory(prefix="website-validation-") as directory:
        yield SiteFixture(Path(directory).resolve())


class SiteValidationTests(unittest.TestCase):
    def assert_diagnostic(self, fixture: SiteFixture, *terms: str):
        errors = check_site.validate_site(fixture.root)
        self.assertTrue(errors, "Corrupted published content was accepted")
        diagnostic = "\n".join(errors).lower()
        self.assertTrue(any(term.lower() in diagnostic for term in terms), diagnostic)

    def test_consistent_site_is_valid(self):
        with example_site() as fixture:
            self.assertEqual(check_site.validate_site(fixture.root), [])

    def test_missing_internal_file_and_fragment(self):
        cases = [
            ("#estimate", "missing.css", ("missing", "target")),
            ("#estimate", "#absent-estimate", ("anchor", "fragment")),
        ]
        for old, new, terms in cases:
            with self.subTest(destination=new), example_site() as fixture:
                fixture.replace("blog/sample-post/index.html", f'href="{old}"', f'href="{new}"')
                self.assert_diagnostic(fixture, *terms)

    def test_same_site_absolute_links_are_checked(self):
        for destination, is_valid in (
            (BASE_URL + "blog/sample-post/#estimate", True),
            (BASE_URL + "assets/missing-resource.svg", False),
        ):
            with self.subTest(destination=destination), example_site() as fixture:
                fixture.replace("blog/sample-post/index.html", 'href="#estimate"', f'href="{destination}"')
                if is_valid:
                    self.assertEqual(check_site.validate_site(fixture.root), [])
                else:
                    self.assert_diagnostic(fixture, "missing", "target")

    def test_blog_listing_must_link_to_each_published_article(self):
        with example_site() as fixture:
            fixture.replace("blog/index.html", '<a class="post-card-link" href="sample-post/">', "")
            fixture.replace("blog/index.html", "</h2></a>", "</h2>")
            self.assert_diagnostic(fixture, "listing")

    def test_math_error_markers_are_rejected(self):
        for marker in (
            '<span class="katex-error">C^{1,}</span>',
            '<span class="other katex-error highlighted">bad</span>',
            "BLOGMATHPLACEHOLDER00000END",
            '<math><merror><mtext>bad math</mtext></merror></math>',
        ):
            with self.subTest(marker=marker), example_site() as fixture:
                fixture.replace("blog/sample-post/index.html", "</article>", marker + "</article>")
                self.assert_diagnostic(fixture, "math", "expression", "katex")

    def test_missing_katex_font_is_rejected(self):
        with example_site() as fixture:
            (fixture.root / "assets/vendor/katex/fonts/KaTeX_Main.woff2").unlink()
            self.assert_diagnostic(fixture, "font", "katex")

    def test_download_with_invalid_pdf_signature_is_rejected(self):
        with example_site() as fixture:
            fixture.write(fixture.post["source_pdf"], b"<!doctype html>not a PDF")
            self.assert_diagnostic(fixture, "pdf")

    def test_rss_count_cannot_hide_wrong_article_url_or_title(self):
        for old, new in (
            (f"{BASE_URL}blog/sample-post/", f"{BASE_URL}blog/other-post/"),
            ("Regularity in Lean", "A different result"),
        ):
            with self.subTest(replacement=new), example_site() as fixture:
                fixture.replace("blog/feed.xml", old, new)
                self.assert_diagnostic(fixture, "rss", "feed")

    def test_search_count_cannot_hide_wrong_article_metadata(self):
        for key, wrong in (
            ("url", "blog/other-post/"),
            ("title", "A different result"),
            ("tags", ["Unrelated"]),
        ):
            with self.subTest(field=key), example_site() as fixture:
                fixture.search[0][key] = wrong
                fixture.write_json("blog/search-index.json", fixture.search)
                fixture.write_home()
                self.assert_diagnostic(fixture, "search", "index")

    def test_homepage_search_data_must_match_blog_index(self):
        with example_site() as fixture:
            wrong = [dict(fixture.search[0], text="Stale article body")]
            fixture.write_home(wrong)
            self.assert_diagnostic(fixture, "search", "inline", "embedded")

    def test_sitemap_must_include_each_article(self):
        with example_site() as fixture:
            fixture.replace("sitemap.xml", f"<url><loc>{BASE_URL}blog/sample-post/</loc><lastmod>2026-10-23</lastmod></url>", "")
            self.assert_diagnostic(fixture, "sitemap")


class MathMarkup(HTMLParser):
    def __init__(self, source: str):
        super().__init__()
        self.tags = []
        self.classes = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        self.classes.extend(dict(attrs).get("class", "").split())


class BlogMathRenderingTests(unittest.TestCase):
    def test_inline_exponents_and_centered_display_use_katex(self):
        body, _ = build_blog.render_article(
            "Regularity in $C^{1,\\gamma}$.\n\n$$\\Theta(a,r) \\leq \\varepsilon_*$$\n"
        )
        markup = MathMarkup(body)
        self.assertIn("math-inline", markup.classes)
        self.assertIn("math-display", markup.classes)
        self.assertIn("katex-display", markup.classes)
        self.assertIn("msup", markup.tags)
        self.assertIn("γ", body)
        self.assertNotIn("BLOGMATHPLACEHOLDER", body)
        self.assertNotIn("katex-error", body)

    def test_invalid_latex_stops_build(self):
        with self.assertRaises(subprocess.CalledProcessError):
            build_blog.render_article("An invalid formula $\\notARealLatexCommand{x}$.")

    def test_code_dollars_are_not_rendered_as_mathematics(self):
        source = "Inline `price = $5` and `C^{1,\\gamma}`.\n\n```lean\n#check $not_math$\n```\n"
        protected, equations = build_blog.protect_math(source)
        self.assertEqual(protected, source)
        self.assertEqual(equations, [])
        body, _ = build_blog.render_article(source)
        self.assertIn("$not_math$", body)
        self.assertIn("price = $5", body)
        self.assertNotIn('class="katex', body)


class GeneratedOutputTests(unittest.TestCase):
    @contextmanager
    def repository(self):
        with tempfile.TemporaryDirectory(prefix="website-generated-") as directory:
            root = Path(directory)
            self.git(root, "init", "--quiet")
            self.git(root, "config", "user.name", "Site test")
            self.git(root, "config", "user.email", "site-test@example.invalid")
            (root / "blog").mkdir()
            (root / "blog/index.html").write_text("<h1>Blog</h1>\n")
            (root / "source.md").write_text("Article source\n")
            self.git(root, "add", "blog/index.html", "source.md")
            self.git(root, "commit", "--quiet", "-m", "Add site fixture")
            yield root

    @staticmethod
    def git(root, *arguments):
        return subprocess.run(["git", "-C", str(root), *arguments], check=True, capture_output=True, text=True)

    def test_committed_output_and_unrelated_source_edits_are_valid(self):
        with self.repository() as root:
            outputs = [Path("blog/index.html")]
            self.assertEqual(check_generated.check_generated(root, outputs), [])
            (root / "source.md").write_text("An unrelated source edit\n")
            self.assertEqual(check_generated.check_generated(root, outputs), [])

    def test_modified_staged_deleted_and_untracked_outputs_are_rejected(self):
        for state in ("modified", "staged", "deleted", "untracked"):
            with self.subTest(state=state), self.repository() as root:
                output = root / "blog/index.html"
                outputs = [Path("blog/index.html")]
                if state in {"modified", "staged"}:
                    output.write_text("<h1>New generated content</h1>\n")
                    if state == "staged":
                        self.git(root, "add", "blog/index.html")
                elif state == "deleted":
                    output.unlink()
                else:
                    (root / "blog/new-post").mkdir()
                    (root / "blog/new-post/index.html").write_text("<h1>New article</h1>\n")
                    outputs.append(Path("blog/new-post/index.html"))
                errors = check_generated.check_generated(root, outputs)
                self.assertTrue(errors, f"Uncommitted {state} generated output was accepted")

    def test_ignored_generated_output_must_still_be_committed(self):
        with self.repository() as root:
            (root / ".gitignore").write_text("blog/ignored-generated.html\n")
            ignored = Path("blog/ignored-generated.html")
            (root / ignored).write_text("<h1>Unpublished generated content</h1>\n")
            self.git(root, "check-ignore", ignored.as_posix())
            errors = check_generated.check_generated(root, [Path("blog/index.html"), ignored])
            self.assertTrue(errors, "An ignored, untracked generated page was accepted")

    def test_manifest_includes_new_article_and_both_diagram_outputs(self):
        with example_site() as fixture:
            fixture.write("blog/content/sample-post.md", """A proof structure.

<a class="figure-link" href="../../assets/blog/sample-post/proof-steps.svg"><img src="../../assets/blog/sample-post/proof-steps.svg" alt="Proof steps"></a>
""")
            diagram = fixture.root / "assets/blog/sample-post/proof-steps.svg"
            fixture.write("assets/blog/sample-post/proof-steps.svg", '<svg xmlns="http://www.w3.org/2000/svg"><title>Proof steps</title></svg>')
            with patch.object(build_blog, "ROOT", fixture.root), patch.object(build_blog, "BLOG", fixture.root / "blog"):
                outputs = set(build_blog.generated_files())
            self.assertIn(fixture.root / "blog/sample-post/index.html", outputs)
            self.assertIn(diagram, outputs)
            self.assertIn(diagram.with_suffix(".html"), outputs)


if __name__ == "__main__":
    unittest.main()
