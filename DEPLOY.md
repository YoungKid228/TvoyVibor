# Деплой на GitHub Pages

Приложение — чистая статика (Vite + PWA), бэкенда нет. GitHub Pages бесплатен
и пересобирает проект автоматически при каждом пуше в `main`.

> На бесплатном плане GitHub Pages доступен только для **публичных**
> репозиториев. Если код должен остаться приватным — см. раздел про
> Cloudflare Pages в конце файла.

## Как устроен деплой

Workflow `.github/workflows/deploy.yml` состоит из двух job'ов:

1. **build** — `npm ci` → сборка с `BASE_PATH=/<имя-репозитория>/` → загрузка
   папки `dist` как артефакта Pages.
2. **deploy** — публикация артефакта через `actions/deploy-pages@v4`.

`BASE_PATH` подставляется в `vite.config.ts` и используется как `base` для Vite
и `vite-plugin-pwa`, а также как `start_url`/`scope` манифеста и в путях иконок.
Поэтому приложение корректно работает из подпапки `/<имя-репозитория>/`.

## Шаг 1. Открыть репозиторий

**Settings → General → Danger Zone → Change repository visibility → Change to
public** (если репозиторий приватный).

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

- Сайт открывается по HTTPS.
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

## Альтернатива: Cloudflare Pages (репозиторий может остаться приватным)

```bash
npm run build
npx wrangler login                                # авторизация в аккаунте Cloudflare
npx wrangler pages project create tvoi-vybor     # создать проект (один раз)
npx wrangler pages deploy dist --project-name tvoi-vybor
```

Либо в панели: **Create application → Pages → Upload assets** и перетащить папку
`dist`. Для автодеплоя из приватного репозитория: **Pages → Connect to Git**,
build command `npm run build`, output directory `dist`, переменную `BASE_PATH`
не задавать.

## Другие статические хостинги

- **Netlify** — Build Command `npm run build`, Publish Directory `dist`.
- **Свой сервер** — отдать содержимое `dist/` как статику.

## Что не должно попадать в репозиторий

`node_modules/`, `dist/` (собирается в CI), временные файлы и локальные скрипты —
всё перечислено в `.gitignore`.
