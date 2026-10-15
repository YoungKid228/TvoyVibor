export type Audience = "school" | "college_or_bachelor";

export type AnswerOption = {
  id: string;
  label: string;
  scores: Record<string, number>;
};

export type Question = {
  id: string;
  text: string;
  professionGroupId: string;
  options: AnswerOption[];
};

export type CareerTest = {
  id: string;
  directionId: string;
  audience: Audience;
  title: string;
  questionIds: string[];
};

export type Profession = {
  id: string;
  directionId: string;
  title: string;
  description: string;
};

export type Direction = {
  id: string;
  title: string;
  programs: string[];
};
