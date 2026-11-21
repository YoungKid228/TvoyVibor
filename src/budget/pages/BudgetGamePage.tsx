import { useEffect, useState } from "react";
import PixelButton from "../../components/PixelButton";
import Icon from "../components/Icon";
import ActionCards, { type SpendGroup } from "../components/ActionCards";
import ActionSheet from "../components/ActionSheet";
import BottomNav, { type PanelTab } from "../components/BottomNav";
import EventScreen from "../components/EventScreen";
import LossScreen from "../components/LossScreen";
import SleepConfirm from "../components/SleepConfirm";
import MorningSheet from "../components/MorningSheet";
import ResultScreen from "../components/ResultScreen";
import RulesScreen from "../components/RulesScreen";
import ScenePanel from "../components/ScenePanel";
import StatusHeader from "../components/StatusHeader";
import Toast from "../components/Toast";
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
  spendBlockReason,
} from "../core/reducer";
import { useGame } from "../state/BudgetGameContext";
import type { ScenarioKey, SpendId } from "../core/types";

/**
 * Страница игры «Белка Соломон».
 *
 * Экраны: меню → брифинг → день → итог. Событие — часть дня, а не отдельный
 * экран: пока игрок не выбрал вариант, день не продолжается, но шкалы и
 * кошелёк уже видны — видно, во что обойдётся каждый вариант.
 *
 * Раскладка дня — вертикальная (9:16), как на макете: шапка со шкалами,
 * сцена, шторка действий и нижняя навигация. Колонка ограничена по ширине
 * и центрируется: на телефоне — во всю ширину, на десктопе — колонкой.
 */
