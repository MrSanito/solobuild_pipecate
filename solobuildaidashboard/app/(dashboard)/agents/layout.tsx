import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Agents",
  description: "Configure and manage your AI voice agents.",
};

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
