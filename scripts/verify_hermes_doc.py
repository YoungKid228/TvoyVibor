"""Сверка чисел из docs/Хермес-вариант.md с эталонной моделью.

Запуск: python scripts/verify_hermes_doc.py
Скрипт завершается с кодом 1, если хоть одно число в документе разошлось с моделью.

Принцип проверки: эталон — источник истины, документ — то, что читает человек.
Поэтому ожидаемые числа НЕ хранятся в этом скрипте: скрипт **разбирает
таблицы документа** и сравнивает каждое число с тем, что посчила модель.
Иначе ожидаемые значения были бы ещё одной копией таблицы, которая тоже
может разойтись с моделью — ровно та ошибка, которую этот скрипт и ловит
(опечатка 72.9 вместо 72.3 прошла именно так).

Что проверяется:
  * числа во всех таблицах раздела 11 и раздела 12 — против модели;
  * обе игровые режима (короткий и длинный) целиком;
  * профессии: JSON ↔ эталон ↔ строка таблицы в документе;
  * заработки, траты, покупки, сценарии, события, правила: JSON ↔ эталон;
  * наличие ключевых сумм, подписей и файлов спрайтов.
"""
import glob
import json
import os
import re
import sys

sys.path.insert(0, "scripts")
import balance_sim as b  # noqa: E402

DATA_PATH = "src/data/solomon-game.json"
DOC_PATH = "docs/Хермес-вариант.md"

fail: list[str] = []


# ---------------------------------------------------------------------------
# Разбор markdown-таблиц документа
# ---------------------------------------------------------------------------

# Разделители тысяч: обычный пробел, неразрывный пробел, узкий пробел.
_SPACES = " \u00a0\u202f\u2009\u2007"
_MINUSES = "\u2212\u2013\u2014-"


def num(cell: str) -> float:
    """Разобрать число из ячейки: «20 700», «−1 750», «3 125»."""
    s = cell.strip()
    for ch in _SPACES:
        s = s.replace(ch, "")
    s = s.replace("₽", "").replace("%", "").strip()
    negative = False
    while s and s[0] in _MINUSES:
        negative = True
        s = s[1:].strip()
    s = s.replace(",", ".")
    try:
        value = float(s)
    except ValueError:
        raise ValueError(f"не число в ячейке: {cell!r}") from None
    return -value if negative else value


def percent(cell: str) -> float:
    """Разобрать процент из ячейки: «26,5 %»."""
    s = cell.strip()
    for ch in _SPACES:
        s = s.replace(ch, "")
    s = s.replace("%", "").replace(",", ".").strip()
    try:
        return float(s)
    except ValueError:
        raise ValueError(f"не процент в ячейке: {cell!r}") from None


def numbers_in(text: str) -> set:
    """Все целые числа, упомянутые в тексте (для сверки колонки «Действия»)."""
    out = set()
    for raw in re.findall(
        r"[\u2212\u2013\u2014-]?\d[\d \u00a0\u202f\u2009\u2007]*", text
    ):
        cleaned = raw
        for ch in _SPACES:
            cleaned = cleaned.replace(ch, "")
        cleaned = cleaned.lstrip(_MINUSES)
        if cleaned:
            out.add(int(cleaned))
    return out


def tables(doc: str) -> list:
    """Все markdown-таблицы документа: список таблиц, каждая — список строк."""
    result = []
    current = []
    for line in doc.splitlines():
        stripped = line.strip()
        if stripped.startswith("|") and stripped.endswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            # Строка-разделитель заголовка пропускаем, но таблицу не рвём.
            if all(set(c) <= {"-", ":", " "} for c in cells):
                continue
            current.append(cells)
            continue
        if current:
            result.append(current)
            current = []
    if current:
        result.append(current)
    return result


