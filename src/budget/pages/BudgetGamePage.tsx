import { useState } from "react";
import PixelButton from "../../components/PixelButton";
import ActionCards from "../components/ActionCards";
import EventScreen from "../components/EventScreen";
import ResultScreen from "../components/ResultScreen";
import RulesScreen from "../components/RulesScreen";
import ScalePanel from "../components/ScalePanel";
import ScenePanel, { type SceneTab } from "../components/ScenePanel";
import WalletPanel from "../components/WalletPanel";
import {
  PROFESSIONS,
  SCENARIOS,
  TAB_LOCATIONS,
  locationById,
} from "../data/scenario";
import { useGame } from "../state/BudgetGameContext";
import type { ProfessionId, ScenarioKey } from "../core/types";

/**
 * Страница игры «Белка Соломон».
 *
 * Экраны: меню → правила → день → итог. Событие — часть дня, а не отдельный
 * экран: пока игрок не выбрал вариант, день не продолжается, но шкалы и
 * кошелёк уже видны — видно, во что обойдётся каждый вариант.
 */
export default function BudgetGamePage() {
  const game = useGame();

  return (
    <div className="flex flex-col gap-4">
      {game.screen === "menu" && <MenuScreen />}
      {game.screen === "rules" && <RulesScreen />}
      {game.screen === "day" && <DayScreen />}
      {game.screen === "result" && (
        <ResultScreen
          state={game.state}
          onRestart={() =>
            game.startGame(game.state.scenarioKey, game.state.professionId)
          }
          onMenu={game.toMenu}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Меню                                                                */
/* ------------------------------------------------------------------ */

function MenuScreen() {
  const game = useGame();
  const [scenario, setScenario] = useState<ScenarioKey>("short");
  const [profession, setProfession] = useState<ProfessionId>("none");

  return (
    <section className="flex flex-col gap-4">
      <header className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <h2 className="text-xl font-bold text-stone-900">Белка Соломон</h2>
        <p className="mt-1 text-sm text-stone-700">
          Вы — студент ПГУ им. Шолом-Алейхема, переехавший в Биробиджан. Живёте
          один, учитесь в «Экономике», а по вечерам помогаете соседке — белке
          Соломону — обустроиться на новом месте. У вас есть кошелёк, финансовая
          подушка и настроение Соломона. Каждое решение тратит что-то: время,
          деньги или настроение. Через неделю игра подведёт итог — по деньгам и
          по счастью.
        </p>
      </header>

      <fieldset className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <legend className="px-1 text-sm font-bold text-stone-700">
          Режим игры
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setScenario(key)}
              aria-pressed={scenario === key}
              className={`min-h-11 rounded-lg border px-3 py-1 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                scenario === key
                  ? "border-orange-700 bg-orange-100 font-bold text-orange-900"
                  : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              <span className="block">{SCENARIOS[key].label}</span>
              <span className="block text-[10px] font-normal text-stone-500">
                {SCENARIOS[key].days} дней
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <legend className="px-1 text-sm font-bold text-stone-700">
          Профессия (необязательно)
        </legend>
        <p className="mt-1 text-xs text-stone-500">
          Профессия даёт небольшой перевес, но исход игры не решает.
        </p>
        <ul className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-stone-600 sm:grid-cols-2">
          {PROFESSIONS.map((prof) => (
            <li key={prof.id}>
              <span className="font-medium text-stone-700">{prof.label}:</span>{" "}
              {professionBonus(prof)}
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROFESSIONS.map((prof) => (
            <button
              key={prof.id}
              type="button"
              onClick={() => setProfession(prof.id)}
              aria-pressed={profession === prof.id}
              className={`min-h-11 rounded-lg border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                profession === prof.id
                  ? "border-orange-700 bg-orange-100 font-bold text-orange-900"
                  : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              {prof.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <PixelButton
          type="button"
          variant="primary"
          onClick={() => game.startGame(scenario, profession)}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          Начать {SCENARIOS[scenario].label.toLowerCase()}
        </PixelButton>
        <PixelButton
          type="button"
          onClick={game.resumeGame}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          Продолжить
        </PixelButton>
        <PixelButton
          type="button"
          onClick={game.showRules}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          Правила
        </PixelButton>
        <PixelButton
          type="button"
          onClick={game.resetGame}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          Сбросить
        </PixelButton>
      </div>
    </section>
  );
}

/** Что даёт профессия — одной строкой, чтобы выбор не был вслепую. */
function professionBonus(prof: (typeof PROFESSIONS)[number]): string {
  const parts: string[] = [];
  if (prof.moodBonus) parts.push(`+${prof.moodBonus} настроения на старте`);
  if (prof.payBonus) parts.push(`+${prof.payBonus} ₽ к зарплате`);
  if (prof.shiftBonus) parts.push(`+${prof.shiftBonus} смена за неделю`);
  if (prof.repBonus) parts.push(`+${prof.repBonus} репутации`);
  return parts.length ? parts.join(", ") : "без перевеса";
}

/* ------------------------------------------------------------------ */
/* День                                                                */
/* ------------------------------------------------------------------ */

function DayScreen() {
  const game = useGame();
  const { state } = game;
  const scenario = SCENARIOS[state.scenarioKey];
  // Активная вкладка = активная локация. Живёт здесь, а не в карточках
  // действий: переключатель нарисован на сцене.
  const [tab, setTab] = useState<SceneTab>("work");
  // Открытое событие переносит игрока в свою локацию: пока вариант не
  // выбран, сцена показывает место события, а переключатели заблокированы.
  const location = locationById(
    state.pendingEvent ? state.pendingEvent.location : TAB_LOCATIONS[tab],
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 className="text-lg font-bold text-stone-900">
          День {state.day} из {scenario.days}
        </h2>
        <span className="text-xs text-stone-500">
          неделя {state.week + 1} · смен: {state.weekShifts[state.week] ?? 0} из
          4
        </span>
      </header>

      <ScenePanel
        location={location}
        mood={state.scales.solomon}
        cleanliness={state.scales.cleanliness}
        tab={tab}
        onTab={setTab}
        disabled={Boolean(state.pendingEvent)}
      />

      {/* Событие — сразу под сценой: пока оно открыто, сцену нельзя
            переключать, а значит оно и есть главное, что сейчас на экране. */}
      {state.pendingEvent && (
        <EventScreen
          event={state.pendingEvent}
          onChoose={game.chooseEvent}
          error={game.error}
        />
      )}

      <p className="text-center text-sm text-stone-700">
        {solomonLine(state.scales.solomon)}
      </p>

      <ScalePanel scales={state.scales} />

      <WalletPanel
        cash={state.cash}
        savings={state.savings}
        income={state.income}
        expenses={state.expenses}
        onSave={game.doSave}
        onWithdraw={game.doWithdraw}
      />

      {game.message && (
        <p
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          {game.message}
        </p>
      )}

      {state.pendingEvent ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Сначала выберите вариант — потом сможете работать и тратить. День
          события ничем не отличается от обычного.
        </p>
      ) : (
        <ActionCards
          state={state}
          tab={tab}
          onWork={game.doWork}
          onBuy={game.doBuy}
          onBuyItem={game.doBuyItem}
          onRest={game.doRest}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <PixelButton
          type="button"
          variant="primary"
          onClick={game.finishDay}
          disabled={Boolean(state.pendingEvent)}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          Закончить день
        </PixelButton>
        <PixelButton
          type="button"
          onClick={game.toMenu}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          В меню
        </PixelButton>
      </div>

      <details
        className="rounded-lg border border-stone-300 bg-white p-3 text-sm"
        open
      >
        <summary className="cursor-pointer font-medium text-stone-700">
          Что было в этот день
        </summary>
        {state.dayNotes.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-stone-600">
            {state.dayNotes.map((note, index) => (
              <li key={`${note}-${index}`}>{note}</li>
            ))}
          </ul>
        )}
        <ul className="mt-2 list-disc pl-5 text-stone-600">
          {state.log
            .slice(-3)
            .reverse()
            .map((entry) => (
              <li key={entry.day}>
                <span className="font-medium">День {entry.day}:</span>{" "}
                {entry.actions.join("; ") || "без действий"}
              </li>
            ))}
        </ul>
      </details>
    </div>
  );
}

/** Реплика Соломона по его настроению. */
function solomonLine(mood: number): string {
  if (mood >= 75) return "Соломон доволен: мурчит и грызёт орешек.";
  if (mood >= 50) return "Соломон спокоен и смотрит на вас.";
  if (mood >= 25) return "Соломон скучает — ему не хватает внимания.";
  return "Соломон грустит и прячется в коробку.";
}
