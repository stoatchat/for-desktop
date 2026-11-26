#!/usr/bin/env python3
"""Add the <release> entry for the current package.json version
in the AppStream metainfo, using the matching section of CHANGELOG.md.
An entry that already exists is left alone.

Run from the repo root. Idempotent: running it twice gives the same file.
"""
import datetime
import html
import json
import re
import sys
from pathlib import Path

METAINFO = Path("chat.stoat.StoatDesktop.metainfo.xml")
CHANGELOG = Path("CHANGELOG.md")
REPO_URL = "https://github.com/stoatchat/for-desktop"


def changelog_section(version: str) -> tuple[str | None, list[tuple[str, list[str]]]]:
    """Return (date, [(heading, [items])]) for `version` from CHANGELOG.md."""
    text = CHANGELOG.read_text(encoding="utf-8")
    head = re.search(
        rf"^## \[?{re.escape(version)}\]?.*?(?:\((\d{{4}}-\d{{2}}-\d{{2}})\))?\s*$",
        text,
        re.M,
    )
    if not head:
        return None, []
    body = text[head.end():]
    nxt = re.search(r"^## ", body, re.M)
    body = body[: nxt.start()] if nxt else body

    groups: list[tuple[str, list[str]]] = []
    for line in body.splitlines():
        if m := re.match(r"^### (.+)", line):
            groups.append((m.group(1).strip(), []))
        elif (m := re.match(r"^\* (.+)", line)) and groups:
            item = m.group(1)
            item = re.sub(r"\s*\(\[[0-9a-f]{7,}\]\([^)]*\)\)", "", item)  # commit links
            item = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", item)  # other links
            item = re.sub(r"\*\*([^*]+)\*\*", r"\1", item).replace("`", "")
            groups[-1][1].append(item.strip())
    return head.group(1), [(h, items) for h, items in groups if items]


def release_xml(version: str, date: str, groups) -> str:
    lines = [f'    <release date="{date}" version="{version}">']
    if groups:
        lines.append("      <description>")
        for heading, items in groups:
            lines.append(f"        <p>{html.escape(heading, quote=False)}:</p>")
            lines.append("        <ul>")
            lines += [f"          <li>{html.escape(i, quote=False)}</li>" for i in items]
            lines.append("        </ul>")
        lines.append("      </description>")
    lines.append(f'      <url type="details">{REPO_URL}/releases/tag/v{version}</url>')
    lines.append("    </release>")
    return "\n".join(lines) + "\n"


def main() -> int:
    version = json.loads(Path("package.json").read_text())["version"]
    cl_date, groups = changelog_section(version)
    date = cl_date or datetime.date.today().isoformat()
    entry = release_xml(version, date, groups)

    xml = METAINFO.read_text(encoding="utf-8")
    if re.search(rf'<release [^>]*version="{re.escape(version)}"', xml):
        print(f"metainfo: release {version} already present, leaving it alone")
        return 0

    new = xml.replace("  <releases>\n", "  <releases>\n" + entry, 1)
    if new == xml:
        print("No <releases> element found", file=sys.stderr)
        return 1

    METAINFO.write_text(new, encoding="utf-8")
    print(f"metainfo: wrote release {version} ({date})")
    return 0


if __name__ == "__main__":
    sys.exit(main())