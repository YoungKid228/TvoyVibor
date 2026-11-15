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
import jobDishes from './job-dishes.png';
import jobDorm from './job-dorm.png';
import jobFreelance from './job-freelance.png';
import jobHegan from './job-hegan.png';
import jobKafe from './job-kafe.png';
import jobMarket from './job-market.png';
import jobTutor from './job-tutor.png';

// Иконки трат (spend-*)
import spendAmulet from './spend-amulet.png';
import spendBowling from './spend-bowling.png';
import spendBreakfast from './spend-breakfast.png';
import spendCafe from './spend-cafe.png';
import spendClothes from './spend-clothes.png';
import spendCoffee from './spend-coffee.png';
import spendDreidel from './spend-dreidel.png';
import spendFestival from './spend-festival.png';
import spendKino from './spend-kino.png';
import spendMatza from './spend-matza.png';
import spendPark from './spend-park.png';
import spendPet from './spend-pet.png';
import spendProducts from './spend-products.png';
import spendSchnitzel from './spend-schnitzel.png';
import spendShower from './spend-shower.png';
import spendToyshop from './spend-toyshop.png';
import spendZoo from './spend-zoo.png';

// Иконки профессий (prof-*)
import profCourier from './prof-courier.png';
import profCreative from './prof-creative.png';
import profEngineer from './prof-engineer.png';
import profNone from './prof-none.png';
import profStudent from './prof-student.png';

// Иконки крупных покупок (item-*)
import itemGym from './item-gym.png';
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
import tabRest from './tab-rest.png';
import tabPet from './tab-pet.png';

// Иконки вердиктов (grade-*)
import gradeDebt from './grade-debt.png';
import gradeMoney from './grade-money.png';
import gradeMood from './grade-mood.png';
import gradeOptional from './grade-optional.png';
import gradeRequired from './grade-required.png';
import gradeSolomon from './grade-solomon.png';
import gradeVerdict from './grade-verdict.png';

// Системные иконки (ui-*)
import uiBirthday from './ui-birthday.png';
import uiBlizzard from './ui-blizzard.png';
import uiBorrow from './ui-borrow.png';
import uiBurnout from './ui-burnout.png';
import uiClock from './ui-clock.png';
import uiCredit from './ui-credit.png';
import uiDay from './ui-day.png';
import uiExpensesSplit from './ui-expenses-split.png';
import uiFreeze from './ui-freeze.png';
import uiKey from './ui-key.png';
import uiMandatory from './ui-mandatory.png';
import uiMap from './ui-map.png';
import uiMoodGraph from './ui-mood-graph.png';
import uiNote from './ui-note.png';
import uiReceipt from './ui-receipt.png';
import uiRecommend from './ui-recommend.png';
import uiRep from './ui-rep.png';
import uiSalary from './ui-salary.png';
import uiSavings from './ui-savings.png';
import uiSavingsGoal from './ui-savings-goal.png';
import uiScholarship from './ui-scholarship.png';
import uiTarget from './ui-target.png';
import uiTransport from './ui-transport.png';
import uiWallet from './ui-wallet.png';
import uiWarning from './ui-warning.png';
import uiWeek from './ui-week.png';


// Кнопки меню (btn-*)
import btnBack from './btn-back.png';
import btnPlay from './btn-play.png';
import btnReset from './btn-reset.png';
import btnResume from './btn-resume.png';
import btnRules from './btn-rules.png';
import btnSound from './btn-sound.png';

