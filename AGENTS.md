# AGENTS.md — Universal AI Development Rules

## 1. Core Principles

1. Understand the task before changing anything.
2. Prefer the smallest correct change that solves the actual problem.
3. Follow the existing architecture, conventions, and coding style.
4. Do not modify unrelated functionality.
5. Do not introduce new dependencies, abstractions, files, or configuration unless they are justified.
6. Never assume that code works merely because it looks correct.
7. Never claim that a task is complete without verifying the result.
8. Be efficient: avoid repetitive investigation, unnecessary planning, and redundant tool calls.

## 2. Project Discovery

Before working on a project:

1. Inspect the relevant project instructions, such as `AGENTS.md`, `README`, and applicable documentation.
2. Identify the relevant source files, tests, build commands, and existing architecture.
3. Inspect the installed Skills catalog only when necessary to identify a suitable skill. Do not repeatedly scan the catalog during the same task.
4. Reuse existing project patterns and utilities before introducing new ones.
5. Check the current state of relevant files and changes before editing. Never overwrite existing user changes without understanding their purpose.

Project-specific instructions take precedence over these general rules when they define legitimate project requirements or constraints.

Do not read the entire repository by default. Start with the files directly related to the task and expand the investigation only when evidence requires it.

## 3. Skill Usage Policy

Skills are tools for improving work, not mandatory ceremony.

### Primary skills

Use these when they fit the task:

- `systematic-debugging` — investigate existing bugs and unexpected behavior.
- `test-driven-development` — develop changes with applicable regression or behavior tests.
- `verification-before-completion` — verify the result before reporting completion.

### Conditional skills

Use other installed skills only when the task benefits from them:

- `brainstorming` — when requirements are unclear, multiple materially different solutions exist, or a design decision needs user input.
- `writing-plans` — when implementation involves substantial complexity or multiple dependent stages.
- `executing-plans` — when carrying out an existing, relevant implementation plan.
- Code review, security, performance, refactoring, documentation, and other skills — when specifically relevant to the task.

### Skill rules

1. Do not invoke every available skill for every task.
2. Do not use a planning or design skill for a straightforward, well-defined change unless it provides real value.
3. Do not reload or reread the same skill repeatedly within one task. Read its instructions when needed, then apply them.
4. Do not follow a skill mechanically when its workflow is inappropriate for the task. Preserve its relevant principles without unnecessary ceremony.
5. Do not invent skill names. Use only skills that are actually available.
6. If a suitable skill is unavailable, continue using sound engineering practices rather than becoming blocked.
7. Do not use subagents or parallel-agent workflows unless explicitly requested by the user or clearly necessary and supported by the environment.

## 4. Bug Fixing

For existing bugs, follow this workflow:

1. **Reproduce or verify the failure.** Inspect error messages, logs, API responses, runtime state, tests, and relevant source code as appropriate.
2. **Trace the cause.** Follow the actual execution path and identify why the behavior occurs.
3. **State the root cause.** Distinguish confirmed evidence from hypotheses.
4. **Create a regression test.** When practical, add a test that fails because of the original bug.
5. **Implement the smallest effective fix.** Avoid unrelated refactoring.
6. **Run the focused test.** Confirm that the regression is fixed and related behavior remains correct.
7. **Continue to the next issue.** For multiple independent bugs, work incrementally instead of spending the entire task investigating everything before making the first fix.
8. **Verify the final result.** Run relevant checks and inspect their actual output.

Do not guess at a root cause and immediately modify code when the failure can be investigated.

If the bug cannot be reproduced, explain what evidence supports the proposed fix and what remains uncertain.

If a test is impractical, explain why and use the strongest reasonable alternative verification.

## 5. Feature Development

For new functionality:

1. Understand the expected behavior and acceptance criteria.
2. Inspect existing architecture and identify the appropriate integration points.
3. Ask a focused clarification question only when an unresolved requirement materially affects the implementation.
4. For substantial or ambiguous features, compare relevant approaches before committing to a design.
5. Create an implementation plan only when the complexity or dependencies justify it.
6. Implement in small, coherent steps.
7. Add or update tests for the new behavior.
8. Verify compatibility with existing functionality.

Do not interrupt straightforward implementation with unnecessary approval requests. If the requirements are clear and the change is reversible, proceed using the project's established conventions.

Do not make major architectural changes without a concrete reason.

## 6. Testing and Verification

1. Inspect the available tests and project scripts before choosing commands.
2. Run focused tests during development.
3. Run relevant integration tests, type checks, linters, and build commands when applicable.
4. Run the broader test suite when appropriate for the scope and cost of the change.
5. Inspect actual command output, exit codes, and failure details.
6. Fix regressions introduced by the change.
7. Do not hide, delete, skip, or weaken tests merely to obtain a passing result.
8. Do not change unrelated tests to make the task appear complete.
9. Never claim that a test, build, or runtime check passed unless it was actually executed and passed.
10. If a check cannot be run, state which check was omitted and why.

