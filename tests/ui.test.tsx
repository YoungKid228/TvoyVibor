import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GlitchText from "../src/components/GlitchText";
import AsciiBackground from "../src/components/AsciiBackground";
import ProfessionCarousel from "../src/components/ProfessionCarousel";
import type { Profession, Program } from "../src/types/test";
import ProgramPage from "../src/pages/ProgramPage";
import DirectionsPage from "../src/pages/DirectionsPage";
import ClubPage from "../src/pages/ClubPage";
import programsData from "../src/data/programs.json";

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

  it("показывает фотографию профессии в карточке карусели", () => {
    const { container } = render(
      <ProfessionCarousel
        professions={professions}
        programs={programs}
        onOpenProfession={() => {}}
      />,
    );
    const images = container.querySelectorAll("img");
    expect(images.length).toBe(professions.length);
    expect(images[0].getAttribute("alt")).toBe("Бухгалтер");
    expect(images[0].getAttribute("src")).toMatch(/accountant/);
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

describe("ProgramPage", () => {
  const program: Program = {
    ...(programsData[0] as Program),
    admissionOptions: [
      {
        form: "Очная",
        base: "На базе 11 классов",
        duration: "1 год 10 месяцев",
        budgetPlaces: null,
        paidPlaces: 30,
        costPerYear: null,
        profiles: null,
      },
    ],
  };

  it("показывает варианты поступления со сроком и без мест", () => {
    const { getByTestId, getAllByText, queryAllByText } = render(
      <ProgramPage
        program={program}
        professions={[]}
        onBack={() => {}}
        onOpenProfession={() => {}}
      />,
    );
    expect(getByTestId("admission-options")).toBeTruthy();
    expect(getAllByText(/на базе 11 классов/i).length).toBeGreaterThan(0);
    expect(getAllByText(/1 год 10 месяцев/).length).toBeGreaterThan(0);
    // места, стоимость и проходные баллы в приложении не показываются
    expect(queryAllByText(/платных мест/i).length).toBe(0);
    expect(queryAllByText(/бюджетных мест/i).length).toBe(0);
    expect(queryAllByText(/стоимость/i).length).toBe(0);
  });
});

describe("DirectionsPage", () => {
  it("разделяет магистратуру на блоки по профилям и не показывает места, цену и баллы", () => {
    const programs = programsData as Program[];
    const onOpenProgram = vi.fn();
    const { getAllByTestId, queryAllByText, getByText } = render(
      <DirectionsPage
        programs={programs}
        professions={[]}
        onOpenProgram={onOpenProgram}
      />,
    );

    const cards = getAllByTestId("program-card");
    // 3 программы с одним профилем + 3 профиля магистратуры
    expect(cards.length).toBe(6);

    expect(queryAllByText(/бюджетных мест/i).length).toBe(0);
    expect(queryAllByText(/платных мест/i).length).toBe(0);
    expect(queryAllByText(/стоимость/i).length).toBe(0);
    expect(queryAllByText(/проходной балл/i).length).toBe(0);

    // клик по блоку магистратуры открывает нужный профиль
    fireEvent.click(getByText("Электронная коммерция"));
    expect(onOpenProgram).toHaveBeenCalledWith(
      "masters",
      "Электронная коммерция",
    );
  });
});

describe("ProgramPage", () => {
  it("не показывает блок «Приём», баллы и места", () => {
    const programs = programsData as Program[];
    const bachelor = programs.find((p) => p.id === "finance_credit")!;
    const { queryByText, queryAllByText, getAllByText } = render(
      <ProgramPage
        program={bachelor}
        professions={[]}
        onBack={() => {}}
        onOpenProfession={() => {}}
      />,
    );

    expect(queryByText("Приём")).toBeNull();
    // минимальные баллы убраны, сами дисциплины остались
    expect(getAllByText("Русский язык").length).toBeGreaterThan(0);
    expect(queryAllByText(/—\s*40/).length).toBe(0);
    expect(queryAllByText(/балл/i).length).toBe(0);
    expect(queryAllByText(/мест/i).length).toBe(0);
  });

  it("убирает баллы и места из карточки профиля магистратуры", () => {
    const programs = programsData as Program[];
    const masters = programs.find((p) => p.id === "masters")!;
    const { queryAllByText, getAllByText } = render(
      <ProgramPage
        program={masters}
        professions={[]}
        profileName="Аналитическая экономика"
        onBack={() => {}}
        onOpenProfession={() => {}}
      />,
    );

    // дисциплина осталась, минимальный балл — нет
    expect(getAllByText(/Вступительное испытание: Экономика$/).length).toBe(1);
    expect(queryAllByText(/60 баллов/).length).toBe(0);
    // примечание про места убрано целиком
    expect(queryAllByText(/платных мест/i).length).toBe(0);
    expect(queryAllByText(/бюджетных мест/i).length).toBe(0);
  });
});

describe("ClubPage", () => {
  it("содержит ссылку на сообщество клуба в MAX", () => {
    const { getByTestId } = render(<ClubPage />);
    const link = getByTestId("club-community-link") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://max.ru/id7901009072_gos3");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("target")).toBe("_blank");
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
