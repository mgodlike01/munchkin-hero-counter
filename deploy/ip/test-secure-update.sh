#!/usr/bin/env bash
# Run only inside the disposable test container; never on a real VPS.
set -euo pipefail
[[ -f /.dockerenv && -d /config && -d /release ]] || { printf 'Run only in the disposable test container.\n' >&2; exit 1; }
mkdir -p /tmp/package/site /tmp/mock /opt/munchkin-hero/site/assets /var/lib/munchkin-hero/certificates
cp /config/{secure-update-ip.sh,update-ip.sh,Caddyfile.template,Caddyfile.legacy.template} /tmp/package/
cp -R /release/. /tmp/package/site/
sed 's/__PUBLIC_IP__/127.0.0.1/g' /config/Caddyfile.legacy.template > /opt/munchkin-hero/Caddyfile
cp /opt/munchkin-hero/Caddyfile /tmp/original
printf 'old index' > /opt/munchkin-hero/site/index.html
printf 'old worker' > /opt/munchkin-hero/site/sw.js
printf 'old asset' > /opt/munchkin-hero/site/assets/old.js
printf 'keep certificate' > /var/lib/munchkin-hero/certificates/keep.pem

cat > /tmp/mock/systemctl <<'MOCK'
#!/usr/bin/env bash
set -eu
[[ ${*: -1} == munchkin-hero.service ]] || exit 91
printf '%s\n' "$*" >> /tmp/service.calls
if [[ $1 == restart && -e /tmp/fail-once ]]; then rm /tmp/fail-once; exit 1; fi
[[ $1 == is-active || $1 == restart ]]
MOCK
cat > /tmp/mock/curl <<'MOCK'
#!/usr/bin/env bash
set -eu
while (( $# )); do
    if [[ $1 == -D ]]; then printf "Content-Security-Policy: default-src 'self'\r\n" > "$2"; break; fi
    shift
done
MOCK
chmod +x /tmp/mock/{curl,systemctl}
export PATH="/tmp/mock:$PATH"
bash -n /tmp/package/secure-update-ip.sh

# A wrong IP or a customized config must stop before any site/config changes.
if bash /tmp/package/secure-update-ip.sh 127.0.0.2 > /tmp/reject.log 2>&1; then exit 1; fi
grep -q 'отличается от стандартной' /tmp/reject.log
[[ $(cat /opt/munchkin-hero/site/index.html) == 'old index' ]]
sed 's@/opt/munchkin-hero/site@/opt/munchkin-hero/custom@' /tmp/original > /opt/munchkin-hero/Caddyfile
if bash /tmp/package/secure-update-ip.sh 127.0.0.1 > /tmp/custom.log 2>&1; then exit 1; fi
grep -q 'отличается от стандартной' /tmp/custom.log
[[ ! -d /opt/munchkin-hero/backups ]]
cp /tmp/original /opt/munchkin-hero/Caddyfile

bash /tmp/package/secure-update-ip.sh 127.0.0.1
grep -q 'Content-Security-Policy' /opt/munchkin-hero/Caddyfile
cmp /release/index.html /opt/munchkin-hero/site/index.html
[[ $(cat /opt/munchkin-hero/site/assets/old.js) == 'old asset' ]]
[[ $(stat -c '%a %U' /opt/munchkin-hero/Caddyfile) == '644 root' ]]
[[ $(cat /var/lib/munchkin-hero/certificates/keep.pem) == 'keep certificate' ]]
[[ $(find /opt/munchkin-hero/backups -name Caddyfile -exec stat -c '%a' {} \;) == 600 ]]
[[ $(find /opt/munchkin-hero/backups -path '*/site.*/index.html' -exec cat {} \;) == 'old index' ]]

# Repeating a successful update is supported.
bash /tmp/package/secure-update-ip.sh 127.0.0.1

# A failed restart restores the old config and restarts only this app.
cp /tmp/original /opt/munchkin-hero/Caddyfile
touch /tmp/fail-once
if bash /tmp/package/secure-update-ip.sh 127.0.0.1 > /tmp/rollback.log 2>&1; then exit 1; fi
grep -q 'Предыдущая конфигурация восстановлена' /tmp/rollback.log
cmp /tmp/original /opt/munchkin-hero/Caddyfile
[[ $(grep -c '^restart munchkin-hero.service$' /tmp/service.calls) == 4 ]]
[[ $(cat /var/lib/munchkin-hero/certificates/keep.pem) == 'keep certificate' ]]
printf 'PASS: wrong IP/custom config rejected, site/config backups, private backup permissions, headers, retained old assets/certificates, idempotence, restart rollback, only app unit called.\n'
