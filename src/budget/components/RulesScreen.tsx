import PixelButton from "../../components/PixelButton";
import { RULES, SCENARIOS } from "../data/scenario";
import { useGame } from "../state/BudgetGameContext";

/**
 * Экран «Правила».
 *
 * Документ обещает его в меню, а без него игрок не понимает главные
 * ограничения игры: сколько раз можно спать, сколько — гладить Соломона
 * и что происходит, когда кошелёк уходит в минус. Для учебной игры
 * непонятные правила — это отсутствие правил.
 */
export default function RulesScreen() {
  const game = useGame();
  const scenario = SCENARIOS[game.state.scenarioKey];

  return (
    <section className="flex flex-col gap-4">
      <header className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <h2 className="text-xl font-bold text-stone-900">Правила</h2>
        <p className="mt-1 text-sm text-stone-700">
          Каждое действие что-то тратит: время, деньги или настроение.
          Бесплатных действий, которые дают только плюсы, в игре нет.
        </p>
      </header>

      <div className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <h3 className="text-sm font-bold text-stone-700">День и время</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li>
            Режим «{scenario.label}»: {scenario.days} дней, стартовый капитал{" "}
            {scenario.capital.toLocaleString("ru-RU")} ₽.
          </li>
          <li>
            Не больше {RULES.weeklyShiftCap} смен за неделю любого вида — это
            главный ограничитель: деньги и счастье конкурируют за время.
          </li>
          <li>
            Сон — не чаще {RULES.sleepPerDay} раза в день. Энергия
            восстанавливается, но не бесконечно.
          </li>
          <li>
            Погладить Соломона — не чаще {RULES.petPerDay} раз в день.
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <h3 className="text-sm font-bold text-stone-700">Деньги</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li>
            Два счёта: кошелёк (свободные деньги) и подушка (резерв). Если в
            кошельке не хватает, оплата идёт из подушки.
          </li>
          <li>
            Долг разрешён: если денег нет нигде, трата всё равно проходит,
            кошелёк уходит в минус, настроение падает на{" "}
            {RULES.creditMoodPenalty}. В карточке такой траты будет пометка
            «уйдёт в долг» — долг должен быть осознанным решением.
          </li>
          <li>
            Обязательные расходы ({scenario.mandatoryTotal.toLocaleString("ru-RU")} ₽){" "}
            при нехватке средств не оплачиваются — это попадёт в разбор как
            «не покрыты».
          </li>
          <li>
            Подушка от {RULES.saveBonusAt.toLocaleString("ru-RU")} ₽ даёт +
            {RULES.saveBonus} настроения в день.
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <h3 className="text-sm font-bold text-stone-700">Шкалы</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li>Все шкалы ограничены диапазоном 0…100 — и в расчётах тоже.</li>
          <li>
            Настроение определяет доход: множитель от 0,5 при нуле до 1,0 при
            100. Ниже {RULES.burnoutMood} начинается выгорание — смена
            оплачивается на {Math.round(RULES.burnoutRate * 100)} %.
          </li>
          <li>
            Соломон скучает без ухода и грустит, если хозяин несчастен
            (настроение ниже {RULES.gloomyOwnerMood}).
          </li>
          <li>
            Репутация нужна для репетиторства и не растёт выше{" "}
            {RULES.repCap}.
          </li>
          <li>Абонемент в зал действует {RULES.gymDays} дней с покупки.</li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <PixelButton
          type="button"
          variant="primary"
          onClick={game.toMenu}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          В меню
        </PixelButton>
      </div>
    </section>
  );
}
