import { startBackends, getResponse } from "../../../../../utils/http";
import got from "got/dist/source";
import { PerformanceTestAppInstance, PerformanceTestResult, PerformanceTestEnv } from "../../../..";
import { HttpMethods } from "../../../../../../types";

export default async function (
  name: string,
  count: number,
  app: PerformanceTestAppInstance,
  testEnv: PerformanceTestEnv
): Promise<PerformanceTestResult> {
  const numLoops = 1000 * count;

  // Start mock servers.
  const backends = startBackends([
    {
      port: 6666,
      routes: (["GET", "POST", "PUT", "DELETE", "PATCH"] as HttpMethods[]).map(
        (method) => ({
          path: "/users",
          method,
          response: { body: `Hello world.` },
        })
      ),
    },
  ]);

  app.mockHttpServers = backends;

  const startTime = Date.now();

  for (let i = 0; i < numLoops; i++) {
    const promisedResponse = got(`http://localhost:6666/users`, {
      method: "GET",
      retry: 0,
    });

    const serverResponse = await getResponse(promisedResponse);
    if (
      serverResponse.statusCode !== 200 ||
      serverResponse.body !== "Hello world."
    ) {
      throw new Error(`${name} test failed.`);
    }
  }

  const endTime = Date.now();

  return {
    numLoops,
    startTime,
    endTime,
  };
}