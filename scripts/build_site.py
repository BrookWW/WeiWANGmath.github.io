from pathlib import Path
import json

from build_blog import build_blog


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SECTION_FILES = [
    ROOT / "sections" / "home.html",
    ROOT / "sections" / "cv.html",
    ROOT / "sections" / "research.html",
    ROOT / "sections" / "teaching.html",
    ROOT / "sections" / "talks.html",
    ROOT / "sections" / "notes.html",
]

START = "        <!-- SECTION_CONTENT_START -->"
END = "        <!-- SECTION_CONTENT_END -->"


def main() -> None:
    blog_documents = build_blog()
    missing_files = [path for path in SECTION_FILES if not path.exists()]
    if missing_files:
        missing = ", ".join(str(path.relative_to(ROOT)) for path in missing_files)
        raise FileNotFoundError(f"Missing section file(s): {missing}")

    index_html = INDEX.read_text(encoding="utf-8")
    section_html = "\n\n".join(
        path.read_text(encoding="utf-8").strip() for path in SECTION_FILES
    )
    replacement = f"{START}\n{section_html}\n        {END.strip()}"

    start_index = index_html.index(START)
    end_index = index_html.index(END, start_index) + len(END)
    updated = index_html[:start_index] + replacement + index_html[end_index:]
    blog_start = "        <!-- BLOG_SEARCH_START -->"
    blog_end = "        <!-- BLOG_SEARCH_END -->"
    blog_data = json.dumps(blog_documents, ensure_ascii=False).replace("<", "\\u003c")
    blog_replacement = f'{blog_start}\n        <script id="blog-search-data" type="application/json">{blog_data}</script>\n{blog_end}'
    blog_start_index = updated.index(blog_start)
    blog_end_index = updated.index(blog_end, blog_start_index) + len(blog_end)
    updated = updated[:blog_start_index] + blog_replacement + updated[blog_end_index:]
    INDEX.write_text(updated, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
