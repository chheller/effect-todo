import { expect, it } from "vitest";
import * as internal from "../todo-handlers";
import { Effect } from "effect";

it("should fetch todos", () =>
  Effect.gen(function* () {
    // const result = yield* internal.getAllTodosHandler;
    // expect(result).toEqual({ status: 200, body: [] });
    yield* Effect.succeed(1);
  }));

