import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BudgetGamePage from "../../src/budget/pages/BudgetGamePage";
import { GameProvider } from "../../src/budget/state/BudgetGameContext";

afterEach(cleanup);

/** Начать игру из меню. */
function startGame() {
  render(
    <GameProvider>
      <BudgetGamePage />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Начать/i }));
}

/** Нажать кнопку по точному тексту начала. */
function clickButton(label: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name: label }));
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

  it("после старта показывает день 1, шесть шкал и кошелёк", () => {
    startGame();
    expect(screen.getByText(/День 1 из 7/)).toBeTruthy();
    // Шесть шкал с ролью progressbar: настроение, энергия, сытость, гигиена, Соломон, чистота.
    expect(screen.getAllByRole("progressbar")).toHaveLength(6);
    // Обязательные расходы 1-го дня списаны: 20 000 − 12 500 = 7 500.
    // Сумма показана и в кошельке, и в итоговом балансе.
    expect(screen.getAllByText("7 500 ₽").length).toBeGreaterThan(0);
  });

  it("вкладки действий переключаются", () => {
    startGame();
    expect(screen.getByText("Помощь по хозяйству")).toBeTruthy();
    // Переключатели теперь нарисованы на сцене: это обычные кнопки.
    fireEvent.click(screen.getByRole("button", { name: /Потратить/ }));
    expect(screen.getByText("Поход в кино")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Отдохнуть/ }));
    expect(screen.getByText("Поспать")).toBeTruthy();
  });

  it("переключатель меняет локацию сцены", () => {
    startGame();
    expect(screen.getByLabelText(/^Сцена: Город/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Потратить/ }));
    expect(screen.getByLabelText(/^Сцена: Арбат/)).toBeTruthy();
    // «Соломон» — точное имя: в карточках есть «Поглаживание Соломона».
    fireEvent.click(screen.getByRole("button", { name: /^Соломон$/ }));
    expect(screen.getByLabelText(/^Сцена: Ванная/)).toBeTruthy();
  });

  it("смена увеличивает кошелёк и тратит энергию", () => {
    startGame();
    expect(screen.getAllByText("7 500 ₽").length).toBeGreaterThan(0);
    clickButton(/Помощь по хозяйству/);
    // 600 ₽ базы, настроение после спада дня — 69, множитель 0.845 → 500 ₽.
    expect(screen.getAllByText("8 000 ₽").length).toBeGreaterThan(0);
  });

  it("недоступная работа подписана причиной", () => {
    startGame();
    expect(screen.getByText(/нужен ноутбук/)).toBeTruthy();
    expect(screen.getByText(/мало репутации/)).toBeTruthy();
  });

  it("на 4-й день открывается событие «снегопад»", () => {
    startGame();
    // Дни 1–3: заканчиваем без событий.
    for (let day = 1; day <= 3; day += 1) {
      clickButton(/Закончить день/);
    }
    expect(screen.getByText("Снегопад парализует Биробиджан")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Автобус/ })).toBeTruthy();
  });

  it("полная неделя доходит до итогового экрана", () => {
    startGame();
    for (let day = 1; day <= 7; day += 1) {
      // Закрываем событие, если оно открыто.
      const blizzard = screen.queryByRole("button", { name: /Автобус/ });
      if (blizzard) fireEvent.click(blizzard);
      const repair = screen.queryByRole("button", { name: /^Ремонт/ });
      if (repair) fireEvent.click(repair);
      const gift = screen.queryByRole("button", { name: /Подарок и праздник/ });
      if (gift) fireEvent.click(gift);
      clickButton(/Закончить день/);
    }
    expect(screen.getByText(/Итог недели/)).toBeTruthy();
    expect(screen.getByText("Проверка расходов")).toBeTruthy();
    expect(screen.getByText("Что стоит изменить")).toBeTruthy();
  });
});
