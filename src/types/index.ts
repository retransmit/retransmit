import { ClientOpts } from "redis";
import { IncomingHttpHeaders } from "http2";
import { FetchedHttpResponse, HttpRouteConfig } from "./http";
import {
  WebSocketRouteConfig,
  WebSocketResponse,
  WebSocketMessageRequest,
} from "./webSocket";
import * as httpModule from "http";
import * as httpsModule from "https";

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";

export type AppControl = {
  instanceId: string;
  port: number;
  closeServers: () => Promise<void>;
};

// Application Config
export type UserAppConfig = {
  hostNames?: [];
  silent?: boolean;
  instanceId?: string;
  workers?: number;
  http?: HttpProxyConfig;
  webSocket?: WebSocketProxyConfig;
  webJobs?: {
    [name: string]: WebJob;
  };
  redis?: {
    options?: ClientOpts;
  };
  useHttps?: {
    key: string;
    cert: string;
    ca?: string[];
  };
  cors?: {
    origin?: string;
    allowMethods?: string;
    maxAge?: number;
    allowHeaders?: string | string[];
    credentials?: boolean;
  };
  state?: InMemoryStateConfig | RedisStateConfig;
  createHttpsServer?: (
    options: httpsModule.ServerOptions,
    listener: httpModule.RequestListener
  ) => httpsModule.Server;
  createHttpServer?: (
    listener: httpModule.RequestListener
  ) => httpModule.Server;
};

export type WhitelistConfig = {
  allowed?: string[];
  disallowed?: string[];
};

export type AppConfig = UserAppConfig & {
  instanceId: string;
  workers: number;
  silent: boolean;
  hostId: string;
};

export type HttpProxyAppConfig = AppConfig & { http: HttpProxyConfig };
export type WebSocketProxyAppConfig = AppConfig & {
  webSocket: WebSocketProxyConfig;
};

export type InMemoryStateConfig = {
  type: "memory";
  clientTrackingEntryExpiry?: number;
  httpServiceErrorTrackingListExpiry?: number;
};

export type RedisStateConfig = {
  type: "redis";
  options?: ClientOpts;
  clientTrackingListLength?: number;
  clientTrackingListExpiry?: number;
  httpServiceErrorTrackingListLength?: number;
  httpServiceErrorTrackingListExpiry?: number;
};

export type RateLimitingConfig = {
  type: "ip";
  maxRequests: number;
  duration: number;
  errorStatus?: number;
  errorBody?: any;
};

export type HttpServiceCircuitBreakerConfig = {
  maxErrors: number;
  duration: number;
  errorStatus?: number;
  errorBody?: any;
};

export type HttpProxyConfig = {
  routes: {
    [key: string]: {
      [key in HttpMethods | "ALL"]?: HttpRouteConfig;
    };
  };
  redis?: {
    responseChannel: string;
    cleanupInterval?: number;
  };
  whitelist?: WhitelistConfig;
  onRequest?: (
    request: HttpRequest
  ) => Promise<
    | { handled: true; response: HttpResponse }
    | { handled: false; request: HttpRequest }
    | void
  >;
  onResponse?: (
    response: HttpResponse,
    request: HttpRequest
  ) => Promise<HttpResponse>;
  genericErrors?: boolean;
  onError?: (responses: FetchedHttpResponse[], request: HttpRequest) => any;
  plugins?: {
    [pluginName: string]: {
      path: string;
    };
  };
  rateLimiting?: RateLimitingConfig;
  circuitBreaker?: HttpServiceCircuitBreakerConfig;
  caching?: HttpServiceCacheConfig;
  authentication?: HttpServiceAuthentication;
};

export type WebSocketProxyConfig = {
  routes: {
    [key: string]: WebSocketRouteConfig;
  };
  redis?: {
    responseChannel: string;
    cleanupInterval?: number;
  };
  whitelist?: WhitelistConfig;
  onConnect?: (
    requestId: string,
    message: string
  ) => Promise<{ drop: true; message?: string } | { drop: false }>;
  onDisconnect?: (requestId: string) => any;
  onRequest?: (
    requestId: string,
    request: string
  ) => Promise<
    | { handled: true; response?: WebSocketResponse }
    | { handled: false; request: WebSocketMessageRequest }
    | void
  >;
  onResponse?: (
    requestId: string,
    response: WebSocketResponse
  ) => Promise<WebSocketResponse>;
  plugins?: {
    [pluginName: string]: {
      path: string;
    };
  };
  rateLimiting?: RateLimitingConfig;
};

