# PWA «ПГУ: Экономика — твой выбор» (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Клиентское PWA с профориентационными тестами (2 аудитории × 20 вопросов), подсчётом соответствия по профессиям, локальным сохранением прогресса и установкой/офлайном.

**Architecture:** Чисто клиентский SPA без роутера (3 вида: Home / Test / Install — состояние в `App.tsx`). Данные — статические JSON в бандле. Подсчёт результата — чистая функция над ответами. Прогресс — `localStorage`. PWA — `vite-plugin-pwa` (generateSW, Workbox precache).

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS (v4, `@tailwindcss/vite`) + vite-plugin-pwa (Workbox) + Vitest + Playwright.

**Spec:** `TECH_STACK_PGU_Economics_PWA.md`; исходный контент — `Proektnaya_deyatelnost.docx` (вопросы в нём примерные; финальные тесты составляются на Task 10). Решения пользователя: 20 вопросов в тесте; методика — баллы по нескольким профессиям из одного теста; тексты вопросов готовит агент.

## Global Constraints

- Каждый опубликованный тест содержит ровно 20 вопросов (валидация автотестом).
- Две аудитории: `school` и `college_or_bachelor`; для обеих определён хотя бы один тест.
- Все id (`direction`, `profession`, `question`, `option`) уникальны; каждый `professionId` в `scores` существует.
- Результат — «показатель соответствия модели теста», % нормируется по достижимому максимуму; никаких «научных» формулировок.
- Mobile-first, ширина от 320 px, без горизонтальной прокрутки; `prefers-reduced-motion` учитывается.
- Обновление Service Worker не теряет текущие ответы (прогресс в localStorage переживает reload).
- Обычный браузер → `InstallPage`; standalone → тесты (`matchMedia("(display-mode: standalone)")` + fallback-инструкция).
- В localStorage только: testId, ответы, номер вопроса, дата изменения. Без секретов.
- Зависимости — только перечисленные в стеке; версии фиксировать в `package.json`.

## Review Focus

1. **Повреждённый/чужой localStorage** — приложение не падает, прогресс сбрасывается молча на валидное состояние; тест в Task 4.
2. **Пропущенный ответ** (вернулся назад и ушёл вперёд, не ответив) — вопрос исключается и из суммы, и из максимума; тест в Task 3.
3. **Ничьи по профессиям** — стабильный порядок по порядку профессий в `professions.json`; тест в Task 3.
4. **Профессия без набранных баллов** — max=0 не даёт NaN/Infinity при нормализации; тест в Task 3.
5. **Данные** — дубликаты id / несуществующая профессия в `scores` / ≠20 вопросов ловятся валидатором до публикации; тесты в Task 5 и Task 10.

---

### Task 1: Скаффолд проекта

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Test: `tests/smoke.test.ts`

- [ ] **Step 1:** Создать проект: `npm create vite@latest . -- --template react-ts` в корне репозитория, затем `npm i && npm i -D vitest @testing-library/react jsdom tailwindcss @tailwindcss/vite vite-plugin-pwa`.
- [ ] **Step 2:** Подключить в `vite.config.ts` плагины `@tailwindcss/vite` и `VitePWA` (registerType: `"autoUpdate"`, manifest на этом этапе не включаем — он настраивается в Task 8), добавить `/// <reference types="vitest" />` и блок `test: { environment: "jsdom" }`.
- [ ] **Step 3:** Smoke-тест: `tests/smoke.test.ts` — `import App from "../src/App"` рендерится без исключения (`render(<App/>)`). Запуск: `npx vitest run`. Expected: PASS.
- [ ] **Step 4:** В `package.json` скрипты: `"test": "vitest run"`, `"test:e2e": "playwright test"`. Запуск `npm run build`. Expected: сборка успешна.
- [ ] **Step 5:** Commit: `chore: scaffold vite react-ts pwa project`

### Task 2: Типы и схема данных

**Files:**
- Create: `src/types/test.ts`, `src/data/directions.json`, `src/data/professions.json`, `src/data/tests.json`

**Interfaces:**
- Produces (весь дальнейший код опирается на эти типы):

