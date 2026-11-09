"""Regression tests for public-file filtering and privacy checks."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("public_check", Path(__file__).with_name("check-public-files.py"))
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


class PublicFilesTests(unittest.TestCase):
    def inspect(self, content, name="README.md"):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            file = root / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(content, encoding="utf-8")
            return check.findings(file, root)

    def test_documentation_and_loopback_addresses(self):
        self.assertEqual(self.inspect("203.0.113.10 198.51.100.1 192.0.2.5 127.0.0.1 0.0.0.0 http://[::1]/"), [])

    def test_real_ip_rejected_without_logging_value(self):
        value = ".".join(map(str, (45, 67, 89, 10)))
        errors = self.inspect("https://" + value + ":8443")
        self.assertTrue(errors)
        self.assertNotIn(value, "\n".join(errors))

    def test_private_lan_ip_also_rejected(self):
        self.assertTrue(self.inspect(".".join(map(str, (192, 168, 1, 5)))))

    def test_personal_windows_path(self):
        self.assertTrue(self.inspect("C:" + "\\Users\\example\\project"))

    def test_secret_formats_rejected(self):
        for value in ("ghp_" + "a" * 36, "AKIA" + "A" * 16,
                      "-----BEGIN " + "OPENSSH PRIVATE KEY-----",
                      "https://name:secret" + "@example.com/"):
            with self.subTest(kind=value[:5]):
                errors = self.inspect(value)
                self.assertTrue(errors)
                self.assertNotIn(value, "\n".join(errors))

    def test_private_files_rejected(self):
        for name in (".env", ".env.production", ".ssh/config", "artifacts/backup.zip", "site/server.key", "SECURITY-REVIEW.md", "PUBLISHING.md"):
            with self.subTest(name=name):
                self.assertTrue(self.inspect("not a real secret", name))

    def test_template_and_legal_attribution_allowed(self):
        self.assertEqual(self.inspect("MUNCHKIN_HTTP_PORT=18080", "deploy/vps.env.example"), [])
        self.assertEqual(self.inspect("Copyright author (author@example.com)"), [])

    def test_source_manifest_contains_no_private_files(self):
        files = check.source_files()
        self.assertTrue(files)
        self.assertFalse(any(check.private_path(p.relative_to(check.ROOT)) for p in files))


if __name__ == "__main__":
    unittest.main()
