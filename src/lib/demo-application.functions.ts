import { createServerFn } from "@tanstack/react-start";

/** Public walkthrough reset; its implementation stays server-only. */
export const resetApplicationDemo = createServerFn({ method: "POST" }).handler(async () => {
  const { resetApplicationDemo: reset } = await import("./demo-application.server");
  return reset();
});