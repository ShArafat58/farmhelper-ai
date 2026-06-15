// Shared list of security question keys (client + server safe).
export const SECURITY_QUESTION_KEYS = [
  "firstSchool",
  "mothersMaidenName",
  "firstPet",
  "bornCity",
  "favoriteFood",
] as const;

export type SecurityQuestionKey = (typeof SECURITY_QUESTION_KEYS)[number];
