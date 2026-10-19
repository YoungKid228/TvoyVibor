import { useEffect, useState } from "react";
import SpecialText from "../components/SpecialText";
import StickyCardStack, {
  type StickyCardItem,
} from "../components/StickyCardStack";

/* Фото галереи ПГУ лежат в public/pgu-gallery и кэшируются service worker'ом
   при первом просмотре (runtimeCaching в vite.config.ts) */
const photos: StickyCardItem[] = Array.from({ length: 30 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    title: `Кадр ${n}`,
    image: `/pgu-gallery/pgu-${n}.jpg`,
  };
});

/** Плавающая кнопка «в начало»: видна, пока страница прокручена. */
function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label="Вернуться в начало галереи"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-5 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#9a3412] bg-[#fff7ed] text-lg text-[#9a3412] shadow-[3px_3px_0_#b45309] transition-transform active:translate-y-0.5"
    >
      ↑
    </button>
  );
}

export default function PguGalleryPage() {
  return (
    <section aria-label="Галерея ПГУ" className="flex flex-col gap-4">
      <SpecialText className="text-2xl font-bold sm:text-3xl">
        Галерея ПГУ
      </SpecialText>
      <p className="text-sm text-stone-500">
        Листай вниз — фотографии накладываются друг на друга.
      </p>
      <StickyCardStack items={photos} />
      <BackToTopButton />
    </section>
  );
}
