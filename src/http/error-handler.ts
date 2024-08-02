import { HttpServerResponse } from "@effect/platform";
import type { ParseResult } from "@effect/schema";
import { Effect } from "effect";
import type { NoSuchElementException } from "effect/Cause";

export namespace HttpErrorHandlers {
  export const handleParseError = (e: ParseResult.ParseError) =>
    HttpServerResponse.unsafeJson(
      { path: "id", error: e.message },
      { status: 400 },
    );

    export const handleNoSuchElementError = (e: NoSuchElementException) =>
      HttpServerResponse.unsafeJson({ message: "Not found" }, { status: 404 });

  export const handleInternalServerError = <E extends Error>(e: E) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Internal server error: ${e.message}`, e.cause);
      return HttpServerResponse.unsafeJson(
        { error: e.message },
        { status: 500 },
      );
    });
  
}
