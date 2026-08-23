import { notFound } from "next/navigation";
import { isPublicDeployment } from "@/lib/public-deployment";
import { PromptEditor } from "./prompt-editor";

export const dynamic = "force-dynamic";

export default function PromptsPage() {
  if (isPublicDeployment()) {
    notFound();
  }

  return <PromptEditor />;
}
