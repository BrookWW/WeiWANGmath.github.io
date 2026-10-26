"""Require build outputs to match committed content, including new files."""

import subprocess
from pathlib import Path


def check_generated(repo: Path, outputs: list[Path]) -> list[str]:
    repo = repo.resolve()
    paths = []
    for output in outputs:
        path = output if output.is_absolute() else repo / output
        paths.append(path.resolve().relative_to(repo).as_posix())
    if not paths:
        return ["No generated files were registered by the site builder"]

    def git(*arguments):
        return subprocess.run(
            ["git", "--literal-pathspecs", "-C", str(repo), *arguments, "--", *paths],
            text=True, capture_output=True, check=True,
        ).stdout

    tracked = set(git("ls-files", "-z").split("\0"))
    errors = [f"Generated file is not tracked: {path}" for path in paths if path not in tracked]
    errors.extend(f"Generated content differs from the committed checkout: {line}"
                  for line in git("status", "--porcelain=v1", "--untracked-files=all").splitlines())
    return errors


def main():
    from build_blog import ROOT, generated_files

    outputs = generated_files()
    errors = check_generated(ROOT, outputs)
    if errors:
        raise SystemExit("\n".join(errors) + "\nRebuild and commit all generated files with the content sources.")
    print(f"All {len(outputs)} generated files match the committed checkout.")


if __name__ == "__main__":
    main()
