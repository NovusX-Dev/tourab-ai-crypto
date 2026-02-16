import type { BotLifecycleState, ControlAction, UserRole } from "@tourab/shared";

export function canRoleExecuteAction(role: UserRole, action: ControlAction): boolean {
  if (role === "read_only") {
    return false;
  }
  if (role === "operator" || role === "admin") {
    return true;
  }
  return false;
}

export function isActionEnabled(state: BotLifecycleState, action: ControlAction): boolean {
  if (action === "start") {
    return state === "stopped";
  }
  if (action === "pause") {
    return state === "running";
  }
  if (action === "resume") {
    return state === "paused";
  }
  if (action === "stop") {
    return state !== "stopped";
  }
  if (action === "cancel_all" || action === "emergency_stop") {
    return state === "running" || state === "paused";
  }
  return false;
}

export function transitionState(state: BotLifecycleState, action: ControlAction): BotLifecycleState {
  if (action === "start" || action === "resume") {
    return "running";
  }
  if (action === "pause") {
    return "paused";
  }
  if (action === "stop" || action === "emergency_stop") {
    return "stopped";
  }
  return state;
}
