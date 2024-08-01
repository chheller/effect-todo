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
import { Effect, Layer } from "effect";

import { ConfigService, ConfigServiceLive } from "./config-service";
import { MongoDatabaseProviderLive } from "./database/mongo-database-provider";
import { TodoHttpLive } from "./todo/todo-http-service";
import { Todo } from "./todo/todo-repository";
import { router } from "./router";

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

const HttpLive = HttpRouter.empty.pipe(
  HttpRouter.get("/health", HttpServerResponse.text("OK")),
  HttpRouter.mount("/", router),
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress,
  Layer.provide(ServerLive),
  Layer.provide(Todo.TodoRepositoryLive),
  Layer.provide(MongoDatabaseProviderLive),
  Layer.provide(ConfigServiceLive),
);

runMain(Layer.launch(HttpLive));
