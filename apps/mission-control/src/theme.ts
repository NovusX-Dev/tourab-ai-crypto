export type ThemeName = "neon-terminal" | "solar-arcade";

export interface ThemeDefinition {
  id: ThemeName;
  label: string;
}

export const THEMES: ThemeDefinition[] = [
  { id: "neon-terminal", label: "Neon Terminal" },
  { id: "solar-arcade", label: "Solar Arcade" }
];

const STORAGE_KEY = "tourab-theme";

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export function getInitialTheme(): ThemeName {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "neon-terminal" || stored === "solar-arcade") {
    return stored;
  }
  return "neon-terminal";
}
