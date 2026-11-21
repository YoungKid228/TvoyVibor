"""Баланс-симулятор «Белка Соломон» v6 — день по часам, без заработка.

Запуск:  python scripts/balance_sim.py
Назначение: воспроизводимый расчёт контрольных примеров из
docs/Хермес-вариант.md. Код игры в src/budget/ повторяет модель 1:1.

Сценарии:
  SHORT (7 дней)  — неделя: события по дням, оценка в конце.
  Пока один режим: неделя (7 дней).

Ключевые решения модели:
  * Игрок — Соломон, белка-студент. Заработка в игре нет: все расходы идут
    из стартового капитала.
  * День устроен по часам: утро (завтрак и дорога к парам) → пары до 15:00 →
    свободное время → сон. Сон — обязательное условие конца дня.
  * Пары и дорога отнимают не только силы, но и сытость и чистоту.
  * Еда, приготовленная утром, — это запас: несколько порций на два дня.
  * Настроение — главная шкала: без развлечений за день оно падает сильно.
  * Сон восстанавливает не полностью: качество сна зависит от чистоты
    Соломона (70 % и 45 %).
  * Все шкалы ограничены диапазоном 0…100 в любой момент игры.
  * Долга нет: если денег не хватает, трата не проходит.
  * Проигрыш возможен: не оплатил жильё вовремя или два дня подряд не ел.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Scenario:
    """Параметры игрового сценария."""

    key: str
    title: str
    days: int
    capital: int
    housing_deadline: int      # после этого дня неоплаченное жильё — выселение
    internet_trial_days: int   # первые дни интернет бесплатный
    internet_days: int         # на сколько дней хватает оплаты интернета
    transit_days: int          # на сколько дней хватает проездного
    laundry_every_days: int    # как часто нужно стирать вещи
    phone_day: int
    gift_day: int
    snow_days: tuple
    hunger_decay: int = 25
    cleanliness_decay: int = 15  # общая чистота падает за день


SHORT = Scenario(
    key="short",
    title="Короткий режим — неделя (7 дней)",
    days=7,
    capital=20000,
    housing_deadline=4,
    internet_trial_days=3,
    internet_days=7,
    transit_days=7,
    laundry_every_days=3,
    phone_day=5,
    gift_day=6,
    snow_days=(4,),
)

# Пока в игре один режим — неделя. Сценарий живёт как данные: чтобы вернуть
# месяц, достаточно добавить его в `src/data/solomon-game.json` и сюда.
SCENARIOS = {SHORT.key: SHORT}

# --- расписание дня (минуты от 00:00) -----------------------------------
DAY_START = 360      # 06:00 — начало дня
MORNING_END = 540    # 09:00 — к этому времени нужно успеть к парам
CLASSES_START = 540  # 09:00 — начало пар
CLASSES_END = 900    # 15:00 — конец пар
NIGHT = 1380         # 23:00 — после этого только сон

# --- общие константы модели ---------------------------------------------
MOOD_OK_AT = 50             # с этого уровня настроение считается хорошим
BORING = 2
PET_NEGLECT_MOOD = 4      # Соломон скучает без ухода — это бьёт по общему настроению
SLEEP_MOOD = 4
SLEEP_ENERGY = 100
SLEEP_HUNGER = 30         # сон НЕ восстанавливает сытость, а опускает её
SAVE_BONUS = 1
SAVE_BONUS_AT = 4000
HUNGER_PENALTY = 5
HYGIENE_PENALTY = 3
MEALS_PER_DAY = 2          # больше двух приёмов пищи в день Соломон не съест
MEAL_SERVINGS = 3          # порций в приготовленной еде
MEAL_KEEPS_DAYS = 2        # еда хранится сегодня и ещё один день
FUN_PER_DAY = 1            # развлечений за день, без них настроение падает
NO_FUN_MOOD_PENALTY = 12   # настроение − за день без развлечений

# Суточные лимиты действий.
SLEEP_PER_DAY = 1
PET_PER_DAY = 3
WASH_PER_DAY = 1
LAUNDRY_PER_DAY = 1

# Пороги загрязнения Соломона.
CLEAN_AT = 67
DIRTY_AT = 33

REP_CAP = 5

# Пары и уроки.
CLASSES_ENERGY_COST = 25
CLASSES_MOOD_COST = 3
CLASSES_HUNGER_COST = 15
CLASSES_CLEANLINESS_COST = 5
CLASSES_MINUTES = 360
MISSED_LESSON_MOOD = 8
LESSON_PROBLEMS_AFTER = 3
MOOD_FOR_FUN = 40

# Проигрыш и лечение.
# Ноль на шкале — это не просто число, а событие:
#   * энергия и сытость на нуле два дня подряд — Соломон теряет сознание,
#     и на лечение уходят деньги (не проигрыш, но день и кошелёк);
#   * чистота на нуле — Соломона не пускают в транспорт и общественные места;
#   * настроение на нуле — депрессия, и на этом игра проиграна.
NEGLECT_HUNGER = 25
NEGLECT_DAYS_TO_LOSE = 2
COLLAPSE_DAYS_TO_BILL = 2   # дней на нуле — и приходит счёт на лечение
TREATMENT_COST = 1500       # счёт за лечение, ₽
SICK_MOOD_COST = 5          # обморок на морозе: настроение
SICK_ENERGY_COST = 10       # обморок на морозе: энергия

# Множители восстановления во сне.
CLEAN_FACTOR_GOOD = 1.0
CLEAN_FACTOR_WEAK = 0.7
CLEAN_FACTOR_BAD = 0.45

# Обязательные расходы по правилам игры: жильё + интернет.
HOUSING_COST = 3500
INTERNET_COST = 1500

# --- траты ----------------------------------------------------------------
# ₽, минуты, настроение (общее), энергия, +энергия, сытость, чистота,
# репутация, статья, готовит еду, условие.
# Настроение и чистота — общие шкалы игрока и Соломона.
SPEND = {
    "food-cheap":     (120, 60, -2, 15, 0, 45, 0, 0, "обязательные", True, None),
    "food-fast":      (250, 20, 5, 0, 12, 45, 0, 0, "обязательные", False, "clean"),
    "food-luxe":      (500, 20, 10, 0, 25, 55, 0, 0, "обязательные", False, "clean"),
    "food-leftovers": (0, 20, 0, 0, 6, 35, 0, 0, "обязательные", False, "mealStock"),
    "food-coffee":    (150, 15, 4, 0, 5, 20, 0, 0, "обязательные", False, "clean"),
    "food-syrniki":   (200, 25, 6, 0, 8, 30, 0, 0, "обязательные", False, "clean"),
    "housing":        (3500, 30, 2, 0, 0, 0, 0, 0, "обязательные", False, None),
    "internet":       (1500, 10, 0, 0, 0, 0, 0, 0, "обязательные", False, None),
    "transit-pass":   (1000, 20, 3, 0, 0, 0, 0, 0, "обязательные", False, None),
    "laundry":        (100, 30, 3, 2, 0, 0, 5, 0, "быт", False, None),
    "kino":           (800, 150, 10, 12, 0, 0, 0, 0, "развлечения", False, "mood+clean"),
    "park":           (200, 90, 8, 8, 0, 0, 0, 0, "развлечения", False, None),
    "tiktok":         (0, 60, 6, 5, 0, 0, 0, 0, "развлечения", False, "internet"),
    "computer":       (0, 90, 7, 6, 0, 0, 0, 0, "развлечения", False, "internet"),
    "pet":            (0, 15, 5, 0, 12, 0, 0, 0, "быт", False, None),
    "wash":           (200, 40, 2, 10, 0, 0, 0, 0, "быт", False, None),
    "lessons":        (0, 90, 3, 15, 0, 0, 0, 1, "быт", False, None),
}

# Требования к трате могут быть несколько: "mood+clean" — нужно и то, и это.
# Условия проверяются по очереди, и игрок видит первую не выполненную.
REQUIREMENTS = {
    "mealStock": "запас еды пуст: сначала приготовь еду",
    "internet": "нет интернета",
    "mood": "настроение плохое — не до развлечений",
    "clean": "Соломон грязный — в общественное место его не пустят",
    "hungry": "Соломон голоден — не до развлечений",
}

# Подписи действий — те же, что в игре. Журнал дня читают люди.
SPEND_LABELS = {
    "food-cheap": "Своя еда, готовим дома",
    "food-fast": "Фастфуд",
    "food-luxe": "Хороший обед",
    "food-leftovers": "Еда, приготовленная утром",
    "food-coffee": "Кофе и булочка",
    "food-syrniki": "Сырники со сметаной",
    "housing": "Жильё в общежитии",
    "internet": "Интернет",
    "transit-pass": "Проездной на месяц",
    "laundry": "Постирать вещи",
    "kino": "Поход в кино",
    "park": "Прогулка в парке",
    "tiktok": "Листать тик-токи",
    "computer": "Играть в компьютер",
    "pet": "Погладить Соломона",
    "wash": "Помыться",
    "lessons": "Сделать уроки",
}

TRANSPORT_LABELS = {"walk": "Пешком", "bus": "Автобус", "taxi": "Такси"}

# Разовая и периодическая оплата — платить второй раз бессмысленно.
SPEND_ONCE = {"housing"}
SPEND_PERIOD = {"internet", "transit-pass"}

# Развлечения: без них за день Соломон грустит.
ENTERTAINMENT_SPENDS = {"kino", "park", "tiktok", "computer"}

# --- дорога ---------------------------------------------------------------
# ₽, минуты, энергия, сытость, грязь, настроение.
TRANSPORT = {
    "walk": (0, 40, 10, 5, 8, -1),
    "bus":  (35, 35, 3, 5, 3, 0),
    "taxi": (150, 15, 3, 5, 2, 1),
}

# --- события --------------------------------------------------------------
# ₽ и общий эффект по настроению.
PHONE_OPTIONS = {
    "repair": (1500, -2),
    "new": (4000, 8),
    "old": (0, -12),
}
GIFT_OPTIONS = {
    "big": (2500, 14),
    "mid": (1200, 9),
    "small": (400, 4),
}

# --- профессии ------------------------------------------------------------
PROFESSIONS = {
    # Игрок всегда студент: выбор профессии убран (решение заказчика).
    "student": {"label": "Студент", "rep": 2, "mood": 0},
}


class Game:
    def __init__(self, scenario: Scenario = SHORT, seed: int = 11, profession: str = "student"):
        self.scenario = scenario
        self.seed = seed
        self.profession = PROFESSIONS[profession]
        self.cash = scenario.capital
        self.savings = 0
        self.mood = 70 + self.profession["mood"]
        self.energy = 100
        self.hunger = 70
        # Чистота общая: и игрок, и Соломон.
        self.cleanliness = 100
        self.rep = self.profession["rep"]
        self.income = 0
        self.expenses = 0
        self.spent_by_category = {
            "обязательные": 0,
            "быт": 0,
            "развлечения": 0,
            "покупки": 0,
            "подарки": 0,
            "телефон": 0,
            "накопления": 0,
        }
        # Дневное состояние.
        self.current_day = 1
        self.current_week = 0
        self.clock = DAY_START
        self.phase = "morning"
        self.breakfast_today = False
        self.transport_today = None
        self.meals_today = 0
        # Запас еды, приготовленной утром: порции и день приготовления.
        self.meal_servings = 0
        self.meal_prepared_on_day = 0
        self.lessons_today = False
        self.lesson_streak = 0
        self.missed_lessons = 0
        self.lesson_problems = False
        self.housing_paid = False
        self.internet_until = scenario.internet_trial_days
        self.transit_until = 0
        self.laundry_day = 1
        self.neglect_days = 0
        # Дни подряд, когда энергия или сытость на нуле: на второй такой
        # день приходит счёт на лечение.
        self.collapse_days = 0
        # Сколько счетов на лечение за игру.
        self.treatment_bills = 0
        self.lost = False
        self.loss_reason = None
        self.phone_broken = False
        self.phone_resolved = False
        self.gift_resolved = False
        self.pending_event = None
        self.log = []
        # Суточные счётчики.
        self.sleeps_today = 0
        self.pets_today = 0
        self.washes_today = 0
        self.laundries_today = 0
        self.fun_today = 0
        self.notes = []
        self.actions = []

    # --- шкалы ------------------------------------------------------------
    def clamp(self) -> None:
        self.mood = max(0, min(100, self.mood))
        self.energy = max(0, min(100, self.energy))
        self.hunger = max(0, min(100, self.hunger))
        self.cleanliness = max(0, min(100, self.cleanliness))

    def dirt_variant(self) -> int:
        if self.cleanliness >= CLEAN_AT:
            return 0
        if self.cleanliness > DIRTY_AT:
            return 1
        return 2

    def add_rep(self, amount: int) -> None:
        self.rep = max(0, min(REP_CAP, self.rep + amount))

    # --- деньги -----------------------------------------------------------
    def can_pay(self, amount: int) -> bool:
        return self.cash >= amount or self.savings >= amount - self.cash

    def pay(self, amount: int, category=None) -> str:
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

    def save_money(self, amount: int) -> str:
        if self.cash < amount:
            return "нет денег"
        self.cash -= amount
        self.savings += amount
        self.spent_by_category["накопления"] += amount
        return f"подушка +{amount}"

    def withdraw(self, amount: int) -> str:
        if self.savings < amount:
            return "нет денег"
        self.savings -= amount
        self.cash += amount
        return f"из подушки +{amount}"

    # --- условия ----------------------------------------------------------
    def has_internet(self) -> bool:
        return self.current_day <= self.internet_until

    def has_transit_pass(self) -> bool:
        return self.current_day <= self.transit_until

    def has_phone(self) -> bool:
        return not self.phone_broken

    def is_snow_day(self) -> bool:
        return self.current_day in self.scenario.snow_days

    def transport_cost(self, key: str) -> int:
        cost = TRANSPORT[key][0]
        if self.has_transit_pass():
            return 0
        if key == "taxi" and self.is_snow_day():
            return cost + 100
        return cost

    def spend_block_reason(self, key: str):
        (cost, minutes, mood_d, energy_d, energy_g, food_d, clean_d, rep_d,
         category, prepares, req) = SPEND[key]
        if self.pending_event:
            return "сначала закрой событие"
        if self.phase == "done":
            return "день уже закончился"
        if self.phase == "morning":
            if not key.startswith("food-"):
                return "утром можно только позавтракать"
            if self.breakfast_today:
                return "завтрак уже был"
            if self.clock + minutes > MORNING_END:
                return "не успеваешь к парам"
        elif self.phase != "free":
            return "сейчас всё занято: сначала пары"
        elif self.clock + minutes > NIGHT:
            return "уже ночь, пора спать"
        if key == "pet" and self.pets_today >= PET_PER_DAY:
            return f"поглаживаний на сегодня хватает ({PET_PER_DAY})"
        if key == "wash" and self.washes_today >= WASH_PER_DAY:
            return f"мытьё на сегодня уже было ({WASH_PER_DAY})"
        if key == "laundry" and self.laundries_today >= LAUNDRY_PER_DAY:
            return f"стирка на сегодня уже была ({LAUNDRY_PER_DAY})"
        if req == "mealStock" and self.meal_servings <= 0:
            return REQUIREMENTS["mealStock"]
        if key.startswith("food-") and self.meals_today >= MEALS_PER_DAY:
            return f"Соломон сыт: еда больше не лезет ({MEALS_PER_DAY} приёма пищи в день)"
        # Требований может быть несколько ("mood+clean"): проверяем по очереди.
        for token in (req or "").split("+"):
            if not token:
                continue
            if token == "internet" and not self.has_internet():
                return REQUIREMENTS["internet"]
            if token == "mood" and self.mood < MOOD_FOR_FUN:
                return REQUIREMENTS["mood"]
            if token == "clean" and self.cleanliness <= DIRTY_AT:
                return REQUIREMENTS["clean"]
        # Голодный Соломон не развлекается: сначала накормить.
        if key in ENTERTAINMENT_SPENDS and self.hunger <= 0:
            return REQUIREMENTS["hungry"]
        if cost > 0 and not self.can_pay(cost):
            return "не хватает денег"
        if energy_d > 0 and self.energy < energy_d:
            return "нет энергии"
        if key in SPEND_ONCE and self.housing_paid:
            return "жильё уже оплачено"
        if key == "internet" and self.internet_until >= self.scenario.days:
            return "интернет уже оплачен"
        if key == "transit-pass" and self.transit_until >= self.scenario.days:
            return "проездной уже куплен"
        return None

    def rest_block_reason(self):
        if self.sleeps_today >= SLEEP_PER_DAY:
            return "сон уже был сегодня"
        if self.phase == "morning":
            return "сначала позавтракай и доедь до пар"
        if self.phase == "classes":
            return "сначала отсиди пары"
        if self.phase == "done":
            return "день уже закончился"
        return None

    # --- действия игрока --------------------------------------------------
    def buy(self, key: str) -> str:
        (cost, minutes, mood_d, energy_d, energy_g, food_d, clean_d, rep_d,
         category, prepares, req) = SPEND[key]
        reason = self.spend_block_reason(key)
        if reason:
            return reason

        paid = self.pay(cost, category) if cost > 0 else "бесплатно"
        self.mood += mood_d
        self.energy = max(0, self.energy - energy_d + energy_g)
        self.hunger = min(100, self.hunger + food_d)
        self.cleanliness = min(100, self.cleanliness + clean_d)
        self.add_rep(rep_d)
        if key == "wash":
            self.cleanliness = 100
        if key.startswith("food-"):
            self.meals_today += 1
            self.breakfast_today = True
            if prepares:
                # Приготовили еду: одна порция съедена сразу, остальные —
                # запас на сегодня и на завтра. Новая порция заменяет старый.
                self.meal_servings = MEAL_SERVINGS - 1
                self.meal_prepared_on_day = self.current_day
            elif key == "food-leftovers":
                self.meal_servings = max(0, self.meal_servings - 1)
        if key in ENTERTAINMENT_SPENDS:
            self.fun_today += 1
        if key == "lessons":
            self.lessons_today = True
            self.lesson_streak += 1
            self.missed_lessons = 0
        if key == "housing":
            self.housing_paid = True
        if key == "internet":
            self.internet_until = min(self.current_day + self.scenario.internet_days - 1,
                                      self.scenario.days)
        if key == "transit-pass":
            self.transit_until = min(self.current_day + self.scenario.transit_days - 1,
                                     self.scenario.days)
        if key == "laundry":
            self.laundry_day = self.current_day
            self.laundries_today += 1
        self.clock += minutes
        self.clamp()
        label = f"{SPEND_LABELS[key]} {paid}"
        self.actions.append(label)
        self.advance()
        return label

    def choose_transport(self, key: str) -> str:
        cost, minutes, energy_d, hunger_d, dirt, mood_d = TRANSPORT[key]
        if self.phase != "morning":
            return "дорога выбирается только утром"
        if self.transport_today:
            return "дорога уже выбрана"
        # Грязного Соломона не пускают в общественный транспорт.
        if key in ("bus", "taxi") and self.cleanliness <= DIRTY_AT:
            return REQUIREMENTS["clean"]
        # Пешком в метель не ходят — но если весь транспорт закрыт из-за
        # грязи, иначе игрок останется без дороги на пары. Тогда можно
        # идти, но Соломон замёрзнет.
        snow_walk = key == "walk" and self.is_snow_day()
        if snow_walk and not self.dirty_blocks_transport():
            return "в метель пешком не дойдёшь"
        if self.clock + minutes > MORNING_END:
            return "не успеваешь к парам"
        price = self.transport_cost(key)
        if price > 0 and not self.can_pay(price):
            return "не хватает денег на дорогу"
        if price > 0:
            self.pay(price, "обязательные")
        self.energy = max(0, self.energy - energy_d)
        self.hunger = max(0, self.hunger - hunger_d)
        self.mood += mood_d
        if dirt:
            self.cleanliness = max(0, self.cleanliness - dirt)
        # Обморок на морозе: грязный Соломон в метель замёрз.
        if snow_walk:
            self.mood = max(0, self.mood - SICK_MOOD_COST)
            self.energy = max(0, self.energy - SICK_ENERGY_COST)
            self.notes.append(
                f"настроение −{SICK_MOOD_COST}, энергия −{SICK_ENERGY_COST}: Соломон замёрз в метель"
            )
        self.clock += minutes
        self.transport_today = key
        self.clamp()
        label = f"дорога: {TRANSPORT_LABELS[key]}{f' −{price}' if price > 0 else ' (проездной)'}"
        self.actions.append(label)
        self.advance()
        return label

    def dirty_blocks_transport(self) -> bool:
        """Закрыт ли весь платный транспорт из-за грязи."""
        return self.cleanliness <= DIRTY_AT

    def sleep(self) -> str:
        reason = self.rest_block_reason()
        if reason:
            return reason
        self.sleeps_today += 1
        if self.cleanliness >= CLEAN_AT:
            clean = CLEAN_FACTOR_GOOD
        elif self.cleanliness > DIRTY_AT:
            clean = CLEAN_FACTOR_WEAK
        else:
            clean = CLEAN_FACTOR_BAD
        energy = round(SLEEP_ENERGY * clean)
        # Сон не восстанавливает сытость — наоборот, опускает её почти до нуля.
        hunger_loss = min(self.hunger, SLEEP_HUNGER)
        self.energy = min(100, self.energy + energy)
        self.hunger = max(0, self.hunger - hunger_loss)
        self.mood = min(100, self.mood + SLEEP_MOOD)
        self.clamp()
        self.notes.append(f"сон: энергия +{energy}, сытость −{hunger_loss}")
        self.clock = NIGHT
        self.phase = "done"
        self.actions.append("сон")
        return "сон"

    def resolve_event(self, choice: str) -> str:
        if self.pending_event is None:
            return "нет открытого события"
        if self.pending_event == "phone":
            if self.phone_resolved:
                return "событие уже закрыто"
            cost, mood_d = PHONE_OPTIONS[choice]
            if cost > 0 and not self.can_pay(cost):
                return "не хватает денег"
            if cost > 0:
                self.pay(cost, "телефон")
            self.mood += mood_d
            self.phone_resolved = True
            self.phone_broken = choice == "old"
            label = f"телефон: {choice} −{cost}"
        else:
            if self.gift_resolved:
                return "событие уже закрыто"
            cost, mood_d = GIFT_OPTIONS[choice]
            if cost > 0 and not self.can_pay(cost):
                return "не хватает денег"
            if cost > 0:
                self.pay(cost, "подарки")
            self.mood += mood_d
            self.add_rep(1)
            self.gift_resolved = True
            label = f"подарок: {choice} −{cost}"
        self.clamp()
        self.actions.append(label)
        self.pending_event = None
        self.advance()
        return label

    # --- дневной цикл ------------------------------------------------------
    def decay(self):
        sc = self.scenario
        notes = []
        self.hunger = max(0, self.hunger - sc.hunger_decay)
        self.cleanliness = max(0, self.cleanliness - sc.cleanliness_decay)
        # Настроение общее: и скука, и брошенный Соломон бьют по нему.
        self.mood -= BORING + PET_NEGLECT_MOOD
        notes.append(f"настроение −{BORING}: скука")
        notes.append(f"настроение −{PET_NEGLECT_MOOD}: Соломон скучает без ухода")
        if self.hunger == 0:
            self.mood -= HUNGER_PENALTY
            notes.append(f"настроение −{HUNGER_PENALTY}: голод")
        if self.cleanliness == 0:
            self.mood -= HYGIENE_PENALTY
            notes.append(f"настроение −{HYGIENE_PENALTY}: грязь")
        if self.savings >= SAVE_BONUS_AT:
            self.mood += SAVE_BONUS
            notes.append(f"настроение +{SAVE_BONUS}: подушка 4 000 ₽")
        dirt = self.dirt_variant()
        if dirt:
            self.mood -= dirt
            notes.append(f"настроение −{dirt}: Соломон грязный")
        self.clamp()
        return notes

    def classes(self):
        notes = []
        self.energy = max(0, self.energy - CLASSES_ENERGY_COST)
        self.mood = max(0, self.mood - CLASSES_MOOD_COST)
        self.hunger = max(0, self.hunger - CLASSES_HUNGER_COST)
        self.cleanliness = max(0, self.cleanliness - CLASSES_CLEANLINESS_COST)
        notes.append(f"энергия −{CLASSES_ENERGY_COST}: пары")
        notes.append(f"сытость −{CLASSES_HUNGER_COST}: пары")
        notes.append(f"чистота −{CLASSES_CLEANLINESS_COST}: пары")
        self.clamp()
        return notes

    def open_pending_event(self):
        if self.current_day == self.scenario.phone_day and not self.phone_resolved:
            return "phone"
        if self.current_day == self.scenario.gift_day and not self.gift_resolved:
            return "gift"
        return None

    def advance(self) -> None:
        """Продвинуть дневной цикл до следующей фазы."""
        while True:
            if self.phase == "morning":
                if self.breakfast_today and self.transport_today:
                    self.phase = "classes"
                    continue
                return
            if self.phase == "classes":
                self.notes.extend(self.classes())
                self.clock = CLASSES_END
                self.phase = "free"
                continue
            if self.phase == "free":
                event = self.open_pending_event()
                if event:
                    self.pending_event = event
                return
            return

    def start_day(self) -> None:
        self.current_week = (self.current_day - 1) // 7
        self.sleeps_today = 0
        self.pets_today = 0
        self.washes_today = 0
        self.laundries_today = 0
        self.fun_today = 0
        self.breakfast_today = False
        self.transport_today = None
        self.meals_today = 0
        self.lessons_today = False
        self.clock = DAY_START
        self.phase = "morning"
        self.notes = self.decay()
        self.actions = []
        # Еда хранится два дня: приготовили в день D — доступна в D и D+1,
        # а на D+2 она портится и пропадает.
        if (self.meal_servings > 0
                and self.current_day - self.meal_prepared_on_day >= MEAL_KEEPS_DAYS):
            self.meal_servings = 0
            self.meal_prepared_on_day = 0
            self.notes.append("еда испортилась: запас пролежал слишком долго")
        self.advance()

    def end_day(self) -> None:
        """Последствия дня и запись в журнал."""
        if not self.lessons_today:
            self.lesson_streak = 0
            self.missed_lessons += 1
            self.mood = max(0, self.mood - MISSED_LESSON_MOOD)
            self.notes.append(f"настроение −{MISSED_LESSON_MOOD}: уроки пропущены")
            if self.missed_lessons >= LESSON_PROBLEMS_AFTER:
                self.lesson_problems = True
                self.notes.append("у Соломона начались проблемы с учёбой")
        if self.current_day - self.laundry_day >= self.scenario.laundry_every_days:
            self.mood = max(0, self.mood - 5)
            self.notes.append("настроение −5: Соломону нечего надеть — постирайте вещи")
        # День без развлечений: Соломон грустит.
        if self.fun_today < FUN_PER_DAY:
            self.mood = max(0, self.mood - NO_FUN_MOOD_PENALTY)
            self.notes.append(f"настроение −{NO_FUN_MOOD_PENALTY}: день без развлечений")
        # Ноль на шкале — это событие.
        #   * энергия или сытость на нуле два дня подряд: Соломон теряет
        #     сознание, и на лечение уходят деньги;
        #   * настроение на нуле: депрессия, игра проиграна.
        collapsed = self.energy <= 0 or self.hunger <= 0
        self.collapse_days = self.collapse_days + 1 if collapsed else 0
        if self.collapse_days >= COLLAPSE_DAYS_TO_BILL:
            self.collapse_days = 0
            self.pay(TREATMENT_COST, "быт")
            cause = "от голода" if self.hunger <= 0 else "от истощения"
            self.notes.append(
                f"Соломон потерял сознание {cause}: счёт на лечение −{TREATMENT_COST}"
            )
            self.actions.append(f"лечение −{TREATMENT_COST}")
            self.treatment_bills += 1
        if self.mood <= 0:
            self.lost = True
            self.loss_reason = "depression"
        if not self.housing_paid and self.current_day >= self.scenario.housing_deadline:
            self.lost = True
            self.loss_reason = "housing"
        self.clamp()
        self.log.append((self.current_day, self.cash, self.savings, self.mood,
                         self.energy, self.cleanliness, self.hunger,
                         "; ".join(self.actions), "; ".join(self.notes)))
        self.actions = []
        self.notes = []
        if self.lost or self.current_day >= self.scenario.days:
            return
        self.current_day += 1

    def run(self, policy) -> "Game":
        for _ in range(self.scenario.days):
            self.start_day()
            policy(self)
            if self.pending_event:
                self.resolve_event("repair" if self.pending_event == "phone" else "mid")
            self.end_day()
            if self.lost:
                break
        return self


FAIL_PREFIXES = ("нет ", "недельный", "выгорание", "лимит", "мало ", "смен нет",
                 "не хватает",
                 "поглаживаний на сегодня", "сон уже был", "мытьё на сегодня",
                 "стирка на сегодня", "нужен ", "работать", "не хватит", "утром ",
                 "завтрак уже", "не успеваешь", "уже ночь", "сейчас всё",
                 "дорога ", "в метель", "жильё уже", "интернет уже",
                 "проездной уже", "нечего есть", "запас еды пуст")


def morning(g: Game, food: str, transport: str):
    """Позавтракать и выбрать дорогу."""
    acts = []
    if not g.breakfast_today:
        acts.append(g.buy(food))
    if not g.transport_today:
        acts.append(g.choose_transport(transport))
    return acts


def meal(g: Game, fallback: str):
    """Поесть из запаса, если он есть, иначе купить еду."""
    if g.meal_servings > 0:
        return g.buy("food-leftovers")
    return g.buy(fallback)


# --- стратегии (крайние профили поведения) --------------------------------


def policy_saver(g: Game):
    """Копилка: копит и почти не тратит, но каждый день гуляет.

    Гулять приходится: без развлечений настроение падает на 12 в день, а
    ноль настроения — это проигрыш от депрессии.
    """
    acts = []
    acts += morning(g, "food-cheap", "walk")
    if g.phase == "free":
        if g.pending_event:
            acts.append(g.resolve_event("repair" if g.pending_event == "phone" else "small"))
        if not g.housing_paid:
            acts.append(g.buy("housing"))
        if g.current_day == 1:
            acts.append(g.save_money(4000))
        # Интернет не покупает: тик-токов и игр нет.
        # Еда — из запаса: он остался от завтрака.
        acts.append(meal(g, "food-cheap"))
        # Развлечение — ровно одно в день, иначе Соломон впадёт в депрессию.
        acts.append(g.buy("park"))
        # Ласка — бесплатно, а настроение поднимает: копилке это тем более
        # по карману.
        acts.append(g.buy("pet"))
        # Мытьё — до того, как Соломон станет сильно грязным: грязного не
        # пускают в транспорт и заведения, а Соломон ещё и хуже спит.
        if g.cleanliness < 25:
            acts.append(g.buy("wash"))
    acts.append(g.sleep())
    return acts


def policy_student(g: Game):
    """Ученик: учится и ест в кафе, развлекается через день."""
    acts = []
    acts += morning(g, "food-fast", "bus")
    if g.phase == "free":
        if g.pending_event:
            acts.append(g.resolve_event("repair" if g.pending_event == "phone" else "mid"))
        if not g.housing_paid:
            acts.append(g.buy("housing"))
        acts.append(meal(g, "food-fast"))
        # Уроки каждый день: без них Соломону тяжело.
        acts.append(g.buy("lessons"))
        # Развлечение — через день: без него настроение дойдёт до нуля.
        if g.current_day % 2 == 1:
            acts.append(g.buy("park"))
        # Мытьё — до того, как Соломон станет сильно грязным: грязного не
        # пускают в автобус, такси и кафе.
        if g.cleanliness < 45:
            acts.append(g.buy("wash"))
    acts.append(g.sleep())
    return acts


def policy_balanced(g: Game):
    """Баланс: уроки, уход за Соломоном, умеренные траты и развлечения."""
    acts = []
    acts += morning(g, "food-cheap", "bus")
    if g.phase == "free":
        if g.pending_event:
            acts.append(g.resolve_event("repair" if g.pending_event == "phone" else "mid"))
        if not g.housing_paid:
            acts.append(g.buy("housing"))
        if not g.has_internet():
            acts.append(g.buy("internet"))
        # Уроки каждый день: без них Соломону тяжело.
        acts.append(g.buy("lessons"))
        # Уход за Соломоном: он грустит, когда за ним не смотрят.
        acts.append(g.buy("pet"))
        # Чистота общая: одного мытья хватает и за игрока, и за Соломона.
        if g.cleanliness < 60:
            acts.append(g.buy("wash"))
        # Второй приём пищи: сон опускает сытость, без еды Соломон голодает.
        acts.append(meal(g, "food-fast"))
        # Раз в два дня — прогулка в парке.
        if g.current_day % 2 == 0:
            acts.append(g.buy("park"))
    acts.append(g.sleep())
    return acts


def policy_gecko(g: Game):
    """Гедонист: дорогая еда, такси, кино и щедрые подарки. Деньги кончаются."""
    acts = []
    acts += morning(g, "food-luxe", "taxi")
    if g.phase == "free":
        if g.pending_event:
            acts.append(g.resolve_event("new" if g.pending_event == "phone" else "big"))
        if not g.housing_paid:
            acts.append(g.buy("housing"))
        if not g.has_internet():
            acts.append(g.buy("internet"))
        if g.current_day % 2 == 1:
            acts.append(g.buy("kino"))
        acts.append(g.buy("park"))
        acts.append(meal(g, "food-luxe"))
        # Грязного Соломона не пускают в такси, кино и ресторан, поэтому
        # богатый игрок тоже моется — иначе он останется без дороги.
        if g.cleanliness < 45:
            acts.append(g.buy("wash"))
    acts.append(g.sleep())
    return acts


# --- оценка ---------------------------------------------------------------


def money_grade(balance: int) -> str:
    if balance >= 12000:
        return "Отличный результат"
    if balance >= 8000:
        return "Хороший результат"
    if balance >= 0:
        return "Есть над чем поработать"
    return "Бюджет ушёл в минус"


def mood_grade(mood: int) -> str:
    if mood >= 75:
        return "Настроение отличное"
    if mood >= 50:
        return "Настроение хорошее"
    if mood >= 25:
        return "Настроение так себе"
    return "Настроение плохое"


def overall_grade(balance: int, mood: int) -> str:
    money_ok = balance >= 8000
    mood_ok = mood >= MOOD_OK_AT
    if money_ok and mood_ok:
        return "Успех: и деньги есть, и настроение хорошее"
    if money_ok:
        return "Деньги есть, но настроение провалилось"
    if mood_ok:
        return "Настроение хорошее, но денег нет"
    return "Провал: ни денег, ни настроения"


def obligatory_total() -> int:
    """Сколько обязательных расходов нужно покрыть по правилам игры."""
    return HOUSING_COST + INTERNET_COST


def expense_audit(g: Game) -> dict:
    """Проверка расходов: как игрок распорядился деньгами."""
    items = g.spent_by_category
    spent_total = sum(v for k, v in items.items() if k != "накопления")
    obligatory = items["обязательные"]
    discretionary = spent_total - obligatory
    share = discretionary / spent_total if spent_total else 0.0
    checks = {
        "обязательные_покрыты": obligatory >= obligatory_total(),
        "доля_необязательных": round(share, 3),
        "нет_долга": g.cash >= 0,
        "есть_подушка": g.savings >= 2000,
        "кошелёк_не_пустой": g.cash > 0,
    }
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
    avg_clean = sum(r[5] for r in g.log) / len(g.log)
    balance = g.cash + g.savings
    audit = expense_audit(g)
    return {
        "итоговый_баланс": balance,
        "кошелёк": g.cash,
        "подушка": g.savings,
        "среднее_настроение": round(avg_mood, 1),
        "средняя_чистота": round(avg_clean, 1),
        "доход": g.income,
        "расход": g.expenses,
        "оценка_деньги": money_grade(balance),
        "оценка_счастье": mood_grade(round(avg_mood)),
        "итог": overall_grade(balance, round(avg_mood)),
        "аудит": audit,
    }


POLICIES = {
    "Копилка": policy_saver,
    "Ученик": policy_student,
    "Баланс": policy_balanced,
    "Гедонист": policy_gecko,
}


def report(scenario: Scenario) -> None:
    print(f"===== {scenario.title} =====")
    for name, policy in POLICIES.items():
        g = Game(scenario, 11).run(policy)
        s = stats(g)
        print(f"{name}: баланс {s['итоговый_баланс']}, кошелёк {s['кошелёк']}, "
              f"подушка {s['подушка']}, настр {s['среднее_настроение']}, "
              f"чистота {s['средняя_чистота']} → {s['итог']}")
        print(f"    статьи расходов: {g.spent_by_category}")
        print(f"    проверка расходов: {s['аудит']['вердикт']} "
              f"(доля необязательных {s['аудит']['доля_необязательных']:.0%})")
    print()


def markdown_tables() -> None:
    """Напечатать таблицы раздела 11 документа — числа берутся из модели.

    Документ собирается по этому выводу: вручную набранные числа
    разъезжаются с моделью, и проверка `verify_hermes_doc.py` начинает
    ругаться на верные значения.
    """
    scenario = SHORT
    print(f"### {scenario.title}")
    print()
    print("| Стратегия | Баланс | Кошелёк | Подушка | Ср. настроение | Ср. чистота | Вердикт |")
    print("|---|---|---|---|---|---|---|")
    for name, policy in POLICIES.items():
        s = stats(Game(scenario, 11).run(policy))
        print(f"| {name} | {s['итоговый_баланс']} | {s['кошелёк']} | {s['подушка']} | "
              f"{s['среднее_настроение']} | {s['средняя_чистота']} | {s['итог']} |")
    print()
    print("| Стратегия | Доля необязательных | Вердикт проверки |")
    print("|---|---|---|")
    for name, policy in POLICIES.items():
        s = stats(Game(scenario, 11).run(policy))
        share = s["аудит"]["доля_необязательных"]
        print(f"| {name} | {share * 100:.1f} % | {s['аудит']['вердикт']} |")
    print()

    print("### Ход недели (короткий режим, стратегия «Баланс»)")
    print()
    print("| День | Кошелёк | Подушка | Настроение | Энергия | Чистота | Сытость |")
    print("|---|---|---|---|---|---|---|")
    for r in Game(SHORT, 11).run(policy_balanced).log:
        print(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} | {r[6]} |")


def main() -> None:
    report(SHORT)

    print("=== Игра: игрок всегда студент ===")
    g = Game(SHORT, 11).run(policy_balanced)
    s = stats(g)
    print(f"Студент          баланс {s['итоговый_баланс']:>6} | "
          f"настр {s['среднее_настроение']:>5} | чистота {s['средняя_чистота']:>5} | "
          f"{s['итог']}")

    print()
    print("=== Ход недели (короткий режим, стратегия «Баланс») ===")
    print("день | кошелёк | подушка | настр | энерг | чистота | сытость | действия")
    g = Game(SHORT, 11).run(policy_balanced)
    for r in g.log:
        print(f"{r[0]:>3} | {r[1]:>6} | {r[2]:>5} | {r[3]:>3} | {r[4]:>3} | "
              f"{r[5]:>5} | {r[6]:>3} | {r[8]}")
    print(f"доход {g.income} | расход {g.expenses} | кошелёк {g.cash} | "
          f"подушка {g.savings}")


if __name__ == "__main__":
    main()
