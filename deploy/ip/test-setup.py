"""Disposable Docker container only: exercise the installer without external networking."""
import hashlib
import io
import os
from pathlib import Path
import pty
import shutil
import socket
import subprocess
import tarfile
import tempfile

if not (Path("/.dockerenv").exists() and Path("/packages/munchkin-vps-ip.tar.gz").is_file()):
    raise SystemExit("Run only in the disposable installer test container, with /packages mounted.")

work = Path(tempfile.mkdtemp(prefix="setup-check-"))
package = work / "package"
package.mkdir()
with tarfile.open("/packages/munchkin-vps-ip.tar.gz") as archive:
    archive.extractall(package, filter="data")
original_caddy = Path("/opt/munchkin-hero/bin/caddy")
fixture = work / "caddy.tar.gz"
with tarfile.open(fixture, "w:gz") as archive:
    data = original_caddy.read_bytes()
    entry = tarfile.TarInfo("caddy")
    entry.size, entry.mode = len(data), 0o755
    archive.addfile(entry, io.BytesIO(data))
# This exact directory belongs to the disposable image, never the host.
shutil.rmtree("/opt/munchkin-hero")
Path("/run/systemd/system").mkdir(parents=True, exist_ok=True)
mock = work / "mock"
mock.mkdir()
(mock / "curl").write_text('''#!/usr/bin/env python3
import hashlib, os, pathlib, shutil, sys
args = sys.argv[1:]
url = next(a for a in args if a.startswith("https://"))
assert url.startswith("https://github.com/caddyserver/caddy/releases/download/v2.11.7/")
dest = pathlib.Path(args[args.index("-o") + 1])
fixture = pathlib.Path(os.environ["CADDY_FIXTURE"])
if url.endswith("checksums.txt"):
    arch = "amd64" if os.uname().machine == "x86_64" else "arm64"
    digest = "0" * 128 if os.environ.get("BAD_CHECKSUM") else hashlib.sha512(fixture.read_bytes()).hexdigest()
    dest.write_text(digest + "  caddy_2.11.7_linux_" + arch + ".tar.gz\\n")
else:
    shutil.copyfile(fixture, dest)
''')
(mock / "systemctl").write_text('''#!/usr/bin/env python3
import os, pathlib, sys
args = sys.argv[1:]
assert args == ["daemon-reload"] or args[-1] == "munchkin-hero.service"
with open(os.environ["SERVICE_LOG"], "a") as log:
    log.write(" ".join(args) + "\\n")
''')
for path in mock.iterdir():
    path.chmod(0o755)
env = dict(os.environ, PATH=str(mock) + ":" + os.environ["PATH"],
           CADDY_FIXTURE=str(fixture), SERVICE_LOG=str(work / "services.log"))


def run(*args, succeeds=True, extra_env=None):
    result = subprocess.run(["bash", str(package / "setup.sh"), *args],
                            env=dict(env, **(extra_env or {})), stdin=subprocess.DEVNULL,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if (result.returncode == 0) != succeeds:
        raise AssertionError(result.stdout)
    return result.stdout


def uninstall(answer):
    master, slave = pty.openpty()
    child = subprocess.Popen(["bash", str(package / "setup.sh"), "uninstall"],
                             env=env, stdin=slave, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    os.close(slave)
    os.write(master, (answer + "\n").encode())
    out, _ = child.communicate(timeout=20)
    os.close(master)
    assert child.returncode == 0, out


with socket.socket() as sentinel:
    sentinel.bind(("0.0.0.0", 443))
    sentinel.listen()
    run("--help")
    run("unknown-action", succeeds=False)
    run("install", "999.0.0.1", succeeds=False)
    with socket.socket() as busy:
        busy.bind(("0.0.0.0", 80))
        busy.listen()
        assert "80" in run("install", "203.0.113.10", succeeds=False)
    assert not Path("/opt/munchkin-hero").exists()
    run("install", "203.0.113.10", succeeds=False, extra_env={"BAD_CHECKSUM": "1"})
    assert not Path("/opt/munchkin-hero").exists()
    # Checksums must reject modified site bytes before installing anything.
    index = package / "site/index.html"
    original = index.read_bytes()
    index.write_text("corrupted download")
    assert "повреждены" in run("install", "203.0.113.10", succeeds=False)
    index.write_bytes(original)
    run("install", "203.0.113.10")
    site = Path("/opt/munchkin-hero/site")
    assert (site / "index.html").read_bytes() == original
    assert (site.stat().st_mode & 0o777) == 0o755
    assert (site / "index.html").stat().st_mode & 0o777 == 0o644
    assert "203.0.113.10" in Path("/opt/munchkin-hero/Caddyfile").read_text()
    run("install", "203.0.113.10", succeeds=False)
    cert = Path("/var/lib/munchkin-hero/test-certificate")
    cert.parent.mkdir(parents=True, exist_ok=True)
    cert.write_text("keep certificate")
    (site / "index.html").write_text("old page")
    (site / "assets/old.js").write_text("keep old asset")
    calls = Path(env["SERVICE_LOG"]).read_text()
    run("update")
    assert Path(env["SERVICE_LOG"]).read_text() == calls, "Update restarted a service"
    assert (site / "index.html").read_bytes() == original
    assert (site / "assets/old.js").read_text() == "keep old asset"
    assert any(p.read_text() == "old page" for p in Path("/opt/munchkin-hero/backups").glob("site.*/index.html"))
    run("stop")
    run("start")
    unit = Path("/etc/systemd/system/munchkin-hero.service")
    unit_data = unit.read_bytes()
    unit.write_text("custom service")
    run("uninstall", succeeds=False)
    unit.write_bytes(unit_data)
    uninstall("cancel")
    assert unit.exists() and site.exists()
    uninstall("REMOVE")
    removed = list(Path("/opt").glob("munchkin-hero-removed.*"))
    assert len(removed) == 1 and (removed[0].stat().st_mode & 0o777) == 0o700
    assert (removed[0] / "app/site/index.html").read_bytes() == original
    assert (removed[0] / "munchkin-hero.service").read_bytes() == unit_data
    assert not unit.exists() and not site.exists()
    assert cert.read_text() == "keep certificate"
    assert sentinel.getsockname()[1] == 443
print("PASS: checksums, invalid IP, busy 80, first install, repeat refusal, update backup, old assets, app-only controls, uninstall confirmation, retained certificate/files, port 443 preserved.")
