"""Проверка RGBA-ассетов: альфа корректна, фон прозрачный."""
import glob
import os
import struct
import zlib
from collections import Counter


def load_rgba(path):
    data = open(path, "rb").read()
    pos = 8
    idat = b""
    w = h = ct = None
    while pos < len(data):
        ln = struct.unpack(">I", data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            w, h, bd, ct, cm, fl, il = struct.unpack(">IIBBBBB", chunk)
            assert bd == 8 and ct == 6 and il == 0, (bd, ct, il)
        elif typ == b"IDAT":
            idat += chunk
        pos += 12 + ln
    raw = zlib.decompress(idat)
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


def check(path):
    w, h, buf = load_rgba(path)
    alpha = Counter()
    opaque = Counter()
    for y in range(h):
        for x in range(w):
            i = (y * w + x) * 4
            a = buf[i + 3]
            alpha[a] += 1
            if a > 200:
                opaque[(buf[i], buf[i + 1], buf[i + 2])] += 1
    transparent = alpha.get(0, 0)
    partial = sum(v for k, v in alpha.items() if 0 < k < 255)
    total = w * h
    top = opaque.most_common(3)
    return w, h, transparent, partial, total, top


if __name__ == "__main__":
    pattern = os.path.join("src", "assets", "squirrel", "pose-*.png")
    files = sorted(glob.glob(pattern))
    if not files:
        raise SystemExit("позы не найдены")
    print(f"проверка {len(files)} ассетов")
    ok = True
    for f in files:
        w, h, tr, part, total, top = check(f)
        share = tr / total
        status = "OK" if share > 0.2 and part < total * 0.2 else "ПРОБЛЕМА"
        if status != "OK":
            ok = False
        print(f"  {os.path.basename(f)} {w}x{h} прозрачно {share:.0%}, "
              f"полупрозрачно {part}, топ: {top}")
    print("ИТОГ:", "все ассеты корректны" if ok else "есть проблемы")
