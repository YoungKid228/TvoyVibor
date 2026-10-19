# Деплой на Vercel

Приложение — чистая статика (Vite + PWA), бэкенда нет. Vercel подходит полностью, бесплатного тарифа (Hobby) достаточно.

## Вариант 1 — через Git (рекомендуется: авто-деплой при каждом пуше)

1. **Залей проект в GitHub**

   ```bash
   git add -A
   git commit -m "Prepare for release"
   git remote add origin https://github.com/<твой-логин>/tvoj-vybor.git
   git push -u origin main
   ```

   Имя репозитория любое (например `tvoj-vybor`), репозиторий можно private.

2. **Импортируй проект в Vercel**
   - Зайди на [vercel.com](https://vercel.com) под аккаунтом GitHub.
   - **Add New → Project → Import** — выбери репозиторий.
   - Vercel сам определит Vite. Проверь настройки (должны подставиться сами):
     - Framework Preset: **Vite**
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`
   - Нажми **Deploy**.

3. Готово — через ~минуту приложение будет на адресе вида
   `https://tvoj-vybor-<хеш>.vercel.app`. Домен можно поменять в
   **Settings → Domains** (можно подключить и свой домен).

4. **Обновления**: правки кода → `git push` → Vercel пересобирает и выкладывает
   автоматически. Каждый pull request получает отдельный preview-адрес.

## Вариант 2 — через Vercel CLI (без Git)

```bash
npm i -g vercel
vercel login
vercel --prod
```

При первом запуске CLI задаст пару вопросов (framework — Vite, остальное по
умолчанию) и задеплоит.

## Важно для PWA

- Сервис-воркер и манифест работают только по **HTTPS** — на Vercel это из
  коробки.
- После первого деплоя открой сайт на телефоне, меню браузера → «Установить
  приложение» (iOS: Поделиться → На экран «Домой»).
- При обновлении версии кэш сбрасывается сам: `registerType: "autoUpdate"`,
  новый `build` меняет precache-манифест.
- Если менялись иконки (`public/icons/`) или имя в `vite.config.ts`
  (секция `manifest`) — после деплоя **переустанови** PWA на телефоне:
  уже установленные приложения не всегда подхватывают новые иконки сразу.

## Локальная проверка сборки перед деплоем

```bash
npm run build
npm run preview   # http://localhost:4173 — именно собранная версия
```

## Структура для деплоя

В репозиторий не должны попадать: `node_modules/`, `dist/` (собирается на
Vercel), временные файлы — всё перечислено в `.gitignore`.
