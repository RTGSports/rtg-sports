declare module "next-pwa" {
  type StrategyName =
    | "CacheFirst"
    | "CacheOnly"
    | "NetworkFirst"
    | "NetworkOnly"
    | "StaleWhileRevalidate";

  type HTTPMethod = "DELETE" | "GET" | "HEAD" | "PATCH" | "POST" | "PUT";

  interface RouteHandlerCallbackOptions {
    event?: ExtendableEvent;
    request: Request;
    url: URL;
    params?: Record<string, string>;
  }

  type RouteHandler = (
    options: RouteHandlerCallbackOptions
  ) => Promise<Response | undefined | null> | Response | undefined | null;

  interface RouteMatchCallbackOptions {
    event?: ExtendableEvent;
    request?: Request;
    sameOrigin?: boolean;
    url: URL;
  }

  type RouteMatchCallback = (
    options: RouteMatchCallbackOptions
  ) => Promise<boolean | RegExpMatchArray | null | undefined> |
    boolean |
    RegExpMatchArray |
    null |
    undefined;

  interface QueueOptions {
    maxRetentionTime?: number;
    maxQueueSize?: number;
    onSync?: (options: { queue: unknown }) => Promise<void> | void;
    [key: string]: unknown;
  }

  interface BroadcastCacheUpdateOptions {
    headersToCheck?: string[];
    generatePayload?: (options: {
      cacheName: string;
      request: Request;
      newResponse: Response;
      oldResponse?: Response | null;
      event?: ExtendableEvent;
    }) => Promise<Record<string, unknown>> | Record<string, unknown>;
    deferNotified?: boolean;
    [key: string]: unknown;
  }

  interface CacheableResponseOptions {
    statuses?: number[];
    headers?: Record<string, string>;
  }

  interface ExpirationPluginOptions {
    maxEntries?: number;
    maxAgeSeconds?: number;
    purgeOnQuotaError?: boolean;
    matchOptions?: CacheQueryOptions;
  }

  interface WorkboxPlugin {
    cacheDidUpdate?: (...args: unknown[]) => Promise<void> | void;
    cacheKeyWillBeUsed?: (...args: unknown[]) => Promise<string> | string;
    cacheWillUpdate?:
      | ((...args: unknown[]) => Promise<Response | null | undefined>)
      | ((...args: unknown[]) => Response | null | undefined);
    cacheWillMatch?: (...args: unknown[]) => Promise<boolean> | boolean;
    cachedResponseWillBeUsed?:
      | ((...args: unknown[]) => Promise<Response | null | undefined>)
      | ((...args: unknown[]) => Response | null | undefined);
    fetchDidFail?: (...args: unknown[]) => Promise<void> | void;
    fetchDidSucceed?:
      | ((...args: unknown[]) => Promise<Response>)
      | ((...args: unknown[]) => Response);
    fetchWillSucceed?:
      | ((...args: unknown[]) => Promise<Response>)
      | ((...args: unknown[]) => Response);
    handlerDidComplete?: (...args: unknown[]) => Promise<void> | void;
    handlerDidError?:
      | ((...args: unknown[]) => Promise<Response | null | undefined>)
      | ((...args: unknown[]) => Response | null | undefined);
    handlerDidRespond?: (...args: unknown[]) => Promise<void> | void;
    handlerWillRespond?:
      | ((...args: unknown[]) => Promise<Response>)
      | ((...args: unknown[]) => Response);
    handlerWillStart?: (...args: unknown[]) => Promise<unknown> | unknown;
    requestWillFetch?:
      | ((...args: unknown[]) => Promise<Request>)
      | ((...args: unknown[]) => Request);
    [key: string]: unknown;
  }

  interface RuntimeCachingOptions {
    backgroundSync?: {
      name: string;
      options?: QueueOptions;
    };
    broadcastUpdate?: {
      channelName?: string;
      options: BroadcastCacheUpdateOptions;
    };
    cacheableResponse?: CacheableResponseOptions;
    cacheName?: string | null;
    expiration?: ExpirationPluginOptions;
    networkTimeoutSeconds?: number;
    plugins?: Array<WorkboxPlugin>;
    precacheFallback?: {
      fallbackURL: string;
    };
    rangeRequests?: boolean;
    fetchOptions?: RequestInit;
    matchOptions?: CacheQueryOptions;
  }

  interface RuntimeCaching {
    handler: RouteHandler | StrategyName;
    method?: HTTPMethod;
    options?: RuntimeCachingOptions;
    urlPattern: RegExp | string | RouteMatchCallback;
  }

  export type { RuntimeCaching, StrategyName };
}
