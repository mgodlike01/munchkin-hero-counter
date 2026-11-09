#!/usr/bin/env bash
set -euo pipefail
fail() { printf 'ОШИБКА: %s\n' "$*" >&2; exit 1; }
[[ ${EUID} -eq 0 ]] || fail 'Запустите через sudo или от root.'
[[ $# -eq 0 ]] || fail 'Аргументы не поддерживаются.'
package_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
app_dir=/opt/munchkin-hero
unit=/etc/systemd/system/munchkin-hero.service
for binary in readlink cmp mktemp mv rm systemctl install; do
    command -v "$binary" >/dev/null || fail "Нет команды $binary."
done
[[ -d $app_dir && $(readlink -f -- "$app_dir") == "$app_dir" ]] || fail 'Не найдена обычная установка; автоматическое удаление остановлено.'
[[ -f $unit && ! -L $unit ]] || fail 'Не найдена обычная служба приложения.'
cmp -s "$package_dir/munchkin-hero.service" "$unit" || fail 'Служба изменена вручную. Автоматическое удаление остановлено.'
[[ -t 0 ]] || fail 'Для удаления запустите мастер в интерактивном терминале.'
printf 'Будет остановлена и отключена только munchkin-hero.\n'
printf 'Каталог программы и служба будут перенесены в закрытый каталог /opt/munchkin-hero-removed.*.\n'
printf 'Сертификаты, резервные копии и системный пользователь сохраняются для восстановления.\n'
read -r -p 'Введите REMOVE для подтверждения: ' confirmation
[[ $confirmation == REMOVE ]] || { printf 'Отменено.\n'; exit 0; }
archive_dir=$(mktemp -d /opt/munchkin-hero-removed.XXXXXXXX)
systemctl disable --now munchkin-hero.service
install -m 0600 "$unit" "$archive_dir/munchkin-hero.service"
mv -- "$app_dir" "$archive_dir/app"
rm -- "$unit"
systemctl daemon-reload
printf '\nПриложение отключено. Файлы: %s\n' "$archive_dir"
printf 'Данные сертификатов оставлены в /var/lib/munchkin-hero. Firewall и другие службы не изменены.\n'
printf 'Для восстановления:\n'
printf 'mv -- %q/app /opt/munchkin-hero\n' "$archive_dir"
printf 'install -m 0644 %q/munchkin-hero.service /etc/systemd/system/munchkin-hero.service\n' "$archive_dir"
printf 'systemctl daemon-reload && systemctl enable --now munchkin-hero.service\n'
