"""Build distributable archives from an explicit, checked public-file manifest."""
from __future__ import annotations

import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tarfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("public_check", ROOT / "scripts/check-public-files.py")
public_check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(public_check)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def tar_archive(path: Path, entries: dict[str, bytes]) -> None:
    with tarfile.open(path, "w:gz", format=tarfile.PAX_FORMAT) as archive:
        for name, contents in sorted(entries.items()):
            entry = tarfile.TarInfo(name)
            entry.size = len(contents)
            entry.mode = 0o755 if name.endswith(".sh") else 0o644
            entry.uid = entry.gid = 0
            entry.uname = entry.gname = "root"
            entry.mtime = 0
            archive.addfile(entry, io.BytesIO(contents))


def main() -> None:
    files = public_check.source_files()
    public_check.check(files)
    dist = ROOT / "dist"
    for name in ("index.html", "sw.js", "manifest.webmanifest"):
        if not (dist / name).is_file():
            raise ValueError("Run npm run build first: missing dist/" + name)
    site_files = []
    for path in dist.rglob("*"):
        if path.is_symlink():
            raise ValueError("Symbolic link in build output")
        if path.is_file():
            site_files.append(path)
    public_check.check(site_files)
    manifest = json.loads(public_check.MANIFEST.read_text("utf-8"))
    release = {name: (ROOT / "deploy/ip" / name).read_bytes() for name in manifest["installer"]}
    release["INSTALL.md"] = (ROOT / "deploy/INSTALL.md").read_bytes()
    for name in manifest.get("optionalSource", []):
        if (ROOT / name).is_file():
            release[name] = (ROOT / name).read_bytes()
    release["VERSION"] = (json.loads((ROOT / "package.json").read_text("utf-8"))["version"] + "\n").encode()
    for path in site_files:
        release["site/" + path.relative_to(dist).as_posix()] = path.read_bytes()
    release["FILES.sha256"] = "".join(f"{sha(data)}  {name}\n" for name, data in sorted(release.items())).encode()
    output = ROOT / "artifacts"
    output.mkdir(exist_ok=True)
    tar_archive(output / "munchkin-vps-ip.tar.gz", release)
    with zipfile.ZipFile(output / "munchkin-static.zip", "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(site_files):
            entry = zipfile.ZipInfo(path.relative_to(dist).as_posix(), (2020, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, path.read_bytes())
    tar_archive(output / "munchkin-source.tar.gz", {
        path.relative_to(ROOT).as_posix(): path.read_bytes() for path in files})
    archives = ("munchkin-vps-ip.tar.gz", "munchkin-static.zip", "munchkin-source.tar.gz")
    (output / "SHA256SUMS.txt").write_text("".join(
        f"{sha((output / name).read_bytes())}  {name}\n" for name in archives), encoding="ascii", newline="\n")
    for name in archives:
        print(f"{name}: {(output / name).stat().st_size} bytes")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
