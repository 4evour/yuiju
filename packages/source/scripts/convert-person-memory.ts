import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getYuijuConfig } from "@yuiju/utils/config/config";

const PERSON_MEMORY_HEAT_FILENAME = "person-memory-heat.json";
const PERSON_MEMORY_SECTION_KEYS = [
  "称呼",
  "喜好",
  "雷区",
  "最近在忙什么",
  "悠酱对她的态度",
  "最近一次值得记住的互动",
  "其他补充",
] as const;
const unsafePersonMemoryFilenameChars = new Set([
  "%",
  "/",
  "\\",
  ":",
  "*",
  "?",
  '"',
  "<",
  ">",
  "|",
]);

type PersonMemorySectionKey = (typeof PERSON_MEMORY_SECTION_KEYS)[number];

interface OldPersonMemoryDocument {
  personId?: unknown;
  nickname?: unknown;
  lastUpdatedAt?: unknown;
  sections?: unknown;
}

interface NewPersonMemoryDocument {
  nickname: string;
  lastUpdatedAt: string;
  sections: Record<PersonMemorySectionKey, string>;
}

interface PersonMemoryHeatEntry {
  heat: number;
  lastInteractedAt: string;
}

interface PersonMemoryConvertPlan {
  sourceFilename: string;
  targetFilename: string;
  sourcePath: string;
  targetPath: string;
  oldPersonId: string | null;
  document: NewPersonMemoryDocument;
}

