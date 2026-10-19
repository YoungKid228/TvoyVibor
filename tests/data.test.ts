import { describe, expect, it } from "vitest";
import directions from "../src/data/directions.json";
import professionsData from "../src/data/professions.json";
import programsData from "../src/data/programs.json";
import professionDetailsData from "../src/data/professionDetails.json";
import testsData from "../src/data/tests.json";
import type {
  CareerTest,
  Profession,
  Program,
  Question,
} from "../src/types/test";

const professions = professionsData as Profession[];
const programs = programsData as Program[];
const professionDetails = professionDetailsData as Record<
  string,
  { tasksAndSkills: string | null; salary: string | null; career: string | null }
>;
const { questions, tests } = testsData as unknown as {
  questions: Question[];
  tests: CareerTest[];
};

const questionById = new Map(questions.map((q) => [q.id, q]));
const professionIds = new Set(professions.map((p) => p.id));
const directionIds = new Set(directions.map((d) => d.id));
const programIds = new Set(programs.map((p) => p.id));

/** Профессии из исходной методики (до расширения до 20) */
const legacyProfessionIds = [
  "accountant",
  "tax_consultant",
  "business_analyst",
  "credit_specialist",
  "financial_analyst",
  "procurement_specialist",
  "economist",
  "economic_security",
  "insurance_agent",
  "budgeting_specialist",
];

function uniqueIds(ids: string[]): boolean {
  return new Set(ids).size === ids.length;
}

describe("data integrity", () => {
  it("publishes exactly 20 professions with unique ids", () => {
    expect(professions).toHaveLength(20);
    expect(uniqueIds(professions.map((p) => p.id))).toBe(true);
  });

  it("keeps all legacy professions", () => {
    for (const id of legacyProfessionIds) {
      expect(professionIds.has(id), id).toBe(true);
    }
  });

  it("distributes professions across the four published programs", () => {
    for (const p of professions) {
      expect(programIds.has(p.programId), `${p.id}: ${p.programId}`).toBe(true);
      expect(directionIds.has(p.directionId), p.id).toBe(true);
    }
    const byProgram = new Map<string, number>();
    for (const p of professions) {
      byProgram.set(p.programId, (byProgram.get(p.programId) ?? 0) + 1);
    }
    for (const program of programs) {
      expect(byProgram.get(program.id) ?? 0, program.id).toBeGreaterThan(0);
    }
    expect(byProgram.size).toBe(4);
  });

  it("every published test has exactly 20 existing questions", () => {
    for (const test of tests) {
      expect(test.questionIds, test.id).toHaveLength(20);
      for (const qid of test.questionIds) {
        expect(questionById.has(qid), `${test.id}: ${qid}`).toBe(true);
      }
    }
  });

  it("all ids are unique within their sets", () => {
    expect(uniqueIds(questions.map((q) => q.id))).toBe(true);
    expect(uniqueIds(tests.map((t) => t.id))).toBe(true);
    expect(uniqueIds(programs.map((p) => p.id))).toBe(true);
  });

  it("every test references an existing direction and covers both audiences", () => {
    const audiences = new Set<string>();
    for (const test of tests) {
      expect(directionIds.has(test.directionId), test.id).toBe(true);
      audiences.add(test.audience);
    }
    expect(audiences.has("school")).toBe(true);
    expect(audiences.has("college_or_bachelor")).toBe(true);
  });
});

