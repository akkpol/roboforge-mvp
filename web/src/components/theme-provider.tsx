"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="lumina"
      disableTransitionOnChange
      enableSystem={false}
      themes={["lumina", "mint", "peach", "lavender", "sky", "light"]}
    >
      {children}
    </NextThemesProvider>
  );
}
