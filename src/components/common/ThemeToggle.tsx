import React, { useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setTheme } from "@/store/authSlice";
import Button from "./Button";

const ThemeToggle: React.FC = () => {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector((state) => state.auth);

  // Apply theme to <html> based on state or system preference
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      if (theme === "system_default") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", prefersDark);
      } else {
        root.classList.toggle("dark", theme === "dark");
      }
    };

    applyTheme();

    // Listen for system theme changes when theme is "system_default"
    if (theme === "system_default") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const handleThemeChange = (newTheme: "light" | "dark" | "system_default") => {
    dispatch(setTheme(newTheme));
  };

  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Theme selector">
      <Button
        variant={theme === "light" ? "primary" : "outline"}
        size="sm"
        onClick={() => handleThemeChange("light")}
        className="p-2 rounded-xs"
        aria-label="Switch to light theme"
        aria-checked={theme === "light"}
        role="radio"
      >
        <Sun size={16} />
      </Button>
      <Button
        variant={theme === "dark" ? "primary" : "outline"}
        size="sm"
        onClick={() => handleThemeChange("dark")}
        className="p-2 rounded-xs"
        aria-label="Switch to dark theme"
        aria-checked={theme === "dark"}
        role="radio"
      >
        <Moon size={16} />
      </Button>
      <Button
        variant={theme === "system_default" ? "primary" : "outline"}
        size="sm"
        onClick={() => handleThemeChange("system_default")}
        className="p-2 rounded-xs"
        aria-label="Switch to system theme"
        aria-checked={theme === "system_default"}
        role="radio"
      >
        <Monitor size={16} />
      </Button>
    </div>
  );
};

export default ThemeToggle;