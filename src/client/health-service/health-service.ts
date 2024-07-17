import {
	type HttpClientError,
	HttpClient,
	HttpClientRequest,
	HttpClientResponse,
} from "@effect/platform";
import { Effect, Context, Layer, Schedule } from "effect";

export interface HealthCheckService {
	readonly check: () => Effect.Effect<string, HttpClientError.HttpClientError>;
}
export const HealthCheckService =
	Context.GenericTag<HealthCheckService>("HealthCheckService");

export const makeHealthCheckService = Effect.gen(function* () {
	const httpClient = yield* HttpClient.HttpClient;
	const clientWithBaseUrl = httpClient.pipe(
		HttpClient.filterStatusOk,
		HttpClient.mapRequest(
			HttpClientRequest.prependUrl("http://localhost:3000"),
		),
	);
	const check = () =>
		HttpClientRequest.get("/health").pipe(
			clientWithBaseUrl,
			HttpClientResponse.text,
		);

	return HealthCheckService.of({ check });
});

export const HealthCheckServiceLive = Layer.effect(
	HealthCheckService,
	makeHealthCheckService,
).pipe(Layer.provide(HttpClient.layer));


export const HttpClientLive = Layer.scopedDiscard(
	Effect.flatMap(HealthCheckService, (svc) =>
		svc
			.check()
			.pipe(Effect.tap(Effect.log), Effect.schedule(Schedule.spaced(1000))),
	),
).pipe(Layer.provide(HealthCheckServiceLive));