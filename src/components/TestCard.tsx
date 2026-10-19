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
      <PixelCard>
        <span className="block font-medium">{test.title}</span>
        <span className="mt-1 block text-sm text-stone-500">
          20 вопросов
          {hasProgress && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              есть прогресс — продолжить
            </span>
          )}
        </span>
      </PixelCard>
    </button>
  );
}
