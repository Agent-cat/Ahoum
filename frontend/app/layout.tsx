import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AuthProvider } from "@/src/auth";
import { Nav } from "@/src/components/Nav";

export const metadata: Metadata = {
  title: "Sessions Marketplace",
  description: "Browse, book, and host sessions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Nav />
          <main className="container">{children}</main>
          <footer className="footer">
            <Link href="/">Sessions Marketplace</Link>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
