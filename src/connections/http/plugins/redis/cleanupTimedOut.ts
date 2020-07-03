import { get as activeRequests, ActiveHttpRequest } from "./activeRequests";
import {
  FetchedHttpRequestHandlerResponse,
} from "../../../../types/http";
import { HttpProxyConfig } from "../../../../types";

let isCleaningUp = false;

/*
  Scavenging for timed out messages
*/
export default function cleanupTimedOut(httpConfig: HttpProxyConfig) {
  return async function cleanupTimedOutImpl() {
    if (!isCleaningUp) {
      isCleaningUp = true;
      const entries = activeRequests().entries();

      const timedOut: [string, ActiveHttpRequest][] = [];
      for (const [id, activeRequest] of entries) {
        if (Date.now() > activeRequest.timeoutAt) {
          activeRequests().delete(id);
          timedOut.push([activeRequest.id, activeRequest]);
        }
      }

      for (const [activeRequestId, activeRequest] of timedOut) {
        const fetchedResponse: FetchedHttpRequestHandlerResponse = {
          type: "redis",
          id: activeRequestId,
          time: Date.now() - activeRequest.startTime,
          service: activeRequest.service,
          path: activeRequest.request.path,
          route: activeRequest.route,
          method: activeRequest.method,
          response: {
            body: `${activeRequest.service} timed out.`,
            status: 408,
          },
          stage: activeRequest.stage,
        };

        activeRequest.onResponse({
          skip: false,
          response: fetchedResponse,
        });
      }
      isCleaningUp = false;
    }
  };
}