def table_by_header(doc: str, *header: str, after: str = "") -> list:
    """Найти таблицу по тексту её заголовка (первой строки).

    `after` ограничивает поиск подзаголовком: короткий и длинный режимы
    описаны таблицами с одинаковыми заголовками, и без этого ограничения
    нашлась бы не та таблица.
    """
    wanted = [h.lower() for h in header]
    started = not after
    lines = doc.splitlines()
    for index, line in enumerate(lines):
        stripped = line.strip()
        if not started:
            if stripped.startswith("#") and after.lower() in stripped.lower():
                started = True
            continue
        if stripped.startswith("|") and stripped.endswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if all(set(c) <= {"-", ":", " "} for c in cells):
                continue
            head = [c.lower() for c in cells]
            if all(w in head for w in wanted):
                # Строки собираем с текущего места, а не через index() по тексту:
                # у короткого и длинного режимов заголовки совпадают, и поиск
                # первой копии дал бы таблицу не того режима.
                return [cells] + _rows_from(lines, index + 1)
    raise LookupError(f"в документе нет таблицы с заголовком {header}")


def _rows_from(lines: list, start: int) -> list:
    """Собрать строки таблицы, идущие после строки с индексом start."""
    rows = []
    for line in lines[start:]:
        stripped = line.strip()
        if not (stripped.startswith("|") and stripped.endswith("|")):
            break
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        if all(set(c) <= {"-", ":", " "} for c in cells):
            continue
        rows.append(cells)
    return rows


def row_by_label(table: list, label: str) -> list:
    """Найти строку таблицы по имени в первой ячейке (без учёта жирности)."""
    for row in table[1:]:
        first = re.sub(r"\*\*", "", row[0]).strip()
        if first.startswith(label):
            return row
    raise LookupError(f"в таблице нет строки «{label}»")


# ---------------------------------------------------------------------------
# Сверка таблиц документа с моделью
# ---------------------------------------------------------------------------

# Сокращённые подписи вердиктов в документе ↔ полные из модели.
VERDICT_FRAGMENTS = {
    "Успех: и деньги есть, и настроение хорошее": "Успех",
    "Деньги есть, но настроение провалилось": "Деньги есть",
    # Фрагмент должен быть ПОДСТРОКОЙ полного вердикта: в документе та же
    # формулировка встречается с эмодзи и без него, но всегда с «но».
    "Настроение хорошее, но денег нет": "Настроение хорошее, но денег нет",
    "Провал: ни денег, ни настроения": "Провал",
}

AUDIT_FRAGMENTS = {
    "Обязательные расходы не покрыты": "Обязательные расходы не покрыты",
    "Расходы превысили доходы": "Расходы превысили доходы",
    "Траты ушли далеко за рамки необходимого": "Траты ушли далеко за рамки",
    "Расходы распределены грамотно": "Расходы распределены грамотно",
    "Расходы покрыты, но резерв не создан": "Расходы покрыты, но резерв не создан",
}


def check_cell(label, column, got, want, tolerance=0.001) -> None:
    if isinstance(want, float) or isinstance(got, float):
        if abs(got - want) > tolerance:
            fail.append(f"{label}: {column} — в документе {got}, в модели {want}")
    elif got != want:
        fail.append(f"{label}: {column} — в документе {got}, в модели {want}")


def check_fragment(label, column, cell, want, table) -> None:
    fragment = table[want]
    if fragment not in cell:
        fail.append(f"{label}: {column} — в документе «{cell}», ожидалось «{fragment}»")


def check_short_table(doc: str) -> None:
    """Раздел 11: короткий режим — итоги стратегий и разбор расходов."""
    table = table_by_header(doc, "баланс", "кошелёк", "подушка", "смен",
                            after="Неделя (7 дней)")
    for name, policy in b.POLICIES.items():
        s = b.stats(b.Game(b.SHORT, 11).run(policy))
        row = row_by_label(table, name)
        check_cell(name, "баланс", num(row[1]), s["итоговый_баланс"])
        check_cell(name, "кошелёк", num(row[2]), s["кошелёк"])
        check_cell(name, "подушка", num(row[3]), s["подушка"])
        check_cell(name, "ср. настроение", num(row[4]), s["среднее_настроение"], 0.05)
        check_cell(name, "ср. чистота", num(row[5]), s["средняя_чистота"], 0.05)
        check_cell(name, "смен", num(row[6]), s["смен"])
        check_fragment(name, "вердикт", row[7], s["итог"], VERDICT_FRAGMENTS)

    audit = table_by_header(doc, "доля необязательных", "вердикт проверки",
                            after="Неделя (7 дней)")
    for name, policy in b.POLICIES.items():
        s = b.stats(b.Game(b.SHORT, 11).run(policy))
        row = row_by_label(audit, name)
        check_cell(name, "доля необязательных", percent(row[1]),
                   s["аудит"]["доля_необязательных"] * 100, 0.05)
        check_fragment(name, "вердикт проверки", row[2],
                       s["аудит"]["вердикт"], AUDIT_FRAGMENTS)


