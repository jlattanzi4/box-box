import type { Metadata } from "next";

// The page itself is a client component, which can't declare metadata.
export const metadata: Metadata = { title: "Make your pick" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
