import { THEMES, type ThemeName } from "../theme";

interface ThemeSwitcherProps {
  value: ThemeName;
  onChange: (next: ThemeName) => void;
}

export function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
  return (
    <label className="theme-switcher">
      <span>Theme</span>
      <select value={value} onChange={(event) => onChange(event.target.value as ThemeName)}>
        {THEMES.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.label}
          </option>
        ))}
      </select>
    </label>
  );
}
