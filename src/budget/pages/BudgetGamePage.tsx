import { useEffect, useState } from "react";
import PixelButton from "../../components/PixelButton";
import Icon from "../components/Icon";
import ActionCards from "../components/ActionCards";
import EventScreen from "../components/EventScreen";
import LossScreen from "../components/LossScreen";
import SleepConfirm from "../components/SleepConfirm";
import MorningPanel from "../components/MorningPanel";
import ResultScreen from "../components/ResultScreen";
import RulesScreen from "../components/RulesScreen";
import ScalePanel from "../components/ScalePanel";
import ScenePanel, { type SceneTab } from "../components/ScenePanel";
import WalletPanel from "../components/WalletPanel";
import {
  DAY,
  RULES,
  SCENARIOS,
  SPENDS,
  TAB_LOCATIONS,
  locationById,
} from "../data/scenario";
import {
  hasInternet,
  laundryDue,
  restBlockReason,
} from "../core/reducer";
import { useGame } from "../state/BudgetGameContext";
import type { ScenarioKey, SpendId } from "../core/types";

/**
 * Страница игры «Белка Соломон».
 *
 * Экраны: меню → брифинг → день → итог. Событие — часть дня, а не отдельный
 * экран: пока игрок не выбрал вариант, день не продолжается, но шкалы и
 * кошелёк уже видны — видно, во что обойдётся каждый вариант.
 */
type Props = {
  /**
   * Сообщить приложению, что игра перешла в полноэкранный режим.
   *
   * В этом режиме шапка приложения и навигация по разделам убираются:
   * игра занимает весь экран вертикально. Возврат — кнопка «В меню»
   * в игровом экране.
   */
  onImmersiveChange?: (immersive: boolean) => void;
};

