"""Check the actual release archives, including their embedded file bytes."""
import hashlib
import importlib.util
from pathlib import Path, PurePosixPath
import tarfile
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("public_check", ROOT / "scripts/check-public-files.py")
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


def validate_name(name):
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts or "\\" in name or check.private_path(Path(name)):
        raise ValueError("Unexpected private/unsafe archive path")


def main():
    output = ROOT / "artifacts"
    expected_source = {p.relative_to(ROOT).as_posix() for p in check.source_files()}
    for line in (output / "SHA256SUMS.txt").read_text("ascii").splitlines():
        digest, name = line.split("  ", 1)
        validate_name(name)
        assert hashlib.sha256((output / name).read_bytes()).hexdigest() == digest, "Archive checksum mismatch"
    for name in ("munchkin-source.tar.gz", "munchkin-vps-ip.tar.gz", "munchkin-static.zip"):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            entries = {}
            if name.endswith(".zip"):
                with zipfile.ZipFile(output / name) as archive:
                    for member in archive.infolist():
                        validate_name(member.filename)
                        assert member.filename not in entries, "Duplicate archive entry"
                        entries[member.filename] = archive.read(member)
            else:
                with tarfile.open(output / name) as archive:
                    for member in archive:
                        validate_name(member.name)
                        assert member.isfile() and not member.linkname, "Non-file archive entry"
                        assert member.uid == member.gid == 0 and member.uname == member.gname == "root", "Personal owner metadata"
                        assert member.name not in entries, "Duplicate archive entry"
                        entries[member.name] = archive.extractfile(member).read()
            for relative, contents in entries.items():
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(contents)
            check.check([root / relative for relative in entries], root)
            if name == "munchkin-source.tar.gz":
                assert set(entries) == expected_source, "Source archive differs from public manifest"
            if name == "munchkin-vps-ip.tar.gz":
                assert all(p in entries for p in ("setup.sh", "INSTALL.md", "FILES.sha256", "site/index.html"))
                sums = dict((path, digest) for digest, path in (
                    line.split("  ", 1) for line in entries["FILES.sha256"].decode().splitlines()))
                assert set(sums) == set(entries) - {"FILES.sha256"}, "Incomplete installer manifest"
                assert all(hashlib.sha256(entries[p]).hexdigest() == digest for p, digest in sums.items()), "Installer checksum mismatch"
            print(f"Verified {name}: {len(entries)} files")


if __name__ == "__main__":
    main()