```ts
export type Audience = "school" | "college_or_bachelor";
export type AnswerOption = { id: string; label: string; scores: Record<string, number> };
export type Question = { id: string; text: string; professionGroupId: string; options: AnswerOption[] };
export type CareerTest = { id: string; directionId: string; audience: Audience; title: string; questionIds: string[] };
export type Profession = { id: string; directionId: string; title: string; description: string };
export type Direction = { id: string; title: string; programs: string[] };
```

- JSON-структура зеркальна типам: `directions.json` — `Direction[]`; `professions.json` — `Profession[]`; `tests.json` — `{ questions: Question[]; tests: CareerTest[] }` (вопросы плоско, тест ссылается по `questionIds`).
- Наполнение на этом этапе: 1 направление «Экономика», 10 профессий из Блока 1 docx (id: `accountant`, `tax_consultant`, `business_analyst`, `credit_specialist`, `financial_analyst`, `procurement_specialist`, `economist`, `economic_security`, `insurance_agent` — описания из Блока 2 docx; карточки профессий отдельным экраном в v1 не входят, но описания нужны для экрана результата), 1 черновой тест-пустышка для разработки.

- [ ] **Step 1:** Создать `src/types/test.ts` с типами выше (точно эти имена полей).
- [ ] **Step 2:** Создать JSON-файлы с минимальным валидным содержимым (см. наполнение выше).
- [ ] **Step 3:** `npm run build`. Expected: PASS.
- [ ] **Step 4:** Commit: `feat: add data types and seed data files`

### Task 3: Подсчёт результата `src/lib/scoring.ts` (TDD)

**Files:**
- Create: `src/lib/scoring.ts`
- Test: `tests/scoring.test.ts`

**Interfaces:**
- Consumes: типы из Task 2.
- Produces:

```ts
export type ScoredProfession = {
  profession: Profession;
  raw: number;          // сумма баллов по отвеченным вопросам
  max: number;          // достижимый максимум по тем же вопросам
  percent: number;      // 0..100 = raw/max*100; max===0 -> 0
};
export function scoreTest(
  questions: Question[],
  answers: Record<string, string | null>,
  professions: Profession[],
): ScoredProfession[];
// отсортировано по percent desc; ничья — порядок профессий из professions.json
export function getResultExtremes(scored: ScoredProfession[]): { best: ScoredProfession; worst: ScoredProfession };
```

Алгоритм: пропущенный вопрос (`answers[q.id] == null` или id опции не найден) исключает вопрос из raw И из max; `percent = max === 0 ? 0 : Math.round(raw / max * 100)`.

- [ ] **Step 1:** Пишем падающие тесты: (a) простой тест 2 вопроса × 2 профессии — сумма считается верно; (b) пропущенный ответ исключает вопрос из raw и max; (c) ничья сохраняет порядок professions.json; (d) max=0 → percent=0 без NaN; (e) сортировка по percent desc; (f) getResultExtremes возвращает first/last.
- [ ] **Step 2:** `npx vitest run tests/scoring.test.ts`. Expected: FAIL (модуль не найден).
- [ ] **Step 3:** Реализовать `scoring.ts` по сигнатурам выше.
- [ ] **Step 4:** `npx vitest run tests/scoring.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: multi-profession scoring with normalization`

### Task 4: Хранение прогресса `src/lib/storage.ts` (TDD)

**Files:**
- Create: `src/lib/storage.ts`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Produces:

```ts
export type TestProgress = {
  testId: string;
  answers: Record<string, string | null>;
  currentIndex: number;
  updatedAt: string; // ISO date
};
export const STORAGE_KEY = "pgu-econ-progress-v1";
export function loadProgress(testId: string): TestProgress | null;
export function saveProgress(p: TestProgress): void;
export function clearProgress(testId: string): void;
```

