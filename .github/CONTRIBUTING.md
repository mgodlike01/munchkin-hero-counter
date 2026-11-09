# Разработка и выпуск

Нужны Node.js 24, npm и Python 3.10+ без дополнительных Python-пакетов. На Linux вместо `python` используйте `python3`.

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
python scripts/check-public-files.py --tracked
python scripts/test-public-files.py
python scripts/package-vps.py
python scripts/verify-packages.py
```

Публичные файлы перечислены в `scripts/public-files.json`. Для нового исходного файла внутри существующих папок менять список не нужно; новые корневые файлы добавляйте явно. Рабочие отчёты, секреты, резервные копии и весь каталог `artifacts/` в репозиторий не включаются. Перед упаковкой проверяются исходники и готовый `dist/`; затем отдельно проверяются содержимое и суммы трёх архивов.

`src/` и `public/` нужны приложению; `tests/`, `scripts/`, `playwright.config.ts` и `.github/workflows/` нужны для проверки и выпуска. `Dockerfile`, `docker-compose.yml`, `.dockerignore` и `deploy/` предоставляют варианты размещения. Конфигурация TypeScript/Vite, `package.json` и `package-lock.json` нужны для воспроизводимой сборки. На VPS при установке готового пакета эти исходники не требуются.

Workflow **Checks** запускается при push и PR. Для выпуска обновите версию в `package.json` и `package-lock.json`, загрузите изменения и отправьте тег `v` с этой версией. Workflow **Release** проверит приложение и установщик, затем создаст черновик релиза с архивами и контрольными суммами. Проверьте черновик и опубликуйте его через **Releases → Publish release**.

В релиз входят только `munchkin-vps-ip.tar.gz`, `munchkin-static.zip`, `munchkin-source.tar.gz` и `SHA256SUMS.txt`. Сборка не использует SSH и не подключается к VPS. Для неё достаточно временного `GITHUB_TOKEN`; право записи есть только у workflow релиза.

Не добавляйте в коммиты личную почту, если хотите скрыть её: настройте privacy email из GitHub → Settings → Emails. Лицензии сторонних библиотек и шрифтов сохраняйте. Собственную лицензию проекта выбирает владелец; после добавления `LICENSE` упаковщик включит её в исходный и установочный архивы.
