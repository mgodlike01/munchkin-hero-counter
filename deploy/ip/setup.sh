#!/usr/bin/env bash
set -euo pipefail
fail() { printf 'ОШИБКА: %s\n' "$*" >&2; exit 1; }
package_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

help() {
    printf 'Манчкин — установка и управление\n\n'
    printf 'sudo bash setup.sh                   — открыть меню\n'
    printf 'sudo bash setup.sh install [IPv4]    — установить\n'
    printf 'sudo bash setup.sh update            — обновить файлы сайта\n'
    printf 'sudo bash setup.sh status            — состояние службы\n'
    printf 'sudo bash setup.sh logs              — последние 50 записей\n'
    printf 'sudo bash setup.sh start|stop        — запуск / остановка приложения\n'
    printf 'sudo bash setup.sh uninstall         — отключить и сохранить установку в архивном каталоге\n'
}
if [[ ${1:-} == --help || ${1:-} == -h ]]; then help; exit 0; fi
[[ ${EUID} -eq 0 ]] || fail 'Запустите через sudo: sudo bash setup.sh'
[[ $# -le 2 ]] || fail 'Слишком много аргументов. Используйте --help.'
action=${1:-}
if [[ -z $action ]]; then
    [[ -t 0 ]] || fail 'Для меню нужен терминал. Используйте sudo bash setup.sh install IPv4 или --help.'
    printf '\nМАНЧКИН — СЧЁТЧИК ГЕРОЯ\n\n'
    printf '1. Установить на этот сервер\n2. Обновить из этого пакета\n3. Состояние\n4. Журнал\n5. Остановить\n6. Запустить\n7. Удалить с сохранением файлов\n0. Выход\n\n'
    read -r -p 'Выберите действие: ' choice
    case "$choice" in
        1) action=install ;; 2) action=update ;; 3) action=status ;;
        4) action=logs ;; 5) action=stop ;; 6) action=start ;;
        7) action=uninstall ;; 0) exit 0 ;; *) fail 'Нет такого пункта.' ;;
    esac
fi
[[ $# -lt 2 || $action == install ]] || fail 'Второй аргумент используется только для IP при установке.'
case "$action" in
    install|update)
        [[ -f "$package_dir/FILES.sha256" ]] || fail 'Нет FILES.sha256. Используйте готовый пакет из Releases.'
        (cd "$package_dir" && sha256sum --check --strict --quiet FILES.sha256) || fail 'Файлы пакета повреждены или изменены. Скачайте пакет заново.'
        ;;
    status|logs|start|stop|uninstall) ;;
    *) help; fail 'Неизвестное действие.' ;;
esac
case "$action" in
    install)
        [[ -r /etc/os-release ]] || fail 'Не удалось определить ОС.'
        os_id=$(awk -F= '$1 == "ID" {gsub(/"/, "", $2); print $2}' /etc/os-release)
        os_version=$(awk -F= '$1 == "VERSION_ID" {gsub(/"/, "", $2); print $2}' /etc/os-release)
        [[ $os_id == ubuntu && $os_version == 24.04 ]] || fail 'Мастер проверен для Ubuntu 24.04. Для других ОС используйте статический архив и свой веб-сервер.'
        public_ip=${2:-}
        printf '\nБудут созданы служба munchkin-hero и отдельный пользователь munchkin-web.\n'
        printf 'Нужны свободные и доступные извне TCP 80 и 8443. Службы на 443 сохраняются.\n'
        printf 'IP-сертификат будет публичным; IP попадёт в Certificate Transparency.\n'
        printf 'Установщик не меняет firewall и не обращается к серверу автора.\n\n'
        if [[ -z $public_ip ]]; then
            [[ -t 0 ]] || fail 'Укажите публичный IPv4 вторым аргументом.'
            read -r -p 'Публичный IPv4 этого сервера: ' public_ip
            read -r -p 'Установить приложение? [y/N]: ' answer
            [[ $answer == y || $answer == Y ]] || { printf 'Отменено.\n'; exit 0; }
        fi
        exec bash "$package_dir/install-ip.sh" "$public_ip"
        ;;
    update) exec bash "$package_dir/update-ip.sh" ;;
    status) exec systemctl status munchkin-hero.service --no-pager ;;
    logs) exec journalctl -u munchkin-hero.service -n 50 --no-pager ;;
    start|stop) exec systemctl "$action" munchkin-hero.service ;;
    uninstall) exec bash "$package_dir/uninstall.sh" ;;
esac