// События культурной ценности ЕАО (eao-*)
import eaoArbat from './eao-arbat.png';
import eaoFerry from './eao-ferry.png';
import eaoFiddler from './eao-fiddler.png';
import eaoFriendship from './eao-friendship.png';
import eaoHanukkiah from './eao-hanukkiah.png';
import eaoHebrewSign from './eao-hebrew-sign.png';
import eaoLanterns from './eao-lanterns.png';
import eaoMenorah from './eao-menorah.png';
import eaoMonument from './eao-monument.png';
import eaoSettlers from './eao-settlers.png';
import eaoStar from './eao-star.png';
import eaoStation from './eao-station.png';
import eaoStreetSign from './eao-street-sign.png';
import eaoTower from './eao-tower.png';

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
  'ui/job-dishes': jobDishes,
  'ui/job-dorm': jobDorm,
  'ui/job-freelance': jobFreelance,
  'ui/job-hegan': jobHegan,
  'ui/job-kafe': jobKafe,
  'ui/job-market': jobMarket,
  'ui/job-tutor': jobTutor,

  'ui/spend-amulet': spendAmulet,
  'ui/spend-bowling': spendBowling,
  'ui/spend-breakfast': spendBreakfast,
  'ui/spend-cafe': spendCafe,
  'ui/spend-clothes': spendClothes,
  'ui/spend-coffee': spendCoffee,
  'ui/spend-dreidel': spendDreidel,
  'ui/spend-festival': spendFestival,
  'ui/spend-kino': spendKino,
  'ui/spend-matza': spendMatza,
  'ui/spend-park': spendPark,
  'ui/spend-pet': spendPet,
  'ui/spend-products': spendProducts,
  'ui/spend-schnitzel': spendSchnitzel,
  'ui/spend-shower': spendShower,
  'ui/spend-toyshop': spendToyshop,
  'ui/spend-zoo': spendZoo,

  'ui/prof-courier': profCourier,
  'ui/prof-creative': profCreative,
  'ui/prof-engineer': profEngineer,
  'ui/prof-none': profNone,
  'ui/prof-student': profStudent,

  'ui/item-gym': itemGym,
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
  'ui/tab-rest': tabRest,
  'ui/tab-pet': tabPet,

  'ui/grade-debt': gradeDebt,
  'ui/grade-money': gradeMoney,
  'ui/grade-mood': gradeMood,
  'ui/grade-optional': gradeOptional,
  'ui/grade-required': gradeRequired,
  'ui/grade-solomon': gradeSolomon,
  'ui/grade-verdict': gradeVerdict,

  'ui/ui-birthday': uiBirthday,
  'ui/ui-blizzard': uiBlizzard,
  'ui/ui-borrow': uiBorrow,
  'ui/ui-burnout': uiBurnout,
  'ui/ui-clock': uiClock,
  'ui/ui-credit': uiCredit,
  'ui/ui-day': uiDay,
  'ui/ui-expenses-split': uiExpensesSplit,
  'ui/ui-freeze': uiFreeze,
  'ui/ui-key': uiKey,
  'ui/ui-mandatory': uiMandatory,
  'ui/ui-map': uiMap,
  'ui/ui-mood-graph': uiMoodGraph,
  'ui/ui-note': uiNote,
  'ui/ui-receipt': uiReceipt,
  'ui/ui-recommend': uiRecommend,
  'ui/ui-rep': uiRep,
  'ui/ui-salary': uiSalary,
  'ui/ui-savings': uiSavings,
  'ui/ui-savings-goal': uiSavingsGoal,
  'ui/ui-scholarship': uiScholarship,
  'ui/ui-target': uiTarget,
  'ui/ui-transport': uiTransport,
  'ui/ui-wallet': uiWallet,
  'ui/ui-warning': uiWarning,
  'ui/ui-week': uiWeek,


  'ui/btn-back': btnBack,
  'ui/btn-play': btnPlay,
  'ui/btn-reset': btnReset,
  'ui/btn-resume': btnResume,
  'ui/btn-rules': btnRules,
  'ui/btn-sound': btnSound,

  'ui/eao-arbat': eaoArbat,
  'ui/eao-ferry': eaoFerry,
  'ui/eao-fiddler': eaoFiddler,
  'ui/eao-friendship': eaoFriendship,
  'ui/eao-hanukkiah': eaoHanukkiah,
  'ui/eao-hebrew-sign': eaoHebrewSign,
  'ui/eao-lanterns': eaoLanterns,
  'ui/eao-menorah': eaoMenorah,
  'ui/eao-monument': eaoMonument,
  'ui/eao-settlers': eaoSettlers,
  'ui/eao-star': eaoStar,
  'ui/eao-station': eaoStation,
  'ui/eao-street-sign': eaoStreetSign,
  'ui/eao-tower': eaoTower,

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
