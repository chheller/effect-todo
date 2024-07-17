import {
	type HttpClientError,
	HttpClient,
	HttpClientRequest,
	HttpClientResponse,
} from "@effect/platform";
import { Effect, Context, Layer } from "effect";

export interface HealthCheckService {
	readonly check: () => Effect.Effect<string, HttpClientError.HttpClientError>;
}
export const HealthCheckService =
	Context.GenericTag<HealthCheckService>("HealthCheckService");

export const makeHealthCheckService = Effect.gen(function* () {
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

export const HealthCheckServiceLive = Layer.effect(
	HealthCheckService,
	makeHealthCheckService,
).pipe(Layer.provide(HttpClient.layer));