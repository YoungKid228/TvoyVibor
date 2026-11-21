import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BudgetGamePage from "../../src/budget/pages/BudgetGamePage";
import { GameProvider } from "../../src/budget/state/BudgetGameContext";

afterEach(cleanup);

/** Начать игру из меню и дойти до первого дня. */
function startGame() {
  render(
    <GameProvider>
      <BudgetGamePage />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Начать/i }));
  // Брифинг: знакомство с Соломоном и объяснение расходов.
  fireEvent.click(screen.getByRole("button", { name: /Понятно, начинаем/i }));
}

/** Нажать кнопку по точному тексту начала. */
function clickButton(label: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

/**
 * Прожить утро: позавтракать и выбрать дорогу.
 *
 * Утром выбор сделан так, как на макете: сначала игрок отмечает вариант в
 * ленте, потом нажимает главную кнопку действия. Поэтому шагов четыре:
 * отметить еду, позавтракать, отметить дорогу, поехать на пары.
 */
function morning(food = /Своя еда/) {
  clickButton(food);
  clickButton(/Позавтракать/);
  clickButton(/Автобус/);
  clickButton(/Ехать на пары/);
}

/**
 * Прожить свободное время по-человечески: покормить Соломона второй раз,
 * оплатить жильё, развлечься и вымыть Соломона.
 *
 * Два приёма пищи в день обязательны: сон опускает сытость, и без еды
 * Соломон голодает. Развлечение нужно, чтобы настроение не упало до нуля
 * (а это проигрыш), а мытьё — чтобы грязного Соломона пустили в автобус.
 */
function feedAndPay() {
  fireEvent.click(screen.getByRole("button", { name: /Чем заняться/ }));
  // Вкладка «Кушать» — второй приём пищи.
  fireEvent.click(screen.getByRole("button", { name: /Кушать/ }));
  const leftovers = screen.queryByRole("button", {
    name: /Еда, приготовленная утром/,
  });
  if (leftovers) fireEvent.click(leftovers);
  // Вкладка «Платежи» — обязательные платежи.
  fireEvent.click(screen.getByRole("button", { name: /Платежи/ }));
  const housing = screen.queryByRole("button", { name: /Жильё в общежитии/ });
  if (housing) fireEvent.click(housing);
  // Вкладка «Развлечься» — прогулка: без неё Соломон впадает в депрессию.
  fireEvent.click(screen.getByRole("button", { name: /Развлечься/ }));
  const park = screen.queryByRole("button", { name: /Прогулка в парке/ });
  if (park) fireEvent.click(park);
  // Раздел «Соломон» — мытьё: иначе в автобус не пустят.
  fireEvent.click(screen.getByRole("button", { name: /^Соломон$/ }));
  const wash = screen.queryByRole("button", { name: /Помыться/ });
  if (wash) fireEvent.click(wash);
}

describe("игра «Белка Соломон»", () => {
  it("в меню есть запуск, продолжение и сброс", () => {
    render(
      <GameProvider>
        <BudgetGamePage />
      </GameProvider>,
    );
    expect(screen.getByText("Белка Соломон")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Начать/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Продолжить/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Сбросить/i })).toBeTruthy();
  });

  it("в описании игрок — сам Соломон, студент", () => {
    render(
      <GameProvider>
        <BudgetGamePage />
      </GameProvider>,
    );
    expect(screen.getByText(/Вы — Соломон: белка, которая переехала/)).toBeTruthy();
  });

  it("брифинг знакомит с Соломоном и объясняет обязательные расходы", () => {
    render(
      <GameProvider>
        <BudgetGamePage />
      </GameProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Начать/i }));
    expect(screen.getByText(/Вы — Соломон/)).toBeTruthy();
    expect(screen.getByText("Обязательные")).toBeTruthy();
    expect(screen.getByText("Необязательные")).toBeTruthy();
  });

  it("после старта показывает день 1, четыре шкалы и кошелёк", () => {
    startGame();
    expect(screen.getByText(/День 1 из 7/)).toBeTruthy();
    // Четыре шкалы с ролью progressbar: настроение, энергия, сытость, чистота.
    expect(screen.getAllByRole("progressbar")).toHaveLength(4);
    // Кошелёк — в своём разделе: внизу только три кнопки, без сумм.
    fireEvent.click(screen.getByRole("button", { name: /Кошелёк/ }));
    expect(screen.getAllByText("20 000 ₽").length).toBeGreaterThan(0);
  });

  it("утром показывается завтрак, а дорога — на своей вкладке", () => {
    startGame();
    expect(screen.getByLabelText("Утро")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Своя еда/ })).toBeTruthy();
    // Дорога живёт на второй вкладке — как на макете.
    clickButton(/Отправиться на учёбу/);
    expect(screen.getByRole("button", { name: /Пешком/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Такси/ })).toBeTruthy();
  });

  it("после завтрака вкладка сама переключается на дорогу", () => {
    startGame();
    clickButton(/Своя еда/);
    clickButton(/Позавтракать/);
    expect(screen.getByRole("button", { name: /Автобус/ })).toBeTruthy();
  });

  it("в вариантах еды видны цена и время", () => {
    startGame();
    const food = screen.getByRole("button", { name: /Своя еда/ });
    expect(food.textContent).toContain("120 ₽");
    expect(food.textContent).toContain("60 мин");
  });

  it("в нижней навигации кнопки одинаковые, а деньги — в разделе «Кошелёк»", () => {
    startGame();
    const wallet = screen.getByRole("button", { name: /Кошелёк/ });
    // Сумм на кнопке нет: из-за них она была выше остальных и ломала ряд.
    expect(wallet.textContent).not.toMatch(/₽/);
    // Деньги видно в самом разделе: утром игрок туда тоже может заглянуть.
    fireEvent.click(wallet);
    expect(screen.getByText("Подушка")).toBeTruthy();
    expect(screen.getByText("Итог")).toBeTruthy();
    // И путь обратно к завтраку есть.
    expect(screen.getByRole("button", { name: /К завтраку/ })).toBeTruthy();
  });

  it("варианты завтрака идут списком, а не лентой", () => {
    startGame();
    const list = screen.getByLabelText("Варианты завтрака");
    // Вертикальный список: одна колонка, и каждый вариант — отдельной строкой.
    expect(list.className).toContain("flex-col");
    expect(list.children.length).toBeGreaterThan(2);
  });

  it("после завтрака и дороги открывается свободное время", () => {
    startGame();
    morning();
    expect(screen.queryByLabelText("Утро")).toBeNull();
    expect(screen.getByRole("button", { name: /Поход в кино/ })).toBeTruthy();
  });

  it("модуля «Заработать» в игре нет", () => {
    startGame();
    morning();
    expect(screen.queryByRole("button", { name: /Заработать/ })).toBeNull();
    expect(screen.queryByText(/Курьерская доставка/)).toBeNull();
    expect(screen.queryByText(/Лаборант/)).toBeNull();
  });

  it("вкладки действий переключаются", () => {
    startGame();
    morning();
    // Переключатели нарисованы на сцене: это обычные кнопки.
    fireEvent.click(screen.getByRole("button", { name: /Чем заняться/ }));
    expect(screen.getByText("Поход в кино")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Соломон$/ }));
    expect(screen.getByText("Погладить Соломона")).toBeTruthy();
  });

  it("переключатель меняет локацию сцены", () => {
    startGame();
    expect(screen.getByLabelText(/^Сцена: Общежитие/)).toBeTruthy();
    morning();
    fireEvent.click(screen.getByRole("button", { name: /Чем заняться/ }));
    expect(screen.getByLabelText(/^Сцена: Арбат/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Соломон$/ }));
    expect(screen.getByLabelText(/^Сцена: Ванная/)).toBeTruthy();
  });

  it("поглаживание восстанавливает энергию", () => {
    startGame();
    morning();
    fireEvent.click(screen.getByRole("button", { name: /^Соломон$/ }));
    expect(screen.getByText(/энергия \+12/)).toBeTruthy();
  });

  it("мытьё осталось одно — «Помыться»", () => {
    startGame();
    morning();
    fireEvent.click(screen.getByRole("button", { name: /^Соломон$/ }));
    expect(screen.getByRole("button", { name: /Помыться/ })).toBeTruthy();
    // Отдельного «помыться самому» больше нет.
    expect(screen.queryByRole("button", { name: /Вымыть Соломона/ })).toBeNull();
  });

  it("игра в компьютер доступна и требует интернет", () => {
    startGame();
    morning();
    fireEvent.click(screen.getByRole("button", { name: /Чем заняться/ }));
    expect(screen.getByRole("button", { name: /Играть в компьютер/ })).toBeTruthy();
  });

  it("сон закрывает день и начинается новое утро", () => {
    startGame();
    morning();
    // Кнопка сна есть на сцене и видна всегда.
    clickButton(/Поспать/);
    // Подтверждение: времени ещё много, поэтому предупреждаем.
    expect(screen.getByText(/можете ещё много чего сделать/)).toBeTruthy();
    clickButton(/Всё равно поспать/);
    expect(screen.getByText(/День 2 из 7/)).toBeTruthy();
    expect(screen.getByLabelText("Утро")).toBeTruthy();
  });

  it("на 5-й день открывается событие про телефон", () => {
    startGame();
    // Дни 1–4 живём без событий, на 5-м открывается телефон.
    for (let day = 1; day <= 4; day += 1) {
      morning();
      // Жильё платим сразу: иначе на пятом дне выселят.
      feedAndPay();
      clickButton(/Поспать/);
      clickButton(/Всё равно поспать|Да, поспать/);
    }
    morning();
    expect(screen.getByText("Сломался телефон")).toBeTruthy();
  });

  it("полная неделя доходит до итогового экрана", () => {
    startGame();
    for (let day = 1; day <= 7; day += 1) {
      morning();
      const phone = screen.queryByRole("button", { name: /Починить/ });
      if (phone) fireEvent.click(phone);
      const gift = screen.queryByRole("button", { name: /Подарок и праздник/ });
      if (gift) fireEvent.click(gift);
      // Жильё платим сразу: иначе на 5-й день выселят.
      feedAndPay();
      clickButton(/Поспать/);
      clickButton(/Всё равно поспать|Да, поспать/);
    }
    expect(screen.getByText(/Итог недели/)).toBeTruthy();
    expect(screen.getByText("Проверка расходов")).toBeTruthy();
    expect(screen.getByText("Что стоит изменить")).toBeTruthy();
  });
});
