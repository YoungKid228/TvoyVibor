/**
 * Реестр иконок игры «Белка Соломон».
 *
 * Все иконки импортируются статически: так Vite их анализирует и кладёт в бандл.
 * Функция iconUrl() конвертирует путь вида "ui/spend-coffee" в готовый URL.
 * Если иконка не найдена — возвращает null.
 */

// Системные иконки шкал
import mood from './mood.png';
import energy from './energy.png';
import hunger from './hunger.png';
import hygiene from './hygiene.png';
import solomon from './solomon.png';
// Сердечки пришли вместе с иконками Соломона и лежат в assets/squirrel.
import heart1 from '../squirrel/heart_1.png';
import heart2 from '../squirrel/heart_2.png';
import heart3 from '../squirrel/heart_3.png';

// Фоны локаций. Лежат в `src/assets/backgrounds/` — это готовые сцены
// без персонажа, в игре Соломон ставится на них поверх.
import locArbatBg from '../backgrounds/loc-arbat.png';
import locBathroomBg from '../backgrounds/loc-bathroom.png';
import locCityBg from '../backgrounds/loc-city.png';
import locDormBg from '../backgrounds/loc-dorm.png';
import locEmbankmentBg from '../backgrounds/loc-embankment.png';
import locUniversityBg from '../backgrounds/loc-university.png';

// Иконки работ (job-*)
import jobCourier from './job-courier.png';
import jobTutor from './job-tutor.png';

// Иконки трат (spend-*)
import spendBreakfast from './spend-breakfast.png';
import spendCafe from './spend-cafe.png';
import spendCoffee from './spend-coffee.png';
import spendKino from './spend-kino.png';
import spendPark from './spend-park.png';
import spendProducts from './spend-products.png';
import spendSchnitzel from './spend-schnitzel.png';
import spendShower from './spend-shower.png';

// Иконки профессий (prof-*)
import profCourier from './prof-courier.png';
import profCreative from './prof-creative.png';
import profEngineer from './prof-engineer.png';
import profNone from './prof-none.png';
import profStudent from './prof-student.png';

// Иконки крупных покупок (item-*)
import itemLaptop from './item-laptop.png';
import itemWasher from './item-washer.png';

// Иконки событий (event-*)
import eventBlizzardBus from './event-blizzard-bus.png';
import eventBlizzardTaxi from './event-blizzard-taxi.png';
import eventBlizzardWalk from './event-blizzard-walk.png';
import eventGiftBig from './event-gift-big.png';
import eventGiftMid from './event-gift-mid.png';
import eventGiftSmall from './event-gift-small.png';
import eventPhoneNew from './event-phone-new.png';
import eventPhoneOld from './event-phone-old.png';
import eventPhoneRepair from './event-phone-repair.png';

// Иконки мест (loc-*)
import locArbat from './loc-arbat.png';
import locBathroom from './loc-bathroom.png';
import locCity from './loc-city.png';
import locDorm from './loc-dorm.png';
import locEmbankment from './loc-embankment.png';
import locUniversity from './loc-university.png';

// Иконки вкладок (tab-*)
import tabEarn from './tab-earn.png';
import tabSpend from './tab-spend.png';
import tabPet from './tab-pet.png';

// Иконки вердиктов (grade-*)
import gradeMoney from './grade-money.png';

// Системные иконки (ui-*)
import uiBirthday from './ui-birthday.png';
import uiClock from './ui-clock.png';
import uiDay from './ui-day.png';
import uiMandatory from './ui-mandatory.png';
import uiRecommend from './ui-recommend.png';
import uiTransport from './ui-transport.png';
import uiWarning from './ui-warning.png';


// Кнопки меню (btn-*)

// События культурной ценности ЕАО (eao-*)

// Реестр всех иконок
const ICON_MAP: Record<string, string> = {
  'ui/mood': mood,
  'ui/energy': energy,
  'ui/hunger': hunger,
  'ui/hygiene': hygiene,
  'ui/solomon': solomon,
  'ui/heart-1': heart1,
  'ui/heart-2': heart2,
  'ui/heart-3': heart3,

  'ui/job-courier': jobCourier,
  'ui/job-tutor': jobTutor,
  'ui/spend-breakfast': spendBreakfast,
  'ui/spend-cafe': spendCafe,
  'ui/spend-coffee': spendCoffee,
  'ui/spend-kino': spendKino,
  'ui/spend-park': spendPark,
  'ui/spend-products': spendProducts,
  'ui/spend-schnitzel': spendSchnitzel,
  'ui/spend-shower': spendShower,

  'ui/prof-courier': profCourier,
  'ui/prof-creative': profCreative,
  'ui/prof-engineer': profEngineer,
  'ui/prof-none': profNone,
  'ui/prof-student': profStudent,
  'ui/item-laptop': itemLaptop,
  'ui/item-washer': itemWasher,

  'ui/event-blizzard-bus': eventBlizzardBus,
  'ui/event-blizzard-taxi': eventBlizzardTaxi,
  'ui/event-blizzard-walk': eventBlizzardWalk,
  'ui/event-gift-big': eventGiftBig,
  'ui/event-gift-mid': eventGiftMid,
  'ui/event-gift-small': eventGiftSmall,
  'ui/event-phone-new': eventPhoneNew,
  'ui/event-phone-old': eventPhoneOld,
  'ui/event-phone-repair': eventPhoneRepair,

  'ui/loc-arbat': locArbat,
  'ui/loc-bathroom': locBathroom,
  'ui/loc-city': locCity,
  'ui/loc-dorm': locDorm,
  'ui/loc-embankment': locEmbankment,
  'ui/loc-university': locUniversity,

  'ui/tab-earn': tabEarn,
  'ui/tab-spend': tabSpend,
  'ui/tab-pet': tabPet,
  'ui/grade-money': gradeMoney,

  'ui/ui-birthday': uiBirthday,
  'ui/ui-clock': uiClock,
  'ui/ui-day': uiDay,
  'ui/ui-mandatory': uiMandatory,
  'ui/ui-recommend': uiRecommend,
  'ui/ui-transport': uiTransport,
  'ui/ui-warning': uiWarning,

  // Фоны локаций. Лежат в отдельной папке, но идут через тот же реестр:
  // путь в данных уже полный, значит искать надо ровно его.
  'backgrounds/loc-arbat': locArbatBg,
  'backgrounds/loc-bathroom': locBathroomBg,
  'backgrounds/loc-city': locCityBg,
  'backgrounds/loc-dorm': locDormBg,
  'backgrounds/loc-embankment': locEmbankmentBg,
  'backgrounds/loc-university': locUniversityBg,
};

/**
 * Получить URL иконки по пути.
 * Поддерживает пути вида "ui/spend-coffee", "ui/job-courier" и т.д.
 * Если иконка не найдена — возвращает null.
 */
export function iconUrl(path: string): string | null {
  return ICON_MAP[path] ?? null;
}
