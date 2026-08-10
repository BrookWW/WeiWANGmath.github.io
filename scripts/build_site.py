from pathlib import Path


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
    INDEX.write_text(updated, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
