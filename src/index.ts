import "./database";
import {
	HttpClient,
	type HttpClientError,
	HttpClientRequest,
	HttpClientResponse,
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
	BunRuntime,
} from "@effect/platform-bun";
import { runMain } from "@effect/platform-bun/BunRuntime";
import { Context, Effect, Layer, pipe, Schedule } from "effect";

import {
	HealthCheckService,
	HealthCheckServiceLive,
} from "./client/health-service/health-service";
import { ConfigService, ConfigServiceLive } from "./config-service";
import { Tag } from "effect/Context";


// const ServerLive = Layer.effect(
// 	pipe(
// 		Tag<HttpServer>(),
// 		Effect.flatMap(ConfigService, (svc) =>
// 			BunHttpServer.make({
// 				port: svc.get().port,
// 				development: svc.get().isDevelopment,
// 			}),
// 		),
// 	),
// );

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
	HttpServer.serve(HttpMiddleware.logger),
	HttpServer.withLogAddress,
	Layer.provide(HealthCheckServiceLive),
	Layer.provide(ServerLive),
	Layer.provide(ConfigServiceLive),
);

const HttpClientLive = Layer.scopedDiscard(
	Effect.flatMap(HealthCheckService, (svc) =>
		svc
			.check()
			.pipe(Effect.tap(Effect.log), Effect.schedule(Schedule.spaced(1000))),
	),
).pipe(Layer.provide(HealthCheckServiceLive));

runMain(Layer.launch(HttpClientLive));

runMain(Layer.launch(HttpLive));