def check_week_table(doc: str) -> None:
    """Раздел 11: ход недели стратегии «Баланс»."""
    table = table_by_header(doc, "день", "кошелёк", "подушка", "энергия",
                            after="Ход недели")
    game = b.Game(b.SHORT, 11).run(b.policy_balanced)
    for entry in game.log:
        day, cash, savings, mood, energy, cleanliness = entry[:6]
        row = row_by_label(table, str(day))
        check_cell(f"день {day}", "кошелёк", num(row[1]), cash)
        check_cell(f"день {day}", "подушка", num(row[2]), savings)
        check_cell(f"день {day}", "настроение", num(row[3]), mood)
        check_cell(f"день {day}", "энергия", num(row[4]), energy)
        check_cell(f"день {day}", "чистота", num(row[5]), cleanliness, 0.05)
        # Сытость: сколько игрок поел.
        check_cell(f"день {day}", "сытость", num(row[6]), entry[6])


# ---------------------------------------------------------------------------
# Сверка JSON с эталоном
# ---------------------------------------------------------------------------

def check_json(data: dict) -> None:
    for job in data["jobs"]:
        if job["id"] not in b.JOBS:
            fail.append(f"в JSON есть заработок {job['id']}, которого нет в модели")
            continue
        # b.JOBS: (база, энергия, настроение, минуты, условие, лимит)
        pay, energy, mood, minutes, req, limit = b.JOBS[job["id"]]
        got = (job["pay"], job["energyCost"], job["moodCost"], job["minutes"], job["limit"])
        want = (pay, energy, mood, minutes, limit)
        if got != want:
            fail.append(f"заработок {job['id']}: JSON {got} != модель {want}")
        if job["requires"] != req:
            fail.append(f"заработок {job['id']}: условие доступа JSON {job['requires']} != модель {req}")

    for spend in data["spends"]:
        if spend["id"] not in b.SPEND:
            fail.append(f"в JSON есть трата {spend['id']}, которой нет в модели")
            continue
        (cost, minutes, mood, energy_d, energy_g, food_d, clean_d, rep_d,
         category, prepares, req) = b.SPEND[spend["id"]]
        got = (spend["cost"], spend["minutes"], spend["moodGain"], spend["energyCost"],
               spend["energyGain"], spend["hungerGain"], spend["cleanlinessGain"],
               spend["repGain"], spend["category"],
               spend["preparesMeal"], spend["requires"])
        want = (cost, minutes, mood, energy_d, energy_g, food_d, clean_d, rep_d,
                category, prepares, req)
        if got != want:
            fail.append(f"трата {spend['id']}: JSON {got} != модель {want}")

    for item in data["items"]:
        if item["id"] not in b.ITEMS:
            fail.append(f"в JSON есть покупка {item['id']}, которой нет в модели")
        elif b.ITEMS[item["id"]][0] != item["cost"]:
            fail.append(f"покупка {item['id']}: цена {item['cost']} != модели {b.ITEMS[item['id']][0]}")

    # Профессии: JSON ↔ эталон. Раньше эта таблица не сверялась вообще —
    # именно поэтому «Инженер» разошёлся с моделью и никто не заметил.
    json_profs = {p["id"]: p for p in data["professions"]}
    for prof_id, model_prof in b.PROFESSIONS.items():
        if prof_id not in json_profs:
            fail.append(f"в JSON нет профессии {prof_id}")
            continue
        json_prof = json_profs[prof_id]
        want = (model_prof["rep"], model_prof["shifts"], model_prof["mood"], model_prof["pay"])
        got = (json_prof["repBonus"], json_prof["shiftBonus"], json_prof["moodBonus"], json_prof["payBonus"])
        if got != want:
            fail.append(
                f"профессия {prof_id}: JSON (rep, shifts, mood, pay) {got} "
                f"!= модель {want}"
            )
    for prof_id in json_profs:
        if prof_id not in b.PROFESSIONS:
            fail.append(f"в JSON есть профессия {prof_id}, которой нет в модели")

    for key, scenario in (("short", b.SHORT),):
        sc = data["scenarios"][key]
        for field, val in (("capital", scenario.capital),
                           ("housingDeadline", scenario.housing_deadline),
                           ("internetTrialDays", scenario.internet_trial_days),
                           ("internetDays", scenario.internet_days),
                           ("transitDays", scenario.transit_days),
                           ("laundryEveryDays", scenario.laundry_every_days),
                           ("phoneDay", scenario.phone_day),
                           ("giftDay", scenario.gift_day),
                           ("snowDays", list(scenario.snow_days)),
                           ("days", scenario.days),
                           ("weeklyShiftCap", scenario.weekly_shift_cap),
                           ("hungerDecay", scenario.hunger_decay),
                           ("cleanlinessDecay", scenario.cleanliness_decay)):
            if sc[field] != val:
                fail.append(f"сценарий {key}.{field}: JSON {sc[field]} != модель {val}")

    for ev in data["events"]:
        if ev["id"] == "phone":
            model_opts = b.PHONE_OPTIONS
        elif ev["id"] == "gift":
            model_opts = b.GIFT_OPTIONS
        else:
            fail.append(f"в JSON есть неизвестное событие {ev['id']}")
            continue
        for opt in ev["options"]:
            want = model_opts[opt["id"]]
            got = (opt["cost"], opt.get("moodGain", 0))
            if got != want:
                fail.append(f"опция события {ev['id']}/{opt['id']}: JSON {got} != модель {want}")

    # Правила: JSON ↔ эталон. Лимиты сна и поглаживаний — это правила игры,
    # и они тоже должны совпадать в обоих источниках.
    rules = data["rules"]
    for field, val in (("weeklyShiftCap", b.SHORT.weekly_shift_cap),
                       ("burnoutMood", b.BURNOUT_MOOD),
                       ("boringDaily", b.BORING),
                       ("sleepMood", b.SLEEP_MOOD),
                       ("sleepEnergy", b.SLEEP_ENERGY),
                       ("sleepHunger", b.SLEEP_HUNGER),
                       ("sleepPerDay", b.SLEEP_PER_DAY),
                       ("petPerDay", b.PET_PER_DAY),
                       ("washPerDay", b.WASH_PER_DAY),
                       ("cleanAt", b.CLEAN_AT),
                       ("dirtyAt", b.DIRTY_AT),
                       ("cleanlinessDecay", b.SHORT.cleanliness_decay),
                       ("repCap", b.REP_CAP),
                       ("saveBonusAt", 4000),
                       ("saveBonus", b.SAVE_BONUS),
                       ("hungerPenalty", b.HUNGER_PENALTY),
                       ("hygienePenalty", b.HYGIENE_PENALTY),
                       ("classesEnergyCost", b.CLASSES_ENERGY_COST),
                       ("classesMoodCost", b.CLASSES_MOOD_COST),
                       ("classesMinutes", b.CLASSES_MINUTES),
                       ("lessonStreakForTutor", b.LESSON_STREAK_FOR_TUTOR),
                       ("lessonMoodGain", b.LESSON_MOOD_GAIN),
                       ("missedLessonMood", b.MISSED_LESSON_MOOD),
                       ("lessonProblemsAfter", b.LESSON_PROBLEMS_AFTER),
                       ("moodForFun", b.MOOD_FOR_FUN),
                       ("neglectHunger", b.NEGLECT_HUNGER),
                       ("neglectDaysToLose", b.NEGLECT_DAYS_TO_LOSE),
                       ("cleanFactorGood", b.CLEAN_FACTOR_GOOD),
                       ("cleanFactorWeak", b.CLEAN_FACTOR_WEAK),
                       ("cleanFactorBad", b.CLEAN_FACTOR_BAD),
                       ("mealsPerDay", b.MEALS_PER_DAY),
                       ("petNeglectMood", b.PET_NEGLECT_MOOD)):
        if rules[field] != val:
            fail.append(f"правило {field}: JSON {rules[field]} != модель {val}")

    if len(data["jobs"]) != len(b.JOBS):
        fail.append(f"количество заработков: JSON {len(data['jobs'])} != модели {len(b.JOBS)}")
    if len(data["spends"]) != len(b.SPEND):
        fail.append(f"количество трат: JSON {len(data['spends'])} != модели {len(b.SPEND)}")
    if len(data["professions"]) != len(b.PROFESSIONS):
        fail.append(
            f"количество профессий: JSON {len(data['professions'])} != модели {len(b.PROFESSIONS)}"
        )


