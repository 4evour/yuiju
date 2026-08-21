import { expect, type Page, test } from "@playwright/test";

async function sendChatMessage(page: Page, text: string): Promise<void> {
  await page.getByRole("textbox", { name: "聊天消息" }).fill(text);
  await page.getByRole("button", { name: "发送消息" }).click();
}

test.describe("Web chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/nodejs/home/summary", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          code: 0,
          message: "ok",
          data: {
            status: {
              behavior: "在咖啡馆读书",
              location: "商业街",
              stamina: { current: 76, max: 100 },
              satiety: 81,
              mood: 92,
            },
            plans: { shortTerm: ["读完手边这本书"] },
          },
        }),
      });
    });
    await page.route("**/api/chat/stickers/**", async (route) => {
      await route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4B8AAAAASUVORK5CYII=",
          "base64",
        ),
      });
    });
    await page.route("**/api/chat/messages", async (route) => {
      const requestBody = route.request().postDataJSON() as { text: string };

      if (requestBody.text === "稍后回复") {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ data: { status: "NO_REPLY" } }),
        });
        return;
      }

      if (requestBody.text === "触发错误") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "CHAT_FAILED", message: "悠酱暂时无法组织回复" },
          }),
        });
        return;
      }

      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            status: "REPLIED",
            reply: {
              id: "reply-1",
              parts: [
                { type: "text", text: "你好呀" },
                { type: "sticker", key: "挥手", url: "/api/chat/stickers/wave" },
              ],
              createdAt: 1_775_856_601_000,
            },
          },
        }),
      });
    });
  });

  test("shows live status and handles reply, no-reply and failure results", async ({ page }) => {
    await page.goto("/chat");

    await expect(page.getByRole("heading", { name: "在咖啡馆读书" })).toBeVisible();
    await expect(page.getByText("商业街")).toBeVisible();
    await expect(page.getByText("读完手边这本书")).toBeVisible();

    await sendChatMessage(page, "你好");
    await expect(page.getByText("你好呀")).toBeVisible();
    await expect(page.getByRole("img", { name: "挥手" })).toBeVisible();

    await sendChatMessage(page, "稍后回复");
    await expect(page.getByText("她看到了，但此刻没有回复。")).toBeVisible();

    await sendChatMessage(page, "触发错误");
    await expect(page.getByText("悠酱暂时无法组织回复")).toBeVisible();
  });
});

test("persists interface preferences across settings reloads", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "设置", exact: true })).toBeVisible();
  const showMessageTime = page.getByRole("switch", { name: "显示聊天消息时间" });
  const reduceMotion = page.getByRole("switch", { name: "减少页面动效" });
  await expect(showMessageTime).toHaveAttribute("aria-checked", "true");
  await expect(reduceMotion).toHaveAttribute("aria-checked", "false");

  await showMessageTime.click();
  await reduceMotion.click();

  await expect(showMessageTime).toHaveAttribute("aria-checked", "false");
  await expect(reduceMotion).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveAttribute("data-show-message-time", "false");
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await expect
    .poll(() =>
      page.evaluate(() => ({
        showMessageTime: localStorage.getItem("yuiju:show-message-time"),
        reduceMotion: localStorage.getItem("yuiju:reduce-motion"),
      })),
    )
    .toEqual({ showMessageTime: "false", reduceMotion: "true" });

  await page.reload();

  await expect(page.getByRole("switch", { name: "显示聊天消息时间" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await expect(page.getByRole("switch", { name: "减少页面动效" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});
