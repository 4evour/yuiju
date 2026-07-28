/**
 * 当前项目的业务配置统一来自项目根目录的 yuiju.config.ts。
 *
 * 该模块不负责加载 .env，只提供运行模式判断工具函数。
 */
export const isDev = () => process.env.NODE_ENV === "development";
export const isProd = () => process.env.NODE_ENV === "production";
