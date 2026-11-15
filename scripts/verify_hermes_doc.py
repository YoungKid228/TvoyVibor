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
    for line in doc.splitlines():
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
                return [cells] + _collect_rows(doc, line)
    raise LookupError(f"в документе нет таблицы с заголовком {header}")


def _collect_rows(doc: str, header_line: str) -> list:
    """Собрать строки таблицы, начинающейся с указанной строки заголовка."""
    rows = []
    lines = doc.splitlines()
    start = lines.index(header_line)
    for line in lines[start + 1:]:
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
    "Успех: и деньги есть, и Соломон счастлив": "Успех",
    "Деньги есть, но Соломон несчастлив": "Деньги есть",
    # Фрагмент должен быть ПОДСТРОКОЙ полного вердикта: в документе та же
    # формулировка встречается с эмодзи и без него, но всегда с «но».
    "Соломон счастлив, но денег нет": "Соломон счастлив, но денег нет",
    "Провал: ни денег, ни счастья": "Провал",
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
                            after="Короткий режим (7 дней)")
    for name, policy in b.POLICIES.items():
        s = b.stats(b.Game(b.SHORT, 11).run(policy))
        row = row_by_label(table, name)
        check_cell(name, "баланс", num(row[1]), s["итоговый_баланс"])
        check_cell(name, "кошелёк", num(row[2]), s["кошелёк"])
        check_cell(name, "подушка", num(row[3]), s["подушка"])
        check_cell(name, "ср. настроение", num(row[4]), s["среднее_настроение"], 0.05)
        check_cell(name, "ср. Соломон", num(row[5]), s["средний_белка"], 0.05)
        check_cell(name, "смен", num(row[6]), s["смен"])
        check_fragment(name, "вердикт", row[7], s["итог"], VERDICT_FRAGMENTS)

    audit = table_by_header(doc, "доля необязательных", "вердикт проверки",
                            after="Короткий режим (7 дней)")
    for name, policy in b.POLICIES.items():
        s = b.stats(b.Game(b.SHORT, 11).run(policy))
        row = row_by_label(audit, name)
        check_cell(name, "доля необязательных", percent(row[1]),
                   s["аудит"]["доля_необязательных"] * 100, 0.05)
        check_fragment(name, "вердикт проверки", row[2],
                       s["аудит"]["вердикт"], AUDIT_FRAGMENTS)


def check_long_table(doc: str) -> None:
    """Раздел 11: длинный режим — итоги стратегий."""
    table = table_by_header(doc, "баланс", "кошелёк", "подушка", "ср. соломон",
                            after="Длинный режим (28 дней)")
    for name, policy in b.POLICIES.items():
        s = b.stats(b.Game(b.LONG, 11).run(policy))
        row = row_by_label(table, name)
        check_cell(name, "баланс", num(row[1]), s["итоговый_баланс"])
        check_cell(name, "кошелёк", num(row[2]), s["кошелёк"])
        check_cell(name, "подушка", num(row[3]), s["подушка"])
        check_cell(name, "ср. настроение", num(row[4]), s["среднее_настроение"], 0.05)
        check_cell(name, "ср. Соломон", num(row[5]), s["средний_белка"], 0.05)
        check_fragment(name, "вердикт", row[6], s["итог"], VERDICT_FRAGMENTS)


def check_week_table(doc: str) -> None:
    """Раздел 11: ход недели стратегии «Баланс»."""
    table = table_by_header(doc, "день", "кошелёк", "подушка", "энерг.",
                            after="Ход недели")
    game = b.Game(b.SHORT, 11).run(b.policy_balanced)
    for entry in game.log:
        day, cash, savings, mood, energy, solomon = entry[:6]
        row = row_by_label(table, str(day))
        check_cell(f"день {day}", "кошелёк", num(row[1]), cash)
        check_cell(f"день {day}", "подушка", num(row[2]), savings)
        check_cell(f"день {day}", "настроение", num(row[3]), mood)
        check_cell(f"день {day}", "энергия", num(row[4]), energy)
        check_cell(f"день {day}", "Соломон", num(row[5]), solomon, 0.05)
        # Колонка чистоты: насколько опрятен питомец в конце дня.
        check_cell(f"день {day}", "чистота", num(row[6]), entry[10])
        # Колонка «Действия» переписана по-русски, поэтому сверяем набор чисел:
        # каждое число из документа должно встречаться в действиях модели.
        model_numbers = set()
        for part in entry[8].split(";"):
            model_numbers |= numbers_in(part)
        for value in numbers_in(row[7]):
            if value not in model_numbers:
                fail.append(
                    f"день {day}: в колонке «Действия» число {value}, "
                    f"которого нет в действиях модели ({entry[8]})"
                )


