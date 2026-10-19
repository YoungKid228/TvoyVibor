import { useEffect, useState } from "react";
import AppShell from "./components/AppShell";
import InstallGate from "./components/InstallGate";
import PixelButton from "./components/PixelButton";
import professionsData from "./data/professions.json";
import testsData from "./data/tests.json";
import directionsData from "./data/directions.json";
import programsData from "./data/programs.json";
import professionDetailsData from "./data/professionDetails.json";
import professionTestsData from "./data/professionTests.json";
import type {
  CareerTest,
  Direction,
  Profession,
  ProfessionDetail,
  Program,
  Question,
  ProfessionTest,
} from "./types/test";
import HomePage from "./pages/HomePage";
import TestPage from "./pages/TestPage";
import ClubPage from "./pages/ClubPage";
import GalleryPage from "./pages/GalleryPage";
import ProfessionPage from "./pages/ProfessionPage";
import ProfessionTestPage from "./pages/ProfessionTestPage";
import DirectionsPage from "./pages/DirectionsPage";
import ProgramPage from "./pages/ProgramPage";
import PguGalleryPage from "./pages/PguGalleryPage";
import GamePage from "./pages/GamePage";

const professions = professionsData as Profession[];
const directions = directionsData as Direction[];
const programs = programsData as Program[];
const professionDetails = professionDetailsData as Record<string, ProfessionDetail>;
const professionTests = (professionTestsData as { tests: ProfessionTest[] }).tests
  .filter((t) => professions.some((p) => p.id === t.professionId));
const professionTestByProfession = new Map(
  professionTests.map((t) => [t.professionId, t]),
);
const { tests } = testsData as unknown as { tests: CareerTest[] };

type View =
  | { name: "home" }
  | { name: "test"; testId: string }
  | { name: "profession-test"; professionId: string }
  | { name: "club" }
  | { name: "gallery" }
  | { name: "profession"; professionId: string }
  | { name: "directions" }
  | { name: "program"; programId: string }
  | { name: "pgu-gallery" }
  | { name: "game" };

const navItems: { key: View["name"]; label: string; activeFor: string[] }[] = [
  { key: "home", label: "Тесты", activeFor: ["home", "test", "profession-test"] },
  { key: "gallery", label: "Галерея профессий", activeFor: ["gallery", "profession"] },
  { key: "directions", label: "Направления", activeFor: ["directions", "program"] },
  { key: "pgu-gallery", label: "Галерея ПГУ", activeFor: ["pgu-gallery"] },
  { key: "club", label: "Клуб", activeFor: ["club"] },
  { key: "game", label: "Игра", activeFor: ["game"] },
];

function activeSection(view: View): string {
  return navItems.find((item) => item.activeFor.includes(view.name))?.key ?? "home";
}

export default function App() {
  const [view, setView] = useState<View>({ name: "home" });

  /* При переходе на другой экран страница открывается сверху,
     а не с позиции прокрутки предыдущего */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);

  return (
    <AppShell>
      <InstallGate>
        <nav
          aria-label="Разделы"
          className="mb-6 flex flex-wrap gap-2 rounded-xl border border-stone-200 bg-white p-1"
        >
          {navItems.map((item) => {
            const active = activeSection(view) === item.key;
            return (
              <PixelButton
                key={item.key}
                type="button"
                variant={active ? "primary" : "neutral"}
                aria-current={active ? "page" : undefined}
                onClick={() => setView({ name: item.key } as View)}
                className="min-h-11 flex-1 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                {item.label}
              </PixelButton>
            );
          })}
        </nav>
      {view.name === "home" && (
        <HomePage
          tests={tests}
          directions={directions}
          professions={professions}
          professionTests={professionTests}
          onSelect={(testId) => setView({ name: "test", testId })}
          onSelectProfessionTest={(professionId) =>
            setView({ name: "profession-test", professionId })
          }
        />
      )}
      {view.name === "test" && (() => {
        const test = tests.find((t) => t.id === view.testId);
        if (!test) {
          return (
            <p className="text-stone-600">
              Тест не найден.{" "}
              <button
                type="button"
                onClick={() => setView({ name: "home" })}
                className="text-orange-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                На главную
              </button>
            </p>
          );
        }
        return (
          <TestPage
            key={test.id}
            test={test}
            questions={testsData.questions as unknown as Question[]}
            professions={professions}
            onExit={() => setView({ name: "home" })}
            onOpenProfession={(professionId) =>
              setView({ name: "profession", professionId })
            }
          />
        );
      })()}
      {view.name === "profession-test" && (() => {
        const pt = professionTestByProfession.get(view.professionId);
        if (!pt) {
          return (
            <p className="text-stone-600">
              Тест не найден.{" "}
              <button
                type="button"
                onClick={() => setView({ name: "home" })}
                className="text-orange-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                На главную
              </button>
            </p>
          );
        }
        return (
          <ProfessionTestPage
            key={pt.professionId}
            test={pt}
            profession={professions.find((p) => p.id === pt.professionId)}
            onExit={() => setView({ name: "home" })}
            onOpenProfession={(professionId) =>
              setView({ name: "profession", professionId })
            }
          />
        );
      })()}
      {view.name === "club" && <ClubPage />}
      {view.name === "pgu-gallery" && <PguGalleryPage />}
      {view.name === "game" && <GamePage />}
      {view.name === "gallery" && (
        <GalleryPage
          professions={professions}
          programs={programs}
          onOpenProfession={(professionId) =>
            setView({ name: "profession", professionId })
          }
          onOpenTest={(professionId) =>
            setView({ name: "profession-test", professionId })
          }
        />
      )}
      {view.name === "profession" && (
        <ProfessionPage
          profession={professions.find((p) => p.id === view.professionId)}
          detail={professionDetails[view.professionId]}
          program={programs.find(
            (pr) =>
              pr.id ===
              professions.find((p) => p.id === view.professionId)?.programId,
          )}
          hasTest={professionTestByProfession.has(view.professionId)}
          onBack={() => setView({ name: "gallery" })}
          onOpenProgram={(programId) => setView({ name: "program", programId })}
          onOpenTest={(professionId) =>
            setView({ name: "profession-test", professionId })
          }
        />
      )}
      {view.name === "directions" && (
        <DirectionsPage
          programs={programs}
          professions={professions}
          onOpenProgram={(programId) => setView({ name: "program", programId })}
        />
      )}
      {view.name === "program" && (
        <ProgramPage
          program={programs.find((pr) => pr.id === view.programId)}
          professions={professions}
          onBack={() => setView({ name: "directions" })}
          onOpenProfession={(professionId) =>
            setView({ name: "profession", professionId })
          }
        />
      )}
      </InstallGate>
    </AppShell>
  );
}
