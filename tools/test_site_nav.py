#!/usr/bin/env python3
"""Validate the visible navigation injected into the generated CERBERUS site."""

from __future__ import annotations

import argparse
from html.parser import HTMLParser
from pathlib import Path

EXPECTED = {
    "index.html": "index.html",
    "scenarios.html": "scenarios.html",
    "assurance-workbench.html": "assurance-workbench.html",
    "flight-kernel.html": "flight-kernel.html",
}
ALL_HREFS = set(EXPECTED.values())


class NavParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_main = False
        self.in_nav = False
        self.nav_count = 0
        self.launcher_count = 0
        self.nav_inside_main = False
        self.links: list[tuple[str | None, str | None, str | None]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        classes = (values.get("class") or "").split()
        if tag == "main":
            self.in_main = True
        if tag == "section" and "cerberus-launcher" in classes:
            self.launcher_count += 1
        if tag == "nav" and "cerberus-page-nav" in classes:
            self.in_nav = True
            self.nav_count += 1
            self.nav_inside_main = self.in_main
        elif tag == "a" and self.in_nav:
            self.links.append(
                (values.get("href"), values.get("aria-current"), values.get("data-page"))
            )

    def handle_endtag(self, tag: str) -> None:
        if tag == "nav" and self.in_nav:
            self.in_nav = False
        elif tag == "main":
            self.in_main = False


def validate(path: Path, expected_current: str) -> None:
    text = path.read_text(encoding="utf-8")
    if text.count('href="site-nav.css"') != 1:
        raise AssertionError(f"{path}: expected one site-nav.css link")

    parser = NavParser()
    parser.feed(text)
    if parser.launcher_count != 1:
        raise AssertionError(
            f"{path}: expected one visible launcher, got {parser.launcher_count}"
        )
    if parser.nav_count != 1:
        raise AssertionError(f"{path}: expected one global page nav, got {parser.nav_count}")
    if not parser.nav_inside_main:
        raise AssertionError(f"{path}: launcher navigation must be inside main content")

    hrefs = {href for href, _, _ in parser.links if href}
    if hrefs != ALL_HREFS:
        raise AssertionError(f"{path}: nav links differ: {sorted(hrefs)}")

    current = [href for href, aria, _ in parser.links if aria == "page"]
    if current != [expected_current]:
        raise AssertionError(
            f"{path}: expected current page {expected_current!r}, got {current!r}"
        )

    kernel = [href for href, _, page in parser.links if page == "kernel"]
    if kernel != ["flight-kernel.html"]:
        raise AssertionError(f"{path}: Flight Kernel must be a direct visible route")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    args = parser.parse_args()
    root = Path(args.root).resolve()

    for filename, expected_current in EXPECTED.items():
        validate(root / filename, expected_current)
        print(f"navigation valid: {filename}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
