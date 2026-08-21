import dayjs from "dayjs";
import { describe, expect, it, vi } from "vitest";
import type { ActionContext, ActionMetadata } from "@yuiju/utils/types/action";
import { ActionId } from "@yuiju/utils/types/action";
import {
  BusinessDistrictSubScene,
  HomeSubScene,
  MajorScene,
  SchoolSubScene,
} from "@yuiju/utils/types/state";
import { anywhereAction } from "./anywhere";
import { trainStationAction } from "./business-district/train-station";
import { schoolAction } from "./school/campus";

vi.mock("@/llm/agent/anywhere", () => ({ chooseFoodAgent: vi.fn() }));
vi.mock("@/llm/agent/phone", () => ({
  generatePhoneUsePlanFromReason: vi.fn(),
  runPhoneApplication: vi.fn(),
}));
vi.mock("@/llm/agent/random-event", () => ({
  buildActionRandomEventDescription: vi.fn(),
  buildMoodChangeDescription: vi.fn(),
  generateActionRandomEvent: vi.fn(),
}));
vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function getAction(actions: ActionMetadata[], actionId: ActionId): ActionMetadata {
  return actions.find((action) => action.action === actionId)!;
}

function createContext(input: {
  major: MajorScene;
  minor: BusinessDistrictSubScene | HomeSubScene | SchoolSubScene;
  money?: number;
  stamina?: number;
  time?: string;
}) {
  const setAction = vi.fn();
  const changeStamina = vi.fn();
  const recoverMood = vi.fn().mockResolvedValue(3);

  const context = {
    characterState: {
      setAction,
      changeStamina,
      recoverMood,
    },
    characterStateData: {
      location: {
        major: input.major,
        minor: input.minor,
      },
      money: input.money ?? 0,
      stamina: input.stamina ?? 0,
    },
    worldState: {
      time: dayjs(input.time ?? "2026-08-17T09:30:00+08:00"),
    },
    runtimeState: {
      actionStartedAt: new Date("2026-08-17T01:30:00.000Z"),
    },
  } as unknown as ActionContext;

  return { context, setAction, changeStamina, recoverMood };
}

describe("world action softlock invariants", () => {
  const idleAction = getAction(anywhereAction, ActionId.Idle);
  const takeTrainToCoastAction = getAction(
    trainStationAction,
    ActionId.Take_Train_To_Coast_From_Train_Station,
  );
  const studyAtSchoolAction = getAction(schoolAction, ActionId.Study_At_School);

  it("keeps Idle available at any location", async () => {
    const { context } = createContext({
      major: MajorScene.Home,
      minor: HomeSubScene.House,
    });

    expect(await idleAction.precondition(context)).toBe(true);
  });

  it.each([
    [undefined, 10],
    [1, 10],
    [10, 10],
    [11, 30],
    [31, 60],
    [61, 120],
    [121, 120],
  ])("maps Idle duration %s to the %s minute tier", async (durationMinute, expectedDuration) => {
    const { context } = createContext({
      major: MajorScene.Home,
      minor: HomeSubScene.House,
    });
    const resolveDuration = idleAction.durationMin as Exclude<
      ActionMetadata["durationMin"],
      number
    >;

    await expect(
      resolveDuration(context, {
        action: ActionId.Idle,
        reason: "恢复体力",
        durationMinute,
      }),
    ).resolves.toBe(expectedDuration);
  });

  it("settles the selected Idle tier into character state and the action summary", async () => {
    const { context, setAction, changeStamina, recoverMood } = createContext({
      major: MajorScene.Home,
      minor: HomeSubScene.House,
    });

    const startResult = await idleAction.executor(context, {
      action: ActionId.Idle,
      reason: "恢复体力",
      durationMinute: 31,
    });
    const completionResult = await idleAction.completionEvent!(context, {
      startContext: startResult?.startContext,
    } as never);

    expect(setAction).toHaveBeenCalledWith(ActionId.Idle);
    expect(changeStamina).toHaveBeenCalledWith(8);
    expect(recoverMood).toHaveBeenCalledWith(3);
    expect(context.runtimeState.actionSummaryText).toBe(
      "悠酱在「家-屋内」休息了60分钟，体力恢复了8点，心情提升了3点",
    );
    expect(completionResult).toEqual({
      completionContext: {
        durationMin: 60,
        staminaGain: 8,
        moodGain: 3,
        actualMoodGain: 3,
      },
    });
  });

  it("requires enough money for both train trips before entering the coast", async () => {
    const insufficient = createContext({
      major: MajorScene.BusinessDistrict,
      minor: BusinessDistrictSubScene.TrainStation,
      money: 5,
    });
    const sufficient = createContext({
      major: MajorScene.BusinessDistrict,
      minor: BusinessDistrictSubScene.TrainStation,
      money: 6,
    });

    expect(await takeTrainToCoastAction.precondition(insufficient.context)).toBe(false);
    expect(await takeTrainToCoastAction.precondition(sufficient.context)).toBe(true);
  });

  it("requires the school location, class time, weekday and return-trip stamina", async () => {
    const insufficientStamina = createContext({
      major: MajorScene.School,
      minor: SchoolSubScene.Campus,
      stamina: 21,
    });
    const sufficientStamina = createContext({
      major: MajorScene.School,
      minor: SchoolSubScene.Campus,
      stamina: 22,
    });
    const weekend = createContext({
      major: MajorScene.School,
      minor: SchoolSubScene.Campus,
      stamina: 22,
      time: "2026-08-22T09:30:00+08:00",
    });
    const outsideClassTime = createContext({
      major: MajorScene.School,
      minor: SchoolSubScene.Campus,
      stamina: 22,
      time: "2026-08-17T13:00:00+08:00",
    });

    expect(await studyAtSchoolAction.precondition(insufficientStamina.context)).toBe(false);
    expect(await studyAtSchoolAction.precondition(sufficientStamina.context)).toBe(true);
    expect(await studyAtSchoolAction.precondition(weekend.context)).toBe(false);
    expect(await studyAtSchoolAction.precondition(outsideClassTime.context)).toBe(false);
  });
});
