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
import { Effect, Layer, Logger } from "effect";

import { ConfigService, ConfigServiceLive } from "./config-service";
import { MongoDatabaseProviderLive } from "./database/mongo-database-provider";
import { TodoHttpLive } from "./todo/todo-http-service";
import { Todo } from "./todo/todo-repository";
import { router } from "./router";
import { NodeSdk } from "@effect/opentelemetry";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const ServerLive = Layer.mergeAll(
  Layer.scoped(
    HttpServer.HttpServer,
    Effect.flatMap(ConfigService, (svc) =>
      BunHttpServer.make({
        port: svc.get().port,
        development: svc.get().isDevelopment,
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
}))
 

const HttpLive = HttpRouter.empty.pipe(
  HttpRouter.get("/health", HttpServerResponse.text("OK")),
  HttpRouter.mount("/", router),
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress,
  Layer.provide(ServerLive),
  Layer.provide(Todo.TodoRepositoryLive),
  Layer.provide(MongoDatabaseProviderLive),
  Layer.provide(ConfigServiceLive),
  Layer.provide(Logger.pretty),
  Layer.provide(NodeSdkLive),
);

 

runMain(Layer.launch(HttpLive));