- [ ] **Step 1:** Падающие тесты: (a) save→load возвращает те же данные; (b) отсутствие записи → null; (c) повреждённый JSON → null без исключения; (d) запись с другим testId → null; (e) clearProgress удаляет запись.
- [ ] **Step 2:** `npx vitest run tests/storage.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Реализовать `storage.ts` (try/catch вокруг JSON.parse и localStorage-доступа; валидация формы объекта: testId — строка, answers — объект).
- [ ] **Step 4:** `npx vitest run tests/storage.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: localStorage progress persistence`

### Task 5: Валидация данных

**Files:**
- Test: `tests/data.test.ts`

**Interfaces:**
- Consumes: JSON Task 2 (`import questionsData from "../src/data/tests.json"` и т.д.).

- [ ] **Step 1:** Падающий набор тестов-валидаторов: (a) каждый тест — ровно 20 вопросов, все `questionIds` существуют; (b) id вопросов/опций/профессий/направлений уникальны; (c) каждый ключ каждого `scores` — существующий id профессии; (d) обе аудитории покрыты тестами; (e) у каждого вопроса ≥2 опции.
- [ ] **Step 2:** `npx vitest run tests/data.test.ts`. Expected: FAIL на текущих черновых данных (пустышка ≠ 20 вопросов).
- [ ] **Step 3:** Поправить сид-данные до валидных (20 заглушечных вопросов с осмысленными баллами по профессиям).
- [ ] **Step 4:** `npx vitest run`. Expected: все PASS.
- [ ] **Step 5:** Commit: `test: data integrity validation for published tests`

### Task 6: UI-компоненты теста

**Files:**
- Create: `src/components/AppShell.tsx`, `src/components/TestCard.tsx`, `src/components/ProgressBar.tsx`, `src/components/QuestionScreen.tsx`, `src/components/ResultScreen.tsx`

**Interfaces:**
- Consumes: типы Task 2, `ScoredProfession` из Task 3.
- Produces (пропсы — контракт для Task 7):

```tsx
AppShell({ children }: { children: ReactNode })            // шапка + контейнер, mobile-first
TestCard({ test, hasProgress, onStart }: { test: CareerTest; hasProgress: boolean; onStart: () => void })
ProgressBar({ current, total }: { current: number; total: number })     // role="progressbar", aria-valuenow
QuestionScreen({ question, index, total, selected, onAnswer, onNext, onBack, canGoBack }:
  { question: Question; index: number; total: number; selected: string | null;
    onAnswer: (optionId: string) => void; onNext: () => void; onBack: () => void; canGoBack: boolean })
ResultScreen({ scored, onRestart }:
  { scored: ScoredProfession[]; onRestart: () => void })   // best/worst вычисляет сам через getResultExtremes
```

- Стиль: Tailwind, интерактивные зоны ≥44 px, видимый focus (`focus-visible:`), контраст ≥4.5:1, `motion-safe:` для переходов.
- QuestionScreen: выбор ответа сразу вызывает `onAnswer` (сохранение мгновенное), кнопка «Далее» активна только при `selected != null`.
- ResultScreen: топ-2 и антилидер + объяснение «на основании чего сформирован результат» (формулировка про соответствие модели теста).
- `data-testid` для e2e: `test-card`, `answer-option`, `next-btn`, `back-btn`, `result-screen`, `progress-bar`.

- [ ] **Step 1:** Реализовать компоненты (визуальные — без unit-тестов; поведение покрывается e2e Task 9).
- [ ] **Step 2:** `npm run build`. Expected: PASS.
- [ ] **Step 3:** Commit: `feat: test flow ui components`

### Task 7: Страницы и связывание (App, Home, Test)

**Files:**
- Create: `src/pages/HomePage.tsx`, `src/pages/TestPage.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: компоненты Task 6, `storage.ts`, `scoring.ts`, JSON-данные, `isStandalone()` из Task 8 (появится позже; App пока рендерит home/test).
- Produces: внутреннее состояние App — `view: { name: "home" } | { name: "test"; testId: string }` (без роутера; install-view добавляется в Task 8).

Логика TestPage: монтирование — `loadProgress(testId)`, если есть — продолжить с `currentIndex`; каждый ответ и переход — `saveProgress`; после 20-го — подсчёт `scoreTest`, экран результата, `clearProgress`; «Пройти заново» — сброс состояния.

- [ ] **Step 1:** Реализовать HomePage (выбор аудитории → выбор теста) и TestPage по контракту выше.
- [ ] **Step 2:** Связать переключение view в `App.tsx`.
- [ ] **Step 3:** `npm run build && npx vitest run`. Expected: PASS.
- [ ] **Step 4:** Commit: `feat: home and test pages with progress restore`

