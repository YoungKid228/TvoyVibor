"""Пересборка src/data/solomon-game.json под новый дизайн игры.

Запуск:  python scripts/build_game_data.py

Скрипт правит существующий файл, а не пишет его заново: разделы, которые
меня не трогают (meta, grades, professions, locations), сохраняются как есть.
Новые разделы — «day» (часы), «transport» (утренний выбор дороги), «spends»
(траты с временем), «rules» (константы модели).

Изменения 19.11.2026 (правки заказчика):
  * модуль «Заработать» убран целиком — работ в игре больше нет;
  * «Помыться» осталось одно — мытьё Соломона;
  * еда, приготовленная утром, хранится два дня и считается порциями;
  * новое развлечение «Играть в компьютер» (нужен интернет);
  * интернет подорожал на 1000 ₽;
  * пары и дорога меняют сытость и чистоту;
  * без развлечений за день Соломон грустит.
"""

import collections
import json
import os

PATH = os.path.join("src", "data", "solomon-game.json")

with open(PATH, encoding="utf-8") as fh:
    data = json.load(fh, object_pairs_hook=collections.OrderedDict)

# ---------------------------------------------------------------- шкалы ---
# Четыре шкалы. Настроение общее (и игрока, и Соломона), чистота тоже общая.
data["scales"] = [
    {
        "id": "mood", "label": "Настроение", "icon": "ui/mood",
        "start": 70, "min": 0, "max": 100, "decay": 6,
    },
    {
        "id": "energy", "label": "Энергия", "icon": "ui/energy",
        "start": 100, "min": 0, "max": 100, "decay": 0,
    },
    {
        "id": "hunger", "label": "Сытость", "icon": "ui/hunger",
        "start": 70, "min": 0, "max": 100, "decay": 25,
    },
    {
        "id": "cleanliness", "label": "Чистота", "icon": "ui/loc-bathroom",
        "start": 100, "min": 0, "max": 100, "decay": 15,
    },
]

# ------------------------------------------------------------ профессии ---
# Игрок всегда студент: выбор профессии убран по решению заказчика.
data["professions"] = [
    {
        "id": "student", "label": "Студент", "icon": "ui/prof-student",
        "payBonus": 0, "moodBonus": 0, "shiftBonus": 0, "repBonus": 2,
    },
]

# ---------------------------------------------------------------- день ---
# Часы дня. Утро — завтрак и дорога, потом пары до 15:00, потом свободное
# время до ночи. Всё в минутах от 00:00.
data["day"] = collections.OrderedDict([
    ("startMinutes", 360),      # 06:00 — начало дня
    ("morningEnd", 540),        # 09:00 — к этому времени нужно успеть к парам
    ("classesStart", 540),      # 09:00 — начало пар
    ("classesEnd", 900),        # 15:00 — конец пар
    ("nightMinutes", 1380),     # 23:00 — после этого только сон
])

# ------------------------------------------------------------ сценарии ---
data["scenarios"] = collections.OrderedDict([
    ("short", collections.OrderedDict([
        ("id", "short"), ("label", "Неделя"), ("days", 7), ("capital", 20000),
        ("housingDeadline", 4),      # четыре дня не платишь — выселение
        ("internetTrialDays", 3),    # первые дни интернет бесплатный
        ("internetDays", 7),         # на сколько дней хватает оплаты
        ("transitDays", 7),          # на сколько дней хватает проездного
        ("laundryEveryDays", 3),     # как часто нужно стирать вещи
        ("phoneDay", 5), ("giftDay", 6),
        ("snowDays", [4]),           # дни снегопада
        ("hungerDecay", 25), ("cleanlinessDecay", 15),
    ])),
])

# Модуль «Заработать» убран: раздел jobs удаляется из данных целиком.
data.pop("jobs", None)

