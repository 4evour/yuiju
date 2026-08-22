import { notFound } from "next/navigation";
import { isPublicDeployment } from "@/lib/public-deployment";
import { SettingsClient } from "./settings-client";
import { getSettingsSnapshot } from "./settings-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (isPublicDeployment()) {
    notFound();
  }

  return <SettingsClient snapshot={await getSettingsSnapshot()} />;
}
