import { availableTargets } from "httpsnippet-lite";

export const targets = availableTargets().filter(
  (target) => target.key !== "http",
);
