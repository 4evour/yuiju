import { setTimeout } from "node:timers/promises";
import { SUBJECT_NAME } from "@yuiju/utils/constants/character";
import {
  getMemoryEpisodeById,
  getRecentMemoryEpisodes,
  saveMemoryEpisode,
  updateMemoryEpisodeById,
} from "@yuiju/utils/db/operations/memory-episode";
import { isDev } from "@yuiju/utils/env";
import { buildPlanUpdateEpisodes } from "@yuiju/utils/memory/plan/episode-builder";
import { planManager } from "@yuiju/utils/memory/plan/manager";
import { type ActionAgentDecision, type ActionContext, ActionId } from "@yuiju/utils/types/action";
import type { PlanChange } from "@yuiju/utils/types/plan";
import dayjs from "dayjs";
import { getActionList } from "@/action/index";
import { getActionById } from "@/action/utils";
import { chooseActionAgent } from "@/llm/agent/action";
import {
  type BehaviorEpisodePayload,
  buildCompletedBehaviorEpisodeUpdate,
  buildRunningBehaviorEpisode,
} from "@/memory/episode-builder";
import { characterState, worldState } from "@/state/index";
import { logger } from "@/utils/logger";
import { scheduleActionCompletionProactiveShare } from "./proactive-message";

async function getDurationTime(
  durationMin:
    | number
    | ((context: ActionContext, selectedAction?: ActionAgentDecision) => Promise<number>),
  context: ActionContext,
  selectedAction?: ActionAgentDecision,
) {
  if (typeof durationMin === "function") {
    return durationMin(context, selectedAction);
  } else {
    return durationMin;
  }
}

interface ActionStartTickResult {
  nextTickInMinutes: number;
  runningAction?: {
    action: ActionId;
    actionStartedAt: string;
    reason: string;
    durationMinutes: number;
    behaviorEpisodeId: string;
    executionResult?: string;
    startContext?: Record<string, any>;
    proactiveShareIntent?: ActionAgentDecision["proactiveShareIntent"];
  };
}

/**
 * 选择并开始一个 Action。
 *
 * 流程：
 * - 使用本轮 ActionContext，让 LLM 在当前可执行 Action 中选择一个；
 * - 应用本次决策携带的 planChanges；
 * - 执行 Action executor，完成“开始 Action”的即时副作用；
 * - 计算持续时间，并把进入 running 阶段所需的信息返回给后续流程。
 */
async function startAction(context: ActionContext): Promise<ActionStartTickResult> {
  const actionList = getActionList(context);
  const planState = await planManager.getState();

  if (actionList.length === 0) {
    const idleAction = getActionById(ActionId.Idle);
    logger.error("[action-lifecycle] action list is empty");

    const durationMin = await getDurationTime(idleAction.durationMin, context);
    return { nextTickInMinutes: durationMin };
  }

  logger.info(
    `[action-lifecycle] Available actions: [${actionList.map((a) => a.action).join(", ")}]`,
  );

  const recentBehaviors = await getRecentMemoryEpisodes({
    limit: 10,
    types: ["behavior"],
    subject: SUBJECT_NAME,
    isDev: isDev(),
    onlyDate: new Date(),
  });
  const history = recentBehaviors.map((behavior) => ({
    behavior: String(behavior.payload.action ?? ActionId.Idle) as ActionId,
    description: String(behavior.payload.reason ?? behavior.summaryText),
    timestamp: behavior.happenedAt.getTime(),
  }));

  const selectedAction = await chooseActionAgent(actionList, context, history, planState);
  const actionMetadata = actionList.find((item) => item.action === selectedAction?.action);

  if (actionMetadata && selectedAction) {
    // 计划变更逻辑
    let planChanges: PlanChange[] = [];
    const agentPlanChanges = selectedAction.planChanges;
    if (agentPlanChanges?.length) {
      try {
        planChanges = (await planManager.applyPlanChanges(agentPlanChanges)).changes;
      } catch (error) {
        logger.warn("[action-lifecycle] apply planChanges failed, ignore current planChanges", {
          error,
          planChanges: agentPlanChanges,
        });
      }
    }

    if (planChanges.length > 0) {
      const planEpisodes = buildPlanUpdateEpisodes({
        changes: planChanges,
        happenedAt: new Date(),
        isDev: isDev(),
      });

      for (const planEpisode of planEpisodes) {
        try {
          await saveMemoryEpisode(planEpisode);
          logger.info("[action-lifecycle] built plan_update episode", planEpisode);
        } catch (error) {
          logger.error("[action-lifecycle] write plan_update episode failed", error);
        }
      }
    }

    context.runtimeState.actionSummaryText = [
      `悠酱在「${context.characterStateData.location.major}${context.characterStateData.location.minor ? `-${context.characterStateData.location.minor}` : ""}」开始执行行为「${selectedAction.action}」`,
      `原因：${selectedAction.reason}`,
    ].join("；");

    const actionStartResult = await actionMetadata.executor(context, selectedAction);
    context.characterStateData = await characterState.getData();

    await context.worldState.updateTime();

    const durationMin = await getDurationTime(actionMetadata.durationMin, context, selectedAction);

    logger.info(
      `[action-lifecycle startAction] Duration ${durationMin} min, selectedAction: `,
      selectedAction,
    );

    const runningAction = {
      action: selectedAction.action,
      actionStartedAt: context.runtimeState.actionStartedAt.toISOString(),
      reason: selectedAction.reason,
      durationMinutes: durationMin,
      executionResult: actionStartResult?.executionResult,
      startContext: actionStartResult?.startContext,
      proactiveShareIntent: selectedAction.proactiveShareIntent,
    };
    const behaviorEpisode = buildRunningBehaviorEpisode({
      context,
      selectedAction: {
        action: runningAction.action,
        reason: runningAction.reason,
      },
      executionResult: runningAction.executionResult,
      startContext: runningAction.startContext,
      durationMinutes: runningAction.durationMinutes,
      happenedAt: new Date(runningAction.actionStartedAt),
      isDev: isDev(),
    });

    if (!behaviorEpisode) {
      return { nextTickInMinutes: durationMin };
    }

    const savedBehaviorEpisode = await saveMemoryEpisode(behaviorEpisode);

    return {
      nextTickInMinutes: durationMin,
      runningAction: {
        ...runningAction,
        behaviorEpisodeId: savedBehaviorEpisode.id,
      },
    };
  } else {
    const idleAction = getActionById(ActionId.Idle);
    logger.error("[action-lifecycle] LLM selected action is not executable.", selectedAction);
    const durationMin = await getDurationTime(idleAction.durationMin, context);
    return { nextTickInMinutes: durationMin };
  }
}