// Web Jobs
export type WebJobBase = {
  url: UrlList;
  getUrl?: UrlSelector;
  method?: HttpMethods;
  body?: any;
  payload?: HttpRequest;
  getPayload?: (url: string) => Promise<HttpRequest>;
};

export type PeriodicWebJob = {
  type: "periodic";
  interval: number;
} & WebJobBase;

export type CronWebJob = {
  type: "cron";
  expression: string;
} & WebJobBase;

export type WebJob = PeriodicWebJob | CronWebJob;

// Http Requests and Responses
export type BodyObject = {
  [field: string]: any;
};

export type HttpRequest = {
  path: string;
  method: HttpMethods;
  params?: {
    [key: string]: string;
  };
  query?: {
    [key: string]: string;
  };
  body?: string | Buffer | BodyObject | Array<any> | undefined;
  headers?: HttpHeaders;
  remoteAddress: string | undefined;
  remotePort: number | undefined;
};

export type HttpHeaders = {
  [key: string]: string | string[];
};

export type HttpResponse = {
  status?: number;
  redirect?: string;
  cookies?: HttpCookie[];
  headers?: IncomingHttpHeaders;
  body?: string | Buffer | BodyObject | Array<any> | undefined;
  contentType?: string;
};

export type HttpCookie = {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  maxAge?: number;
  overwrite?: boolean;
};

export type UrlList = string | string[];
export type UrlSelector = (urlList: UrlList) => Promise<UrlList>;

export type ClientTrackingInfo = {
  path: string;
  method: HttpMethods;
  timestamp: number;
  instanceId: string;
  remoteAddress: string;
};

export type HttpServiceTrackingInfo = {
  route: string;
  method: HttpMethods;
  status: number;
  instanceId: string;
  timestamp: number;
  requestTime: number;
  responseTime: number;
};

export type IApplicationState = {
  clientTracking: Map<string, ClientTrackingInfo[]>;
  httpServiceErrorTracking: Map<string, HttpServiceTrackingInfo[]>;
  httpResponseCache: Map<string, InMemoryCacheEntry>;
};

export type InMemoryCacheEntry = {
  time: number;
  expiry: number;
  response: HttpResponse;
};

export type HttpServiceCacheConfig = {
  varyBy?: {
    headers?: string[];
    query?: string[];
    body?: string[];
  };
  expiry: number;
  maxSize?: number;
};

export type Algorithm =
  | "HS256"
  | "HS384"
  | "HS512"
  | "RS256"
  | "RS384"
  | "RS512"
  | "ES256"
  | "ES384"
  | "ES512"
  | "PS256"
  | "PS384"
  | "PS512"
  | "none";

export type HttpServiceJwtAuthentication = {
  type: "jwt";
  key: string;
  jwtHeaderField?: string;
  getJwt?: (request: HttpRequest) => string;
  jwtBodyField?: string;
  verify?: (jwt: string | object, request: HttpRequest) => Promise<boolean>;
  onError?: (error: any, request: HttpRequest) => any;
  errorStatus?: number;
  errorBody?: any;
  verifyOptions?: {
    algorithms?: Algorithm[];
    audience?: string; // | RegExp | Array<string | RegExp>;
    clockTimestamp?: number;
    clockTolerance?: number;
    // return an object with the decoded `{ payload, header, signature }
    // instead of only the usual content of the payload. */
    complete?: boolean;
    issuer?: string | string[];
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    jwtid?: string;
    /**
     * If you want to check `nonce` claim, provide a string value here.
     * It is used on Open ID for the ID Tokens. ([Open ID implementation notes](https://openid.net/specs/openid-connect-core-1_0.html#NonceNotes))
     */
    nonce?: string;
    subject?: string;
  };
};

export type HttpServiceAuthentication = HttpServiceJwtAuthentication;

export type Notification =
  | {
      type: "email";
      email: string;
    }
  | {
      type: "sms";
      phoneNumber: string;
    };

export type ClientTrackingStateProviderPlugin = {
  getTrackingInfo: (
    path: string,
    method: HttpMethods,
    remoteAddress: string,
    config: AppConfig
  ) => Promise<ClientTrackingInfo[] | undefined>;
  setTrackingInfo: (
    path: string,
    method: HttpMethods,
    remoteAddress: string,
    trackingInfo: ClientTrackingInfo,
    config: AppConfig
  ) => Promise<void>;
};

export type PluginList<T> = {
  [name: string]: T;
};
