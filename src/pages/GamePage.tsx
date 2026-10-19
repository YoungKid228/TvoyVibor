import SpecialText from "../components/SpecialText";
import PixelRunGame from "../components/PixelRunGame";

export default function GamePage() {
  return (
    <section aria-label="Игра" className="flex flex-col gap-4">
      <SpecialText className="text-2xl font-bold sm:text-3xl">
        Пиксель-раннер
      </SpecialText>
      <p className="text-sm text-stone-500">
        Тапни по экрану (или нажми пробел), чтобы перепрыгнуть препятствие.
        Скорость растёт — держись как можно дольше!
      </p>
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white p-2 shadow-[3px_3px_0_#d6d3d1]">
        <PixelRunGame style={{ height: 300 }} />
      </div>
      <p className="text-xs text-stone-400">
        Рекорд сохраняется на устройстве.
      </p>
    </section>
  );
}
