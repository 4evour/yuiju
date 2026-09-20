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

// 当提供 DEEPSEEK_API_KEY（建议放在 Cloud Agent Secrets）时，把所有 LLM 档位指向 DeepSeek。
// 不把密钥写进仓库：这里只从环境变量读取，缺失时保留示例占位符。
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
if (deepseekApiKey) {
  const deepseekSource = {
    baseUrl: "https://api.deepseek.com",
    apiKey: deepseekApiKey,
    model: "deepseek-flash",
  };
  config.llm = {
    models: {
      chat: [deepseekSource],
      strong: [deepseekSource],
      flash: [deepseekSource],
      vision: [deepseekSource],
    },
  };
  console.log("[gen-config] DEEPSEEK_API_KEY detected, configured all LLM tiers to deepseek-flash");
}

writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`[gen-config] wrote development config to ${configPath}`);
