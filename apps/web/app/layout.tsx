import type { Metadata } from "next";
import { Manrope, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sama - Better Health",
  description: "Begin your journey to better health.",
};

import { Toaster } from "@repo/ui";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${dmSerif.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" expand={true} richColors />
      </body>
    </html>
  );
}
