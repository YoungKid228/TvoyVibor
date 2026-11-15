import PixelButton from "../../components/PixelButton";
import { DAY, OBLIGATORY_TOTAL, RULES, SCENARIOS } from "../data/scenario";
import { useGame } from "../state/BudgetGameContext";

/**
 * Экран «Правила».
 *
 * Документ обещает его в меню, а без него игрок не понимает главные
 * ограничения игры: как устроен день по часам, что обязательно, а что по
 * желанию, и чем заканчивается плохой уход за Соломоном. Для учебной игры
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
            День начинается в {format(DAY.startMinutes)}. Сначала — завтрак и
            дорога на пары, и всё это нужно успеть до {format(DAY.morningEnd)}.
          </li>
          <li>
            Пары идут с {format(DAY.classesStart)} до {format(DAY.classesEnd)}:
            время уходит само, а силы тратятся. Дальше день свободен до{" "}
            {format(DAY.nightMinutes)}.
          </li>
          <li>
            Закончить день можно только сном — это обязательное условие.
            Сон — не чаще {RULES.sleepPerDay} раза в день.
          </li>
          <li>
            Не больше {RULES.weeklyShiftCap} смен за неделю любого вида — это
            главный ограничитель: деньги и счастье конкурируют за время.
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <h3 className="text-sm font-bold text-stone-700">
          Обязательные расходы и необязательные
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li>
            Жильё в общежитии — 3 500 ₽, платится один раз. Не заплатили до{" "}
            {scenario.housingDeadline}-го дня — Соломона выселят, и игра
            закончится.
          </li>
          <li>
            Интернет — 500 ₽ за период. Первые {scenario.internetTrialDays}{" "}
            дня он бесплатный, а потом без оплаты пропадают курьерская
            доставка и тик-токи.
          </li>
          <li>
            Транспорт: проездной за 1 000 ₽ на период или поездки — автобус
            35 ₽, такси 150 ₽. Пешком бесплатно, но устаёте и Соломон
            пачкается.
          </li>
          <li>
            Еда — каждый день. Своя еда дешевле, но отнимает силы и время;
            фастфуд и хороший обед дороже, зато возвращают силы. Из
            приготовленного остаётся еда на второй приём пищи.
          </li>
          <li>
            Обязательные расходы по правилам —{" "}
            {OBLIGATORY_TOTAL.toLocaleString("ru-RU")} ₽ (жильё и интернет).
            Всё остальное — по желанию, но за это платит время и настроение.
          </li>
          <li>
            Стирка — 100 ₽: раз в {scenario.laundryEveryDays} дней, иначе
            Соломону нечего надеть.
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
            Долга нет: если денег не хватает, трата не проходит — карточка
            будет недоступна с пометкой «не хватает денег».
          </li>
          <li>
            Подушка от {RULES.saveBonusAt.toLocaleString("ru-RU")} ₽ даёт +
            {RULES.saveBonus} настроения в день.
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <h3 className="text-sm font-bold text-stone-700">Соломон</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li>
            Чистота падает на {RULES.cleanlinessDecay} в день. Мытьё — 200 ₽,
            не чаще {RULES.washPerDay} раза в день. Поглаживание — бесплатно,
            не чаще {RULES.petPerDay} раз в день.
          </li>
          <li>
            Сон возвращает силы: чистый Соломон — 100 % восстановления,
            слегка грязный — 70 %, сильно грязный — 45 %. Зато сон опускает
            сытость на {RULES.sleepHunger} — поесть придётся с утра.
          </li>
          <li>
            Если настроение ниже {RULES.moodForFun}, развлечения недоступны:
            скучно и не до них.
          </li>
          <li>
            Уроки: три дня подряд — и откроется репетиторство. Пропуск — минус
            {RULES.missedLessonMood} настроения; после{" "}
            {RULES.lessonProblemsAfter} пропусков подряд у Соломона начнутся
            проблемы с учёбой.
          </li>
          <li>
            Два дня без еды — проигрыш: за Соломоном не уследили, и ему стало
            плохо.
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
            Настроение и чистота общие у игрока и Соломона. Соломон скучает без
            ухода — это минус {RULES.petNeglectMood} настроения в день.
          </li>
          <li>
            Поесть можно {RULES.mealsPerDay} раза в день: если Соломон сыт,
            еда не лезет.
          </li>
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

/** Минуты от полуночи — в человеческий вид «09:00». */
function format(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
