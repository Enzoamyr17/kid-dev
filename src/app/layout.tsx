import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import AuthSessionProvider from "@/components/providers/session-provider";
import SWRProvider from "@/components/providers/swr-provider";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kingland Internal Dashboard",
  description: "Kingland Internal Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>
        <AuthSessionProvider>
          <SWRProvider>
            {children}
          </SWRProvider>
        </AuthSessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
