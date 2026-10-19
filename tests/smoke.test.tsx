import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../src/App";

afterEach(cleanup);

describe("App smoke", () => {
  it("renders without crashing", () => {
    const { container } = render(<App />);
    // Заголовок шапки остался «Экономика — твой выбор», гейт установки
    // после переименования приложения говорит «Твой выбор»
    expect(container.textContent).toContain("Твой выбор");
  });

  it("shows direction on home screen after dismissing install gate", () => {
    const { getByRole, getByText } = render(<App />);
    fireEvent.click(getByRole("button", { name: "Продолжить в браузере" }));
    expect(getByText("Направление: Экономика")).toBeTruthy();
  });
});
