import { HttpServerResponse } from "@effect/platform";
import type { ParseResult } from "@effect/schema";
import { Effect } from "effect";

export namespace HttpErrorHandlers {
	export const handleParseError = (e: ParseResult.ParseError) =>
		HttpServerResponse.unsafeJson(
			{ path: "id", error: e.message },
			{ status: 400 },
		);

	export const handleInternalServerError = <E extends Error>(e: E) =>
		HttpServerResponse.unsafeJson({ error: e }, { status: 500 });
}