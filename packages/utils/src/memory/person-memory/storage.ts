import { mkdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import dayjs from "dayjs";
import { z } from "zod";
import { getYuijuConfig } from "../../config/config";
import {
  assertValidSectionContent,
  normalizeSectionContent,
  PersonMemoryFormatError,
} from "./format";
import {
  PERSON_MEMORY_SECTION_KEYS,
  type PersonMemoryContentResult,
  type PersonMemoryDocument,
  type PersonMemorySectionKey,
} from "./types";

const personMemorySectionsSchema = z.strictObject({
  称呼: z.string(),
  喜好: z.string(),
  雷区: z.string(),
  最近在忙什么: z.string(),
  悠酱对她的态度: z.string(),
  最近一次值得记住的互动: z.string(),
  其他补充: z.string(),
});

const personMemoryDocumentSchema = z.strictObject({
  nickname: z.string().min(1),
  lastUpdatedAt: z.string().min(1),
  sections: personMemorySectionsSchema,
});

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

export async function getPersonMemoryDirectoryPath(): Promise<string> {
  const directoryPath = resolve(getYuijuConfig().app.memoryDir, "people");

  try {
    const stats = await stat(directoryPath);
    if (!stats.isDirectory()) {
      throw new Error(`人物记忆目录路径不是目录：${directoryPath}`);
    }
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error;
    }

    await mkdir(directoryPath, { recursive: true });
  }

  return directoryPath;
}

export async function getPersonMemoryFilePath(nickname: string): Promise<string> {
  return resolve(
    await getPersonMemoryDirectoryPath(),
    `${encodePersonMemoryFilename(nickname)}.json`,
  );
}

export function parsePersonMemoryJson(content: string): PersonMemoryDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new PersonMemoryFormatError("人物记忆文件不是合法 JSON。");
  }

  const parsedResult = personMemoryDocumentSchema.safeParse(parsed);
  if (!parsedResult.success) {
    throw new PersonMemoryFormatError("人物记忆 JSON 对象结构不合法。");
  }

  const document = parsedResult.data;

  if (!dayjs(document.lastUpdatedAt).isValid()) {
    throw new PersonMemoryFormatError("人物记忆文件中的 lastUpdatedAt 不是合法时间。");
  }

  for (const section of PERSON_MEMORY_SECTION_KEYS) {
    assertValidSectionContent(section, document.sections[section]);
  }

  return {
    nickname: document.nickname,
    lastUpdatedAt: document.lastUpdatedAt.trim(),
    sections: PERSON_MEMORY_SECTION_KEYS.reduce(
      (result, section) => {
        result[section] = normalizeSectionContent(document.sections[section]);
        return result;
      },
      {} as Record<PersonMemorySectionKey, string>,
    ),
  };
}

export async function getPersonMemory(nickname: string): Promise<PersonMemoryContentResult | null> {
  const filePath = await getPersonMemoryFilePath(nickname);
  let content: string;

  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return null;
    }

    throw error;
  }

  const memory = parsePersonMemoryJson(content);

  return {
    nickname: memory.nickname,
    sections: memory.sections,
  };
}

export function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
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