/**
 * 恢复并完成 Redis 中正在运行的 action。
 *
 * 流程：
 * - 从 Redis 读取 runningAction；
 * - 等待到 waitUntil，若进程重启后时间已过则直接进入完成流程；
 * - 等待结束后执行 completionEvent，完成状态结算并得到下一次 tick 的事件描述；
 * - 使用 behaviorEpisodeId 将同一条 behavior Episode 从 running 更新为 completed；
 * - Episode 更新成功后清理 Redis 运行态。
 */
export async function recoverRunningAction(context?: ActionContext): Promise<string | undefined> {
  const runningAction = await characterState.getRunningAction();

  if (!runningAction) {
    return undefined;
  }

  const remainingMs = Math.max(dayjs(runningAction.waitUntil).diff(dayjs()), 0);

  if (remainingMs > 0) {
    await setTimeout(remainingMs);
  }

  if (!context) {
    context = {
      characterState,
      characterStateData: await characterState.getData(),
      worldState,
      runtimeState: {
        actionStartedAt: new Date(runningAction.actionStartedAt),
      },
    };
  }

  context.runtimeState.actionEndedAt = new Date();
  context.characterStateData = await characterState.getData();

  const actionMetadata = getActionById(runningAction.action);
  const runningEpisode = await getMemoryEpisodeById(runningAction.behaviorEpisodeId);
  if (!runningEpisode) {
    throw new Error(`Running behavior episode not found: ${runningAction.behaviorEpisodeId}`);
  }

  const runningPayload = runningEpisode.payload as BehaviorEpisodePayload;
  context.runtimeState.actionSummaryText = [
    `悠酱在${context.characterStateData.location.major}-${context.characterStateData.location.minor}完成了行为「${runningAction.action}」`,
    `原因：${runningPayload.reason}`,
  ].join("；");

  const completionResult = await actionMetadata.completionEvent?.(context, runningAction);
  context.characterStateData = await characterState.getData();

  const completedEpisode = buildCompletedBehaviorEpisodeUpdate({
    context: context as ActionContext,
    runningAction,
    runningPayload,
    completionContext: completionResult?.completionContext,
    eventDescription: completionResult?.eventDescription,
  });

  const updatedEpisode = await updateMemoryEpisodeById(runningAction.behaviorEpisodeId, {
    summaryText: completedEpisode.summaryText,
    payload: completedEpisode.payload,
  });

  if (!updatedEpisode) {
    throw new Error(`Update behavior episode failed: ${runningAction.behaviorEpisodeId}`);
  }

  scheduleActionCompletionProactiveShare({
    actionMetadata,
    runningAction,
    actionSummaryText: context.runtimeState.actionSummaryText!,
    characterStateSnapshot: context.characterStateData,
    worldStateSnapshot: context.worldState.log(),
  });

  await characterState.clearRunningAction();
  return completionResult?.eventDescription;
}

/**
 * 启动下一次 Action。
 *
 * 流程：
 * - 更新时间并开始一次 Action；
 * - 如果没有需要等待的 Action，按返回的分钟数等待后结束本轮；
 * - 将 behaviorEpisodeId 和 startContext 写入 Redis runningAction；
 * - 进入恢复/完成流程，最终返回下一次 tick 的事件描述。
 */
export async function runNextAction(eventDescription?: string): Promise<string | undefined> {
  await worldState.updateTime();
  const context: ActionContext = {
    characterState,
    characterStateData: await characterState.getData(),
    worldState,
    runtimeState: {
      actionStartedAt: new Date(),
    },
    eventDescription,
  };

  const actionStartResult = await startAction(context);

  if (!actionStartResult.runningAction) {
    await setTimeout(actionStartResult.nextTickInMinutes * 60 * 1000);
    return undefined;
  }

  const waitUntil = dayjs().add(actionStartResult.nextTickInMinutes, "minute").toISOString();
  await characterState.setRunningAction({
    action: actionStartResult.runningAction.action,
    actionStartedAt: actionStartResult.runningAction.actionStartedAt,
    waitUntil,
    behaviorEpisodeId: actionStartResult.runningAction.behaviorEpisodeId,
    startContext: actionStartResult.runningAction.startContext,
    proactiveShareIntent: actionStartResult.runningAction.proactiveShareIntent,
  });

  return recoverRunningAction(context);
}
