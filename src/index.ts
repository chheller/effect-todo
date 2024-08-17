import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "@effect/platform";
import {
  BunContext,
  BunEtag,
  BunHttpPlatform,
  BunHttpServer,
} from "@effect/platform-bun";
import { runMain } from "@effect/platform-bun/BunRuntime";
import { Effect, Layer, Logger, LogLevel } from "effect";

import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ServerConfigLive } from "./config/server-config";
import {
  MongoReaderProviderLive,
  MongoWriterProviderLive,
} from "./database/mongo-database-provider";
import { router } from "./router";
import { TodoCommandRepositoryLive } from "./todo/internal/repository/todo-command-repository";
import { TodoQueryRepositoryLive } from "./todo/internal/repository/todo-query-repository";


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
  BunEtag.layerWeak,
  BunContext.layer,
);

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "effect-todo-http-api" },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}));


const HttpLive = HttpRouter.empty.pipe(
  HttpRouter.get("/health", HttpServerResponse.text("OK")),
  HttpRouter.mount("/", router),
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress,
  Layer.provide(ServerLive),
  Layer.provide(TodoCommandRepositoryLive),
  Layer.provide(TodoQueryRepositoryLive),
  Layer.provide(MongoReaderProviderLive),
  Layer.provide(MongoWriterProviderLive),
  Layer.provide(Logger.pretty),
  Layer.provide(NodeSdkLive),
);

runMain(
  Layer.launch(HttpLive).pipe(Logger.withMinimumLogLevel(LogLevel.Debug)),
);