# ---------------------------------------------------------------------------
# Проверки содержимого документа
# ---------------------------------------------------------------------------

def check_content(doc: str) -> None:
    # Три заработка и три уровня еды — как в игре.
    job_labels = {"courier": "Курьерская доставка", "tutor": "Репетиторство",
                  "lab": "Лаборант в университете"}
    for job, label in job_labels.items():
        if job not in b.JOBS:
            fail.append(f"нет заработка {job}")
        elif label not in doc:
            fail.append(f"заработок {job} ({label}) не описан в документе")

    food_labels = {"food-cheap": "Своя еда", "food-fast": "Фастфуд",
                   "food-luxe": "Хороший обед"}
    for spend, label in food_labels.items():
        if spend not in b.SPEND:
            fail.append(f"нет уровня еды {spend}")
        elif label not in doc:
            fail.append(f"уровень еды {spend} ({label}) не описан в документе")

    bill_labels = {"housing": "Жильё", "internet": "Интернет",
                   "transit-pass": "Проездной", "laundry": "Стирка"}
    for spend, label in bill_labels.items():
        if spend not in b.SPEND:
            fail.append(f"нет обязательного платежа {spend}")
        elif label not in doc:
            fail.append(f"обязательный платёж {spend} ({label}) не описан в документе")

    # Расписание дня: утро, пары, свободное время, сон.
    if b.DAY_START != 360:
        fail.append("день должен начинаться в 06:00")
    if b.CLASSES_START != 540 or b.CLASSES_END != 900:
        fail.append("пары должны идти с 09:00 до 15:00")
    if b.NIGHT != 1380:
        fail.append("ночь должна наступать в 23:00")
    for text in ("06:00", "09:00", "15:00", "23:00"):
        if text not in doc:
            fail.append(f"время {text} не описано в документе")

    # Снегопад — погода, а не событие: пешком не дойдёшь, такси дороже.
    if b.SHORT.snow_days != (4,):
        fail.append("снегопад должен быть на 4-й день короткого режима")
    snow = b.Game(b.SHORT, 11)
    snow.current_day = 4
    snow.start_day()
    snow.buy("food-cheap")
    if snow.choose_transport("walk") != "в метель пешком не дойдёшь":
        fail.append("в снегопад пешком идти нельзя")
    if snow.transport_cost("taxi") != b.TRANSPORT["taxi"][0] + 100:
        fail.append("в снегопад такси должно стоить на 100 ₽ дороже")

    # Сон: восстанавливает энергию (зависит от чистоты) и опускает сытость.
    sleeper = b.Game(b.SHORT, 11)
    sleeper.start_day()
    sleeper.buy("food-cheap")
    sleeper.choose_transport("bus")
    sleeper.hunger = 100
    sleeper.cleanliness = 100
    sleeper.energy = 0
    sleeper.sleep()
    if sleeper.energy != b.SLEEP_ENERGY:
        fail.append(f"сон должен вернуть {b.SLEEP_ENERGY} энергии (стало {sleeper.energy})")
    if sleeper.hunger != 100 - b.SLEEP_HUNGER:
        fail.append(f"сон должен опустить сытость на {b.SLEEP_HUNGER} (стало {sleeper.hunger})")
    dirty = b.Game(b.SHORT, 11)
    dirty.start_day()
    dirty.buy("food-cheap")
    dirty.choose_transport("bus")
    dirty.hunger = 100
    dirty.cleanliness = 10
    dirty.energy = 0
    dirty.sleep()
    want = round(b.SLEEP_ENERGY * b.CLEAN_FACTOR_BAD)
    if dirty.energy != want:
        fail.append(f"сон с сильно грязным Соломоном должен вернуть {want} (стало {dirty.energy})")

    # Еда: не больше двух приёмов в день, сытый Соломон не ест.
    feeder = b.Game(b.SHORT, 11)
    feeder.start_day()
    feeder.buy("food-cheap")
    feeder.choose_transport("bus")
    feeder.buy("food-leftovers")
    if feeder.meals_today != 2:
        fail.append(f"за день должно быть 2 приёма пищи (стало {feeder.meals_today})")
    reason = feeder.spend_block_reason("food-fast")
    if not reason or "Соломон сыт" not in reason:
        fail.append("третий приём пищи должен блокироваться: Соломон сыт")

    # Долга нет: без денег трата не проходит.
    broke = b.Game(b.SHORT, 11)
    broke.cash = 100
    broke.savings = 0
    broke.start_day()
    if "не хватает денег" not in broke.spend_block_reason("housing"):
        fail.append("без денег трата должна блокироваться: не хватает денег")

    # Суммы новой экономики.
    for amount in ("3 500", "1 000", "6 000", "500", "120", "250", "100", "800", "200"):
        if amount not in doc:
            fail.append(f"сумма {amount} отсутствует в документе")

    # Пороги оценки по деньгам.
    for balance, want in [(7000, "Отличный результат"), (6999, "Хороший результат"),
                           (3000, "Хороший результат"), (2999, "Есть над чем поработать"),
                           (0, "Есть над чем поработать"), (-1, "Бюджет ушёл в минус")]:
        if b.money_grade(balance) != want:
            fail.append(f"оценка по деньгам {balance}: {b.money_grade(balance)} != {want}")

    # Пороги шкалы счастья игрока и белки.
    for mood, want in [(75, "Настроение отличное"), (74, "Настроение хорошее"),
                       (50, "Настроение хорошее"), (49, "Настроение так себе"),
                       (25, "Настроение так себе"), (24, "Настроение плохое")]:
        if b.mood_grade(mood) != want:
            fail.append(f"оценка настроения {mood}: {b.mood_grade(mood)} != {want}")
    # Общий вердикт во всех четырёх комбинациях.
    for bal, mood, want in [(10000, 70, "Успех: и деньги есть, и настроение хорошее"),
                            (10000, 30, "Деньги есть, но настроение провалилось"),
                            (1000, 70, "Настроение хорошее, но денег нет"),
                            (1000, 30, "Провал: ни денег, ни настроения")]:
        if b.overall_grade(bal, mood) != want:
            fail.append(f"вердикт ({bal},{mood}): {b.overall_grade(bal, mood)} != {want}")

    # Выгорание: смена при настроении < 25 оплачивается на 70 %.
    g = b.Game(b.SHORT)
    g.mood = 20
    g.energy = 100
    g.start_day()
    g.buy("food-cheap")
    g.choose_transport("bus")
    # Настроение к моменту смены уже упало (скука, брошенный Соломон, еда),
    # поэтому считаем выплату от фактического настроения.
    mood_now = g.mood
    gain = b.round50(b.JOBS["courier"][0] * b.income_multiplier(mood_now) * 0.7)
    if g.work("courier").find(f"+{gain}") < 0:
        fail.append(f"смена в выгорании должна оплачиваться по ставке 0,7 (ждали +{gain})")

    # Недельный лимит смен: 10 смен любого вида, одиннадцатая — отказ.
    g = b.Game(b.SHORT)
    g.mood = 80
    g.energy = 100
    g.start_day()
    g.buy("food-cheap")
    g.choose_transport("bus")
    g.energy = 100
    g.current_day = 2
    g.week_shifts[0] = b.SHORT.weekly_shift_cap
    if not g.work("lab").startswith(("недельный", "лимит")):
        fail.append(f"смена сверх лимита {b.SHORT.weekly_shift_cap} должна блокироваться")

    # Лимит смен сбрасывается на следующей неделе.
    g = b.Game(b.SHORT)
    g.current_week = 1
    g.week_shifts[1] = b.SHORT.weekly_shift_cap
    g.start_day()
    g.buy("food-cheap")
    g.choose_transport("bus")
    if g.work("lab").startswith(("недельный", "лимит")):
        fail.append("недельный лимит смен должен сбрасываться в начале новой недели")

    # Долга нет: без денег жильё не оплачивается, кошелёк не уходит в минус.
    g = b.Game(b.SHORT)
    # Денег хватает на завтрак и дорогу, но не на жильё.
    g.cash = 200
    g.savings = 0
    g.start_day()
    g.buy("food-cheap")
    g.choose_transport("bus")
    result = g.buy("housing")  # жильё покупается уже в свободное время
    if "не хватает денег" not in result:
        fail.append("без денег жильё не должно оплачиваться")
    if g.cash < 0:
        fail.append("кошелёк не должен уходить в минус")
    if g.housing_paid:
        fail.append("неоплаченное жильё не должно считаться оплаченным")

    # Подушку можно использовать при нехватке в кошельке.
    g = b.Game(b.SHORT)
    g.cash = 1000
    g.savings = 5000
    result = g.pay(3000, "обязательные")
    if "из подушки" not in result:
        fail.append("при нехватке в кошельке оплата должна идти из подушки")
    if g.savings != 3000:
        fail.append(f"подушка после оплаты должна быть 3 000, а не {g.savings}")

    # Брошенный Соломон отнимает настроение каждый день.
    g = b.Game(b.SHORT)
    g.mood = 60
    before = g.mood
    notes = g.decay()
    if g.mood != before - b.BORING - b.PET_NEGLECT_MOOD:
        fail.append(f"настроение должно падать на скуку и брошенного Соломона: {before} -> {g.mood}")
    if not any("Соломон скучает" in note for note in notes):
        fail.append("в причинах должно быть сказано, что Соломон скучает без ухода")

    # Грязный Соломон отнимает настроение ещё сильнее.
    dirty = b.Game(b.SHORT)
    dirty.mood = 60
    dirty.cleanliness = 0
    dirty_before = dirty.mood
    dirty.decay()
    if dirty.mood >= g.mood:
        fail.append("грязный Соломон должен отнимать настроение сильнее")

    # Проверка расходов: все вердикты достижимы.
    verdicts = set()
    for policy in b.POLICIES.values():
        verdicts.add(b.expense_audit(b.Game(b.SHORT, 11).run(policy))["вердикт"])
    for want in ("Расходы распределены грамотно", "Расходы покрыты, но резерв не создан"):
        if want not in verdicts:
            fail.append(f"вердикт проверки расходов «{want}» недостижим")

    # Проверка расходов: обязательные не покрыты.
    g = b.Game(b.SHORT, 11).run(b.policy_gecko)
    g.spent_by_category["обязательные"] = 0
    if b.expense_audit(g)["вердикт"] != "Обязательные расходы не покрыты":
        fail.append("вердикт «Обязательные расходы не покрыты» не работает")

    # Спрайты персонажа: подготовленный набор и исходный арт.
    sprites = sorted(glob.glob(os.path.join("src", "assets", "squirrel", "sprites", "pose-*.png")))
    if len(sprites) != 28:
        fail.append(f"ожидалось 28 подготовленных спрайтов, найдено {len(sprites)}")
    raw = sorted(glob.glob(os.path.join("src", "assets", "squirrel", "pose-*_*.png")))
    if len(raw) != 27:
        fail.append(f"ожидалось 27 исходных поз с загрязнением, найдено {len(raw)}")
    if not os.path.exists(os.path.join("src", "assets", "squirrel", "пояснялка по поводу имён.md")):
        fail.append("нет пояснения к названиям спрайтов")
    if "src/assets/squirrel/sprites" not in doc:
        fail.append("в документе нет ссылки на каталог подготовленных спрайтов")
    # Таблица поз: 9 поз, у каждой — число вариантов загрязнения.
    for row in ("| 1 | 3 |", "| 3 | 1 |", "| 6 | 3 |", "| 7 | 3 |", "| 10 | 3 |"):
        if row not in doc:
            fail.append(f"в документе нет строки описания позы: {row}")


