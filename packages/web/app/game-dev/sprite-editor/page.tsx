import fs from "node:fs/promises";
import path from "node:path";
import { SpriteEditor } from "./sprite-editor";

export const dynamic = "force-dynamic";

export default async function GameSpriteEditorPage() {
  const sourceDirectory = path.join(process.cwd(), "public", "game-sprite-editor", "source-sheets");
  const sourceFileNames = (await fs.readdir(sourceDirectory))
    .filter((fileName) => path.extname(fileName).toLowerCase() === ".png")
    .sort((leftFileName, rightFileName) => leftFileName.localeCompare(rightFileName));
  const sourceSheets = await Promise.all(
    sourceFileNames.map(async (fileName) => {
      const imageData = await fs.readFile(path.join(sourceDirectory, fileName));
      return {
        name: fileName,
        url: `/game-sprite-editor/source-sheets/${encodeURIComponent(fileName)}`,
        width: imageData.readUInt32BE(16),
        height: imageData.readUInt32BE(20),
      };
    }),
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f2ead7_0%,#e7d9bd_100%)] px-[18px] py-[28px] text-[#493247]">
      <div className="mx-auto grid max-w-[1200px] gap-[20px]">
        <header className="font-fusion-pixel text-center">
          <p className="text-[14px] tracking-[0.22em] text-[#7b665d]">游戏开发工具</p>
          <h1 className="mt-[6px] text-[28px]">精灵动画编辑器</h1>
        </header>
        <SpriteEditor sourceSheets={sourceSheets} />
      </div>
    </main>
  );
}
