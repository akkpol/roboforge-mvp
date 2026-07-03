import type { Metadata } from "next";
import "@fontsource/rajdhani/400.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/600.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LyraChat } from "@/components/lumina/lyra-chat";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoboForge Lumina",
  description:
    "A soft anime RoboForge home screen for setting up Rover-01 with Lyra.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <LyraChat />
      </body>
    </html>
  );
}
