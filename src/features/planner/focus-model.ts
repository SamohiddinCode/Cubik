export type FocusMode = "focus" | "shortBreak" | "longBreak";

export type FocusSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartBreak: boolean;
  autoStartFocus: boolean;
};

export type FocusSession = {
  id: string;
  taskId: string | null;
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
};

export type FocusTimerState = {
  version: 1;
  mode: FocusMode;
  remainingSeconds: number;
  isRunning: boolean;
  endsAt: number | null;
  startedAt: string | null;
  selectedTaskId: string | null;
  completedFocuses: number;
  settings: FocusSettings;
  sessions: FocusSession[];
};

export const FOCUS_STORAGE_KEY = "cubik.planner.focus.v1";

export const defaultFocusSettings: FocusSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreak: false,
  autoStartFocus: false,
};

export function durationForMode(mode: FocusMode, settings: FocusSettings) {
  if (mode === "shortBreak") return settings.shortBreakMinutes * 60;
  if (mode === "longBreak") return settings.longBreakMinutes * 60;
  return settings.focusMinutes * 60;
}

export function nextFocusMode(mode: FocusMode, completedFocuses: number, settings: FocusSettings): FocusMode {
  if (mode !== "focus") return "focus";
  return completedFocuses > 0 && completedFocuses % settings.sessionsBeforeLongBreak === 0 ? "longBreak" : "shortBreak";
}

export function createFocusTimerState(): FocusTimerState {
  return {
    version: 1,
    mode: "focus",
    remainingSeconds: durationForMode("focus", defaultFocusSettings),
    isRunning: false,
    endsAt: null,
    startedAt: null,
    selectedTaskId: null,
    completedFocuses: 0,
    settings: { ...defaultFocusSettings },
    sessions: [],
  };
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

export function normalizeFocusTimerState(value: unknown): FocusTimerState {
  const fallback = createFocusTimerState();
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Record<string, unknown>;
  const rawSettings = candidate.settings && typeof candidate.settings === "object" ? candidate.settings as Record<string, unknown> : {};
  const settings: FocusSettings = {
    focusMinutes: boundedInteger(rawSettings.focusMinutes, fallback.settings.focusMinutes, 1, 180),
    shortBreakMinutes: boundedInteger(rawSettings.shortBreakMinutes, fallback.settings.shortBreakMinutes, 1, 60),
    longBreakMinutes: boundedInteger(rawSettings.longBreakMinutes, fallback.settings.longBreakMinutes, 1, 120),
    sessionsBeforeLongBreak: boundedInteger(rawSettings.sessionsBeforeLongBreak, fallback.settings.sessionsBeforeLongBreak, 2, 12),
    autoStartBreak: typeof rawSettings.autoStartBreak === "boolean" ? rawSettings.autoStartBreak : false,
    autoStartFocus: typeof rawSettings.autoStartFocus === "boolean" ? rawSettings.autoStartFocus : false,
  };
  const mode: FocusMode = candidate.mode === "shortBreak" || candidate.mode === "longBreak" ? candidate.mode : "focus";
  const sessions = Array.isArray(candidate.sessions) ? candidate.sessions.filter((item): item is FocusSession => {
    if (!item || typeof item !== "object") return false;
    const session = item as Record<string, unknown>;
    return typeof session.id === "string"
      && (session.taskId === null || typeof session.taskId === "string")
      && typeof session.startedAt === "string"
      && typeof session.completedAt === "string"
      && typeof session.durationMinutes === "number"
      && session.durationMinutes > 0;
  }).slice(-200) : [];
  const defaultDuration = durationForMode(mode, settings);

  return {
    version: 1,
    mode,
    remainingSeconds: boundedInteger(candidate.remainingSeconds, defaultDuration, 0, 180 * 60),
    isRunning: candidate.isRunning === true && typeof candidate.endsAt === "number",
    endsAt: typeof candidate.endsAt === "number" ? candidate.endsAt : null,
    startedAt: typeof candidate.startedAt === "string" ? candidate.startedAt : null,
    selectedTaskId: typeof candidate.selectedTaskId === "string" ? candidate.selectedTaskId : null,
    completedFocuses: boundedInteger(candidate.completedFocuses, 0, 0, 100_000),
    settings,
    sessions,
  };
}

export function tickFocusTimer(state: FocusTimerState, now: number): FocusTimerState {
  if (!state.isRunning || state.endsAt === null) return state;
  const remainingSeconds = Math.max(0, Math.ceil((state.endsAt - now) / 1000));
  if (remainingSeconds > 0) return remainingSeconds === state.remainingSeconds ? state : { ...state, remainingSeconds };

  const completedFocuses = state.mode === "focus" ? state.completedFocuses + 1 : state.completedFocuses;
  const sessions = state.mode === "focus" ? [...state.sessions.slice(-199), {
    id: `focus-${state.endsAt}`,
    taskId: state.selectedTaskId,
    startedAt: state.startedAt ?? new Date(state.endsAt - state.settings.focusMinutes * 60_000).toISOString(),
    completedAt: new Date(state.endsAt).toISOString(),
    durationMinutes: state.settings.focusMinutes,
  }] : state.sessions;
  const mode = nextFocusMode(state.mode, completedFocuses, state.settings);
  const duration = durationForMode(mode, state.settings);
  const shouldAutoStart = state.mode === "focus" ? state.settings.autoStartBreak : state.settings.autoStartFocus;

  return {
    ...state,
    mode,
    remainingSeconds: duration,
    isRunning: shouldAutoStart,
    endsAt: shouldAutoStart ? now + duration * 1000 : null,
    startedAt: mode === "focus" && shouldAutoStart ? new Date(now).toISOString() : null,
    completedFocuses,
    sessions,
  };
}

export function startFocusTimer(state: FocusTimerState, now: number): FocusTimerState {
  if (state.isRunning || state.remainingSeconds <= 0) return state;
  return {
    ...state,
    isRunning: true,
    endsAt: now + state.remainingSeconds * 1000,
    startedAt: state.mode === "focus" ? state.startedAt ?? new Date(now).toISOString() : null,
  };
}

export function pauseFocusTimer(state: FocusTimerState, now: number): FocusTimerState {
  if (!state.isRunning) return state;
  const remainingSeconds = state.endsAt === null ? state.remainingSeconds : Math.max(0, Math.ceil((state.endsAt - now) / 1000));
  return { ...state, remainingSeconds, isRunning: false, endsAt: null };
}

export function resetFocusTimer(state: FocusTimerState): FocusTimerState {
  return { ...state, remainingSeconds: durationForMode(state.mode, state.settings), isRunning: false, endsAt: null, startedAt: null };
}

export function changeFocusMode(state: FocusTimerState, mode: FocusMode): FocusTimerState {
  return { ...state, mode, remainingSeconds: durationForMode(mode, state.settings), isRunning: false, endsAt: null, startedAt: null };
}
