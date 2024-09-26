import { HttpServerResponse } from "@effect/platform";
import { ArrayFormatter, type ParseResult } from "@effect/schema";
import { Effect } from "effect";
import type { NoSuchElementException } from "effect/Cause";

export namespace HttpErrorHandlers {
  export const handleParseError = (e: ParseResult.ParseError) =>
    Effect.gen(function* () {
      yield* Effect.logDebug(
        "Error parsing request or response",
        ArrayFormatter.formatErrorSync(e),
      );
      return HttpServerResponse.unsafeJson(
        { error: ArrayFormatter.formatErrorSync(e) },
        { status: 400 },
      );
    });

  export const handleNoSuchElementError = (e: NoSuchElementException) =>
    Effect.gen(function* () {
      yield* Effect.logDebug(`Not found: ${e.message}`);
      return HttpServerResponse.unsafeJson(
        { message: "Not found" },
        { status: 404 },
      );
    });

  export const handleInternalServerError = <E extends Error>(e: E) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Internal server error: ${e.message}`, e.cause);
      return HttpServerResponse.unsafeJson(
        { message: "Internal server error" },
        { status: 500 },
      );
    });
}
