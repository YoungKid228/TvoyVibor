/**
 * ClubPhoto — одиночная фотография между блоками страницы «Клуб».
 * Оформлена в общей пиксельной стилистике: кремовая подложка,
 * оранжевая рамка, жёсткая тень, лёгкий наклон для «живости».
 */
export default function ClubPhoto({
  src,
  alt,
  tilt = 0,
  caption,
}: {
  src: string;
  alt: string;
  /** Наклон в градусах, для чередования оформления */
  tilt?: number;
  caption?: string;
}) {
  return (
    <figure
      className="m-0 flex flex-col items-center"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div
        className="w-full overflow-hidden border-4 border-[#9a3412] bg-[#fffaf2]"
        style={{ boxShadow: "6px 6px 0 #b45309" }}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="block h-auto max-h-72 w-full object-cover"
        />
      </div>
      {caption ? (
        <figcaption className="mt-1 text-xs font-medium text-stone-500">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
