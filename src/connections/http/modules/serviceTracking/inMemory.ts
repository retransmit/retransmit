import * as applicationState from "../../../../state";

import { AppConfig } from "../../../../types/config";
import { HttpMethods } from "../../../../types/http";
import { HttpServiceTrackingInfo } from ".";

export async function getTrackingInfo(
  route: string,
  method: HttpMethods,
  config: AppConfig
): Promise<HttpServiceTrackingInfo[] | undefined> {
  const key = getKey(config.hostId, route, method);
  const state = applicationState.get();
  return state.httpServiceErrorTracking.get(key);
}

export async function setTrackingInfo(
  route: string,
  method: HttpMethods,
  trackingInfo: HttpServiceTrackingInfo,
  config: AppConfig
): Promise<void> {
  const key = getKey(config.hostId, route, method);
  const state = applicationState.get();
  const trackingList = state.httpServiceErrorTracking.get(key);

  if (trackingList) {
    trackingList.push(trackingInfo);
  } else {
    const newTrackingList = [trackingInfo];
    state.httpServiceErrorTracking.set(key, newTrackingList);
  }
}

function getKey(hostId: string, route: string, method: HttpMethods) {
  return `${hostId}:${route}:${method}`;
}
