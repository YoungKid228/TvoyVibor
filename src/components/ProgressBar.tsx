type Props = {
  current: number;
  total: number;
};

export default function ProgressBar({ current, total }: Props) {
  const value = Math.min(Math.max(current, 0), total);
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div
      data-testid="progress-bar"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Вопрос ${value} из ${total}`}
      className="flex items-center gap-3"
    >
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-sky-600 motion-safe:transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm tabular-nums text-slate-600">
        {value} / {total}
      </span>
    </div>
  );
}
