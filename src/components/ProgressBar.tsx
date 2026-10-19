import { ProgressBar as PixelProgressBar } from "pixel-retroui";

type Props = {
  current: number;
  total: number;
};

export default function ProgressBar({ current, total }: Props) {
  const value = Math.min(Math.max(current, 0), total);
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div data-testid="progress-bar" className="flex items-center gap-3">
      <PixelProgressBar
        progress={percent}
        size="md"
        color="#f97316"
        borderColor="#9a3412"
        className="pixel-progress min-w-0 flex-1"
      />
      <span
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Вопрос ${value} из ${total}`}
        className="shrink-0 text-sm tabular-nums text-stone-600"
      >
        {value} / {total}
      </span>
    </div>
  );
}
