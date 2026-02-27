import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life Design Coach",
  description: "Your weekly reflection and goal tracking dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
