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
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { runMain } from "@effect/platform-bun/BunRuntime";
import { Context, Effect, Layer, pipe, Schedule } from "effect";

interface HealthCheckService {
	readonly check: () => Effect.Effect<string, HttpClientError.HttpClientError>;
}
const HealthCheckService =
	Context.GenericTag<HealthCheckService>("HealthCheckService");

const makeHealthCheckService = Effect.gen(function* () {
	const httpClient = yield* HttpClient.HttpClient;
	const clientWithBaseURl = httpClient.pipe(
		HttpClient.filterStatusOk,
		HttpClient.mapRequest(
			HttpClientRequest.prependUrl("http://localhost:3000"),
		),
	);
	const check = () =>
		HttpClientRequest.get("/health").pipe(
			clientWithBaseURl,
			HttpClientResponse.text,
		);

	return HealthCheckService.of({ check });
});

const HealthCheckServiceLive = Layer.effect(
	HealthCheckService,
	makeHealthCheckService,
).pipe(Layer.provide(HttpClient.layer));

const ServerLive = BunHttpServer.layer({ port: 3000 });

const HttpLive = HttpRouter.empty.pipe(
	HttpRouter.get("/health", HttpServerResponse.text("OK")),
	HttpServer.serve(HttpMiddleware.logger),
	HttpServer.withLogAddress,
	Layer.provide(HealthCheckServiceLive),
	Layer.provide(ServerLive),
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
