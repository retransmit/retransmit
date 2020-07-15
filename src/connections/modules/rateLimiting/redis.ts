import {
  HttpMethods,
  ClientTrackingInfo,
  AppConfig,
} from "../../../types";
import { createClient } from "redis";

const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;

import { promisify } from "util";
const redisLRange = promisify(createClient().lrange);

export async function getTrackingInfo(
  path: string,
  method: HttpMethods,
  remoteAddress: string,
  config: AppConfig
): Promise<ClientTrackingInfo[] | undefined> {
  if (config.state?.type === "redis") {
    const client = createClient(config.state?.options);
    const key = getKey(config.hostId, remoteAddress);
    const jsonEntries = await redisLRange.call(client, key, 0, -1);
    return jsonEntries.map((x) => JSON.parse(x) as ClientTrackingInfo);
  }
}

export async function setTrackingInfo(
  path: string,
  method: HttpMethods,
  remoteAddress: string,
  trackingInfo: ClientTrackingInfo,
  config: AppConfig
): Promise<void> {
  if (config.state?.type === "redis") {
    const client = createClient(config.state?.options);
    const key = getKey(config.hostId, remoteAddress);
    const jsonEntry = JSON.stringify(trackingInfo);
    const multi = client.multi();
    multi
      .lpush(key, jsonEntry)
      .ltrim(key, 0, config.state?.clientTrackingListLength || 2000)
      .pexpire(key, config.state?.clientTrackingListExpiry || TWO_MINUTES);
    multi.exec();
  }
}

function getKey(hostId: string, remoteAddress: string) {
  return `client_tracking:${hostId}_${remoteAddress}`;
}
