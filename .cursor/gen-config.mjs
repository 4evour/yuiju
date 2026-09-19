import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(repoRoot, "yuiju.config.json");
const examplePath = resolve(repoRoot, "yuiju.config.json.example");
const memoryDir = resolve(repoRoot, "data/memory");

mkdirSync(memoryDir, { recursive: true });

if (existsSync(configPath)) {
  console.log(`[gen-config] ${configPath} already exists, leaving it untouched`);
  process.exit(0);
}

const config = JSON.parse(readFileSync(examplePath, "utf8"));
config.app = { ...config.app, memoryDir };
config.database = {
  ...config.database,
  mongoUri: "mongodb://127.0.0.1:27017/yuiju",
  redisUrl: "redis://127.0.0.1:6379",
};

writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`[gen-config] wrote development config to ${configPath}`);
