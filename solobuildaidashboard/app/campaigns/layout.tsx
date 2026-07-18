import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Campaigns",
  description: "Monitor and configure your active voice calling campaigns.",
};

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