A passing test suite does not automatically prove that the original user-visible problem is fixed. Verify the specific behavior whenever practical.

## 7. Efficient Tool and Context Usage

1. Inspect only the relevant portions of large files. Expand the inspected scope when necessary.
2. Search for symbols, call sites, state transitions, and tests instead of repeatedly reading entire files.
3. Do not repeat a command unless the previous result was inconclusive, the underlying state changed, or the repetition serves a clear verification purpose.
4. Avoid repeated investigations of the same hypothesis without new evidence.
5. Do not create temporary scripts, diagnostic files, or test fixtures unless they materially help resolve uncertainty. Remove temporary artifacts created during the task when they are no longer needed.
6. Do not perform expensive full-suite checks after every trivial edit if a focused check is sufficient at that stage.
7. For multiple independent issues, solve them incrementally and keep track of verified fixes and remaining work.
8. If progress stalls, summarize what is known, what remains uncertain, and the next concrete diagnostic step.
9. Do not continue redundant investigation merely to consume the available context.
10. Never report progress as implementation. Distinguish investigation, code changes, and verification.

## 8. Code Quality and Scope Control

1. Match the surrounding code style and established conventions.
2. Keep changes focused and the diff as small as reasonably possible.
3. Preserve public interfaces and backward compatibility unless the task requires otherwise.
4. Handle errors explicitly and consistently with the existing architecture.
5. Avoid duplicate logic when a suitable existing abstraction is available.
6. Do not refactor unrelated code during a bug fix.
7. Do not silently remove existing behavior, configuration, or compatibility support.
8. Do not hardcode values that belong in existing configuration.
9. Do not introduce security vulnerabilities, expose secrets, or weaken validation.
10. Review the final diff for accidental edits, temporary files, unrelated changes, and missing tests.

## 9. Existing User Changes and Version Control

1. Inspect the relevant working-tree state before editing when version control is available.
2. Preserve uncommitted changes made by the user or other contributors.
3. Do not reset, discard, overwrite, or revert unrelated changes without explicit authorization.
4. Do not create commits, branches, tags, or releases unless requested or required by the established workflow.
5. If unrelated changes prevent safe implementation, explain the conflict before proceeding.

## 10. Handling Blockers

If blocked:

1. Identify the specific blocker.
2. Report what has already been established.
3. Distinguish missing evidence from confirmed failures.
4. Choose the next concrete action that is most likely to resolve the blocker.
5. Ask the user only for information or access that is genuinely necessary.

Do not fabricate results, invent unavailable tool capabilities, or claim that a change was made when it was not.

## 11. Completion Criteria

A task is complete only when:

- The requested change has been implemented, or the remaining limitation is clearly explained.
- Relevant tests and checks have been executed where possible.
- The original issue or expected behavior has been verified to a reasonable degree.
- The final changes have been reviewed for unintended effects.
- Any remaining risks, blockers, or unverified behavior have been disclosed.

## 12. Final Report

Respond in the user's language. Keep the report concise, factual, and proportional to the task.

Use this structure when reporting code changes:

**What changed**
- Summarize the implemented behavior.

**Files changed**
- List the relevant files and the purpose of each change.

**Verification**
- List the commands or checks actually executed and their results.

**Remaining issues**
- Mention unresolved issues, limitations, or checks that could not be performed.

For purely explanatory or investigative tasks, use a shorter report appropriate to the request.

Never present an investigation as a completed fix. Clearly state whether the work is implemented, tested, partially completed, or blocked.

## 13. Правила игры «Белка Соломон»

Это правила **этой** игры, а не общие слова. Они важны, потому что в игре
есть эталонная модель, и любая правка баланса без синхронизации с ней
ломает числа.

### Порядок правки баланса

Изменение баланса идёт **всегда** по цепочке:

```
scripts/balance_sim.py  →  src/budget/  →  tests/budget/  →  docs/Хермес-вариант.md  →  scripts/verify_hermes_doc.py
```

- Эталон правится **первым**: он источник истины.
- Код игры повторяет эталон 1:1, включая порядок операций внутри дня.
- Тест `tests/budget/balance.test.ts` прогоняет эталонные стратегии через
  код игры: расхождение в любой цифре роняет тест.
- Числа в документе берутся **из вывода модели**, вручную не набираются.
- `scripts/verify_hermes_doc.py` разбирает таблицы документа и сверяет
  каждое число с моделью. Правка только в коде оставит документ ругаться
  на верные числа — и это выглядит как «модель сломалась», хотя сломали не её.

### Правила, которые живут в ядре

- Все шкалы ограничены **0…100** — обрезка в `core/mood.ts` (`clampScales`),
  вызывается после каждого изменения шкалы и **до** расчёта дохода.
  Обрезка только при отрисовке — это два разных числа: модель считает одно,
  игрок видит другое.
