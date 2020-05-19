import {
  HttpMethods,
  RouteConfig,
  FetchedResponse,
  HttpRequest,
} from "../../types";

import * as activeRequests from "../redis/activeRequests";
import * as configModule from "../../config";
import got from "got";

/*
  Make Promises for Redis Services
*/
export default function invokeServices(
  requestId: string,
  request: HttpRequest
): Promise<FetchedResponse>[] {
  const timeNow = Date.now();
  const config = configModule.get();
  const path = request.path;
  const method = request.method;
  const routeConfig = config.routes[path][method] as RouteConfig;

  const promises: Promise<FetchedResponse>[] = [];
  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "http") {
      const url = serviceConfig.config.url;

      if (url) {
        const basicOptions = {
          searchParams: request.query,
          method: method,
          headers: request.headers,
          timeout: serviceConfig.timeoutMS,
        };

        const options =
          typeof request.body === "string"
            ? {
                ...basicOptions,
                body: request.body,
              }
            : typeof request.body === "object"
            ? {
                ...basicOptions,
                json: request.body,
              }
            : basicOptions;

        if (serviceConfig.awaitResponse !== false) {
          promises.push(
            new Promise<FetchedResponse>((success, failure) => {
              got(url, options)
                .then((serverResponse) => {
                  // success({
                  //   method: request.method,
                  //   path: request.path,
                  //   service,
                  //   time: Date.now() - timeNow,
                  //   serviceResult: {
                  //     id: requestId,
                  //     service,
                  //     response: serverResponse,
                  //   },
                  // });
                })
                .catch(failure);
            })
          );
        } else {
          got(url, options);
        }
      }
    }
  }

  return []; // promises;
}