# --------------------------------------------------------------- траты ---
# У каждой траты есть время в минутах и место: по месту игра показывает
# нужную сцену. `requires` — условие доступности.
data["spends"] = [
    # Еда: три уровня по цене. Дешёвая готовится долго и отнимает силы,
    # зато после неё остаётся запас еды на два дня (порциями — mealServings).
    {
        "id": "food-cheap", "label": "Своя еда, готовим дома", "icon": "ui/spend-products",
        "cost": 120, "minutes": 60, "location": "dorm",
        "moodGain": -2, "energyCost": 15, "energyGain": 0,
        "hungerGain": 45, "cleanlinessGain": 0, "repGain": 0,
        "category": "обязательные", "preparesMeal": True, "requires": None,
    },
    {
        "id": "food-fast", "label": "Фастфуд", "icon": "ui/spend-schnitzel",
        "cost": 250, "minutes": 20, "location": "arbat",
        "moodGain": 5, "energyCost": 0, "energyGain": 12,
        "hungerGain": 45, "cleanlinessGain": 0, "repGain": 0,
        "category": "обязательные", "preparesMeal": False, "requires": "clean",
    },
    {
        "id": "food-luxe", "label": "Хороший обед", "icon": "ui/spend-cafe",
        "cost": 500, "minutes": 20, "location": "arbat",
        "moodGain": 10, "energyCost": 0, "energyGain": 25,
        "hungerGain": 55, "cleanlinessGain": 0, "repGain": 0,
        "category": "обязательные", "preparesMeal": False, "requires": "clean",
    },
    {
        "id": "food-leftovers", "label": "Еда, приготовленная утром", "icon": "ui/spend-breakfast",
        "cost": 0, "minutes": 20, "location": "dorm",
        "moodGain": 0, "energyCost": 0, "energyGain": 6,
        "hungerGain": 35, "cleanlinessGain": 0, "repGain": 0,
        "category": "обязательные", "preparesMeal": False, "requires": "mealStock",
    },
    # Быстрые завтраки между «своей едой» и фастфудом: сытость меньше,
    # зато времени уходит меньше и настроение не падает.
    {
        "id": "food-coffee", "label": "Кофе и булочка", "icon": "ui/spend-coffee",
        "cost": 150, "minutes": 15, "location": "arbat",
        "moodGain": 4, "energyCost": 0, "energyGain": 5,
        "hungerGain": 20, "cleanlinessGain": 0, "repGain": 0,
        "category": "обязательные", "preparesMeal": False, "requires": "clean",
    },
    {
        "id": "food-syrniki", "label": "Сырники со сметаной", "icon": "ui/spend-breakfast",
        "cost": 200, "minutes": 25, "location": "arbat",
        "moodGain": 6, "energyCost": 0, "energyGain": 8,
        "hungerGain": 30, "cleanlinessGain": 0, "repGain": 0,
        "category": "обязательные", "preparesMeal": False, "requires": "clean",
    },
    # Обязательные платежи.
    {
        "id": "housing", "label": "Жильё в общежитии", "icon": "ui/loc-dorm",
        "cost": 3500, "minutes": 30, "location": "dorm",
        "moodGain": 2, "energyCost": 0, "energyGain": 0,
        "hungerGain": 0, "cleanlinessGain": 0, "repGain": 0,
        "category": "обязательные", "preparesMeal": False, "requires": None, "once": True,
    },
    {
        "id": "internet", "label": "Интернет", "icon": "ui/item-laptop",
        "cost": 1500, "minutes": 10, "location": "dorm",
        "moodGain": 0, "energyCost": 0, "energyGain": 0,
        "hungerGain": 0, "cleanlinessGain": 0, "repGain": 0,
        "category": "обязательные", "preparesMeal": False, "requires": None, "period": True,
    },
    {
        "id": "transit-pass", "label": "Проездной на месяц", "icon": "ui/ui-transport",
        "cost": 1000, "minutes": 20, "location": "city",
        "moodGain": 3, "energyCost": 0, "energyGain": 0,
        "hungerGain": 0, "cleanlinessGain": 0, "repGain": 0,
        "category": "обязательные", "preparesMeal": False, "requires": None, "period": True,
    },
    {
        "id": "laundry", "label": "Постирать вещи", "icon": "ui/item-washer",
        "cost": 100, "minutes": 30, "location": "dorm",
        "moodGain": 3, "energyCost": 2, "energyGain": 0,
        "hungerGain": 0, "cleanlinessGain": 5, "repGain": 0,
        "category": "быт", "preparesMeal": False, "requires": None,
    },
    # Развлечения — их немного, и часть из них завязана на интернет.
    {
        "id": "kino", "label": "Поход в кино", "icon": "ui/spend-kino",
        "cost": 800, "minutes": 150, "location": "city",
        "moodGain": 10, "energyCost": 12, "energyGain": 0,
        "hungerGain": 0, "cleanlinessGain": 0, "repGain": 0,
        "category": "развлечения", "preparesMeal": False, "requires": "mood+clean",
    },
    {
        "id": "park", "label": "Прогулка в парке", "icon": "ui/spend-park",
        "cost": 200, "minutes": 90, "location": "embankment",
        "moodGain": 8, "energyCost": 8, "energyGain": 0,
        "hungerGain": 0, "cleanlinessGain": 0, "repGain": 0,
        "category": "развлечения", "preparesMeal": False, "requires": None,
    },
    {
        "id": "tiktok", "label": "Листать тик-токи", "icon": "ui/event-phone-new",
        "cost": 0, "minutes": 60, "location": "dorm",
        "moodGain": 6, "energyCost": 5, "energyGain": 0,
        "hungerGain": 0, "cleanlinessGain": 0, "repGain": 0,
        "category": "развлечения", "preparesMeal": False, "requires": "internet",
    },
    {
        "id": "computer", "label": "Играть в компьютер", "icon": "ui/item-laptop",
        "cost": 0, "minutes": 90, "location": "dorm",
        "moodGain": 7, "energyCost": 6, "energyGain": 0,
        "hungerGain": 0, "cleanlinessGain": 0, "repGain": 0,
        "category": "развлечения", "preparesMeal": False, "requires": "internet",
    },
    # Уход за Соломоном.
    {
        "id": "pet", "label": "Погладить Соломона", "icon": "ui/heart-2",
        "cost": 0, "minutes": 15, "location": "city",
        "moodGain": 5, "energyCost": 0, "energyGain": 12,
        "hungerGain": 0, "cleanlinessGain": 0, "repGain": 0,
        "category": "быт", "preparesMeal": False, "requires": None,
    },
    {
        "id": "wash", "label": "Помыться", "icon": "ui/spend-shower",
        "cost": 200, "minutes": 40, "location": "bathroom",
        "moodGain": 2, "energyCost": 10, "energyGain": 0,
        "hungerGain": 0, "cleanlinessGain": 0, "repGain": 0,
        "category": "быт", "preparesMeal": False, "requires": None,
    },
    {
        "id": "lessons", "label": "Сделать уроки", "icon": "ui/prof-student",
        "cost": 0, "minutes": 90, "location": "dorm",
        "moodGain": 3, "energyCost": 15, "energyGain": 0,
        "hungerGain": 0, "cleanlinessGain": 0, "repGain": 1,
        "category": "быт", "preparesMeal": False, "requires": None,
    },
]