### Task 8: PWA-манифест, Service Worker, InstallGate

**Files:**
- Modify: `vite.config.ts` (manifest), `src/App.tsx`
- Create: `src/lib/pwa.ts`, `src/components/InstallGate.tsx`, `public/icons/` (иконки 192/512 + maskable)

**Interfaces:**
- Produces:

```ts
// src/lib/pwa.ts
export function isStandalone(): boolean;
// window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true
```

- Manifest (в `vite.config.ts`): `name: "ПГУ: Экономика — твой выбор"`, `short_name: "ПГУ Экономика"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `theme_color`, `background_color`, иконки 192/512 (+ maskable).
- InstallGate: оборачивает контент в App; `isStandalone() === false` → экран-инструкция установки (Windows/macOS/Android/iOS) + кнопка «Продолжить в браузере» (запасной сценарий, доступ не блокируется).

- [ ] **Step 1:** Добавить manifest и placeholder-иконки (SVG→PNG или сгенерировать скриптом).
- [ ] **Step 2:** `src/lib/pwa.ts` + InstallGate, встроить в App.
- [ ] **Step 3:** `npm run build` → проверить в `dist/`: `manifest.webmanifest`, SW-файлы. Expected: присутствуют.
- [ ] **Step 4:** Commit: `feat: pwa manifest, service worker, install gate`

### Task 9: E2E-тесты Playwright

**Files:**
- Create: `playwright.config.ts`, `tests/test-flow.spec.ts`

- [ ] **Step 1:** `npm i -D @playwright/test && npx playwright install chromium`; конфиг: `webServer: { command: "npm run preview", port: 4173, reuseExistingServer: true }`.
- [ ] **Step 2:** Сценарий `test-flow.spec.ts`: (a) home → аудитория → тест → 20 ответов, проверка ProgressBar и сохранения ответа при возврате назад; (b) перезагрузка на 10-м вопросе → прогресс восстановлен; (c) после 20-го — экран результата (`result-screen`); (d) `/manifest.webmanifest` → 200.
- [ ] **Step 3:** `npm run test:e2e`. Expected: PASS.
- [ ] **Step 4:** Commit: `test: e2e test flow with progress persistence`

### Task 10: Финальный контент тестов

**Files:**
- Modify: `src/data/tests.json`, `src/data/professions.json`

- [ ] **Step 1:** Составить 2 теста × 20 вопросов (`school`, `college_or_bachelor`) по направлению «Экономика»: вопросы группируются по `professionGroupId`, опции раскладывают баллы по 2–4 профессиям так, чтобы профиль результата был осмысленным (аналитика/цифры → финанс-профессии; коммуникация → страховой агент, кредитный специалист и т.п.). Формулировки — по образцу docx, но оригинальные, без «правильных» ответов.
- [ ] **Step 2:** `npx vitest run tests/data.test.ts`. Expected: PASS.
- [ ] **Step 3:** `npm run test:e2e`. Expected: PASS.
- [ ] **Step 4:** Commit: `feat: final career test content for both audiences`

### Task 11: Финальная проверка и подготовка деплоя

**Files:**
- Create: `README.md` (запуск, тесты, деплой на Vercel: `npm run build`, каталог `dist`)

- [ ] **Step 1:** `npm run build && npx vitest run && npm run test:e2e`. Expected: всё PASS.
- [ ] **Step 2:** Проверка доступности: ширина 320 px без горизонтальной прокрутки, клавиатурная навигация по опциям, видимый фокус (Playwright/вручную).
- [ ] **Step 3:** Офлайн-проверка: открыть preview, отключить сеть (DevTools), перезагрузить — оболочка загружается из кэша.
- [ ] **Step 4:** Commit: `docs: readme with build and deploy instructions`

---

## Примечания по контенту (Task 10)

- Описания профессий — из Блока 2 docx (бухгалтер, налоговый консультант, бизнес-аналитик, кредитный специалист, финансовый аналитик, специалист по закупкам, экономист, специалист по экон. безопасности, страховой агент).
- Пороговые интерпретации из docx не переносятся 1:1 — они написаны под «один тест = одна профессия»; вместо них — процент соответствия по каждой профессии модели теста (согласовано с пользователем).