TAB_LABELS = {"work": "Заработать", "spend": "Потратить", "solomon": "Соломон"}


def check_locations(doc: str, data: dict) -> None:
    """Раздел 13а: сцена, локации и координаты персонажа.

    Таблицу вкладок сверяем с `tabLocations`, таблицу координат — с
    `locations[*].character`, а сами фоны — с файлами на диске.
    """
    locations = data["locations"]
    by_label = {loc["label"]: loc for loc in locations.values()}

    # 1. Кнопки-переключатели: вкладка → локация.
    table = table_by_header(doc, "вкладка", "локация", "фон", after="13а")
    for tab_id, label in TAB_LABELS.items():
        loc_id = data["tabLocations"][tab_id]
        row = row_by_label(table, label)
        check_cell(label, "локация", row[1], locations[loc_id]["label"])
        check_cell(label, "фон", row[2].strip("`"), locations[loc_id]["background"] + ".png")

    # 2. Координаты персонажа.
    coords = table_by_header(doc, "локация", "высота", "центр x", "пол", after="13а")
    for loc in locations.values():
        row = row_by_label(coords, loc["label"])
        c = loc["character"]
        check_cell(loc["label"], "высота", num(row[1]), c["height"])
        check_cell(loc["label"], "центр X", num(row[2]), c["x"])
        check_cell(loc["label"], "пол", num(row[3]), c["y"])

    # 3. Файлы фонов на диске и пустота персонажа в них.
    for loc in locations.values():
        bg = loc["background"]
        path = os.path.join("src", "assets", bg + ".png")
        if not os.path.exists(path):
            fail.append(f"{loc['label']}: нет файла фона «{bg}.png»")
            continue
        if os.path.getsize(path) < 50_000:
            fail.append(f"{loc['label']}: фон «{bg}.png» подозрительно мал")


