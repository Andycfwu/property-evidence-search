export type Confidence = "High" | "Medium" | "Low";

export function confidenceFor(score: number, sourceCount: number, strongMatches: number): Confidence {
  if (sourceCount >= 2 && score >= 20) return "High";
  if (strongMatches >= 1 && score >= 25) return "High";
  if (strongMatches >= 1 || sourceCount >= 2) return "Medium";
  return "Low";
}
