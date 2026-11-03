import { deleteValue, readValue, writeValue } from "./db";
import type { GameState } from "../core/types";

/**
 * Репозиторий сохранений игры.
 *
 * Формат: `{ schemaVersion, state, updatedAt }`. При несовместимой версии
 * сохранение считается битым и удаляется — так игрок не получает игру,
 * падающую на старте из-за старой схемы.
 */

const SAVE_KEY = "budget-game";

/** Текущая версия схемы. При изменении формата состояния её нужно поднять. */
export const SCHEMA_VERSION = 1;

export type SavedGame = {
  schemaVersion: number;
  state: GameState;
  updatedAt: string;
};

/** Проверить, что сохранённые данные пригодны к использованию. */
function isValidSave(value: unknown): value is SavedGame {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== SCHEMA_VERSION) return false;
  if (typeof v.updatedAt !== "string") return false;
  const state = v.state as Record<string, unknown> | undefined;
  if (typeof state !== "object" || state === null) return false;
  return (
    typeof state.day === "number" &&
    typeof state.cash === "number" &&
    typeof state.savings === "number" &&
    typeof state.scales === "object" &&
    state.scales !== null
  );
}

/** Сохранить состояние игры. */
export async function saveGame(state: GameState): Promise<void> {
  const payload: SavedGame = {
    schemaVersion: SCHEMA_VERSION,
    state,
    updatedAt: new Date().toISOString(),
  };
  await writeValue(SAVE_KEY, payload);
}

/**
 * Загрузить состояние игры.
 * Битое или устаревшее сохранение удаляется и возвращается null.
 */
export async function loadGame(): Promise<GameState | null> {
  const raw = await readValue<unknown>(SAVE_KEY);
  if (raw === null) return null;
  if (!isValidSave(raw)) {
    await deleteValue(SAVE_KEY);
    return null;
  }
  return raw.state;
}

/** Удалить сохранение (кнопка «Сброс»). */
export async function clearGame(): Promise<void> {
  await deleteValue(SAVE_KEY);
}

/** Есть ли сохранение — для кнопки «Продолжить». */
export async function hasGame(): Promise<boolean> {
  return (await loadGame()) !== null;
}
