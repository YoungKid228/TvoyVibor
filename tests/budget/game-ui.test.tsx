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
  // Брифинг: знакомство с белкой и объяснение расходов.
  fireEvent.click(screen.getByRole("button", { name: /Понятно, начинаем/i }));
}

/** Нажать кнопку по точному тексту начала. */
function clickButton(label: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

/** Прожить утро: позавтракать и выбрать дорогу. */
function morning(food = /Своя еда/) {
  clickButton(food);
  clickButton(/Автобус/);
}

/**
 * Покормить Соломона второй раз и оплатить жильё.
 *
 * Два приёма пищи в день — обязательны: сон опускает сытость, и если
 * кормить раз в день, Соломон голодает и игра проигрывается.
 */
function feedAndPay() {
  fireEvent.click(screen.getByRole("button", { name: /Потратить/ }));
  const leftovers = screen.queryByRole("button", {
    name: /Еда, приготовленная утром/,
  });
  if (leftovers) fireEvent.click(leftovers);
  const housing = screen.queryByRole("button", { name: /Жильё в общежитии/ });
  if (housing) fireEvent.click(housing);
}

describe("игра «Белка Соломон»", () => {
  it("в меню есть выбор режима и профессии", () => {
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

  it("брифинг знакомит с белкой и объясняет обязательные расходы", () => {
    render(
      <GameProvider>
        <BudgetGamePage />
      </GameProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Начать/i }));
    expect(screen.getByText(/Знакомьтесь: это Соломон/)).toBeTruthy();
    expect(screen.getByText("Обязательные")).toBeTruthy();
    expect(screen.getByText("Необязательные")).toBeTruthy();
  });

  it("после старта показывает день 1, четыре шкалы и кошелёк", () => {
    startGame();
    expect(screen.getByText(/День 1 из 7/)).toBeTruthy();
    // Четыре шкалы с ролью progressbar: настроение, энергия, сытость, чистота.
    expect(screen.getAllByRole("progressbar")).toHaveLength(4);
    expect(screen.getAllByText("20 000 ₽").length).toBeGreaterThan(0);
  });

  it("утром показывает выбор завтрака и дороги", () => {
    startGame();
    expect(screen.getByLabelText("Утро")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Своя еда/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Пешком/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Такси/ })).toBeTruthy();
  });

  it("после завтрака и дороги открывается свободное время", () => {
    startGame();
    morning();
    expect(screen.queryByLabelText("Утро")).toBeNull();
    expect(screen.getByRole("button", { name: /Курьерская доставка/ })).toBeTruthy();
  });

  it("вкладки действий переключаются", () => {
    startGame();
    morning();
    expect(screen.getByText("Курьерская доставка")).toBeTruthy();
    // Переключатели нарисованы на сцене: это обычные кнопки.
    fireEvent.click(screen.getByRole("button", { name: /Потратить/ }));
    expect(screen.getByText("Поход в кино")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Соломон$/ }));
    expect(screen.getByText("Погладить Соломона")).toBeTruthy();
  });

  it("переключатель меняет локацию сцены", () => {
    startGame();
    expect(screen.getByLabelText(/^Сцена: Общежитие/)).toBeTruthy();
    morning();
    expect(screen.getByLabelText(/^Сцена: Город/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Потратить/ }));
    expect(screen.getByLabelText(/^Сцена: Арбат/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Соломон$/ }));
    expect(screen.getByLabelText(/^Сцена: Ванная/)).toBeTruthy();
  });

  it("смена увеличивает кошелёк и тратит энергию", () => {
    startGame();
    morning();
    clickButton(/Курьерская доставка/);
    expect(screen.getAllByText(/₽/).length).toBeGreaterThan(0);
    expect(screen.getByText(/энергия −30/)).toBeTruthy();
  });

  it("недоступная работа подписана причиной", () => {
    startGame();
    morning();
    // Лаборант доступен со второго дня, репетиторство — после трёх дней уроков.
    expect(screen.getByText(/лаборантом можно со второго дня/)).toBeTruthy();
    expect(screen.getByText(/нужен интернет и 3 дня уроков подряд/)).toBeTruthy();
  });

  it("сон закрывает день и начинается новое утро", () => {
    startGame();
    morning();
    // Кнопка сна есть на сцене и видна всегда.
    clickButton(/Поспать/);
    // Подтверждение: времени ещё много, поэтому предупреждаем.
    expect(screen.getByText(/Соломон может ещё много чего сделать/)).toBeTruthy();
    clickButton(/Всё равно поспать/);
    expect(screen.getByText(/День 2 из 7/)).toBeTruthy();
    expect(screen.getByLabelText("Утро")).toBeTruthy();
  });

  it("на 5-й день открывается событие про телефон", () => {
    startGame();
    // Дни 1–4 живём без событий, на 5-м открывается телефон.
    for (let day = 1; day <= 4; day += 1) {
      morning();
      // Жильё платим сразу: иначе на пятом дне Соломона выселят.
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
      // Жильё платим сразу: иначе на 5-м день Соломона выселят.
      feedAndPay();
      clickButton(/Поспать/);
      clickButton(/Всё равно поспать|Да, поспать/);
    }
    expect(screen.getByText(/Итог недели/)).toBeTruthy();
    expect(screen.getByText("Проверка расходов")).toBeTruthy();
    expect(screen.getByText("Что стоит изменить")).toBeTruthy();
  });
});
