"""Подготовка игровых ассетов «Белка Соломон».

Запуск:  python scripts/prepare_assets.py

Скрипт превращает присланный арт в файлы, пригодные для игры:

  1. Позы Соломона. Присланные файлы `pose-N_M.png` — это полотна
     1024…1193 × 1401…1536 пикселей по ~1.3 МБ каждый (27 файлов, ~34 МБ).
     Каждая поза приходит в трёх вариантах загрязнения: M = 0 (чистый),
     1 (слегка грязный), 2 (сильно грязный) — так описано в
     `assets/squirrel/пояснялка по поводу pose.md`. Номера поз не сплошные:
     3 в новом наборе отсутствует.

     Скрипт обрезает прозрачные поля, приводит все позы к одному масштабу
     (арт вырос в 4.39 раза относительно старых спрайтов) и складывает их
     на общий холст 300×340. После этого любая поза рисуется в игре
     одинаково крупно, а переключение варианта загрязнения не «прыгает».

Фоны локаций (`src/assets/backgrounds/loc-*.png`) готовые и приходят уже без
персонажа — их скрипт не трогает: в игре Соломон ставится на такой фон по
координатам из `solomon-game.json`.

Исходники не удаляются: скрипт пишет результат в `assets/squirrel/sprites`,
так что арт всегда можно перегенерировать.
"""

from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parent.parent / "src" / "assets"
SQUIRREL = ASSETS / "squirrel"
SPRITES = SQUIRREL / "sprites"

# Общий холст для всех поз: как в старых спрайтах (250×340), но шире —
# в новом арте у части поз справа есть «лишние» пиксели.
CANVAS_W, CANVAS_H = 300, 340
# Отступ от нижнего края холста до низа персонажа.
BOTTOM_MARGIN = 12

# Во сколько раз новый арт больше старых спрайтов (250×340). Замерено по
# высоте персонажа в одинаковых позах: 1297/305, 1297/295, 1294/305 …
# Разброс ±3.5 %, то есть масштаб исходников единый.
ART_SCALE = 4.39

# Позы, которые есть только в старом наборе: новый арт их не содержит.
LEGACY_ONLY = {"pose-03"}

# Порог непрозрачности для поиска границ персонажа. Мягкие края
# (полупрозрачные пиксели по контуру) попадают в результат, одиночные
# артефакты — нет.
ALPHA_THRESHOLD = 10

# Таблица порога для PIL.Image.point: 0 ниже порога, 255 выше.
ALPHA_TABLE = [0] * (ALPHA_THRESHOLD + 1) + [255] * (255 - ALPHA_THRESHOLD)

# PIL 9.1+: качество ресемплинга живёт в Image.Resampling.
RESAMPLE = Image.Resampling.LANCZOS


def character_box(image: Image.Image) -> tuple[int, int, int, int]:
    """Прямоугольник персонажа по пикселям с непрозрачностью выше порога."""
    alpha = image.getchannel("A")
    mask = alpha.point(ALPHA_TABLE)
    box = mask.getbbox()
    if box is None:
        raise ValueError("пустой спрайт")
    return box


def compose(character: Image.Image) -> Image.Image:
    """Положить персонажа на общий холст: ноги на одной линии, по центру."""
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    x = (CANVAS_W - character.width) // 2
    y = CANVAS_H - BOTTOM_MARGIN - character.height
    if x < 0:
        # Слишком широкий персонаж — вписываем по ширине, иначе обрежется.
        ratio = (CANVAS_W - 8) / character.width
        character = character.resize(
            (int(character.width * ratio), int(character.height * ratio)),
            RESAMPLE,
        )
        y = CANVAS_H - BOTTOM_MARGIN - character.height
        x = (CANVAS_W - character.width) // 2
    canvas.alpha_composite(character, (x, y))
    return canvas


def build_poses() -> list[str]:
    """Собрать спрайты поз: новые (с загрязнением) + устаревшая поза 3."""
    SPRITES.mkdir(parents=True, exist_ok=True)
    made: list[str] = []

    for source in sorted(SQUIRREL.glob("pose-*_*.png")):
        image = Image.open(source).convert("RGBA")
        character = image.crop(character_box(image))
        scale = 1 / ART_SCALE
        character = character.resize(
            (max(1, round(character.width * scale)),
             max(1, round(character.height * scale))),
            RESAMPLE,
        )
        target = SPRITES / source.name
        compose(character).save(target, optimize=True)
        made.append(target.name)

    # Поза 3 есть только в старом наборе: переносим её в тот же формат.
    for name in LEGACY_ONLY:
        source = SQUIRREL / f"{name}.png"
        if not source.exists():
            continue
        image = Image.open(source).convert("RGBA")
        character = image.crop(character_box(image))
        target = SPRITES / f"{name.replace('-', '-')}.png"
        compose(character).save(target, optimize=True)
        made.append(target.name)

    return made




def main() -> None:
    poses = build_poses()

    pose_bytes = sum((SPRITES / name).stat().st_size for name in poses)
    print(f"поз: {len(poses)} шт., {pose_bytes / 1024:.0f} КБ")
    for name in poses:
        size = (SPRITES / name).stat().st_size
        print(f"  {name:<16} {size / 1024:>6.1f} КБ")



if __name__ == "__main__":
    main()