type Props = {
  /**
   * Сообщить приложению, что игра перешла в полноэкранный режим.
   *
   * В этом режиме шапка приложения и навигация по разделам убираются:
   * игра занимает весь экран. Возврат — домик в шапке игры.
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

      {/* Уведомления всплывают поверх всей игры: отказ не должен теряться
          внизу страницы. */}
      <Toast message={game.message} error={game.error} />
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

  return (
    <section className="flex flex-col gap-4">
      <header className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <h2 className="text-xl font-bold text-stone-900">Белка Соломон</h2>
        <p className="mt-1 text-sm text-stone-700">
          Вы — Соломон: белка, которая переехала в Биробиджан и поступила в
          ПГУ им. Шолом-Алейхема на «Экономику». Живёте в общежитии, у вас есть
          кошелёк, финансовая подушка и настроение. Каждое решение тратит
          что-то: время, деньги или настроение. Через неделю игра подведёт
          итог — по деньгам и по счастью.
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

/* ------------------------------------------------------------------ */
/* Брифинг: правила расходов                                           */
/* ------------------------------------------------------------------ */

function BriefingScreen() {
  const game = useGame();
  const scenario = SCENARIOS[game.state.scenarioKey];

  return (
    <section className="flex flex-col gap-4">
      <header className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-[3px_3px_0_#fcd34d]">
        <h2 className="text-xl font-bold text-stone-900">Вы — Соломон</h2>
        <p className="mt-2 text-sm text-stone-800">
          Соломон — белка-студент: у него есть настроение и чистота, общие с
          вами. Когда его не моют, он пачкается и его не пускают в транспорт и
          общественные места; когда не кормят — он голодает и теряет сознание.
          Если два дня подряд не есть, придёт счёт на лечение. А если весь
          день не развлекаться — Соломон заскучает, и настроение, упавшее до
          нуля, закончит игру.
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
              Жильё в общежитии — 3 500 ₽ разово. Интернет — 1 500 ₽ за период:
              без него пропадают тик-токи и игры в компьютер. Транспорт — либо
              проездной за 1 000 ₽, либо поездки по 35–150 ₽. Еда — каждый день,
              от 120 ₽.
            </p>
          </li>
          <li className="rounded-lg border border-stone-200 bg-stone-50 p-2">
            <span className="font-bold text-stone-900">Необязательные</span>
            <p className="mt-1 text-xs">
              Кино, прогулки, подарки, еда по дорогой цене. Но хотя бы одно
              развлечение в день нужно: без него Соломон грустит, а день
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

/** Вкладки шторки в свободное время — как утренние. */
const ACTIVITY_TABS: { id: SpendGroup; label: string; icon: string }[] = [
  { id: "fun", label: "Развлечься", icon: "ui/spend-kino" },
  { id: "food", label: "Кушать", icon: "ui/spend-breakfast" },
  { id: "bills", label: "Платежи", icon: "ui/ui-mandatory" },
];

function DayScreen() {
  const game = useGame();
  const { state } = game;
  const scenario = SCENARIOS[state.scenarioKey];
  // Открытый раздел нижней навигации: «Кошелёк», «Чем заняться?», «Соломон».
  const [tab, setTab] = useState<PanelTab>("spend");
  // Вкладка внутри раздела «Чем заняться?»: развлечься / кушать / платежи.
  const [activityTab, setActivityTab] = useState<SpendGroup>("fun");
  // Утром шторка показывает завтрак и дорогу. Если игрок ушёл в другой
  // раздел, вернуть его к завтраку можно кнопкой «Потратить» в навигации.
  const [morningTab, setMorningTab] = useState(true);
  // Локация сцены: раздел задаёт основную, а действие может увести в
  // другую (уроки — в общежитие, мытьё — в ванную).
  const [sceneLocation, setSceneLocation] = useState<string>(
    TAB_LOCATIONS.spend,
  );
  // Сон закрывает день, поэтому спрашиваем подтверждение — и особенно
  // важно предупредить, если времени ещё много.
  const [askSleep, setAskSleep] = useState(false);
  // Счёт на лечение приходит ночью: показываем окно, когда счёт изменился.
  const [billsShown, setBillsShown] = useState(state.treatmentBills);
  const [showBill, setShowBill] = useState(false);

  useEffect(() => {
    if (state.treatmentBills > billsShown) {
      setBillsShown(state.treatmentBills);
      setShowBill(true);
    }
  }, [state.treatmentBills, billsShown]);

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
   * мытьё — в ванную. Локация меняется только если действие действительно
   * выполнилось: иначе игрок уезжал в ванную, не помывшись.
   */
  const handleBuy = (spendId: SpendId) => {
    const spend = SPENDS.find((item) => item.id === spendId);
    if (spend && state.phase === "free" && !spendBlockReason(state, spendId)) {
      setSceneLocation(spend.location);
    }
    game.doBuy(spendId);
  };

  /** Переключение раздела в нижней навигации: меняет и содержимое шторки,
   *  и локацию сцены. */
  const handleTab = (next: PanelTab) => {
    setTab(next);
    // Утром разделы ещё не по делу: «Чем заняться?» возвращает к завтраку,
    // остальные показывают свой раздел (кошелёк посмотреть можно всегда).
    if (state.phase === "morning") {
      setMorningTab(next === "spend");
    }
    const locationId = TAB_LOCATIONS[next];
    if (locationId) setSceneLocation(locationId);
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[560px] flex-col overflow-hidden bg-stone-900">
      {/* Шапка: день, время до ночи, четыре шкалы и выход в меню. */}
      <StatusHeader
        day={state.day}
        days={scenario.days}
        week={state.week}
        minutesLeft={Math.max(0, DAY.nightMinutes - state.clock)}
        scales={state.scales}
        onMenu={game.toMenu}
      />

      {/* Сцена: локация, Соломон, часы и кнопка сна. */}
      <ScenePanel
        location={location}
        mood={state.scales.mood}
        cleanliness={state.scales.cleanliness}
        clock={state.clock}
        phaseLabel={phaseLabel}
        canSleep={!restBlockReason(state)}
        sleepHint={restBlockReason(state)}
        onSleep={() => setAskSleep(true)}
      />

      {/* Шторка действий. */}
      <div className="flex min-h-0 flex-1 flex-col">
        {state.phase === "morning" && morningTab && (
          <MorningSheet
            state={state}
            onBuy={handleBuy}
            onTransport={game.doTransport}
          />
        )}

        {/* Утром игрок может заглянуть в другой раздел — тогда нужен путь
            обратно к завтраку. */}
        {state.phase === "morning" && !morningTab && (
          <ActionSheet
            title={SECTION_TITLES[tab].title}
            timeLabel={formatClock(state.clock)}
            illustration={SECTION_TITLES[tab].icon}
            description={SECTION_TITLES[tab].description}
          >
            <button
              type="button"
              onClick={() => setMorningTab(true)}
              className="mb-2 flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border-2 border-orange-300 bg-white px-3 py-1.5 text-xs font-bold text-orange-700 transition hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            >
              ← К завтраку
            </button>
            <ActionCards
              state={state}
              group="care"
              onBuy={handleBuy}
            />
            {tab === "wallet" && (
              <WalletPanel
                cash={state.cash}
                savings={state.savings}
                income={state.income}
                expenses={state.expenses}
                onSave={game.doSave}
                onWithdraw={game.doWithdraw}
              />
            )}
          </ActionSheet>
        )}

        {state.phase === "classes" && (
          <ActionSheet
            title="Пары"
            timeLabel="09:00 — 15:00"
            illustration="ui/loc-university"
            description="Время идёт само: энергия падает, Соломон голодает и пачкается. После 15:00 день станет свободным."
          >
            <p className="text-sm text-stone-700">
              Идут пары. Они закончатся в 15:00 — потом можно тратить,
              развлекаться и ухаживать за собой.
            </p>
          </ActionSheet>
        )}

        {state.phase === "free" && (
          <ActionSheet
            title={SECTION_TITLES[tab].title}
            timeLabel={formatClock(state.clock)}
            illustration={SECTION_TITLES[tab].icon}
            tabs={tab === "spend" ? ACTIVITY_TABS : undefined}
            activeTab={tab === "spend" ? activityTab : undefined}
            onTab={
              tab === "spend"
                ? (id) => setActivityTab(id as SpendGroup)
                : undefined
            }
            description={SECTION_TITLES[tab].description}
          >
            {/* Событие — первым делом: пока оно открыто, день не идёт
                дальше, а значит оно и есть главное, что сейчас на экране. */}
            {state.pendingEvent ? (
              <EventScreen
                event={state.pendingEvent}
                onChoose={game.chooseEvent}
                error={game.error}
              />
            ) : (
              <>
                {/* Напоминания — свёрнуты: важны, но не должны закрывать
                    карточки действий, ради которых игрок сюда пришёл. */}
                <Reminders state={state} />
                {tab === "wallet" ? (
                  <WalletPanel
                    cash={state.cash}
                    savings={state.savings}
                    income={state.income}
                    expenses={state.expenses}
                    onSave={game.doSave}
                    onWithdraw={game.doWithdraw}
                  />
                ) : (
                  <ActionCards
                    state={state}
                    group={tab === "solomon" ? "care" : activityTab}
                    onBuy={handleBuy}
                    onSkipPayments={game.doSkipPayments}
                  />
                )}
                <p className="text-center text-sm text-stone-700">
                  {solomonLine(state.scales.mood)}
                </p>
                <details
                  className="rounded-lg border border-stone-300 bg-white p-3 text-sm"
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
              </>
            )}
          </ActionSheet>
        )}

        {state.phase === "done" && (
          <ActionSheet
            title="День закончен"
            timeLabel="23:00"
            illustration="ui/solomon"
            description="Соломон спит, а утром начнётся новый день."
          >
            <p className="text-sm text-emerald-800">
              День закончен: Соломон спит, а утром начнётся новый.
            </p>
          </ActionSheet>
        )}
      </div>

      {/* Нижняя навигация: кошелёк, чем заняться и Соломон. */}
      <BottomNav
        tab={tab}
        onTab={handleTab}
        disabled={Boolean(state.pendingEvent)}
      />

      {/* Подтверждение сна — поверх всего: сон закрывает день, и спросить
          надо так, чтобы вопрос не потерялся за шторкой. */}
      {askSleep && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm">
            <SleepConfirm
              minutesLeft={Math.max(0, DAY.nightMinutes - state.clock)}
              onConfirm={() => {
                setAskSleep(false);
                game.doRest();
              }}
              onCancel={() => setAskSleep(false)}
            />
          </div>
        </div>
      )}

      {/* Счёт на лечение: Соломон два дня был без сил и еды и потерял
          сознание. Окно объясняет, что произошло и куда ушли деньги. */}
      {showBill && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-xl border-2 border-rose-400 bg-rose-50 p-4 shadow-[4px_4px_0_#fda4af]">
            <h3 className="flex items-center gap-2 text-lg font-bold text-rose-900">
              <Icon name="ui/ui-warning" alt="" size={22} />
              Соломон потерял сознание
            </h3>
            <p className="mt-2 text-sm text-stone-800">
              Два дня подряд он был без сил и без еды. Врачи вытащили его, но
              пришлось заплатить за лечение:{" "}
              <span className="font-bold">
                −{RULES.treatmentCost.toLocaleString("ru-RU")} ₽
              </span>
              .
            </p>
            <p className="mt-1 text-xs text-stone-700">
              Чтобы этого не повторилось: кормите Соломона дважды в день и
              ложитесь спать вовремя — сон возвращает силы.
            </p>
            <div className="mt-3">
              <PixelButton
                type="button"
                variant="primary"
                onClick={() => setShowBill(false)}
                className="min-h-11 w-full px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                Понятно
              </PixelButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Заголовки разделов шторки в свободное время. */
const SECTION_TITLES: Record<
  PanelTab,
  { title: string; icon: string; description: string }
> = {
  wallet: {
    title: "Кошелёк",
    icon: "ui/grade-money",
    description:
      "Кошелёк — свободные деньги, подушка — резерв. Итоговый баланс — то, с чем игрок закончит неделю.",
  },
  spend: {
    title: "Чем заняться?",
    icon: "ui/tab-spend",
    description:
      "Развлечься, поесть или заплатить по счетам — три вкладки, как утром. Обязательные платежи — на вкладке «Платежи».",
  },
  solomon: {
    title: "Соломон",
    icon: "ui/tab-pet",
    description:
      "Уход за собой: помыться, погладить и сделать уроки. Без ухода Соломон пачкается и хуже спит.",
  },
};

/** Часы в виде «09:40». */
function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
      `Жильё не оплачено — после ${scenario.housingDeadline}-го дня вас выселят.`,
    );
  }
  if (!hasInternet(state)) {
    notes.push(
      "Интернет не оплачен: нет тик-токов и игр в компьютер. Остаются кино и прогулки.",
    );
  }
  if (laundryDue(state)) {
    notes.push("Соломону нечего надеть — постирайте вещи, иначе он расстроится.");
  }
  if (!state.lessonsToday && state.phase !== "morning") {
    notes.push(
      "Уроки не сделаны: три пропуска подряд — и начнутся проблемы с учёбой.",
    );
  }
  // Ноль на шкале — это событие, и о нём надо сказать заранее.
  if (state.scales.mood <= 15) {
    notes.push(
      "Настроение на нуле — Соломон впадает в депрессию, а это проигрыш. Развлекитесь: прогулка, кино, тик-токи.",
    );
  }
  if (state.scales.cleanliness <= RULES.dirtyAt) {
    notes.push(
      `Соломон ${state.scales.cleanliness <= 0 ? "совсем грязный" : "сильно грязный"}: его не пустят в автобус, такси, кафе и кино. Помыться — 200 ₽.`,
    );
  }
  if (state.scales.energy <= 0) {
    notes.push(
      "Сил нет: Соломон не может готовить, мыться и делать уроки. Сон вернёт силы, но опустит сытость.",
    );
  }
  if (state.scales.hunger <= 0) {
    notes.push(
      "Соломон голоден: развлечения недоступны, а если не поесть второй день — придёт счёт за лечение.",
    );
  }
  // Сытость: сон её опускает, поэтому кормить нужно дважды в день.
  if (state.scales.hunger > 0 && state.scales.hunger <= RULES.neglectHunger) {
    notes.push(
      "Соломон голоден — покормите его: два дня без еды и счёт за лечение.",
    );
  } else if (state.mealsToday < RULES.mealsPerDay && state.phase === "free") {
    notes.push(
      "Соломон ещё не поел второй раз: сон опускает сытость, без еды он голодает.",
    );
  }
  // Радость: без развлечений настроение падает сильно.
  if (state.funToday < RULES.funPerDay && state.phase === "free") {
    notes.push(
      "Скучно: листайте тик-токи, гуляйте, сходите в кино или играйте в компьютер — без этого Соломон заскучает.",
    );
  }
  if (!restBlockReason(state) && state.phase === "free") {
    notes.push(
      "День закрывается сном — он вернёт силы, но опустит сытость.",
    );
  }

  if (notes.length === 0) return null;
  return (
    <details
      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
    >
      <summary className="cursor-pointer font-medium">
        Напоминания ({notes.length})
      </summary>
      <ul className="mt-2 flex flex-col gap-1">
        {notes.map((note) => (
          <li key={note}>• {note}</li>
        ))}
      </ul>
    </details>
  );
}

/** Реплика Соломона по его настроению. Игрок — это и есть Соломон. */
function solomonLine(mood: number): string {
  if (mood >= 75) return "Вы довольны: мурчите и грызёте орешек.";
  if (mood >= 50) return "Вы спокойны и смотрите на окно.";
  if (mood >= 25) return "Вам скучно — не хватает развлечений.";
  return "Вы задумчиво сидите у окна — день выдался тяжёлым.";
}