def check_professions_table(doc: str) -> None:
    """Раздел 12: профессии — баланс, настроение и Соломон против модели."""
    table = table_by_header(doc, "профессия", "перевес", "баланс", "настроение")
    labels = {
        "none": "Без профессии",
        "student": "Студент",
        "courier": "Курьер",
        "engineer": "Инженер",
        "creative": "Творческий",
    }
    for prof, label in labels.items():
        s = b.stats(b.Game(b.SHORT, 11, prof).run(b.policy_balanced))
        row = row_by_label(table, label)
        check_cell(label, "баланс", num(row[2]), s["итоговый_баланс"])
        check_cell(label, "настроение", num(row[3]), s["среднее_настроение"], 0.05)
        check_cell(label, "Соломон", num(row[4]), s["средний_белка"], 0.05)
        check_fragment(label, "вердикт", row[5], s["итог"], VERDICT_FRAGMENTS)


# ---------------------------------------------------------------------------
# Сверка JSON с эталоном
# ---------------------------------------------------------------------------

def check_json(data: dict) -> None:
    for job in data["jobs"]:
        if job["id"] not in b.JOBS:
            fail.append(f"в JSON есть заработок {job['id']}, которого нет в модели")
            continue
        # b.JOBS: (база, энергия, настроение, условие, лимит)
        pay, energy, mood, req, limit = b.JOBS[job["id"]]
        if (job["pay"], job["energyCost"], job["moodCost"], job["limit"]) != (pay, energy, mood, limit):
            fail.append(f"заработок {job['id']}: JSON {(job['pay'], job['energyCost'], job['moodCost'], job['limit'])} != модель {(pay, energy, mood, limit)}")
        if job["requires"] != req:
            fail.append(f"заработок {job['id']}: условие доступа JSON {job['requires']} != модель {req}")

    for spend in data["spends"]:
        if spend["id"] not in b.SPEND:
            fail.append(f"в JSON есть трата {spend['id']}, которой нет в модели")
            continue
        cost, mood, energy, hunger, hyg, rep, sol = b.SPEND[spend["id"]]
        got = (spend["cost"], spend["moodGain"], spend["energyCost"], spend["hungerGain"],
               spend["hygieneGain"], spend["repGain"], spend["solomonGain"])
        if got != (cost, mood, energy, hunger, hyg, rep, sol):
            fail.append(f"трата {spend['id']}: JSON {got} != модель {(cost, mood, energy, hunger, hyg, rep, sol)}")

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
        want = (model_prof["rep"], model_prof["shifts"], model_prof["mood"], model_prof["salary"])
        got = (json_prof["repBonus"], json_prof["shiftBonus"], json_prof["moodBonus"], json_prof["payBonus"])
        if got != want:
            fail.append(
                f"профессия {prof_id}: JSON (rep, shifts, mood, salary) {got} "
                f"!= модель {want}"
            )
    for prof_id in json_profs:
        if prof_id not in b.PROFESSIONS:
            fail.append(f"в JSON есть профессия {prof_id}, которой нет в модели")

    for key, scenario in (("short", b.SHORT), ("long", b.LONG)):
        sc = data["scenarios"][key]
        for field, val in (("capital", scenario.capital),
                           ("mandatoryTotal", scenario.mandatory_total),
                           ("salary", scenario.salary),
                           ("salaryDay", scenario.salary_day),
                           ("phoneDay", scenario.phone_day),
                           ("giftDay", scenario.gift_day),
                           ("blizzardDay", scenario.blizzard_day),
                           ("days", scenario.days),
                           ("weeklyShiftCap", scenario.weekly_shift_cap),
                           ("hungerDecay", scenario.hunger_decay),
                           ("hygieneDecay", scenario.hygiene_decay),
                           ("solomonDecay", scenario.solomon_decay),
                           ("cleanlinessDecay", scenario.cleanliness_decay),
                           ("mandatoryMode", scenario.mandatory_mode)):
            if sc[field] != val:
                fail.append(f"сценарий {key}.{field}: JSON {sc[field]} != модель {val}")

    for ev in data["events"]:
        if ev["id"] == "blizzard":
            model_opts = {"taxi": (400, -2, 0), "bus": (0, -1, 0), "walk": (0, -3, 15)}
            for opt in ev["options"]:
                want = model_opts[opt["id"]]
                got = (opt["cost"], opt.get("moodGain", 0), opt.get("energyCost", 0))
                if got != want:
                    fail.append(f"опция снегопада {opt['id']}: JSON {got} != модель {want}")

    # Правила: JSON ↔ эталон. Лимиты сна и поглаживаний — это правила игры,
    # и они тоже должны совпадать в обоих источниках.
    rules = data["rules"]
    for field, val in (("weeklyShiftCap", b.WEEKLY_SHIFT_CAP),
                       ("burnoutMood", b.BURNOUT_MOOD),
                       ("boringDaily", b.BORING),
                       ("sleepMood", b.SLEEP_MOOD),
                       ("sleepEnergy", 45),
                       ("sleepPerDay", b.SLEEP_PER_DAY),
                       ("petPerDay", b.PET_PER_DAY),
                       ("washPerDay", b.WASH_PER_DAY),
                       ("cleanAt", b.CLEAN_AT),
                       ("dirtyAt", b.DIRTY_AT),
                       ("cleanlinessDecay", b.SHORT.cleanliness_decay),
                       ("repCap", b.REP_CAP),
                       ("gymDays", b.GYM_DAYS),
                       ("saveBonusAt", 4000),
                       ("saveBonus", b.SAVE_BONUS),
                       ("solomonUpAt", 60),
                       ("solomonUp", b.SOLOMON_UP),
                       ("solomonDown", b.SOLOMON_DOWN),
                       ("gloomyOwnerMood", b.GLOOMY_OWNER_MOOD),
                       ("solomonHappy", b.SOLOMON_HAPPY),
                       ("creditMoodPenalty", b.CREDIT_MOOD_PENALTY),
                       ("debtDailyMoodPenalty", 3),
                       ("hungerPenalty", 5),
                       ("hygienePenalty", 3)):
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
    # Биробиджанская механика: заработки, траты, событие «снегопад».
    job_labels = {"market": "Центральном рынке", "hegan": "гостей из Хэгана",
                  "dorm": "общежитии"}
    for job, label in job_labels.items():
        if job not in b.JOBS:
            fail.append(f"нет биробиджанского заработка {job}")
        elif label not in doc:
            fail.append(f"заработок {job} ({label}) не описан в документе")

    spend_labels = {"schnitzel": "Шницель по-биробиджански", "matza": "Матца и хумус",
                    "breakfast": "Кефир и бублики", "dreidel": "Дрейдл на Арбате",
                    "amulet": "Талесман", "festival": "Фестиваль еврейской культуры",
                    "zoo": "Амурский тигр в зоопарке"}
    for spend, label in spend_labels.items():
        if spend not in b.SPEND:
            fail.append(f"нет биробиджанской траты {spend}")
        elif label not in doc:
            fail.append(f"трата {spend} ({label}) не описана в документе")

    if b.SHORT.blizzard_day != 4:
        fail.append("снегопад должен быть на 4-й день короткого режима")
    gb = b.Game(b.SHORT, 11)
    gb.blizzard_choice = "taxi"
    before_mood, before_energy = gb.mood, gb.energy
    msg = gb.blizzard()
    if "снегопад" not in msg:
        fail.append("снегопад не вернул сообщение")
    if gb.cash != 19600:
        fail.append(f"снегопад на такси должен стоить 400 (кошелёк {gb.cash})")
    if gb.mood != before_mood - 2:
        fail.append("снегопад на такси должен стоить 2 настроения")
    gb2 = b.Game(b.SHORT, 11)
    gb2.blizzard_choice = "walk"
    gb2.blizzard()
    if gb2.energy != before_energy - 15:
        fail.append(f"снегопад пешком должен стоить 15 энергии (стало {gb2.energy})")
    gb3 = b.Game(b.SHORT, 11)
    gb3.blizzard_choice = "bus"
    gb3.blizzard()
    if gb3.cash != 20000:
        fail.append("снегопад на автобусе должен быть бесплатным")

    for amount in ("700", "1 200", "450", "380", "200", "500", "600", "1 800", "400"):
        if amount not in doc:
            fail.append(f"биробиджанская сумма {amount} отсутствует в документе")

    # Суммы из исходного документа.
    for amount in ("20 000", "15 000", "12 500", "800", "1 500", "2 000",
                   "4 000", "12 000", "5 000", "2 500", "500"):
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
    for solomon, want in [(75, "Соломон доволен"), (74, "Соломон спокоен"), (50, "Соломон спокоен"),
                          (49, "Соломон скучает"), (25, "Соломон скучает"), (24, "Соломон грустит")]:
        if b.solomon_grade(solomon) != want:
            fail.append(f"оценка Соломона {solomon}: {b.solomon_grade(solomon)} != {want}")

    # Общий вердикт во всех четырёх комбинациях.
    for bal, solomon, want in [(5000, 70, "Успех: и деньги есть, и Соломон счастлив"),
                               (5000, 30, "Деньги есть, но Соломон несчастлив"),
                               (1000, 70, "Соломон счастлив, но денег нет"),
                               (1000, 30, "Провал: ни денег, ни счастья")]:
        if b.overall_grade(bal, solomon) != want:
            fail.append(f"вердикт ({bal},{solomon}): {b.overall_grade(bal, solomon)} != {want}")

    # Выгорание: смена при настроении < 25 оплачивается на 70 %.
    g = b.Game(b.SHORT)
    g.mood = 20
    g.energy = 100
    gain = b.round50(b.JOBS["dishes"][0] * b.income_multiplier(20) * 0.7)
    if g.work("dishes").find(f"+{gain}") < 0:
        fail.append("смена в выгорании должна оплачиваться по ставке 0,7")

    # Недельный лимит смен: 4 смены любого вида, пятая — отказ.
    g = b.Game(b.SHORT)
    g.mood = 80
    g.energy = 100
    for key in ("dishes", "dishes", "kafe", "dishes"):
        g.work(key)
    if g.shifts != 4:
        fail.append(f"недельный лимит не сработал: смен {g.shifts}, ожидалось 4")
    if not g.work("dishes").startswith(("недельный", "лимит")):
        fail.append("пятая смена за неделю должна блокироваться")

    # Лимит смен сбрасывается на следующей неделе (длинный режим).
    g = b.Game(b.LONG)
    g.mood = 80
    g.energy = 100
    for key in ("dishes", "dishes", "kafe", "dishes"):
        g.work(key)
    g.current_day = 8
    g.current_week = 1
    if g.work("dishes").startswith(("недельный", "лимит")):
        fail.append("недельный лимит смен должен сбрасываться в начале новой недели")

    # Кредит: кошелёк уходит в минус, кредитный штраф применяется.
    g = b.Game(b.SHORT)
    g.cash = 100
    g.savings = 0
    before_mood = g.mood
    g.buy("clothes")
    if g.cash >= 0:
        fail.append("покупка в долг должна уводить кошелёк в минус")
    if g.debt != 3000:
        fail.append(f"долг должен составить 3 000, а не {g.debt}")
    # бонус за одежду (+8) минус штраф за долг (5) = +3
    if g.mood != before_mood - b.CREDIT_MOOD_PENALTY + 8:
        fail.append(f"кредитный штраф настроения применён неверно: {before_mood} -> {g.mood}")

    # Обязательные расходы не оплачиваются, если денег нет нигде.
    g = b.Game(b.SHORT)
    g.cash = 0
    g.savings = 0
    g.day_events(1)
    if g.spent_by_category["обязательные"] != 0:
        fail.append("обязательные расходы без денег не должны оплачиваться")

    # Подушку можно использовать при нехватке в кошельке.
    g = b.Game(b.SHORT)
    g.cash = 1000
    g.savings = 5000
    result = g.pay(3000, "обязательные")
    if "из подушки" not in result:
        fail.append("при нехватке в кошельке оплата должна идти из подушки")
    if g.savings != 3000:
        fail.append(f"подушка после оплаты должна быть 3 000, а не {g.savings}")

    # Спад Соломона и его связь с хозяином.
    g = b.Game(b.SHORT)
    g.mood = 60
    g.solomon = 100
    g.decay()
    if g.solomon >= 100:
        fail.append("Соломон должен скучать без ухода")
    g2 = b.Game(b.SHORT)
    g2.mood = 10
    g2.solomon = 100
    g2.decay()
    if g2.solomon >= g.solomon:
        fail.append("несчастный хозяин должен запускать Соломона сильнее")

    # Проверка расходов: все вердикты достижимы.
    verdicts = set()
    for policy in b.POLICIES.values():
        verdicts.add(b.expense_audit(b.Game(b.SHORT, 11).run(policy))["вердикт"])
    for want in ("Расходы распределены грамотно", "Расходы покрыты, но резерв не создан",
                 "Расходы превысили доходы"):
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


TAB_LABELS = {"work": "Заработать", "spend": "Потратить",
               "rest": "Отдохнуть", "pet": "Соломон"}


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
    check_long_table(doc)
    check_week_table(doc)
    check_professions_table(doc)

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