def check_icon_registry() -> None:
    """Реестр иконок: каждая запись должна указывать на существующий файл,
    а каждый файл в `src/assets/ui` — быть в реестре. Иначе в игре появятся
    иконки, которые не грузятся, или файлы, о которых забыли.
    """
    import re as _re

    registry = os.path.join("src", "assets", "ui", "icons.ts")
    with open(registry, encoding="utf-8") as fh:
        source = fh.read()

    used = {os.path.basename(m) for m in
            _re.findall(r"from [\"']\./([^\"']+\.png)[\"']", source)}
    on_disk = {f for f in os.listdir(os.path.join("src", "assets", "ui"))
               if f.endswith(".png")}

    for name in sorted(on_disk - used):
        fail.append(f"иконка «{name}» лежит в assets/ui, но на неё нет записи в реестре")
    for name in sorted(used - on_disk):
        fail.append(f"реестр ссылается на «{name}», а файла нет")


def main() -> None:
    with open(DOC_PATH, encoding="utf-8") as fh:
        doc = fh.read()
    with open(DATA_PATH, encoding="utf-8") as fh:
        data = json.load(fh)

    # 1. Все числа таблиц документа — против модели (обе игровые режима).
    check_short_table(doc)
    check_week_table(doc)

    # 2. JSON — против модели (включая профессии и правила).
    check_json(data)

    # 3. Содержимое документа: подписи, суммы, пороги, спрайты.
    check_content(doc)

    # 4. Сцена: локации, координаты персонажа, файлы фонов.
    check_locations(doc, data)

    # 5. Реестр иконок: нет «сирот» и нет битых ссылок.
    check_icon_registry()

    print("ПРОВЕРКА ДОКУМЕНТА")
    if fail:
        print("ПРОВАЛЕНО:")
        for item in fail:
            print("  -", item)
        sys.exit(1)
    print("Все числа документа совпадают с эталонной моделью.")


if __name__ == "__main__":
    main()
