import { defineConfig } from "vitepress";

export default defineConfig({
  title: "yuiju",
  description: "LLM 驱动的角色自主生活模拟项目",
  lang: "zh-Hans",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "项目介绍", link: "/project/introduction" },
      { text: "项目部署", link: "/deployment/" },
    ],
    sidebar: {
      "/project/": [
        {
          text: "项目",
          items: [{ text: "项目介绍", link: "/project/introduction" }],
        },
      ],
      "/deployment/": [
        {
          text: "项目部署",
          items: [
            { text: "部署概览", link: "/deployment/" },
            { text: "Docker 一键部署", link: "/deployment/docker" },
            { text: "准备运行环境", link: "/deployment/preparation" },
            { text: "项目配置", link: "/deployment/configuration" },
            { text: "使用 PM2 部署", link: "/deployment/pm2" },
            { text: "日常运维", link: "/deployment/operations" },
          ],
        },
      ],
    },
    outline: {
      level: [2, 4],
      label: "本页内容",
    },
    docFooter: {
      prev: "上一页",
      next: "下一页",
    },
    darkModeSwitchLabel: "外观模式",
    sidebarMenuLabel: "菜单",
    returnToTopLabel: "返回顶部",
    socialLinks: [{ icon: "github", link: "https://github.com/yixiaojiu/yuiju" }],
  },
});
