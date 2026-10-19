import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GlitchText from "../src/components/GlitchText";
import AsciiBackground from "../src/components/AsciiBackground";
import ProfessionCarousel from "../src/components/ProfessionCarousel";
import type { Profession } from "../src/types/test";

afterEach(cleanup);

describe("GlitchText", () => {
  it("рендерит видимый текст и два aria-hidden слоя глитча", () => {
    const { container, getAllByText } = render(
      <GlitchText text="Экономика — твой выбор" as="h1" />,
    );
    const h1 = container.querySelector("h1");
    expect(h1).toBeTruthy();
    expect(h1?.className).toContain("glitch--on");
    const layers = container.querySelectorAll("[aria-hidden='true']");
    expect(layers.length).toBe(2);
    // базовый текст + 2 слоя
    expect(getAllByText("Экономика — твой выбор").length).toBe(3);
  });

  it("в режиме enableOnHover слои отключены до наведения", () => {
    const { container } = render(
      <GlitchText text="ПГУ им. Шолом-Алейхема" enableOnHover />,
    );
    expect(container.querySelector(".glitch--hover")).toBeTruthy();
    expect(container.querySelector(".glitch--on")).toBeNull();
  });
});

describe("ProfessionCarousel", () => {
  const professions: Profession[] = [
    {
      id: "accountant",
      directionId: "economics",
      programId: "econ_accounting",
      title: "Бухгалтер",
      description: "Описание",
    },
    {
      id: "credit_specialist",
      directionId: "economics",
      programId: "banking",
      title: "Кредитный специалист",
      description: "Описание",
    },
    {
      id: "economist",
      directionId: "economics",
      programId: "finance_credit",
      title: "Экономист",
      description: "Описание",
    },
  ];
  const programs = [
    { id: "banking", code: "38.02.07", title: "Банковское дело", level: "СПО" },
  ];

  it("рендерит карточки всех профессий", () => {
    const { getAllByTestId, getByTestId } = render(
      <ProfessionCarousel
        professions={professions}
        programs={programs}
        onOpenProfession={() => {}}
      />,
    );
    expect(getByTestId("profession-carousel")).toBeTruthy();
    expect(getAllByTestId("profession-carousel-card").length).toBe(3);
  });

  it("клик по карточке открывает соответствующую профессию", () => {
    const onOpen = vi.fn();
    const { getAllByTestId } = render(
      <ProfessionCarousel
        professions={professions}
        programs={programs}
        onOpenProfession={onOpen}
      />,
    );
    fireEvent.click(getAllByTestId("profession-carousel-card")[1]);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith("credit_specialist");
  });

  it("кнопки прокрутки заблокированы, пока прокрутка невозможна (jsdom)", () => {
    const { getByTestId } = render(
      <ProfessionCarousel
        professions={professions}
        programs={programs}
        onOpenProfession={() => {}}
      />,
    );
    expect((getByTestId("carousel-prev") as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((getByTestId("carousel-next") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe("AsciiBackground", () => {
  it("рендерит canvas и не падает в среде без поддержки 2D-контекста", () => {
    const { container } = render(
      <AsciiBackground className="absolute inset-0" />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();
  });
});