data["transport"] = [
    {
        "id": "walk", "label": "Пешком", "icon": "ui/event-blizzard-walk",
        "cost": 0, "minutes": 40, "energyCost": 10, "hungerCost": 5, "dirt": 8, "moodGain": -1,
    },
    {
        "id": "bus", "label": "Автобус", "icon": "ui/event-blizzard-bus",
        "cost": 35, "minutes": 35, "energyCost": 3, "hungerCost": 5, "dirt": 3, "moodGain": 0,
    },
    {
        "id": "taxi", "label": "Такси", "icon": "ui/event-blizzard-taxi",
        "cost": 150, "minutes": 15, "energyCost": 3, "hungerCost": 5, "dirt": 2, "moodGain": 1,
    },
]

# ----------------------------------------------------------------- правила ---
rules = collections.OrderedDict([
    ("burnoutMood", 25), ("burnoutRate", 0.7),
    ("boringDaily", 2),
    ("petNeglectMood", 4),      # Соломон скучает без ухода — минус к настроению
    ("sleepMood", 4),
    ("sleepEnergy", 100),       # сон возвращает силы (если Соломон чистый — полностью)
    ("sleepHunger", 30),        # сон опускает сытость, а не поднимает
    ("sleepPerDay", 1),
    ("petPerDay", 3),
    ("washPerDay", 1),
    ("laundryPerDay", 1),       # стирка — раз в день, иначе деньги утекают внику
    ("mealsPerDay", 2),         # больше двух приёмов пищи Соломон не съест
    ("mealServings", 3),        # сколько порций в приготовленной еде
    ("mealKeepsDays", 2),       # сколько дней еда хранится (сегодня и ещё один)
    ("funPerDay", 1),           # сколько развлечений нужно за день
    ("noFunMoodPenalty", 12),   # настроение без развлечений за день
    ("repCap", 5),
    ("cleanAt", 67), ("dirtyAt", 33),
    ("cleanlinessDecay", 15),
    ("saveBonusAt", 4000), ("saveBonus", 1),
    ("gloomyOwnerMood", 30),
    ("hungerPenalty", 5), ("hygienePenalty", 3),
    ("note", "Константы модели. Должны совпадать с scripts/balance_sim.py."),
    # --- пары и уроки ---
    ("classesEnergyCost", 25),
    ("classesMoodCost", 3),
    ("classesHungerCost", 15),
    ("classesCleanlinessCost", 5),
    ("classesMinutes", 360),
    ("lessonStreakForTutor", 3),
    ("lessonMoodGain", 3),
    ("missedLessonMood", 8),
    ("lessonProblemsAfter", 3),
    ("moodForFun", 40),
    # --- ноль на шкале ---
    # Сытость ниже neglectHunger — предупреждение («Соломон голоден»).
    ("neglectHunger", 25),
    # Энергия или сытость на нуле два дня подряд — счёт на лечение.
    ("collapseDaysToBill", 2),
    ("treatmentCost", 1500),
    # Обморок на морозе: грязный Соломон в метель идёт пешком и мёрзнет.
    ("sickMoodCost", 5),
    ("sickEnergyCost", 10),
    # --- качество сна ---
    ("cleanFactorGood", 1.0),
    ("cleanFactorWeak", 0.7),
    ("cleanFactorBad", 0.45),
])

