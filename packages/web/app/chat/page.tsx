import { getYuijuConfig } from "@yuiju/utils/config/config";
import { notFound } from "next/navigation";
import { isPublicDeployment } from "@/lib/public-deployment";
import { ChatClient } from "./chat-client";

export default function ChatPage() {
  if (isPublicDeployment() || !getYuijuConfig().message.web.enabled) {
    notFound();
  }

  return <ChatClient />;
}
