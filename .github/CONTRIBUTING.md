# Разработка

Node.js 24 и Python 3.10+. В Linux при необходимости используйте `python3`.

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
python scripts/check-public-files.py --tracked
python scripts/test-public-files.py
npm run package:vps
python scripts/verify-packages.py
```

Публичные файлы перечислены в `scripts/public-files.json`. Личные данные, локальная `.npmrc`, отчёты и резервные копии в репозиторий не входят.

Проверки запускаются при push и PR. Для релиза обновите версию в `package.json` и `package-lock.json`, затем отправьте тег `v` с этой версией. GitHub проверит приложение и установщик и создаст черновик релиза с архивами и контрольными суммами.

Установка на VPS описана в [инструкции](../deploy/INSTALL.md). Сборка релизов не использует SSH. Контейнер в тестах нужен только для проверки установщика.
