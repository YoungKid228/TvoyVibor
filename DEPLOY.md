# Деплой на GitHub Pages

Приложение — чистая статика (Vite + PWA), бэкенда нет. GitHub Pages бесплатен
и пересобирает проект автоматически при каждом пуше в `main`.

## Как устроен деплой

Workflow `.github/workflows/deploy.yml` состоит из двух job'ов:

1. **build** — `npm ci` → сборка с `BASE_PATH=/<имя-репозитория>/` → загрузка
   папки `dist` как артефакта Pages.
2. **deploy** — публикация артефакта через `actions/deploy-pages@v4`.

`BASE_PATH` подставляется в `vite.config.ts` и используется как `base` для Vite
и `vite-plugin-pwa`, а также как `start_url`/`scope` манифеста и в путях иконок.
Поэтому приложение корректно работает из подпапки `/<имя-репозитория>/`.

## Шаг 1. Реквизиты репозитория

- Ветка `main` должна содержать актуальный код приложения.
- Репозиторий должен быть **публичным**: GitHub Pages на бесплатном плане
  недоступен для приватных репозиториев (нужен Pro/Team).
  Сделать публичным: **Settings → General → Danger Zone → Change visibility →
  Change repository visibility → Change to public**.

## Шаг 2. Включить Pages

1. **Settings → Pages**.
2. **Source**: *Deploy from a branch*.
3. Ветка: `main`, папка: `/ (root)`.
4. **Save**.

Первый деплой запустится автоматически (или вручную: **Actions → Deploy to
GitHub Pages → Run workflow**).

## Шаг 3. Публиковать изменения

```bash
git add -A
git commit -m "Описание изменений"
git push origin main
```

Workflow соберёт и опубликует сайт. Адрес: `https://<логин>.github.io/<имя-репозитория>/`.

## Шаг 4. Проверить результат

- Сайт открывается по HTTPS (при необходимости редирект с `http://`).
- Service worker зарегистрирован в scope `/<имя-репозитория>/`.
- Фото клуба и галереи ПГУ загружаются (кэшируются отдельно от precache).
- Манифест отдаётся с MIME `application/manifest+json`.
- Приложение открывается в standalone-режиме и работает без сети.

## Локальная проверка сборки с тем же base-path

```bash
MSYS_NO_PATHCONV=1 BASE_PATH=/<имя-репозитория>/ npm run build
MSYS_NO_PATHCONV=1 BASE_PATH=/<имя-репозитория>/ npm run preview
# http://127.0.0.1:4173/<имя-репозитория>/
```

`MSYS_NO_PATHCONV=1` нужен только в Git Bash на Windows — без него путь
`/<имя-репозитория>/` превратится в `C:/Program Files/Git/...`. В CI (Linux)
такой проблемы нет.

## Важно для PWA

- Service worker работает только по **HTTPS** — на GitHub Pages это из коробки.
- После первого деплоя откройте сайт на телефоне и установите приложение:
  Android — кнопка «Установить приложение» в приложении (нативный промпт),
  iOS — «Поделиться → На экран “Домой”».
- Версия обновляется автоматически: `registerType: "autoUpdate"`, новый `build`
  меняет precache-манифест.
- Если менялись иконки (`public/icons/`) или манифест — **переустановите** PWA
  на телефоне: уже установленные приложения не всегда подхватывают изменения
  иконок сразу.

## Другие статические хостинги

Подойдёт любой хостинг статических файлов по HTTPS:

- **Netlify** — Build Command `npm run build`, Publish Directory `dist`.
- **Cloudflare Pages** — Build Command `npm run build`, Output Directory `dist`.
- **Свой сервер** — отдать содержимое `dist/` как статику.

Для них `BASE_PATH` не задаётся: сборка идёт в корень (`base: "/"`).

## Что не должно попадать в репозиторий

`node_modules/`, `dist/` (собирается в CI), временные файлы и локальные скрипты —
всё перечислено в `.gitignore`.
