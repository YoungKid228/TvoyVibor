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
 *
 * Правил про работу и смены здесь нет: модуль «Заработать» убран из игры.
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
            время уходит само, а силы, сытость и чистота падают (энергия −
            {RULES.classesEnergyCost}, сытость −{RULES.classesHungerCost},
            чистота −{RULES.classesCleanlinessCost}). Дальше день свободен до{" "}
            {format(DAY.nightMinutes)}.
          </li>
          <li>
            Закончить день можно только сном — это обязательное условие.
            Сон — не чаще {RULES.sleepPerDay} раза в день.
          </li>
          <li>
            Заработка в игре нет: вы — студент, и все расходы идут из
            капитала. Главный ограничитель — время: деньги и счастье
            конкурируют за одни и те же часы.
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
            {scenario.housingDeadline}-го дня — вас выселят, и игра закончится.
          </li>
          <li>
            Интернет — 1 500 ₽ за период. Первые {scenario.internetTrialDays}{" "}
            дня он бесплатный, а потом без оплаты пропадают тик-токи и игры в
            компьютер.
          </li>
          <li>
            Транспорт: проездной за 1 000 ₽ на период или поездки — автобус
            35 ₽, такси 150 ₽. Пешком бесплатно, но устаёте и Соломон
            пачкается.
          </li>
          <li>
            Еда — каждый день. Своя еда дешевле, но отнимает силы и время;
            фастфуд и хороший обед дороже, зато возвращают силы.
          </li>
          <li>
            Еда, приготовленная утром, — это запас: {RULES.mealServings}{" "}
            порций, которые хранятся {RULES.mealKeepsDays} дня (сегодня и
            ещё один). Если не съедите и завтра — еда испортится и пропадёт.
          </li>
          <li>
            Обязательные расходы по правилам —{" "}
            {OBLIGATORY_TOTAL.toLocaleString("ru-RU")} ₽ (жильё и интернет).
            Всё остальное — по желанию, но за это платит время и настроение.
          </li>
          <li>
            Стирка — 100 ₽ и не чаще {RULES.laundryPerDay} раза в день.
            Стирать надо каждые {scenario.laundryEveryDays} дней, иначе
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
            <strong>Сильно грязного Соломона (чистота ≤ {RULES.dirtyAt}) не
            пускают в автобус и такси и в общественные места</strong> — кафе,
            хороший обед, кофе, сырники, кино. Своя еда дома остаётся
            доступна. Мытьё возвращает чистоту и открывает дорогу обратно.
          </li>
          <li>
            Сон возвращает силы: чистый Соломон — 100 % восстановления,
            слегка грязный — 70 %, сильно грязный — 45 %. Зато сон опускает
            сытость на {RULES.sleepHunger} — поесть придётся с утра.
          </li>
          <li>
            Если настроение ниже {RULES.moodForFun}, развлечения недоступны:
            скучно и не до них. Голодный Соломон тоже не развлекается —
            сначала накормить.
          </li>
          <li>
            Без сил Соломон не может готовить, мыться и делать уроки: всё,
            что отнимает энергию, ему недоступно.
          </li>
          <li>
            Уроки: пропуск — минус {RULES.missedLessonMood} настроения; после{" "}
            {RULES.lessonProblemsAfter} пропусков подряд начнутся проблемы с
            учёбой.
          </li>
          <li>
            Два дня подряд без сил и без еды — Соломон теряет сознание, и
            приходит счёт за лечение {RULES.treatmentCost.toLocaleString("ru-RU")}{" "}
            ₽. Причина будет названа: от голода или от истощения.
          </li>
          <li>
            Настроение на нуле — депрессия, и на этом игра проиграна.
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <h3 className="text-sm font-bold text-stone-700">Шкалы</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li>Все шкалы ограничены диапазоном 0…100 — и в расчётах тоже.</li>
          <li>
            Настроение — главная шкала игры. Без развлечений за день оно
            падает на {RULES.noFunMoodPenalty}: листайте тик-токи, гуляйте,
            ходите в кино или играйте в компьютер (для игр нужен интернет).
          </li>
          <li>
            Настроение и чистота общие у игрока и Соломона. Соломон скучает без
            ухода — это минус {RULES.petNeglectMood} настроения в день.
          </li>
          <li>
            Поесть можно {RULES.mealsPerDay} раза в день: если Соломон сыт,
            еда не лезет. Запас еды позволяет поесть и на следующий день, но
            не трижды за день.
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        {game.state.dayStarted && (
          <PixelButton
            type="button"
            variant="primary"
            onClick={game.backToDay}
            className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
          >
            Вернуться к игре
          </PixelButton>
        )}
        <PixelButton
          type="button"
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
