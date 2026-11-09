#!/usr/bin/env bash
set -euo pipefail

fail() { printf 'ОШИБКА: %s\n' "$*" >&2; exit 1; }
[[ ${EUID} -eq 0 ]] || fail 'Запустите обновление через sudo или от root.'
[[ $# -eq 1 ]] || fail 'Использование: bash secure-update-ip.sh ПУБЛИЧНЫЙ_IPV4'
public_ip=$1
[[ $public_ip =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || fail 'Укажите IPv4-адрес приложения.'
IFS=. read -r -a ip_parts <<< "$public_ip"
for part in "${ip_parts[@]}"; do
    (( 10#$part <= 255 )) || fail 'Некорректный IPv4-адрес.'
    [[ $part == 0 || $part != 0* ]] || fail 'Укажите IPv4 без ведущих нулей.'
done

package_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
app_dir=/opt/munchkin-hero
caddy="$app_dir/bin/caddy"
config="$app_dir/Caddyfile"
for binary in readlink find cp install mv chmod mktemp sed cmp systemctl curl bash grep rm; do
    command -v "$binary" >/dev/null || fail "Не найдена команда $binary."
done
[[ $(readlink -f -- "$app_dir") == "$app_dir" && ! -L "$config" && -f "$config" && -x "$caddy" ]] || fail 'Не найдена обычная установка приложения; автоматическая замена остановлена.'
[[ ! -L "$app_dir/backups" ]] || fail 'Каталог резервных копий оказался символической ссылкой.'
for file in Caddyfile.template Caddyfile.legacy.template update-ip.sh; do
    [[ -f "$package_dir/$file" ]] || fail "В архиве отсутствует $file."
done
systemctl is-active --quiet munchkin-hero.service || fail 'Служба munchkin-hero не запущена. Сначала проверьте её журнал.'

work_dir=$(mktemp -d /tmp/munchkin-security.XXXXXXXX)
cleanup() {
    [[ -n ${work_dir:-} && $work_dir == /tmp/munchkin-security.* ]] && rm -rf -- "$work_dir"
}
trap cleanup EXIT
sed "s/__PUBLIC_IP__/$public_ip/g" "$package_dir/Caddyfile.template" > "$work_dir/Caddyfile"
sed "s/__PUBLIC_IP__/$public_ip/g" "$package_dir/Caddyfile.legacy.template" > "$work_dir/legacy"

# Compare parsed configs, so whitespace and comments do not affect the check.
# Never replace a config containing an added host, proxy or custom TLS settings.
# Use the same stdin filename: file_server automatically hides the config path.
"$caddy" adapt --config - --adapter caddyfile < "$config" > "$work_dir/current.json"
"$caddy" adapt --config - --adapter caddyfile < "$work_dir/legacy" > "$work_dir/legacy.json"
"$caddy" adapt --config - --adapter caddyfile < "$work_dir/Caddyfile" > "$work_dir/new.json"
if ! cmp -s "$work_dir/current.json" "$work_dir/legacy.json" && ! cmp -s "$work_dir/current.json" "$work_dir/new.json"; then
    fail 'Caddyfile отличается от стандартной конфигурации для этого IP. Файлы и службы не изменены. Необходимо проверить пользовательские настройки вручную.'
fi
XDG_DATA_HOME="$work_dir/data" XDG_CONFIG_HOME="$work_dir/config" \
    "$caddy" validate --config "$work_dir/Caddyfile" --adapter caddyfile

# The site updater validates its paths and backs up the current files first.
bash "$package_dir/update-ip.sh"
install -d -m 0700 "$app_dir/backups"
backup_dir=$(mktemp -d "$app_dir/backups/security.XXXXXXXX")
install -m 0600 "$config" "$backup_dir/Caddyfile"
printf 'Резервная копия конфигурации: %s/Caddyfile\n' "$backup_dir"
install -m 0644 "$work_dir/Caddyfile" "$work_dir/publish"
install -m 0644 "$work_dir/publish" "$app_dir/.Caddyfile.next"
mv -f -- "$app_dir/.Caddyfile.next" "$config"

# The admin API is disabled. Only this application needs a short restart.
if systemctl restart munchkin-hero.service && systemctl is-active --quiet munchkin-hero.service \
    && curl --fail --silent --show-error --max-time 10 --retry 2 --retry-connrefused --retry-delay 1 --retry-max-time 25 \
        -D "$work_dir/headers" "https://$public_ip:8443/" -o /dev/null \
    && grep -qi '^content-security-policy:' "$work_dir/headers"; then
    printf '\nПриложение обновлено: https://%s:8443\n' "$public_ip"
    printf 'Защитные HTTP-заголовки включены. Сертификаты, systemd и firewall не изменены.\n'
    printf 'Перезапущена только munchkin-hero; службы на 443 не затрагивались.\n'
else
    install -m 0644 "$backup_dir/Caddyfile" "$app_dir/.Caddyfile.rollback"
    mv -f -- "$app_dir/.Caddyfile.rollback" "$config"
    if systemctl restart munchkin-hero.service; then
        printf 'Предыдущая конфигурация восстановлена; новые файлы сайта сохранены.\n' >&2
    else
        printf 'Конфигурация восстановлена, но служба не запустилась. Проверьте journalctl -u munchkin-hero -n 50 --no-pager.\n' >&2
    fi
    fail 'Проверка после перезапуска не прошла. Резервные копии сохранены.'
fi
