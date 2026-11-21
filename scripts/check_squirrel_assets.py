"""Проверка ассетов: альфа корректна, фон прозрачный.

Поддерживаются PNG 8-bit: RGBA (color type 6) и палитра с tRNS (color type 3).
"""
import glob
import os
import struct
import zlib
from collections import Counter


def load_rgba(path: str) -> tuple[int, int, bytearray]:
    data = open(path, "rb").read()
    pos = 8
    idat = b""
    w: int = 0
    h: int = 0
    ct: int = 0
    palette = b""
    trns = b""
    while pos < len(data):
        ln = struct.unpack(">I", data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            w, h, bd, ct, cm, fl, il = struct.unpack(">IIBBBBB", chunk)
            assert bd == 8 and ct in (3, 6) and il == 0, (bd, ct, il)
        elif typ == b"PLTE":
            palette = chunk
        elif typ == b"tRNS":
            trns = chunk
        elif typ == b"IDAT":
            idat += chunk
        pos += 12 + ln
    raw = zlib.decompress(idat)
    if ct == 3:
        return _palette_to_rgba(w, h, raw, palette, trns)
    stride = w * 4
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        ft = raw[p]
        p += 1
        line = bytearray(raw[p:p + stride])
        p += stride
        if ft == 1:
            for i in range(4, stride):
                line[i] = (line[i] + line[i - 4]) & 0xFF
        elif ft == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ft == 3:
            for i in range(stride):
                a = line[i - 4] if i >= 4 else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif ft == 4:
            for i in range(stride):
                a = line[i - 4] if i >= 4 else 0
                b = prev[i]
                c = prev[i - 4] if i >= 4 else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 0xFF
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return w, h, out


def _unfilter(raw, height, stride, bpp):
    """Раскодит строки PNG (фильтры 0-4) в плоский буфер."""
    out = bytearray(height * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(height):
        ft = raw[p]
        p += 1
        line = bytearray(raw[p:p + stride])
        p += stride
        if ft == 1:
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 0xFF
        elif ft == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ft == 3:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif ft == 4:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 0xFF
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return out


def _palette_to_rgba(w, h, raw, palette, trns):
    """Палитровый PNG (color type 3) + tRNS -> буфер RGBA."""
    assert palette, "у палитрового PNG нет чанка PLTE"
    stride = w
    idx = _unfilter(raw, h, stride, 1)
    out = bytearray(h * stride * 4)
    for i in range(h * stride):
        pi = idx[i] * 3
        r, g, b = palette[pi], palette[pi + 1], palette[pi + 2]
        a = trns[idx[i]] if idx[i] < len(trns) else 255
        o = i * 4
        out[o] = r
        out[o + 1] = g
        out[o + 2] = b
        out[o + 3] = a
    return w, h, out


def check(path):
    w, h, buf = load_rgba(path)
    alpha = Counter()
    opaque = Counter()
    min_x, min_y, max_x, max_y = w, h, -1, -1
    for y in range(h):
        row = y * w
        for x in range(w):
            i = (row + x) * 4
            a = buf[i + 3]
            alpha[a] += 1
            if a > 0:
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y
            if a > 200:
                opaque[(buf[i], buf[i + 1], buf[i + 2])] += 1
    transparent = alpha.get(0, 0)
    partial = sum(v for k, v in alpha.items() if 0 < k < 255)
    total = w * h
    top = opaque.most_common(3)
    box = (min_x, min_y, max_x + 1, max_y + 1) if max_x >= 0 else None
    return w, h, transparent, partial, total, top, box


# Подготовленные спрайты: `scripts/prepare_assets.py` кладёт их на общий
# холст 300×340 и выравнивает ноги по одной линии. Проверяем именно их:
# исходники в `src/assets/squirrel/` — это большие полотна, они в игру не
# попадают напрямую.
CANVAS = (300, 340)
SPRITES_DIR = os.path.join("src", "assets", "squirrel", "sprites")
RAW_DIR = os.path.join("src", "assets", "squirrel")


def check_raw_sources():
    """Исходный арт: 30 поз с загрязнением + старая поза 3 + пояснение.

    27 поз пришли от заказчика (номера 1, 2, 4…10 — по три варианта
    загрязнения) плюс три новых грустных позы со слезами (11, 12, 13) —
    они есть только в чистом виде.
    """
    problems = []
    raw = sorted(glob.glob(os.path.join(RAW_DIR, "pose-*_*.png")))
    if len(raw) != 30:
        problems.append(f"исходных поз с загрязнением должно быть 30, а найдено {len(raw)}")
    # Пояснение к названиям файлов обязано лежать рядом с артом.
    if not os.path.exists(os.path.join(RAW_DIR, "пояснялка по поводу имён.md")):
        problems.append("нет файла «пояснялка по поводу имён.md»")
    return problems


if __name__ == "__main__":
    files = sorted(glob.glob(os.path.join(SPRITES_DIR, "pose-*.png")))
    if not files:
        raise SystemExit("подготовленные спрайты не найдены — запусти scripts/prepare_assets.py")
    print(f"проверка {len(files)} подготовленных спрайтов")
    ok = True
    for problem in check_raw_sources():
        ok = False
        print(f"  ПРОБЛЕМА: {problem}")

    bottoms = set()
    for f in files:
        w, h, tr, part, total, top, box = check(f)
        share = tr / total
        bottom = box[3] if box else -1
        bottoms.add(bottom)
        problems = []
        if (w, h) != CANVAS:
            problems.append(f"размер {w}×{h}, ожидался {CANVAS[0]}×{CANVAS[1]}")
        if share < 0.3:
            problems.append(f"фон не прозрачный: прозрачно только {share:.0%}")
        if box is None:
            problems.append("пустой спрайт")
        if problems:
            ok = False
        print(f"  {os.path.basename(f)} {w}x{h} прозрачно {share:.0%}, "
              f"низ персонажа {bottom}, {'; '.join(problems) if problems else 'OK'}")

    # Все позы должны стоять на одной линии: иначе при смене варианта
    # загрязнения персонаж «прыгает» по экрану.
    if len(bottoms) > 1:
        ok = False
        print(f"  ПРОБЛЕМА: ноги поз стоят на разных линиях: {sorted(bottoms)}")
    else:
        print(f"  ноги всех поз на одной линии: {bottoms.pop()}")
    print("ИТОГ:", "все ассеты корректны" if ok else "есть проблемы")
    raise SystemExit(0 if ok else 1)
