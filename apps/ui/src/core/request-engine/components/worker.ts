import { PreRequestResult, TestResult } from "./types";
import { getPreRequestScriptMethods } from "./shared-utils";

export const executeScriptInContext = (
  preRequestScript: string,
  envs: TestResult["envs"],
): PreRequestResult => {
  try {
    const { voiden, updatedEnvs } = getPreRequestScriptMethods(envs);

    // Create a function from the pre request script using the `Function` constructor
    const executeScript = new Function("voiden", preRequestScript);

    // Execute the script
    executeScript(voiden);

    return {
      left: "",
      right: updatedEnvs,
    };
  } catch (error) {
    return {
      left: `Script execution failed: ${(error as Error).message}`,
      right: {} as TestResult["envs"],
    };
    // return TE.left(`Script execution failed: ${(error as Error).message}`);
  }
};
