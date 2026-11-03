/**
 * Обёртка над IndexedDB без зависимостей.
 *
 * Требование ТЗ (п. 10): прогресс игры должен переживать перезагрузку и
 * работать офлайн. localStorage для этого не годится — он синхронный и не
 * рассчитан на структурированные данные, поэтому здесь своя тонкая обёртка.
 */

const DB_NAME = "pgu-econ-budget";
const DB_VERSION = 1;
const STORE_NAME = "saves";

/** Открыть базу и создать хранилище, если его ещё нет. */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB недоступна"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("не удалось открыть IndexedDB"));
  });
}

/** Выполнить транзакцию над хранилищем. */
async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = action(tx.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("ошибка транзакции IndexedDB"));
    });
  } finally {
    db.close();
  }
}

/** Прочитать значение по ключу. */
export async function readValue<T>(key: string): Promise<T | null> {
  try {
    const value = await withStore<T | undefined>("readonly", (store) =>
      store.get(key),
    );
    return value ?? null;
  } catch {
    // Приватный режим или недоступное хранилище — играем без сохранения.
    return null;
  }
}

/** Записать значение по ключу. */
export async function writeValue<T>(key: string, value: T): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.put(value, key));
  } catch {
    // Сохранение — необязательный сервис: его отсутствие не должно ломать игру.
  }
}

/** Удалить значение по ключу. */
export async function deleteValue(key: string): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.delete(key));
  } catch {
    // ignore
  }
}
