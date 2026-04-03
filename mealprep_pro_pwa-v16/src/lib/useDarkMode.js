import { useState, useEffect } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(function () {
    var saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(function () {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return [isDark, function () { setIsDark(function (d) { return !d; }); }];
}
