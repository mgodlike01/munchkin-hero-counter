#!/usr/bin/env bash
set -euo pipefail

fail() { printf 'ОШИБКА: %s\n' "$*" >&2; exit 1; }
[[ ${EUID} -eq 0 ]] || fail 'Запустите обновление через sudo или от root.'
package_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_site="$package_dir/site"
target_site=/opt/munchkin-hero/site

for binary in readlink find cp install mv chmod mktemp; do
    command -v "$binary" >/dev/null || fail "Не найдена команда $binary."
done
[[ -f "$source_site/index.html" && -f "$source_site/sw.js" && -f "$source_site/manifest.webmanifest" ]] || fail 'В архиве отсутствует готовая папка site.'
[[ -d "$target_site" && -f "$target_site/index.html" ]] || fail 'Приложение не установлено в /opt/munchkin-hero/site.'
[[ $(readlink -f -- /opt/munchkin-hero) == /opt/munchkin-hero && $(readlink -f -- "$target_site") == "$target_site" ]] || fail 'Каталог приложения оказался символической ссылкой; автоматическое обновление остановлено.'
[[ -z $(find "$source_site" "$target_site" -type l -print -quit) ]] || fail 'В файлах сайта обнаружена символическая ссылка; проверьте каталог вручную.'
[[ ! -L /opt/munchkin-hero/backups ]] || fail 'Каталог резервных копий оказался символической ссылкой.'

install -d -m 0700 /opt/munchkin-hero/backups
backup_dir=$(mktemp -d /opt/munchkin-hero/backups/site.XXXXXXXX)
cp -a -- "$target_site/." "$backup_dir/"
printf 'Резервная копия текущего сайта: %s\n' "$backup_dir"

# Publish assets before entry points. Old hashed files remain available to open PWAs.
for entry in "$source_site"/*; do
    filename=${entry##*/}
    case "$filename" in index.html|sw.js) continue ;; esac
    cp -R -- "$entry" "$target_site/"
done
find "$target_site" -type d -exec chmod 0755 {} +
find "$target_site" -type f -exec chmod 0644 {} +
install -m 0644 "$source_site/index.html" "$target_site/.index.html.next"
install -m 0644 "$source_site/sw.js" "$target_site/.sw.js.next"
mv -f -- "$target_site/.index.html.next" "$target_site/index.html"
mv -f -- "$target_site/.sw.js.next" "$target_site/sw.js"

printf '\nФайлы сайта обновлены.\n'
printf 'Откройте приложение с интернетом и нажмите «Обновить», когда появится уведомление.\n'
printf 'Прогресс игроков хранится в браузерах и сохраняется.\n'