export default function BudgetGamePage({ onImmersiveChange }: Props) {
  const game = useGame();
  // Полноэкранный режим — это сама игра: день и итоги. Меню, брифинг и
  // правила остаются внутри приложения, с шапкой и навигацией.
  const immersive = game.screen === "day" || game.screen === "result";

  useEffect(() => {
    onImmersiveChange?.(immersive);
  }, [immersive, onImmersiveChange]);

  return (
    <div className="flex flex-col gap-4">
      {game.screen === "menu" && <MenuScreen />}
      {game.screen === "rules" && <RulesScreen />}
      {game.screen === "briefing" && <BriefingScreen />}
      {game.screen === "day" && game.state.lost && game.state.lossReason ? (
        <LossScreen reason={game.state.lossReason} onMenu={game.toMenu} />
      ) : (
        <>
          {game.screen === "day" && <DayScreen />}
        </>
      )}
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
  // Режим в игре один — неделя. Список режимов: SCENARIOS в data/scenario.
  const scenario: ScenarioKey = "short";
  // Профессия одна: игрок всегда студент.

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


      <div className="flex flex-wrap gap-2">
        <PixelButton
          type="button"
          variant="primary"
          onClick={() => game.startGame(scenario, "student")}
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

/* ------------------------------------------------------------------ */
/* Брифинг: знакомство с белкой и правилами расходов                    */
/* ------------------------------------------------------------------ */

function BriefingScreen() {
  const game = useGame();
  const scenario = SCENARIOS[game.state.scenarioKey];

  return (
    <section className="flex flex-col gap-4">
      <header className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-[3px_3px_0_#fcd34d]">
        <h2 className="text-xl font-bold text-stone-900">
          Знакомьтесь: это Соломон
        </h2>
        <p className="mt-2 text-sm text-stone-800">
          Соломон — белка, которая живёт с вами в общежитии. У него есть
          настроение и чистота: когда его не моют, он пачкается, скучает и
          хуже спит — а вы вместе с ним плохо отдыхаете. Если не кормить его
          два дня подряд, ему станет совсем плохо и игра закончится.
        </p>
      </header>

      <section className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <h3 className="text-sm font-bold text-stone-900">
          Обязательные расходы и необязательные
        </h3>
        <ul className="mt-2 grid grid-cols-1 gap-2 text-sm text-stone-700 sm:grid-cols-2">
          <li className="rounded-lg border border-stone-200 bg-stone-50 p-2">
            <span className="flex items-center gap-1.5 font-bold text-stone-900">
              <Icon name="ui/ui-mandatory" alt="" size={16} />
              Обязательные
            </span>
            <p className="mt-1 text-xs">
              Жильё в общежитии — 3 500 ₽ разово. Интернет — 500 ₽ за период:
              без него с 4-го дня пропадают развлечения и подработки на
              телефоне. Транспорт — либо проездной за 1 000 ₽, либо поездки
              по 35–150 ₽. Еда — каждый день, от 120 ₽.
            </p>
          </li>
          <li className="rounded-lg border border-stone-200 bg-stone-50 p-2">
            <span className="font-bold text-stone-900">Необязательные</span>
            <p className="mt-1 text-xs">
              Кино, прогулки, подарки, еда по дорогой цене. Их покупают по
              желанию, но каждая трата — это время и настроение, а день
              заканчивается сном в 23:00.
            </p>
          </li>
        </ul>
        <p className="mt-2 text-xs text-stone-600">
          Режим: {scenario.label}, {scenario.days} дней. День начинается в
          06:00, пары идут до 15:00, а закончить день можно только сном.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <PixelButton
          type="button"
          variant="primary"
          onClick={() => game.showRules()}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          Подробные правила
        </PixelButton>
        <PixelButton
          type="button"
          onClick={game.startPlaying}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          Понятно, начинаем
        </PixelButton>
      </div>
    </section>
  );
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
  // Локация сцены: вкладка задаёт основную, а действие может увести в
  // другую (уроки — в общежитие, мытьё — в ванную).
  const [sceneLocation, setSceneLocation] = useState<string>(
    TAB_LOCATIONS.work,
  );
  // Сон закрывает день, поэтому спрашиваем подтверждение — и особенно
  // важно предупредить, если времени ещё много.
  const [askSleep, setAskSleep] = useState(false);

  const location = locationById(
    state.pendingEvent
      ? state.pendingEvent.location
      : state.phase === "morning"
        ? "dorm"
        : state.phase === "classes"
          ? "university"
          : sceneLocation,
  );

  const phaseLabel =
    state.phase === "morning"
      ? "утро: завтрак и дорога"
      : state.phase === "classes"
        ? "идут пары"
        : state.phase === "done"
          ? "день закончен"
          : "свободное время";

  /**
   * Трата переносит игрока туда, где она происходит: уроки — в общежитие,
   * мытьё — в ванную. Утром сцена и так показывает дом, поэтому завтрак
   * локацию не меняет.
   */
  const handleBuy = (spendId: SpendId) => {
    const spend = SPENDS.find((item) => item.id === spendId);
    if (spend && state.phase === "free") setSceneLocation(spend.location);
    game.doBuy(spendId);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 className="text-lg font-bold text-stone-900">
          День {state.day} из {scenario.days}
        </h2>
        <span className="text-xs text-stone-500">
          неделя {state.week + 1} · смен: {state.weekShifts[state.week] ?? 0} из{" "}
          {RULES.weeklyShiftCap}
        </span>
      </header>

      <ScenePanel
        location={location}
        mood={state.scales.mood}
        cleanliness={state.scales.cleanliness}
        tab={tab}
        onTab={(next) => {
          setTab(next);
          setSceneLocation(TAB_LOCATIONS[next]);
        }}
        clock={state.clock}
        phaseLabel={phaseLabel}
        disabled={Boolean(state.pendingEvent)}
        canSleep={!restBlockReason(state)}
        sleepHint={restBlockReason(state)}
        onSleep={() => setAskSleep(true)}
      />

      {askSleep && (
        <SleepConfirm
          minutesLeft={Math.max(0, DAY.nightMinutes - state.clock)}
          onConfirm={() => {
            setAskSleep(false);
            game.doRest();
          }}
          onCancel={() => setAskSleep(false)}
        />
      )}

      {/* Событие — сразу под сценой: пока оно открыто, сцену нельзя
            переключать, а значит оно и есть главное, что сейчас на экране. */}
      {state.pendingEvent && (
        <EventScreen
          event={state.pendingEvent}
          onChoose={game.chooseEvent}
          error={game.error}
        />
      )}

      <Reminders state={state} />

      <p className="text-center text-sm text-stone-700">
        {solomonLine(state.scales.mood)}
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

      {state.phase === "morning" && (
        <MorningPanel
          state={state}
          onBuy={handleBuy}
          onTransport={game.doTransport}
        />
      )}

      {state.phase === "classes" && (
        <p className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700">
          Идут пары. Они закончатся в 15:00 — потом можно работать, тратить и
          отдыхать.
        </p>
      )}

      {state.phase === "free" && (
        <ActionCards
          state={state}
          tab={tab}
          onWork={game.doWork}
          onBuy={handleBuy}
        />
      )}

      {state.phase === "done" && (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          День закончен: Соломон спит, а утром начнётся новый.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
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

/**
 * Напоминания о том, что скоро придётся сделать.
 *
 * Игра учит бюджету, а бюджет — это в первую очередь сроки: не заплатил за
 * жильё вовремя — выселяют. Напоминание заранее честнее, чем штраф в конце.
 */
function Reminders({ state }: { state: ReturnType<typeof useGame>["state"] }) {
  const scenario = SCENARIOS[state.scenarioKey];
  const notes: string[] = [];

  if (!state.housingPaid && state.day >= scenario.housingDeadline - 1) {
    notes.push(
      `Жильё не оплачено — после ${scenario.housingDeadline}-го дня Соломона выселят.`,
    );
  }
  if (!hasInternet(state)) {
    notes.push(
      "Интернет не оплачен: нет курьерской доставки и тик-тока. Доступен только лаборант.",
    );
  }
  if (laundryDue(state)) {
    notes.push("Соломону нечего надеть — постирайте вещи, иначе он расстроится.");
  }
  if (!state.lessonsToday && state.phase !== "morning") {
    notes.push("Уроки не сделаны: три пропуска подряд — и у Соломона начнутся проблемы с учёбой.");
  }
  // Сытость: сон её опускает, поэтому кормить нужно дважды в день.
  if (state.scales.hunger <= RULES.neglectHunger) {
    notes.push(
      "Соломон голоден — покормите его: два дня без еды и игра проиграна.",
    );
  } else if (state.mealsToday < RULES.mealsPerDay && state.phase === "free") {
    notes.push(
      "Соломон ещё не поел второй раз: сон опускает сытость, без еды он голодает.",
    );
  }
  if (!restBlockReason(state) && state.phase === "free") {
    notes.push(
      "День закрывается сном — он вернёт силы, но опустит сытость.",
    );
  }

  if (notes.length === 0) return null;
  return (
    <ul
      aria-label="Напоминания"
      className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
    >
      {notes.map((note) => (
        <li key={note}>• {note}</li>
      ))}
    </ul>
  );
}

/** Реплика Соломона по его настроению. */
function solomonLine(mood: number): string {
  if (mood >= 75) return "Соломон доволен: мурчит и грызёт орешек.";
  if (mood >= 50) return "Соломон спокоен и смотрит на вас.";
  if (mood >= 25) return "Соломон скучает — ему не хватает внимания.";
  return "Соломон грустит и прячется в коробку.";
}