data["rules"] = rules

# --------------------------------------------------------------- события ---
# Снегопад больше не отдельное событие: дорога теперь часть каждого дня,
# а метель — это погода, которая меняет стоимость проезда.
data["events"] = [
    {
        "id": "phone", "day": 5,
        "title": "Сломался телефон",
        "icon": "ui/event-phone-repair",
        "location": "city",
        "options": [
            {
                "id": "repair", "label": "Починить", "icon": "ui/event-phone-repair",
                "cost": 1500, "moodGain": -2, "energyCost": 0,
                "hint": "Дёшево, но связь работает через день.",
            },
            {
                "id": "new", "label": "Купить новый", "icon": "ui/event-phone-new",
                "cost": 4000, "moodGain": 8, "energyCost": 0,
                "hint": "Дорого, зато работает сразу и радует.",
            },
            {
                "id": "old", "label": "Оставить как есть", "icon": "ui/event-phone-old",
                "cost": 0, "moodGain": -12, "energyCost": 0,
                "hint": "Бесплатно, но без телефона нет курьерской доставки и тик-тока.",
            },
        ],
    },
    {
        "id": "gift", "day": 6,
        "title": "День рождения друга",
        "icon": "ui/ui-birthday",
        "location": "arbat",
        "options": [
            {
                "id": "big", "label": "Дорогой подарок", "icon": "ui/event-gift-big",
                "cost": 2500, "moodGain": 14, "energyCost": 0,
                "hint": "Впечатление сильное, но дыра в кошельке тоже.",
            },
            {
                "id": "mid", "label": "Подарок и праздник", "icon": "ui/event-gift-mid",
                "cost": 1200, "moodGain": 9, "energyCost": 0,
                "hint": "Золотая середина: и friend, и кошелёк довольны.",
            },
            {
                "id": "small", "label": "Символический подарок", "icon": "ui/event-gift-small",
                "cost": 400, "moodGain": 4, "energyCost": 0,
                "hint": "Дёшево, но внимание важнее суммы.",
            },
        ],
    },
]

# --------------------------------------------------------------- прочее ---
data["items"] = []
data["entertainmentSpends"] = ["kino", "park", "tiktok", "computer"]
data["spendCategories"] = collections.OrderedDict([
    ("obligatory", "обязательные"),
    ("household", "быт"),
    ("entertainment", "развлечения"),
    ("purchases", "покупки"),
    ("gifts", "подарки"),
    ("phone", "телефон"),
    ("savings", "накопления"),
])

# Вкладки: две. Модуль «Заработать» убран по решению заказчика.
data["tabLocations"] = collections.OrderedDict([
    ("spend", "arbat"),
    ("solomon", "bathroom"),
    # Кошелёк: деньги лежат в общежитии, там же мы и откладываем подушку.
    ("wallet", "dorm"),
])

# Мы — Соломон: игрок сам белка-студент, а не сосед, у которого живёт белка.
data["meta"]["subtitle"] = "Соломон — студент ПГУ им. Шолом-Алейхема в Биробиджане"

with open(PATH, "w", encoding="utf-8", newline="\n") as fh:
    json.dump(data, fh, ensure_ascii=False, indent=2)
    fh.write("\n")

print("записано:", PATH)
print("трат:", len(data["spends"]),
      "транспорт:", len(data["transport"]), "события:", len(data["events"]))
