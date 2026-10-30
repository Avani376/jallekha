import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { WorkspaceProvider } from "@/data/store";
import { MotionPreference } from "@/components/motion-preference";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "JalLekha — Water delivery & consumption reconciliation",
  description:
    "JalLekha helps campus facilities and housing-society teams reconcile tanker delivery receipts, tank readings and metered usage — with uncertainty bounds, verification tasks and a documented audit trail. Prototype using synthetic demonstration data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-offwhite text-ink">
        <a
          href="#main"
          className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-ink focus:shadow-lg"
        >
          Skip to main content
        </a>
        <WorkspaceProvider>
          <MotionPreference />
          {children}
        </WorkspaceProvider>
      </body>
    </html>
  );
}
