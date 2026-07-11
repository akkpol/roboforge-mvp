export const SETUP_STEPS = ["prepare", "runtime", "agent", "handoff"] as const;

export type SetupStepId = (typeof SETUP_STEPS)[number];
export type StepStatus = "active" | "error" | "idle" | "success" | "unsupported";

export type SetupProgress = {
  completed: SetupStepId[];
  robotId: string;
  version: 1;
};

export type SetupState = {
  message?: string;
  progress: SetupProgress;
  status: StepStatus;
  step: SetupStepId;
};

export type SetupEvent =
  | { message: string; type: "fail" }
  | { message: string; type: "unsupported" }
  | { step: SetupStepId; type: "succeed" }
  | { type: "retry" };

function freshProgress(robotId: string): SetupProgress {
  return { completed: [], robotId, version: 1 };
}

function contiguousCompleted(value: readonly unknown[]) {
  const completed: SetupStepId[] = [];
  for (const step of SETUP_STEPS) {
    if (!value.includes(step)) break;
    completed.push(step);
  }
  return completed;
}

function nextStep(completed: readonly SetupStepId[]): SetupStepId {
  return SETUP_STEPS.find((step) => !completed.includes(step)) ?? "handoff";
}

export function parseSetupProgress(value: string | null, fallbackRobotId: string): SetupProgress {
  if (!value) return freshProgress(fallbackRobotId);

  try {
    const input = JSON.parse(value) as Record<string, unknown>;
    if (input.version !== 1 || typeof input.robotId !== "string") {
      return freshProgress(fallbackRobotId);
    }

    const storedCompleted = Array.isArray(input.completed) ? input.completed : [];
    const completed = contiguousCompleted(storedCompleted);

    return { completed, robotId: input.robotId, version: 1 };
  } catch {
    return freshProgress(fallbackRobotId);
  }
}

export function serializeSetupProgress(progress: SetupProgress) {
  return JSON.stringify({
    version: 1,
    robotId: progress.robotId,
    completed: progress.completed,
  });
}

export function createSetupState(robotId: string, progress = freshProgress(robotId)): SetupState {
  const normalizedProgress = { ...progress, completed: contiguousCompleted(progress.completed) };
  const step = nextStep(normalizedProgress.completed);
  return {
    progress: normalizedProgress,
    status: normalizedProgress.completed.length === SETUP_STEPS.length ? "success" : "active",
    step,
  };
}

export function reduceSetupState(state: SetupState, event: SetupEvent): SetupState {
  if (event.type === "fail" || event.type === "unsupported") {
    return { ...state, message: event.message, status: event.type === "fail" ? "error" : "unsupported" };
  }
  if (event.type === "retry") {
    return { ...state, message: undefined, status: "active" };
  }
  if (event.step !== state.step || state.progress.completed.includes(event.step)) {
    return state;
  }

  const completed = SETUP_STEPS.filter((step) =>
    [...state.progress.completed, event.step].includes(step),
  );
  const progress = { ...state.progress, completed };
  return createSetupState(progress.robotId, progress);
}
