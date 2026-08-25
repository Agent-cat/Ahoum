import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/src/auth";
import { Nav } from "@/src/components/Nav";
import { ToastProvider } from "@/src/components/toast-provider";

export const metadata: Metadata = {
  title: "Sessions Marketplace",
  description: "Browse, book, and host sessions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-zinc-50/50">
        <AuthProvider>
          <ToastProvider />
          <Nav />
          <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-zinc-200/60 bg-white/50 py-8 text-center text-sm text-zinc-400">
            Sessions Marketplace
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