async function convertPersonMemory() {
  const peopleDir = resolve(getYuijuConfig().app.memoryDir, "people");
  const filenames = await readdir(peopleDir);
  const plans: PersonMemoryConvertPlan[] = [];
  const planByTargetFilename = new Map<string, PersonMemoryConvertPlan>();
  const nicknameByOldPersonId = new Map<string, string>();
  const nicknameSet = new Set<string>();

  for (const filename of filenames.sort()) {
    if (!filename.endsWith(".json") || filename === PERSON_MEMORY_HEAT_FILENAME) {
      continue;
    }

    const sourcePath = resolve(peopleDir, filename);
    const parsed = JSON.parse(await readFile(sourcePath, "utf8")) as OldPersonMemoryDocument;

    if (typeof parsed.nickname !== "string" || !parsed.nickname.trim()) {
      throw new Error(`人物记忆文件缺少合法 nickname：${filename}`);
    }

    if (typeof parsed.lastUpdatedAt !== "string" || !parsed.lastUpdatedAt.trim()) {
      throw new Error(`人物记忆文件缺少合法 lastUpdatedAt：${filename}`);
    }

    if (!Number.isFinite(Date.parse(parsed.lastUpdatedAt))) {
      throw new Error(`人物记忆文件 lastUpdatedAt 不是合法时间：${filename}`);
    }

    if (!parsed.sections || typeof parsed.sections !== "object" || Array.isArray(parsed.sections)) {
      throw new Error(`人物记忆文件缺少合法 sections：${filename}`);
    }

    const sections = {} as Record<PersonMemorySectionKey, string>;
    for (const section of PERSON_MEMORY_SECTION_KEYS) {
      const content = (parsed.sections as Record<string, unknown>)[section];
      if (typeof content !== "string") {
        throw new Error(`人物记忆文件缺少合法 sections.${section}：${filename}`);
      }

      sections[section] = content;
    }

    const nickname = parsed.nickname.trim();
    const targetFilename = `${encodePersonMemoryFilename(nickname)}.json`;
    const existingPlan = planByTargetFilename.get(targetFilename);
    if (existingPlan) {
      throw new Error(
        `人物记忆昵称文件名冲突：${existingPlan.sourceFilename} 和 ${filename} 都会写入 ${targetFilename}`,
      );
    }

    const plan: PersonMemoryConvertPlan = {
      sourceFilename: filename,
      targetFilename,
      sourcePath,
      targetPath: resolve(peopleDir, targetFilename),
      oldPersonId:
        typeof parsed.personId === "string" && parsed.personId.trim() ? parsed.personId : null,
      document: {
        nickname,
        lastUpdatedAt: parsed.lastUpdatedAt.trim(),
        sections,
      },
    };

    plans.push(plan);
    planByTargetFilename.set(targetFilename, plan);
    nicknameSet.add(nickname);

    if (plan.oldPersonId) {
      nicknameByOldPersonId.set(plan.oldPersonId, nickname);
    }
  }

  const heatFilePath = resolve(peopleDir, PERSON_MEMORY_HEAT_FILENAME);
  let convertedHeatDocument: Record<string, PersonMemoryHeatEntry> | null = null;

  try {
    const parsedHeat = JSON.parse(await readFile(heatFilePath, "utf8")) as Record<string, unknown>;
    convertedHeatDocument = {};

    for (const [key, value] of Object.entries(parsedHeat)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`人物记忆热度文件中 ${key} 的结构不合法。`);
      }

      const heatEntry = value as Partial<PersonMemoryHeatEntry>;
      if (
        typeof heatEntry.heat !== "number" ||
        !Number.isFinite(heatEntry.heat) ||
        heatEntry.heat < 0
      ) {
        throw new Error(`人物记忆热度文件中 ${key} 的 heat 不合法。`);
      }

      if (typeof heatEntry.lastInteractedAt !== "string" || !heatEntry.lastInteractedAt.trim()) {
        throw new Error(`人物记忆热度文件中 ${key} 的 lastInteractedAt 不合法。`);
      }

      if (!Number.isFinite(Date.parse(heatEntry.lastInteractedAt))) {
        throw new Error(`人物记忆热度文件中 ${key} 的 lastInteractedAt 不是合法时间。`);
      }

      const nickname = nicknameByOldPersonId.get(key) ?? (nicknameSet.has(key) ? key : null);
      if (!nickname) {
        throw new Error(`人物记忆热度文件中的 key 无法映射到 nickname：${key}`);
      }

      const existingEntry = convertedHeatDocument[nickname];
      convertedHeatDocument[nickname] = {
        heat: (existingEntry?.heat ?? 0) + heatEntry.heat,
        lastInteractedAt:
          !existingEntry ||
          Date.parse(heatEntry.lastInteractedAt) > Date.parse(existingEntry.lastInteractedAt)
            ? heatEntry.lastInteractedAt
            : existingEntry.lastInteractedAt,
      };
    }
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error;
    }
  }

  for (const plan of plans) {
    await writeFile(plan.targetPath, `${JSON.stringify(plan.document, null, 2)}\n`, "utf8");

    if (plan.sourcePath !== plan.targetPath) {
      await unlink(plan.sourcePath);
    }
  }

  if (convertedHeatDocument) {
    await writeFile(heatFilePath, `${JSON.stringify(convertedHeatDocument, null, 2)}\n`, "utf8");
  }

  const renamedCount = plans.filter((plan) => plan.sourceFilename !== plan.targetFilename).length;
  console.info(`人物记忆转换完成：${plans.length} 个文件，${renamedCount} 个文件重命名。`);
  if (convertedHeatDocument) {
    console.info(
      `人物记忆热度转换完成：${Object.keys(convertedHeatDocument).length} 个 nickname。`,
    );
  }
}

function encodePersonMemoryFilename(nickname: string): string {
  let filename = "";

  for (const char of nickname) {
    const codePoint = char.codePointAt(0);
    if (
      codePoint === undefined ||
      codePoint <= 31 ||
      codePoint === 127 ||
      unsafePersonMemoryFilenameChars.has(char)
    ) {
      filename += `%${(codePoint ?? 0).toString(16).toUpperCase().padStart(2, "0")}`;
      continue;
    }

    filename += char;
  }

  return filename;
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

convertPersonMemory().catch((error) => {
  console.error("人物记忆转换失败：", error);
  process.exitCode = 1;
});
