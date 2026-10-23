# Деплой на Cloudflare Pages

Приложение — чистая статика (Vite + PWA), бэкенда нет. Cloudflare Pages (бесплатный
тариф) подходит полностью: отдаёт сайт по HTTPS, а репозиторий с кодом может
оставаться приватным.

## Шаг 1. Собрать проект

```bash
npm install
npm run build      # результат — папка dist/
```

`dist/` — это и есть сайт: `index.html`, ассеты, `manifest.webmanifest`, `sw.js`,
иконки и фотографии.

Локальная проверка именно собранной версии:

```bash
npm run preview    # http://127.0.0.1:4173
```

> `BASE_PATH` для Cloudflare Pages задавать **не нужно**: сайт лежит в корне домена,
> сборка идёт с `base: "/"`. Значение нужно только для хостингов с подпапкой
> (например, `https://user.github.io/repo/`).

## Шаг 2. Создать проект и задеплоить

### Вариант A — вручную через панель (самый быстрый)

1. Откройте [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**.
2. **Create application → Pages → Upload assets**.
3. Имя проекта: `tvoi-vybor`.
4. Перетащите папку `dist` в окно загрузки → **Deploy**.
5. Через минуту сайт доступен: `https://tvoi-vybor.pages.dev`.

Обновление: снова `npm run build` и загрузить новую папку `dist`.

### Вариант B — CLI (wrangler)

```bash
npx wrangler login                                  # авторизация в аккаунте Cloudflare
npx wrangler pages project create tvoi-vybor       # создать проект (один раз)
npm run build
npx wrangler pages deploy dist --project-name tvoi-vybor
```

После деплоя CLI печатает URL деплоя (`https://<hash>.tvoi-vybor.pages.dev`);
постоянный адрес проекта — `https://tvoi-vybor.pages.dev`.

`wrangler login` открывает браузер — нужно подтвердить вход аккаунтом Cloudflare.
Альтернатива для CI: токен API (`CLOUDFLARE_API_TOKEN`) + `CLOUDFLARE_ACCOUNT_ID`.

### Вариант C — автодеплой из GitHub (приватный репозиторий поддерживается)

1. **Create application → Pages → Connect to Git**.
2. Авторизуйте GitHub и выберите репозиторий с проектом, ветку `main`.
3. Настройки сборки:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variables: **пусто** (или `BASE_PATH` = `/`)
4. **Save and Deploy**.

Дальше каждый `git push` в `main` пересобирает и публикует сайт автоматически,
без публикации репозитория.

## Шаг 3. Проверить результат

- Сайт открывается по HTTPS.
- Service worker зарегистрирован в scope `/`.
- Фото клуба и галереи ПГУ грузятся (кэшируются отдельно от precache).
- Манифест отдаётся с MIME `application/manifest+json`.
- Приложение открывается в standalone-режиме и работает без сети.

## Важно для PWA

- Service worker работает только по **HTTPS** — на Cloudflare Pages это из коробки.
- После первого деплоя откройте сайт на телефоне и установите приложение:
  Android — кнопка «Установить приложение» внутри приложения (нативный промпт),
  iOS — «Поделиться → На экран “Домой”».
- Версия обновляется автоматически: `registerType: "autoUpdate"`, новый `build`
  меняет precache-манифест.
- Если менялись иконки (`public/icons/`) или манифест — **переустановите** PWA
  на телефоне: уже установленные приложения не всегда подхватывают изменения
  иконок сразу.

## Что не должно попадать в репозиторий

`node_modules/`, `dist/` (собирается при деплое), временные файлы и локальные
скрипты — всё перечислено в `.gitignore`.
