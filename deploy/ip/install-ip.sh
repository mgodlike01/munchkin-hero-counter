#!/usr/bin/env bash
set -euo pipefail

fail() { printf 'ОШИБКА: %s\n' "$*" >&2; exit 1; }
[[ ${EUID} -eq 0 ]] || fail 'Запустите установку через sudo или от root.'
[[ $# -eq 1 ]] || fail 'Использование: bash install-ip.sh ПУБЛИЧНЫЙ_IPV4'
public_ip=$1
[[ $public_ip =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || fail 'Укажите публичный IPv4 вашего сервера.'
IFS=. read -r -a ip_parts <<< "$public_ip"
for part in "${ip_parts[@]}"; do
    (( 10#$part <= 255 )) || fail 'Некорректный IPv4-адрес.'
    [[ $part == 0 || $part != 0* ]] || fail 'Укажите IPv4 без ведущих нулей.'
done

for binary in curl tar sha256sum sha512sum ss systemctl install useradd getent sed awk mktemp cp chmod find; do
    command -v "$binary" >/dev/null || fail "Не найдена команда $binary. Установка остановлена до изменения приложения."
done
[[ -d /run/systemd/system ]] || fail 'Требуется система с systemd (Ubuntu 24.04 подходит).'

package_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ -f "$package_dir/site/index.html" && -f "$package_dir/site/sw.js" && -f "$package_dir/site/manifest.webmanifest" ]] || fail 'Рядом с установщиком должна быть папка site из готового архива.'
[[ -f "$package_dir/Caddyfile.template" && -f "$package_dir/munchkin-hero.service" ]] || fail 'В архиве отсутствуют файлы настройки.'

for port in 80 8443; do
    listeners=$(ss -H -ltn "sport = :$port")
    [[ -z $listeners ]] || fail "TCP-порт $port уже занят. Существующие процессы не изменены."
done
[[ ! -e /opt/munchkin-hero && ! -L /opt/munchkin-hero ]] || fail 'Каталог /opt/munchkin-hero уже существует. Для обновления используйте отдельную инструкцию.'
[[ ! -e /var/lib/munchkin-hero && ! -L /var/lib/munchkin-hero ]] || fail 'Каталог /var/lib/munchkin-hero уже существует; автоматическая перезапись запрещена.'
[[ ! -e /etc/systemd/system/munchkin-hero.service ]] || fail 'Служба munchkin-hero уже существует.'
if getent passwd munchkin-web >/dev/null || getent group munchkin-web >/dev/null; then
    fail 'Пользователь или группа munchkin-web уже существуют; установка остановлена.'
fi

case $(uname -m) in
    x86_64) caddy_arch=amd64 ;;
    aarch64|arm64) caddy_arch=arm64 ;;
    *) fail 'Поддерживаются x86_64 и arm64.' ;;
esac
caddy_version=2.11.7
archive_name="caddy_${caddy_version}_linux_${caddy_arch}.tar.gz"
base_url="https://github.com/caddyserver/caddy/releases/download/v${caddy_version}"
download_dir=$(mktemp -d /tmp/munchkin-install.XXXXXXXX)
cleanup() { [[ -n ${download_dir:-} && $download_dir == /tmp/munchkin-install.* ]] && rm -rf -- "$download_dir"; }
trap cleanup EXIT

printf 'Загрузка Caddy %s (%s) с официального GitHub...\n' "$caddy_version" "$caddy_arch"
curl --fail --location --retry 3 --proto '=https' --tlsv1.2 "$base_url/$archive_name" -o "$download_dir/$archive_name"
curl --fail --location --retry 3 --proto '=https' --tlsv1.2 "$base_url/caddy_${caddy_version}_checksums.txt" -o "$download_dir/checksums.txt"
expected_hash=$(awk -v target="$archive_name" '$2 == target || $2 == "*" target {print $1}' "$download_dir/checksums.txt")
if [[ $expected_hash =~ ^[[:xdigit:]]{128}$ ]]; then
    checksum_tool=sha512sum
elif [[ $expected_hash =~ ^[[:xdigit:]]{64}$ ]]; then
    checksum_tool=sha256sum
else
    fail 'В официальном списке не найдена поддерживаемая контрольная сумма Caddy.'
fi
(cd "$download_dir" && printf '%s  %s\n' "$expected_hash" "$archive_name" | "$checksum_tool" --check --status)
tar -xzf "$download_dir/$archive_name" -C "$download_dir" caddy
chmod 0755 "$download_dir/caddy"
sed "s/__PUBLIC_IP__/$public_ip/g" "$package_dir/Caddyfile.template" > "$download_dir/Caddyfile"
XDG_DATA_HOME="$download_dir/data" XDG_CONFIG_HOME="$download_dir/config" \
    "$download_dir/caddy" validate --config "$download_dir/Caddyfile" --adapter caddyfile

# Re-check immediately before installation. No process on a busy port is stopped.
for port in 80 8443; do
    [[ -z $(ss -H -ltn "sport = :$port") ]] || fail "TCP-порт $port был занят во время подготовки."
done

useradd --system --user-group --home-dir /var/lib/munchkin-hero --shell /usr/sbin/nologin munchkin-web
install -d -m 0755 /opt/munchkin-hero/bin /opt/munchkin-hero/site
install -m 0755 "$download_dir/caddy" /opt/munchkin-hero/bin/caddy
install -m 0644 "$download_dir/Caddyfile" /opt/munchkin-hero/Caddyfile
cp -R -- "$package_dir/site/." /opt/munchkin-hero/site/
find /opt/munchkin-hero/site -type d -exec chmod 0755 {} +
find /opt/munchkin-hero/site -type f -exec chmod 0644 {} +
install -m 0644 "$package_dir/munchkin-hero.service" /etc/systemd/system/munchkin-hero.service
systemctl daemon-reload
systemctl enable --now munchkin-hero.service

printf '\nПриложение: https://%s:8443\n' "$public_ip"
printf 'Сертификат выпускается и продлевается автоматически через HTTP-01 на TCP 80.\n'
printf 'Порты 80 и 8443 должны быть доступны извне в действующем firewall и панели VPS.\n'
printf 'Журнал: journalctl -u munchkin-hero -n 50 --no-pager\n'
printf 'Остановка только приложения: systemctl stop munchkin-hero\n'
printf 'Существующие службы и правила firewall установщик не меняет.\n'
