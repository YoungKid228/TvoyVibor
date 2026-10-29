"""Конвертирует фотографии из папки «специалисты» в WebP для приложения.

Запуск: python scripts/prepare_profession_photos.py
Результат: src/assets/professions/<professionId>.webp
"""
import os
from PIL import Image

SRC = "специалисты"
DST = os.path.join("src", "assets", "professions")
MAX_WIDTH = 1200
QUALITY = 82

# Имя файла в исходной папке -> id профессии в src/data/professions.json
MAPPING = {
    "Бизнес аналитик.png": "business_analyst",
    "Бухгалтер.png": "accountant",
    "Кредитный специалист.png": "credit_specialist",
    "пециалист по налогообложению.jfif": "tax_consultant",
    "Специалист по бюджету.png": "budgeting_specialist",
    "Специалист по закупкам.png": "procurement_specialist",
    "Специалист по экономической безопасности.png": "economic_security",
    "страховой агент.png": "insurance_agent",
    "Финансовый аналитик.png": "financial_analyst",
    "Экономист.png": "economist",
}


def main() -> None:
    os.makedirs(DST, exist_ok=True)
    for filename, profession_id in MAPPING.items():
        source = os.path.join(SRC, filename)
        target = os.path.join(DST, f"{profession_id}.webp")
        if not os.path.exists(source):
            print(f"НЕТ ФАЙЛА: {source}")
            continue
        with Image.open(source) as image:
            image = image.convert("RGB")
            if image.width > MAX_WIDTH:
                height = round(image.height * MAX_WIDTH / image.width)
                image = image.resize((MAX_WIDTH, height), Image.LANCZOS)
            image.save(target, "WEBP", quality=QUALITY, method=6)
        size_kb = round(os.path.getsize(target) / 1024)
        print(f"{profession_id:28} -> {target} ({size_kb} KB)")


if __name__ == "__main__":
    main()
