import { useState } from "react";
import AppShell from "./components/AppShell";
import InstallGate from "./components/InstallGate";
import professionsData from "./data/professions.json";
import testsData from "./data/tests.json";
import type { CareerTest, Profession, Question } from "./types/test";
import HomePage from "./pages/HomePage";
import TestPage from "./pages/TestPage";

const professions = professionsData as Profession[];
const { tests } = testsData as unknown as { tests: CareerTest[] };

type View = { name: "home" } | { name: "test"; testId: string };

export default function App() {
  const [view, setView] = useState<View>({ name: "home" });

  return (
    <AppShell>
      <InstallGate>
      {view.name === "home" && (
        <HomePage
          tests={tests}
          onSelect={(testId) => setView({ name: "test", testId })}
        />
      )}
      {view.name === "test" && (() => {
        const test = tests.find((t) => t.id === view.testId);
        if (!test) {
          return (
            <p className="text-slate-600">
              Тест не найден.{" "}
              <button
                type="button"
                onClick={() => setView({ name: "home" })}
                className="text-sky-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
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
          />
        );
      })()}
      </InstallGate>
    </AppShell>
  );
}
