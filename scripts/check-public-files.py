"""Check public sources without logging the values of potential secrets."""
from __future__ import annotations

import argparse
import ipaddress
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "scripts/public-files.json"
DOC_NETWORKS = tuple(ipaddress.ip_network(n) for n in (
    "192.0.2.0/24", "198.51.100.0/24", "203.0.113.0/24"))
IPV4 = re.compile(r"(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])")
PATTERNS = {
    "absolute Windows path": re.compile(r"(?<![\w])[a-zA-Z]:[\\/](?!/)"),
    "personal home directory": re.compile(r"/(?:home|Users)/[\w.-]+/"),
    "private key": re.compile(r"-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----"),
    "GitHub credential": re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b"),
    "AWS credential": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "credential in URL": re.compile(r"https?://[^\s/@:]+:[^\s/@]+@"),
}
PRIVATE_PARTS = {".git", ".ssh", ".aws", ".codex", ".agents", "node_modules",
                 "artifacts", "backups", "private-backups", ".npm-cache",
                 "test-results", "playwright-report", "__pycache__"}
PRIVATE_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".log", ".pyc", ".tsbuildinfo"}


def private_path(path: Path) -> bool:
    name = path.name.lower()
    return (bool({part.lower() for part in path.parts} & PRIVATE_PARTS)
            or path.suffix.lower() in PRIVATE_SUFFIXES
            or (name.startswith(".env") and not name.endswith(".example"))
            or name.startswith(("id_rsa", "id_ed25519", "known_hosts"))
            or name in {"credentials", ".git-credentials", "security-review.md", "publishing.md"})


def source_files(root: Path = ROOT) -> list[Path]:
    manifest = json.loads((root / "scripts/public-files.json").read_text("utf-8"))
    files = []
    optional = [entry for entry in manifest.get("optionalSource", []) if (root / entry).exists()]
    for entry in manifest["source"] + optional:
        path = root / entry
        if not path.exists():
            raise ValueError(f"Missing public source: {entry}")
        if path.is_symlink():
            raise ValueError(f"Symbolic link in public source: {entry}")
        for candidate in sorted(path.rglob("*")) if path.is_dir() else [path]:
            if candidate.is_symlink():
                raise ValueError(f"Symbolic link: {candidate.relative_to(root)}")
            if candidate.is_file() and "__pycache__" not in candidate.parts:
                files.append(candidate)
    return sorted(set(files))


def findings(path: Path, root: Path) -> list[str]:
    relative = path.relative_to(root)
    if private_path(relative):
        return [f"{relative}: private file must not be published"]
    # Binary assets may also contain embedded paths; inspect printable contents.
    contents = path.read_bytes().decode("utf-8", errors="replace")
    errors = []
    for number, line in enumerate(contents.splitlines(), 1):
        for match in IPV4.finditer(line):
            try:
                address = ipaddress.ip_address(match.group())
            except ValueError:
                continue
            if not (address.is_loopback or address.is_unspecified
                    or any(address in network for network in DOC_NETWORKS)):
                errors.append(f"{relative}:{number}: non-example IPv4 address")
        for description, pattern in PATTERNS.items():
            if pattern.search(line):
                errors.append(f"{relative}:{number}: {description}")
        for match in re.finditer(r"https?://\[([^\]]+)\]", line):
            try:
                address = ipaddress.ip_address(match[1])
            except ValueError:
                continue
            if not (address.is_loopback or address.is_unspecified
                    or address in ipaddress.ip_network("2001:db8::/32")):
                errors.append(f"{relative}:{number}: non-example IPv6 address")
    return errors


def check(files: list[Path], root: Path = ROOT) -> None:
    errors = [error for path in files for error in findings(path, root)]
    if errors:
        raise ValueError("Public-file check failed (values hidden):\n" + "\n".join(errors))
    print(f"Public-file check passed: {len(files)} files; no matched private data.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tracked", action="store_true", help="Check every Git-tracked file too")
    args = parser.parse_args()
    files = source_files()
    if args.tracked:
        tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
        files = sorted(set(files) | {ROOT / name.decode("utf-8") for name in tracked.split(b"\0") if name})
    check(files)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
