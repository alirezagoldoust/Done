import type { TaskColor } from "@/types";

/**
 * Task colour palette. Three hues are lifted from the "Done" app logo /
 * board-block artwork (purple / blue / teal), plus the neutral default and a
 * red accent. Coloured tasks render as a full, glossy background fill — like
 * the solid blocks in the logo — with white text.
 *
 * - `swatch` is the solid dot shown in the picker.
 * - `fill` is the card background (a top-lit gradient); `null` keeps the
 *   default translucent surface.
 * - `border` tunes the card outline so the fill reads as a raised block.
 */
export interface TaskColorDef {
  value: TaskColor;
  label: string;
  swatch: string;
  fill: string | null;
  border: string | null;
}

export const TASK_COLORS: TaskColorDef[] = [
  {
    value: "default",
    label: "Default",
    swatch: "#565c76",
    fill: null,
    border: null,
  },
  {
    value: "purple",
    label: "Purple",
    swatch: "#5D2EED",
    fill: "linear-gradient(160deg, #7b52ff 0%, #4a1fd0 100%)",
    border: "rgba(255, 255, 255, 0.16)",
  },
  {
    value: "blue",
    label: "Blue",
    swatch: "#2778F4",
    fill: "linear-gradient(160deg, #3a8bff 0%, #1f66e0 100%)",
    border: "rgba(255, 255, 255, 0.16)",
  },
  {
    value: "teal",
    label: "Teal",
    swatch: "#03A4A9",
    fill: "linear-gradient(160deg, #12b7bd 0%, #018f94 100%)",
    border: "rgba(255, 255, 255, 0.16)",
  },
  {
    value: "red",
    label: "Red",
    swatch: "#E5484D",
    fill: "linear-gradient(160deg, #f2686c 0%, #d83a40 100%)",
    border: "rgba(255, 255, 255, 0.16)",
  },
];

const BY_VALUE: Record<TaskColor, TaskColorDef> = Object.fromEntries(
  TASK_COLORS.map((c) => [c.value, c]),
) as Record<TaskColor, TaskColorDef>;

export function taskColor(value: TaskColor | null | undefined): TaskColorDef {
  return (value && BY_VALUE[value]) || BY_VALUE.default;
}
