import type { Tool } from "ai";
import dayjs from "dayjs";
import z from "zod";
import { initCharacterStateData, initPlanStateData, initWorldStateData } from "../../redis";
import { getTimeWithWeekday } from "../../time";

export const queryStateTool: Tool = {
  description:
    "查询状态，包括当前时间、角色状态、世界天气，以及长期计划和短期计划。状态不会变化，短时间内只用调用一次。",
  inputSchema: z.object({}),
  execute: async () => {
    const characterState = await initCharacterStateData();
    const worldState = await initWorldStateData();
    const planState = await initPlanStateData();
    const now = dayjs();

    return {
      currentTime: getTimeWithWeekday(now, "MM-DD HH:mm"),
      characterState,
      worldState: {
        lastAdvancedAt: worldState.lastAdvancedAt,
        weather: worldState.weather?.type,
        temperatureLevel: worldState.weather?.temperatureLevel,
        scenes: worldState.scenes,
      },
      planState: {
        longTermPlan: planState.longTermPlan?.title ?? null,
        shortTermPlans: planState.shortTermPlans.map((plan) => plan.title),
      },
    };
  },
};
