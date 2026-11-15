"""Баланс-симулятор «Белка Соломон» v4 — Talking Tom-подобный цикл в экономике.

Запуск:  python scripts/balance_sim.py
Назначение: воспроизводимый расчёт контрольных примеров из
docs/Хермес-вариант.md. Код игры в src/budget/ повторяет модель 1:1.

Сценарии:
  SHORT (7 дней)  — основной режим: неделя, события по дням, оценка в конце.
  LONG  (28 дней) — будущий «бесконечный» режим: полный месяц.

Ключевые решения модели:
  * Белка живёт своей жизнью: настроение белки падает каждый день (скука без
    ухода) и растёт от ухода (поглаживание, игрушка, совместные развлечения).
    Несчастливый хозяин (настроение < 30) запускает белку ещё сильнее.
  * Деньги и счастье — две независимые оси, конкурирующие за время игрока:
    не больше 4 смен за неделю.
  * Отрицательный кошелёк разрешён: рискованные покупки можно взять в долг
    (кошелёк уходит в минус, настроение падает). Зато итоговая проверка
    расходов покажет, что игрок «попал в минус».
  * Все шкалы ограничены диапазоном 0…100 в любой момент игры — не только
    при отрисовке. Иначе шкала «уезжает» за потолок, а доход считается от
    неправильного значения (аудит от 30 октября 2026, проблема 1).
  * Бесплатных действий «только в плюс» нет: сон — не чаще раза в день,
    поглаживание Соломона — не чаще трёх раз в день. Счётчики суточные.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Scenario:
    """Параметры игрового сценария."""

    key: str
    title: str
    days: int
    capital: int
    mandatory_total: int
    mandatory_mode: str          # "once" | "weekly"
    salary: int
    salary_day: int
    phone_day: int
    gift_day: int
    weekly_shift_cap: int
    hunger_decay: int = 6
    hygiene_decay: int = 5
    solomon_decay: int = 4
    blizzard_day: int = 0      # день локального события «снегопад» (0 — нет)
    cleanliness_decay: int = 15  # насколько сильно Соломон пачкается за день


SHORT = Scenario(
    key="short",
    title="Короткий режим — неделя (7 дней)",
    days=7,
    capital=20000,
    mandatory_total=12500,
    mandatory_mode="once",
    salary=15000,
    salary_day=4,
    phone_day=5,
    gift_day=6,
    weekly_shift_cap=4,
    blizzard_day=4,
)

LONG = Scenario(
    key="long",
    title="Длинный режим — месяц (28 дней)",
    days=28,
    capital=20000,
    mandatory_total=12500,
    mandatory_mode="weekly",
    salary=15000,
    salary_day=8,
    phone_day=12,
    gift_day=19,
    weekly_shift_cap=4,
    hunger_decay=5,
    hygiene_decay=4,
    solomon_decay=4,
)

SCENARIOS = {SHORT.key: SHORT, LONG.key: LONG}

# Общий лимит смен за неделю (любого вида): время — scarce-ресурс.
# Без него игрок успевает работать каждый день и «Баланс» выигрывает по обеим осям.
WEEKLY_SHIFT_CAP = 4

BURNOUT_MOOD = 25
BORING = 2
SLEEP_MOOD = 4
SAVE_BONUS = 1
SOLOMON_UP = 1
SOLOMON_DOWN = -3
GLOOMY_OWNER_MOOD = 30      # ниже — хозяин запускает белку
SOLOMON_HAPPY = 60              # порог «Соломон доволен» для итогового вердикта
CREDIT_MOOD_PENALTY = 5     # штраф настроения за покупку в долг

# Суточные лимиты бесплатных действий. Без них энергия становится
# неограниченным ресурсом, а шкалы набиваются кликами (аудит, проблемы 2–3).
SLEEP_PER_DAY = 1         # сон
PET_PER_DAY = 3           # поглаживание Соломона
WASH_PER_DAY = 1          # мытьё Соломона

# Пороги загрязнения Соломона. Чистота — шкала 0…100, где 100 это «только что
# вымыт». Варианты спрайта: 0 — чистый, 1 — слегка грязный, 2 — сильно грязный.
# Границы подобраны так, чтобы «слегка грязный» держался примерно два дня
# без мытья, а «сильно грязный» — с пятого.
CLEAN_AT = 67             # чистота ≥ 67 → спрайт «чистый»
DIRTY_AT = 33             # чистота ≤ 33 → спрайт «сильно грязный»

# Потолок репутации: выше 5 репутация ничего не даёт.
REP_CAP = 5

# Срок абонемента в зал: 14 дней с момента покупки.
GYM_DAYS = 14

# заработки: база ₽/смена, энергия, настроение, условие, лимит смен в неделю
JOBS = {
    "dishes":    (600, 12, 4, None, 4),
    "kafe":      (1100, 24, 6, None, 3),
    "tutor":     (1400, 20, 5, "rep>=2", 3),
    "freelance": (1000, 16, 6, "laptop", 3),
    "courier":   (1600, 30, 8, None, 2),
    # биробиджанские подработки (документ «Хермес-вариант», раздел 2)
    "market":   (700, 12, 4, None, 3),      # торговля на Центральном рынке
    "hegan":    (1200, 20, 5, None, 2),      # сопровождение гостей из Хэгана
    "dorm":     (600, 10, 3, None, 3),       # уборка в общежитии
}

# траты: ₽, настроение, энергия, сытость, гигиена, репутация, уход за белкой
# Цены развлечений и подарков — как в исходном документе «Проверь свой бюджет».
SPEND = {
    "kino":      (800, 6, 12, 0, 0, 1, 3),      # поход в кино — 800 ₽
    "cafe":      (1500, 8, 8, 20, 0, 1, 2),     # кафе с друзьями — 1 500 ₽
    "bowling":   (2000, 9, 22, 0, 0, 1, 4),     # боулинг — 2 000 ₽
    "park":      (250, 4, 8, 0, 0, 1, 3),       # прогулка в парке — 250 ₽
    "products":  (350, 1, 0, 30, 0, 0, 1),
    "coffee":    (150, 2, 0, 5, 0, 0, 1),
    "pet":       (0, 1, 2, 0, 0, 0, 5),         # погладить Соломона — бесплатно
    "shower":    (250, 1, 5, 0, 35, 0, 0),
    "clothes":   (3000, 8, 0, 0, 0, 2, 0),
    "toyshop":   (1200, 7, 0, 0, 0, 0, 6),      # игрушка белке
    # биробиджанские траты (документ «Хермес-вариант», раздел 2)
    "schnitzel": (450, 5, 0, 20, 0, 0, 2),      # шницель по-биробиджански
    "matza":     (380, 4, 0, 15, 0, 0, 1),      # маца и хумус
    "breakfast": (200, 2, 0, 10, 0, 0, 0),      # кефир и бублики у вокзала
    "dreidel":   (500, 4, 0, 0, 0, 0, 2),       # дрейдл на Арбате
    "amulet":    (600, 5, 0, 0, 0, 0, 2),       # талесман со звездой Давида
    "festival":  (1800, 9, 10, 0, 0, 1, 3),     # фестиваль еврейской культуры
    "zoo":       (400, 4, 5, 0, 0, 0, 1),       # амурский тигр в зоопарке
    "wash":      (200, 1, 0, 0, 0, 0, 2),       # вымыть Соломона — 200 ₽
}

# крупные покупки: ₽, эффект
ITEMS = {"laptop": (8000, "freelance"), "washer": (6000, "hygiene"), "gym": (2500, "mood")}

# что можно взять в долг (кошелёк уходит в минус)
CREDITABLE = ("clothes", "toyshop", "laptop", "washer", "gym")

# Профессии — необязательный выбор. Дают небольшой перевес и не должны
# перевернуть игру: максимум +1 смена или +500 ₽ к зарплате.
PROFESSIONS = {
    "none":     {"label": "Без профессии", "rep": 0, "shifts": 0, "mood": 0, "salary": 0},
    "student":  {"label": "Студент", "rep": 2, "shifts": 0, "mood": 0, "salary": 0},
    "courier":  {"label": "Курьер", "rep": 0, "shifts": 1, "mood": 0, "salary": 0},
    "engineer": {"label": "Инженер", "rep": 0, "shifts": 0, "mood": 5, "salary": 150},
    "creative": {"label": "Творческий", "rep": 0, "shifts": 0, "mood": 0, "salary": 500},
}


def income_multiplier(mood: int) -> float:
    """Множитель дохода от настроения: 0.5 при 0 → 1.0 при 100."""
    return 0.5 + 0.5 * mood / 100


def round50(value: float) -> int:
    """Доход округляется до 50 ₽ — как реальные выплаты."""
    return int(round(value / 50.0)) * 50


class Game:
    def __init__(self, scenario: Scenario = SHORT, seed: int = 11, profession: str = "none"):
        self.scenario = scenario
        self.seed = seed
        self.profession = PROFESSIONS[profession]
        self.cash = scenario.capital
        self.savings = 0
        self.mood = 70 + self.profession["mood"]
        self.energy = 100
        self.hunger = 100
        self.hygiene = 100
        self.solomon = 70
        # Чистота Соломона: 100 — только что вымыт, 0 — грязный.
        self.cleanliness = 100
        self.rep = self.profession["rep"]
        self.items: set[str] = set()
        # День покупки каждой крупной вещи — чтобы абонемент имел срок.
        self.item_days: dict[str, int] = {}
        self.income = 0
        self.expenses = 0
        self.shifts = 0
        self.week_shifts: dict[int, int] = {}
        self.debt = 0
        self.current_day = 1
        self.current_week = 0
        self.blizzard_choice = "bus"
        self.week_jobs: dict[tuple[int, str], int] = {}
        self.log: list[tuple] = []
        # Суточные счётчики бесплатных действий.
        self.sleeps_today = 0
        self.pets_today = 0
        self.washes_today = 0
        self.spent_by_category = {
            "обязательные": 0,
            "быт": 0,
            "развлечения": 0,
            "покупки": 0,
            "подарки": 0,
            "телефон": 0,
            "накопления": 0,
        }

    # --- шкалы ----------------------------------------------------------
    def clamp(self) -> None:
        """Обрезать все шкалы в 0…100.

        Обрезка живёт в ядре, а не только при отрисовке: пока шкала может
        уйти за потолок, доход считается от неверного значения, а игрок видит
        одно число, а модель — другое.
        """
        self.mood = max(0, min(100, self.mood))
        self.energy = max(0, min(100, self.energy))
        self.hunger = max(0, min(100, self.hunger))
        self.hygiene = max(0, min(100, self.hygiene))
        self.solomon = max(0, min(100, self.solomon))
        self.cleanliness = max(0, min(100, self.cleanliness))

    def dirt_variant(self) -> int:
        """Вариант спрайта Соломона по загрязнению: 0 чистый, 1 слегка, 2 сильно."""
        if self.cleanliness >= CLEAN_AT:
            return 0
        if self.cleanliness > DIRTY_AT:
            return 1
        return 2

    def add_rep(self, amount: int) -> None:
        """Добавить репутацию с учётом потолка."""
        self.rep = max(0, min(REP_CAP, self.rep + amount))

    # --- деньги ----------------------------------------------------------
    def can_pay(self, amount: int) -> bool:
        return self.cash >= amount or self.savings >= amount - self.cash

    def pay(self, amount: int, category: str | None = None) -> str:
        """Оплата. Если в кошельке не хватает — берём из подушки."""
        if self.cash >= amount:
            self.cash -= amount
            self.expenses += amount
            if category:
                self.spent_by_category[category] += amount
            return f"-{amount}"
        if self.savings >= amount - self.cash:
            take = amount - self.cash
            self.savings -= take
            self.cash -= amount - take
            self.expenses += amount
            if category:
                self.spent_by_category[category] += amount
            return f"-{amount} (из подушки {take})"
        return "нет денег"

    def pay_on_credit(self, amount: int, category: str | None = None) -> str:
        """Покупка в долг: кошелёк уходит в минус, настроение падает."""
        self.cash -= amount
        self.debt += amount
        self.expenses += amount
        if category:
            self.spent_by_category[category] += amount
        self.mood = max(0, self.mood - CREDIT_MOOD_PENALTY)
        return f"-{amount} (в долг)"

    def save(self, amount: int) -> str:
        if self.cash < amount:
            return "нет денег"
        self.cash -= amount
        self.savings += amount
        self.spent_by_category["накопления"] += amount
        return f"подушка +{amount}"

    def withdraw(self, amount: int) -> str:
        """Снять из подушки безопасности."""
        if self.savings < amount:
            return "нет денег"
        self.savings -= amount
        self.cash += amount
        return f"из подушки +{amount}"

    # --- действия игрока -------------------------------------------------
    def work(self, key: str) -> str:
        base, energy_cost, mood_cost, req, cap = JOBS[key]
        if req == "laptop" and "laptop" not in self.items:
            return "нет ноутбука"
        if req == "rep>=2" and self.rep < 2:
            return "мало репутации"
        if self.week_shifts.get(self.current_week, 0) >= WEEKLY_SHIFT_CAP + self.profession["shifts"]:
            return "недельный лимит смен исчерпан"
        if self.week_jobs.get((self.current_week, key), 0) >= cap:
            return "лимит смен"
        if self.energy < energy_cost:
            return "нет энергии"
        # Шкалы приводятся в диапазон ДО расчёта дохода: иначе множитель
        # посчитался бы от значения выше 100 и смена принесла бы больше
        # базовой ставки (при настроении 150 курьер давал 2 000 ₽ вместо 1 600).
        self.clamp()
        # Выгорание: смена оплачивается хуже и выжигает сильнее, но не обнуляется —
        # иначе «трудяга» зарабатывал бы меньше «балансного» игрока.
        burnt = self.mood < BURNOUT_MOOD
        rate = 0.7 if burnt else 1.0
        gain = round50(base * income_multiplier(self.mood) * rate)
        self.cash += gain
        self.income += gain
        self.energy = max(0, self.energy - energy_cost)
        self.mood = max(0, self.mood - mood_cost * (2 if burnt else 1))
        self.week_jobs[(self.current_week, key)] = self.week_jobs.get((self.current_week, key), 0) + 1
        self.week_shifts[self.current_week] = self.week_shifts.get(self.current_week, 0) + 1
        self.shifts += 1
        self.clamp()
        return f"{key} +{gain}" + (" (выгорание)" if burnt else "")

    def buy(self, key: str) -> str:
        """Обычная трата. Если денег нет — покупку можно взять в долг."""
        cost, mood_d, energy_d, food_d, hyg_d, rep_d, solomon_d = SPEND[key]
        category = "развлечения" if key in ("kino", "cafe", "bowling", "park", "clothes", "toyshop") else "быт"
        # Поглаживание Соломона — бесплатное действие, поэтому у него суточный лимит.
        if key == "pet":
            if self.pets_today >= PET_PER_DAY:
                return "поглаживаний на сегодня хватает"
            self.pets_today += 1
        # Мытьё Соломона — тоже суточное действие: иначе игрок вымывал бы его
        # по десять раз за день ради одного и того же настроения.
        if key == "wash":
            if self.washes_today >= WASH_PER_DAY:
                return "мытьё на сегодня уже было"
            self.washes_today += 1
        if self.can_pay(cost):
            paid = self.pay(cost, category)
        else:
            # Денег нет — покупку можно взять в долг: кошелёк уйдёт в минус,
            # а итоговая проверка расходов покажет, что игрок перестал считать.
            paid = self.pay_on_credit(cost, category)
        self.mood += mood_d
        self.energy = max(0, self.energy - energy_d)
        self.hunger = min(100, self.hunger + food_d)
        self.hygiene = min(100, self.hygiene + hyg_d)
        self.add_rep(rep_d)
        self.solomon = min(100, self.solomon + solomon_d)
        if key == "wash":
            # Мытьё возвращает блеск: спрайт снова становится чистым.
            self.cleanliness = 100
        self.clamp()
        return f"{key} {paid}"

    def sleep(self) -> str:
        """Сон. Не чаще раза в день: иначе энергия не ограничена ничем."""
        if self.sleeps_today >= SLEEP_PER_DAY:
            return "сон уже был сегодня"
        self.sleeps_today += 1
        self.energy = min(100, self.energy + 45)
        self.mood = min(100, self.mood + SLEEP_MOOD)
        self.clamp()
        return "сон"

    def buy_item(self, key: str) -> str:
        cost, eff = ITEMS[key]
        if self.can_pay(cost):
            self.pay(cost, "покупки")
        else:
            self.pay_on_credit(cost, "покупки")
        self.items.add(key)
        self.item_days[key] = self.current_day
        return f"{key} -{cost}"

    def phone(self, choice: str) -> str:
        cost = {"repair": 4000, "new": 12000, "old": 0}[choice]
        if self.can_pay(cost):
            self.pay(cost, "телефон")
        else:
            self.pay_on_credit(cost, "телефон")
        self.mood += {"repair": 3, "new": 6, "old": -6}[choice]
        self.solomon += {"repair": 1, "new": 3, "old": -4}[choice]
        self.clamp()
        return f"телефон:{choice} -{cost}"

    def gift(self, choice: str) -> str:
        cost, mood_d, solomon_d = {"big": (5000, 9, 3), "mid": (2500, 6, 2), "small": (500, 2, 1)}[choice]
        if self.can_pay(cost):
            self.pay(cost, "подарки")
        else:
            self.pay_on_credit(cost, "подарки")
        self.mood += mood_d
        self.solomon += solomon_d
        self.add_rep(1)
        self.clamp()
        return f"подарок:{choice} -{cost}"

    # --- дневной цикл ----------------------------------------------------
    def decay(self) -> list[str]:
        """Ежедневные расходы шкал. Возвращает список причин изменения."""
        sc = self.scenario
        notes: list[str] = []
        self.hunger = max(0, self.hunger - sc.hunger_decay)
        self.hygiene = max(0, self.hygiene - (sc.hygiene_decay if "washer" not in self.items
                                             else sc.hygiene_decay // 2))
        self.mood -= BORING
        notes.append(f"настроение −{BORING}: скука")
        if self.hunger == 0:
            self.mood -= 5
            notes.append("настроение −5: голод")
        if self.hygiene == 0:
            self.mood -= 3
            notes.append("настроение −3: грязь")
        if self.cash < 0:
            self.mood -= 3
            notes.append("настроение −3: долг")
        if self.savings >= 4000:
            self.mood += SAVE_BONUS
            notes.append("настроение +1: подушка 4 000 ₽")
        if self.gym_active():
            self.mood += 1
            notes.append("настроение +1: абонемент в зал")
        # Соломон скучает без ухода, а несчастливый хозяин запускает его ещё сильнее.
        # Грязный Соломон скучает сильнее: спрайт пачкается, и это видно игроку.
        self.cleanliness = max(0, self.cleanliness - sc.cleanliness_decay)
        dirt = self.dirt_variant()
        self.solomon -= sc.solomon_decay + dirt
        if dirt:
            notes.append(f"Соломон −{dirt}: грязный")
        if self.mood < GLOOMY_OWNER_MOOD:
            self.solomon -= 2
            notes.append("Соломон −2: хозяин несчастен")
        if self.solomon >= 60:
            self.mood += SOLOMON_UP
            notes.append("настроение +1: довольный Соломон")
        elif self.solomon <= 25:
            self.mood += SOLOMON_DOWN
            notes.append("настроение −3: Соломон грустит")
        self.clamp()
        return notes

    def gym_active(self) -> bool:
        """Действует ли абонемент в зал (14 дней с покупки)."""
        if "gym" not in self.items:
            return False
        bought = self.item_days.get("gym", self.current_day)
        return self.current_day - bought < GYM_DAYS

    def blizzard(self) -> str:
        """Снегопад парализует город: транспорт дорожает, но и время уходит.

        Три варианта: такси (быстро, но дорого), автобус (дёшево, но долго),
        пешком (бесплатно, но выматывает).
        """
        if self.blizzard_choice == "taxi":
            if not self.can_pay(400):
                return "снегопад: такси недоступно"
            self.pay(400, "быт")
            self.mood = max(0, self.mood - 2)
            self.clamp()
            return "снегопад: такси -400"
        if self.blizzard_choice == "bus":
            self.mood = max(0, self.mood - 1)
            self.clamp()
            return "снегопад: автобус, бесплатно, но долго"
        self.energy = max(0, self.energy - 15)
        self.mood = max(0, self.mood - 3)
        self.clamp()
        return "снегопад: пешком, -15 энергии"

    def day_events(self, day: int) -> list[str]:
        sc = self.scenario
        acts = []
        # Локальное событие: снегопад парализует город (зимний сценарий).
        if day == sc.blizzard_day:
            acts.append(self.blizzard())
        if sc.mandatory_mode == "once":
            if day == 1:
                acts.append(f"обязательные {self.pay(sc.mandatory_total, 'обязательные')}")
        else:
            if (day - 1) % 7 == 0:
                acts.append(f"обязательные {self.pay(sc.mandatory_total // 4, 'обязательные')}")
        if day == sc.salary_day:
            gain = sc.salary + self.profession["salary"]
            self.cash += gain
            self.income += gain
            acts.append(f"зарплата +{gain}")
        return acts

    def run(self, policy) -> "Game":
        for day in range(1, self.scenario.days + 1):
            self.current_day = day
            self.current_week = (day - 1) // 7
            # Суточные счётчики бесплатных действий обнуляются каждый день.
            self.sleeps_today = 0
            self.pets_today = 0
            self.washes_today = 0
            acts = self.day_events(day)
            notes = self.decay()
            acts += policy(day, self)
            self.log.append((day, self.cash, self.savings, self.mood, self.energy,
                             round(self.solomon, 1), self.hunger, self.hygiene,
                             "; ".join(acts), notes, self.cleanliness))
        return self


FAIL_PREFIXES = ("нет ", "недельный", "выгорание", "лимит", "мало ", "смен нет",
                 "поглаживаний на сегодня", "сон уже был", "мытьё на сегодня")


def try_jobs(g, order):
    """Взять первую доступную смену из списка по приоритету.

    Если лимит недели исчерпан или не хватает энергии — пробуем следующую работу,
    как поступил бы игрок, а не сдаёмся после первой неудачи.
    """
    for key in order:
        result = g.work(key)
        if not result.startswith(FAIL_PREFIXES):
            return result
    return "смен нет"


# --- стратегии (крайние профили поведения) ------------------------------
#
# День события — обычный день: сначала игрок закрывает событие, потом
# продолжает жить как обычно. Раньше стратегия на 5-м и 6-м дне просто
# «прерывалась», и в таблицах выглядело так, будто игрок терял день.
# Это свойство тестовой стратегии, а не правило игры, поэтому эталон
# теперь повторяет правило: событие, затем обычные действия дня.


def policy_saver(day, g):
    """Копилка: копит и почти не тратит. Белка брошен — счастье падает."""
    acts = []
    if day == g.scenario.phone_day:
        acts.append(g.phone("repair"))
    if day == g.scenario.gift_day:
        acts.append(g.gift("small"))
    if day == 1:
        acts.append(g.save(4000))
    if g.energy >= 30 and g.cash < 9000:
        acts.append(try_jobs(g, ["kafe", "dishes"]))
    if g.hunger < 45:
        acts.append(g.buy("products"))
    if g.hygiene < 45:
        acts.append(g.buy("shower"))
    return acts


def policy_worker(day, g):
    """Трудяга: максимум смен, никаких развлечений и никакого ухода за белком."""
    acts = []
    if day == g.scenario.phone_day:
        acts.append(g.phone("repair"))
    if day == g.scenario.gift_day:
        acts.append(g.gift("mid"))
    if g.energy >= 30:
        acts.append(try_jobs(g, ["courier", "kafe", "dishes"]))
    elif g.energy >= 12:
        acts.append(try_jobs(g, ["dishes"]))
    else:
        acts.append(g.sleep())
    if g.hunger < 45:
        acts.append(g.buy("products"))
    if g.hygiene < 45:
        acts.append(g.buy("shower"))
    return acts


def policy_balanced(day, g):
    """Баланс: работа в хорошей форме, отдых, белка, умеренные траты."""
    acts = []
    if day == g.scenario.phone_day:
        acts.append(g.phone("repair"))
    if day == g.scenario.gift_day:
        acts.append(g.gift("mid"))
    if day == 1:
        acts.append(g.save(2000))
        acts.append(g.buy("kino"))
    if g.energy >= 30 and g.mood >= 45:
        acts.append(try_jobs(g, ["courier", "tutor", "kafe"]))
    elif g.energy < 20:
        acts.append(g.sleep())
    acts.append(g.buy("pet"))
    if g.hunger < 50:
        acts.append(g.buy("products"))
    if g.hygiene < 45:
        acts.append(g.buy("shower"))
    # Соломона моют, когда он начинает пачкаться: без этого он скучает сильнее.
    if g.cleanliness < 80:
        acts.append(g.buy("wash"))
    if day == 3:
        acts.append(g.buy("park"))
    return acts


def policy_gecko(day, g):
    """Гедонист: развлечения и дорогие покупки в долг. Деньги кончаются."""
    acts = []
    if day == g.scenario.phone_day:
        acts.append(g.phone("new"))
    if day == g.scenario.gift_day:
        acts.append(g.gift("big"))
    if g.energy < 30:
        acts.append(g.sleep())
    else:
        acts.append(g.work("kafe"))
    acts.append(g.buy("bowling" if day % 2 else "cafe"))
    if day == 2:
        acts.append(g.buy("toyshop"))
    if g.hunger < 55:
        acts.append(g.buy("products"))
    if g.hygiene < 45:
        acts.append(g.buy("shower"))
    return acts


# --- оценка ------------------------------------------------------------

def money_grade(balance: int) -> str:
    """Оценка по деньгам — шкала из исходного документа."""
    if balance >= 7000:
        return "Отличный результат"
    if balance >= 3000:
        return "Хороший результат"
    if balance >= 0:
        return "Есть над чем поработать"
    return "Бюджет ушёл в минус"


def mood_grade(mood: int) -> str:
    """Оценка шкалы счастья игрока."""
    if mood >= 75:
        return "Настроение отличное"
    if mood >= 50:
        return "Настроение хорошее"
    if mood >= 25:
        return "Настроение так себе"
    return "Настроение плохое"


def solomon_grade(solomon: int) -> str:
    """Оценка качества жизни по настроению белки."""
    if solomon >= 75:
        return "Соломон доволен"
    if solomon >= 50:
        return "Соломон спокоен"
    if solomon >= 25:
        return "Соломон скучает"
    return "Соломон грустит"


def overall_grade(balance: int, solomon: int) -> str:
    """Итоговый вердикт: деньги И качество жизни белки."""
    money_ok = balance >= 3000
    cat_ok = solomon >= SOLOMON_HAPPY
    if money_ok and cat_ok:
        return "Успех: и деньги есть, и Соломон счастлив"
    if money_ok:
        return "Деньги есть, но Соломон несчастлив"
    if cat_ok:
        return "Соломон счастлив, но денег нет"
    return "Провал: ни денег, ни счастья"


def expense_audit(g: Game) -> dict:
    """Проверка расходов: как игрок распорядился деньгами.

    Это то, что игрок видит на экране «Финансовый итог»: разбор не только по
    остатку, но и по структуре трат — что было обязательным, а что по желанию.
    Накопления в долю трат не входят: это не расход, а перевод денег в резерв.
    """
    items = g.spent_by_category
    spent_total = sum(v for k, v in items.items() if k != "накопления")
    obligatory = items["обязательные"]
    discretionary = spent_total - obligatory
    share = discretionary / spent_total if spent_total else 0.0
    checks = {
        "обязательные_покрыты": obligatory >= g.scenario.mandatory_total,
        "доля_необязательных": round(share, 3),
        "нет_долга": g.cash >= 0,
        "есть_подушка": g.savings >= 2000,
        "кошелёк_не_пустой": g.cash > 0,
    }
    # Разбор перечисляет все нарушения, а не только первое: иначе игрок
    # не видит долг и перекос трат, если не покрыл обязательные.
    violations = []
    if not checks["обязательные_покрыты"]:
        violations.append("обязательные расходы не покрыты")
    if not checks["нет_долга"]:
        violations.append("есть долг")
    if share > 0.6:
        violations.append("доля необязательных трат выше 60 %")
    if not checks["есть_подушка"]:
        violations.append("нет финансовой подушки")
    if not checks["кошелёк_не_пустой"]:
        violations.append("кошелёк пуст")
    if not checks["обязательные_покрыты"]:
        verdict = "Обязательные расходы не покрыты"
    elif not checks["нет_долга"]:
        verdict = "Расходы превысили доходы"
    elif share > 0.6:
        verdict = "Траты ушли далеко за рамки необходимого"
    elif checks["есть_подушка"] and checks["кошелёк_не_пустой"]:
        verdict = "Расходы распределены грамотно"
    else:
        verdict = "Расходы покрыты, но резерв не создан"
    checks["вердикт"] = verdict
    checks["нарушения"] = violations
    return checks


def stats(g: Game) -> dict:
    avg_mood = sum(r[3] for r in g.log) / len(g.log)
    avg_solomon = sum(r[5] for r in g.log) / len(g.log)
    avg_clean = sum(r[10] for r in g.log) / len(g.log)
    balance = g.cash + g.savings
    audit = expense_audit(g)
    return {
        "итоговый_баланс": balance,
        "кошелёк": g.cash,
        "подушка": g.savings,
        "среднее_настроение": round(avg_mood, 1),
        "средний_белка": round(avg_solomon, 1),
        "средняя_чистота": round(avg_clean, 1),
        "смен": g.shifts,
        "доход": g.income,
        "расход": g.expenses,
        "оценка_деньги": money_grade(balance),
        "оценка_счастье": solomon_grade(round(avg_solomon)),
        "итог": overall_grade(balance, round(avg_solomon)),
        "аудит": audit,
    }


POLICIES = {
    "Копилка": policy_saver,
    "Трудяга": policy_worker,
    "Баланс": policy_balanced,
    "Гедонист": policy_gecko,
}


def report(scenario: Scenario) -> None:
    print(f"===== {scenario.title} =====")
    for name, policy in POLICIES.items():
        g = Game(scenario, 11).run(policy)
        s = stats(g)
        print(f"{name}: баланс {s['итоговый_баланс']}, кошелёк {s['кошелёк']}, "
              f"подушка {s['подушка']}, настр {s['среднее_настроение']}, белка {s['средний_белка']}, "
              f"чистота {s['средняя_чистота']}, смен {s['смен']} → {s['итог']}")
        print(f"    статьи расходов: {g.spent_by_category}")
        print(f"    проверка расходов: {s['аудит']['вердикт']} "
              f"(доля необязательных {s['аудит']['доля_необязательных']:.0%})")
    print()


def main() -> None:
    report(SHORT)
    report(LONG)

    print("=== Профессии (короткий режим, стратегия «Баланс») ===")
    for prof in PROFESSIONS:
        g = Game(SHORT, 11, prof).run(policy_balanced)
        s = stats(g)
        print(f"{PROFESSIONS[prof]['label']:<14} баланс {s['итоговый_баланс']:>6} | "
              f"настр {s['среднее_настроение']:>5} | белка {s['средний_белка']:>5} | "
              f"смен {s['смен']} | {s['итог']}")

    print()
    print("=== Ход недели (короткий режим, стратегия «Баланс») ===")
    print("день | кошелёк | подушка | настр | энерг | белка | сытость | гигиена | действия")
    g = Game(SHORT, 11).run(policy_balanced)
    for r in g.log:
        print(f"{r[0]:>3} | {r[1]:>6} | {r[2]:>5} | {r[3]:>3} | {r[4]:>3} | "
              f"{r[5]:>5} | {r[6]:>3} | {r[7]:>3} | {r[8]}")
    print(f"доход {g.income} | расход {g.expenses} | кошелёк {g.cash} | "
          f"подушка {g.savings} | смен {g.shifts}")


if __name__ == "__main__":
    main()
