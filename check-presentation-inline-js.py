#!/usr/bin/env python3
"""Check inline JavaScript in presentation pages before publishing."""

from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys


PAGES = (
    "youtube-presentation.html",
    "youtube-presentation-main.html",
    "youtube-presentation-core.html",
    "youtube-presentation-studio.html",
    "youtube-presentation-studio-core.html",
)


class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.inline = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            self.current = None if dict(attrs).get("src") else []

    def handle_data(self, data):
        if self.current is not None:
            self.current.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.current is not None:
            self.inline.append("".join(self.current))
            self.current = None


def main():
    failed = False
    for filename in PAGES:
        page = Path(filename)
        if not page.is_file():
            print(f"Missing page: {filename}", file=sys.stderr)
            failed = True
            continue
        parser = Scripts()
        parser.feed(page.read_text(encoding="utf-8"))
        for number, source in enumerate(parser.inline, 1):
            result = subprocess.run(
                ["node", "--check", "-"], input=source, text=True,
                capture_output=True, check=False,
            )
            if result.returncode:
                print(f"{filename}: inline script {number}:\n{result.stderr}", file=sys.stderr)
                failed = True
    if failed:
        return 1
    print("Presentation inline JavaScript syntax: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