describe("question weights", () => {
  it("each question has at least one nonzero weight referencing a known profession", () => {
    for (const q of questions) {
      const nonzero = Object.entries(q.weights).filter(([, w]) => w !== 0);
      expect(nonzero.length, q.id).toBeGreaterThanOrEqual(1);
      for (const [pid, w] of nonzero) {
        expect(professionIds.has(pid), `${q.id}: ${pid}`).toBe(true);
        expect(Number.isInteger(w), `${q.id}/${pid}`).toBe(true);
        expect(Math.abs(w as number), `${q.id}/${pid}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it("every profession is reachable through question weights", () => {
    for (const pid of professionIds) {
      const touched = questions.some((q) => (q.weights[pid] ?? 0) !== 0);
      expect(touched, pid).toBe(true);
    }
  });

  it("keeps weights within [-3; 3] and uses signed values", () => {
    const all = questions.flatMap((q) => Object.values(q.weights));
    expect(all.some((w) => w < 0)).toBe(true);
    expect(all.some((w) => w > 0)).toBe(true);
    for (const w of all) {
      expect(w).toBeGreaterThanOrEqual(-3);
      expect(w).toBeLessThanOrEqual(3);
    }
  });
});

describe("profession details (gallery)", () => {
  it("has a detail entry for every profession", () => {
    for (const p of professions) {
      expect(professionDetails[p.id], p.id).toBeDefined();
      expect(professionDetails[p.id]).toHaveProperty("tasksAndSkills");
      expect(professionDetails[p.id]).toHaveProperty("salary");
      expect(professionDetails[p.id]).toHaveProperty("career");
    }
  });

  it("keeps detail sections either null or nonempty strings", () => {
    for (const [id, detail] of Object.entries(professionDetails)) {
      for (const key of ["tasksAndSkills", "salary", "career"] as const) {
        const value = detail[key];
        if (value !== null) {
          expect(typeof value === "string" && value.length > 0, `${id}.${key}`).toBe(
            true,
          );
        }
      }
    }
  });

  it("fills all profession detail sections from the gallery source", () => {
    for (const p of professions) {
      for (const key of ["tasksAndSkills", "salary", "career"] as const) {
        expect(professionDetails[p.id][key], `${p.id}.${key}`).toBeTruthy();
      }
    }
  });
});

describe("programs", () => {
  it("lists the four published programs with correct codes", () => {
    const byId = new Map(programs.map((p) => [p.id, p]));
    expect(byId.get("banking")?.code).toBe("38.02.07");
    expect(byId.get("econ_accounting")?.code).toBe("38.02.01");
    expect(byId.get("finance_credit")?.code).toBe("38.03.01");
    expect(byId.get("masters")?.code).toBe("38.04.01");
  });

  it("declares the three master's profiles", () => {
    const masters = programs.find((p) => p.id === "masters")!;
    expect(masters.profiles).toHaveLength(3);
  });

  it("links every program to its official pgusa.ru page", () => {
    const expected = new Map([
      ["banking", "https://pgusa.ru/admission/op/Bankovskoe_delo/"],
      ["econ_accounting", "https://pgusa.ru/admission/op/380201kl11/?tabs-368=1"],
      ["finance_credit", "https://pgusa.ru/admission/op/economics/"],
      ["masters", "https://pgusa.ru/admission/op/economics-mag/"],
    ]);
    for (const program of programs) {
      expect(program.sourceUrl).toBe(expected.get(program.id));
    }
  });

  it("profileDetails names match the declared profile names", () => {
    for (const program of programs) {
      const detailNames = program.profileDetails.map((d) => d.name);
      expect(detailNames).toEqual(program.profiles);
    }
  });

  it("carries admission facts taken from the official pages", () => {
    const byId = new Map(programs.map((p) => [p.id, p]));

    expect(byId.get("banking")?.duration).toBe("1 год 10 месяцев");
    expect(byId.get("banking")?.durationByForm).toMatchObject({
      "Очная": "1 год 10 месяцев",
      "Заочная": "3 года 10 месяцев",
    });
    expect(byId.get("banking")?.qualification).toBe("специалист банковского дела");
    expect(byId.get("banking")?.activityTypes).toHaveLength(2);
    const bankingPc = (byId.get("banking")?.competencies ?? []).flatMap((g) => g.items);
    expect(bankingPc).toHaveLength(10); // ПК 1.1–1.6 и 2.1–2.4 из ООП
    expect(byId.get("banking")?.generalCompetencies).toHaveLength(9);
    expect(byId.get("banking")?.profileDetails[0]?.paidPlaces).toBe(30);

    const econAcc = byId.get("econ_accounting")!;
    expect(econAcc.baseEducation).toBe("На базе 11 классов");
    expect(econAcc.qualification).toBe("бухгалтер");
    expect(econAcc.activityTypes).toHaveLength(2);
    const pcItems = (econAcc.competencies ?? []).flatMap((g) => g.items);
    expect(pcItems).toHaveLength(11);
    expect(econAcc.generalCompetencies).toHaveLength(9);

    const bachelor = byId.get("finance_credit")!;
    expect(bachelor.duration).toBe("4 года");
    expect(bachelor.durationByForm).toMatchObject({
      "Очная": "4 года",
      "Заочная": "4 года 6 месяцев",
    });
    expect(bachelor.costPerYearByForm).toMatchObject({
      "Очная": "173 500 руб./год",
      "Заочная": "127 500 руб./год",
    });
    expect(bachelor.profileDetails[0]).toMatchObject({
      budgetPlaces: 20,
      paidPlaces: 3,
      passScore: 155,
    });
    expect(bachelor.admission).toHaveLength(2);

    const masters = byId.get("masters")!;
    expect(masters.duration).toBe("2 года");
    expect(masters.durationByForm).toMatchObject({
      "Очная": "2 года",
      "Заочная": "2 года 6 месяцев",
    });
    expect(masters.profileDetails).toHaveLength(3);
    const [security, ecommerce, analytics] = masters.profileDetails;
    // профиль «Экономическая безопасность…»: данные из ООП (PDF) —
    // описание и компетенции заполнены, места — заочная форма
    expect(security.description).not.toBeNull();
    expect(security.budgetPlaces).toBe(8);
    expect(security.paidPlaces).toBe(10);
    expect(security.forms).toEqual(["Заочная"]);
    const securityCompetencies = (security.competencies ?? []).flatMap((g) => g.items);
    expect(securityCompetencies.length).toBeGreaterThanOrEqual(13);
    expect(securityCompetencies.some((c) => c.startsWith("УК-"))).toBe(false);
    expect(securityCompetencies.some((c) => c.startsWith("ПК-"))).toBe(false);
    expect(securityCompetencies[0]).toMatch(/^Способен|^Построение/);
    expect(ecommerce.description).not.toBeNull();
    expect(ecommerce.paidPlaces).toBe(10);
    expect(analytics.description).not.toBeNull();
    expect(analytics.disciplines).toHaveLength(12);
    expect(analytics.exams).toEqual(["Экономика — 60 баллов"]);
  });

  it("declares which sections are pending for each program", () => {
    for (const program of programs) {
      for (const section of program.pending) {
        expect(
          ["Описание", "Дисциплины", "Компетенции", "Карьерные перспективы"],
          `${program.id}: ${section}`,
        ).toContain(section);
      }
    }
    const byId = new Map(programs.map((p) => [p.id, p]));
    expect(byId.get("banking")?.pending).toEqual([]);
    expect(byId.get("econ_accounting")?.pending).toEqual([]);
    expect(byId.get("finance_credit")?.pending).toEqual([]);
    expect(byId.get("masters")?.pending).toEqual([]);
  });

  it("fills banking content from the ООП and the 2026 curriculum", () => {
    const banking = programs.find((p) => p.id === "banking")!;
    expect(banking.description).not.toBeNull();
    expect(banking.disciplines).toHaveLength(3);
    expect(banking.careers).not.toBeNull();
    expect(banking.qualificationDetails).not.toBeNull();
    expect(banking.disciplines!.some((g) => g.items.some((i) => i.includes("Агент банка")))).toBe(true);
  });

  it("fills econ_accounting content from the ООП and the curriculum", () => {
    const ea = programs.find((p) => p.id === "econ_accounting")!;
    expect(ea.description).not.toBeNull();
    expect(ea.disciplines).toHaveLength(4);
    expect(ea.careers).not.toBeNull();
    expect(ea.qualificationDetails).not.toBeNull();
  });

  it("adds bachelor competencies from the ФГОС and the 2026 curriculum", () => {
    const bachelor = programs.find((p) => p.id === "finance_credit")!;
    expect(bachelor.competencies).toHaveLength(2);
    const items = bachelor.competencies!.flatMap((g) => g.items);
    expect(items.length).toBeGreaterThanOrEqual(9);
    expect(bachelor.generalCompetencies).toHaveLength(10);
    expect(bachelor.profileDetails[0]?.note).toContain("15 платных мест");
  });

  it("binds master's profiles to study forms", () => {
    const masters = programs.find((p) => p.id === "masters")!;
    const [security, ecommerce, analytics] = masters.profileDetails;
    expect(security.forms).toEqual(["Заочная"]);
    expect(ecommerce.forms).toEqual(["Очная"]);
    expect(analytics.forms).toEqual(["Очная"]);
  });

  it("shows competency texts without code prefixes", () => {
    for (const program of programs) {
      const items = [
        ...(program.competencies ?? []).flatMap((g) => g.items),
        ...(program.generalCompetencies ?? []),
        ...program.profileDetails.flatMap((d) => [
          ...(d.competencies ?? []).flatMap((g) => g.items),
          ...(d.generalCompetencies ?? []),
        ]),
      ];
      for (const item of items) {
        expect(item, `${program.id}: ${item}`).not.toMatch(
          /^(ПК\s?\d|ОК\s?\d|УК-\d|ОПК-\d|ПК-\d)/,
        );
      }
    }
  });
});
