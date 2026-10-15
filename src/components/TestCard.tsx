import type { CareerTest } from "../types/test";

type Props = {
  test: CareerTest;
  hasProgress: boolean;
  onStart: () => void;
};

export default function TestCard({ test, hasProgress, onStart }: Props) {
  return (
    <button
      type="button"
      data-testid="test-card"
      onClick={onStart}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 hover:border-sky-400 motion-safe:transition-colors"
    >
      <span className="block font-medium">{test.title}</span>
      <span className="mt-1 block text-sm text-slate-500">
        20 вопросов
        {hasProgress && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            есть прогресс — продолжить
          </span>
        )}
      </span>
    </button>
  );
}
