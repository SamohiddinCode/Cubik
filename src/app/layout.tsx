import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CUBIK — Life OS",
  description: "Планируйте время, цели и деньги как одну связанную систему.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
