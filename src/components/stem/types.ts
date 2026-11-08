export const STAGES = [
  { subject: "Engineering", club: "Engineering Club" },
  { subject: "Chemistry", club: "Chemistry Club" },
  { subject: "Physics", club: "Physics Club" },
  { subject: "Biology", club: "Biology Club" },
  { subject: "Computer science", club: "Applied Programming Club" },
] as const;

export interface StemSceneProps {
  active: boolean;
  still: boolean;
  onStage: (index: number) => void;
}
