import type { CareerTest } from "../types/test";
import PixelCard from "./PixelCard";

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
      className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
    >
      <PixelCard style={{ padding: 24, margin: 6 }}>
        <span className="block text-lg font-semibold leading-snug">
          {test.title}
        </span>
        <span className="mt-2 block text-sm text-stone-500">
          20 вопросов · 10 профессий · 5 минут
          {hasProgress && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              есть прогресс — продолжить
            </span>
          )}
        </span>
        <span className="mt-4 block text-sm font-medium text-orange-700">
          Начать тест →
        </span>
      </PixelCard>
    </button>
  );
}
