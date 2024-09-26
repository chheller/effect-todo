import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "@effect/platform";
import {
  BunContext,
  BunHttpPlatform,
  BunHttpServer,
} from "@effect/platform-bun";
import { runMain } from "@effect/platform-bun/BunRuntime";
import { Effect, Layer, LogLevel, Logger, flow } from "effect";

import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ServerConfigLive } from "./config/server-config";

import { makeBaseRouter } from "./router";

import { Auth0 } from "./auth/auth0";
import { Auth0ConfigProvider } from "./auth/auth0.config";
import { authorizationMiddleware } from "./auth/authorization-middleware";
import { TodoHttpHandlers } from "./todo/internal/todo-handlers";


const ServerLive = Layer.mergeAll(
  Layer.scoped(
    HttpServer.HttpServer,
    Effect.flatMap(ServerConfigLive, ({ hostname, port, isDevelopment }) =>
      BunHttpServer.make({
        hostname,
        port,
        development: isDevelopment,
      }),
    ),
  ),
  BunHttpPlatform.layer,
  BunContext.layer,
);

const OtelSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "effect-todo-http-api" },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}));

const Router = Effect.gen(function* () {
  const middleware = flow(
    HttpMiddleware.cors({
      allowedOrigins: ["*"],
      allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["*"],
    }),
    yield* authorizationMiddleware,
    HttpMiddleware.logger,
  );

  const baseRouter = yield* makeBaseRouter;
  return HttpRouter.empty.pipe(
    HttpRouter.get("/health", HttpServerResponse.text("OK")),
    HttpRouter.mount("/", baseRouter),
    HttpServer.serve(middleware),
    HttpServer.withLogAddress,
  );
});

const RouterLive = Layer.unwrapEffect(Router).pipe(
  Layer.provide(Auth0.Test),
  Layer.provide(Auth0ConfigProvider.Test),
  Layer.provide(TodoHttpHandlers.Live),
);
const HttpLive = RouterLive.pipe(
  Layer.provide(ServerLive),
  Layer.provide(Logger.pretty),
  Layer.provide(OtelSdkLive),
);

runMain(
  Layer.launch(HttpLive).pipe(Logger.withMinimumLogLevel(LogLevel.Debug)),
);