- **Действие, которое даёт только плюсы, обязано иметь суточный лимит.**
  Сейчас: сон — 1 раз в день, поглаживание Соломона — 3 раза в день,
  мытьё Соломона — 1 раз в день.
  Лимит — именно счётчик дня, а не следствие энергии: иначе «сон → энергия →
  снова сон» снова станет бесконечным циклом.
- **Долга нет** (решение заказчика, ноябрь 2026). Правило живёт в ядре
  (`spendBlockReason` → «не хватает денег»), интерфейс его отражает: карточка
  траты недоступна. Кошелёк никогда не уходит в минус.
- **Шкал четыре, а не шесть**: настроение и чистота общие у игрока и
  Соломона. Счастье одно, грязь одна — и правило проще объяснить.
- **Профессия одна**: игрок всегда студент (`student`). Выбор профессий убран.
- **Еда — не чаще двух приёмов в день** (`mealsPerDay`): сытый Соломон не ест.
- **Сон опускает сытость** (`sleepHunger` = 30), а не поднимает её. Вместе со
  спадом 25 в день это 55 за сутки, а один приём пищи даёт 25…50: кормить
  нужно дважды, иначе Соломон голодает и игрок проигрывает.
- **Проигрыш — отдельный экран** (`LossScreen`): четыре дня без оплаты жилья
  (выселение) или два дня без еды (голод).
- **Кнопка сна живёт на сцене** (`ScenePanel`) и видна всегда; перед сном
  спрашивают подтверждение (`SleepConfirm`), и если времени ещё много —
  предупреждают, что Соломон будет бездельничать.
- Репутация не растёт выше 5.
- День события — **обычный день**: событие закрывается, потом игрок
  продолжает работать и тратить.

### День устроен по часам (переписано 15 ноября 2026)

- Режим игры **один — неделя (7 дней)**. Сценарий живёт данными
  (`src/data/solomon-game.json` → `scenarios`), месячный режим убран, но
  вернётся записью в данные.
- День начинается в **06:00**. Утром игрок обязан выбрать **завтрак**
  (три уровня цены) и **дорогу** (пешком, автобус, такси) — оба выбора
  тратят минуты, и не успеть до 09:00 нельзя.
- **09:00…15:00 — пары**: время идёт само, энергия −20, настроение −1.
- **15:00…23:00 — свободное время**: работа, развлечения, еда, уход.
- **День закрывается только сном.** Сон — обязательный шаг, а не действие
  среди прочих; его качество зависит от сытости игрока и чистоты Соломона
  (100 % / 70 % / 45 %).
- **Минуты — настоящий ресурс.** Деньги и счастье конкурируют за время:
  смена курьера — 180 минут, уроки — 90, кино — 150.
- **Проигрыш возможен** в двух случаях: неоплаченное жильё к дедлайну
  (выселение) и два дня без еды. Оба условия живут в ядре, экран проигрыша —
  в `components/LossScreen.tsx`.
- **Обязательные расходы** (жильё 3 500 ₽, интернет 500 ₽ за период,
  проездной, стирка) считаются из данных, а не из константы в сценарии:
  `OBLIGATORY_TOTAL` в `data/scenario.ts`.

### Где что живёт

| Что | Где |
|---|---|
| Правила-модели (константы) | `src/data/solomon-game.json`, сверяется с эталоном |
| Генератор игровых данных | `scripts/build_game_data.py` (собирает JSON из правил) |
| Деньги | `src/budget/core/finance.ts` |
| Шкалы, спад, обрезка, сон | `src/budget/core/mood.ts` |
| Утренний выбор и подтверждение сна | `src/budget/components/MorningPanel.tsx`, `SleepConfirm.tsx` |
| Экран проигрыша | `src/budget/components/LossScreen.tsx` |
| Переходы состояния, guard'ы, часы дня | `src/budget/core/reducer.ts` |
| Оценки и разбор расходов | `src/budget/core/evaluation.ts` |
| Эталон экономики | `scripts/balance_sim.py` |
| Сверка документа с эталоном | `scripts/verify_hermes_doc.py` |
| Утренний выбор (завтрак, дорога) | `src/budget/components/MorningPanel.tsx` |
| Сцена, часы, кнопки локаций | `src/budget/components/ScenePanel.tsx` |
| Экран проигрыша | `src/budget/components/LossScreen.tsx` |

### Ассеты и неиспользуемый материал

- `src/assets/ui/` — только используемые иконки; реестр в
  `src/assets/ui/icons.ts`, сверяется верификатором (нет «сиротских» PNG
  и нет ссылок на отсутствующие файлы).
- `src/assets/неиспользуемый материал/` — то, что игра не использует.
  Файлы не удаляются, а переносятся сюда; в эту папку попадает всё, что
  выпало из реестра.
- `src/assets/backgrounds/` — пустые фоны локаций **без персонажа**: Соломон
  рисуется отдельным спрайтом поверх. Фоны не удалять.
- `art/` — параллельная работа пользователя по генерации иконок. Не трогать.
