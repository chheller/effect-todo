import { it } from "../../../effect/bun:test";
import { expect } from "bun:test";
import { TodoQueryRepositoryTest } from "../repository/todo-query-repository";
import * as internal from "../todo-handlers";
import { Effect } from "effect";

const provideEnv = Effect.provide(TodoQueryRepositoryTest);
it.effect("should fetch todos", () =>
  provideEnv(
    Effect.gen(function* () {
      const result = yield* internal.getAllTodosHandler;
      expect(result).toEqual(expect.objectContaining({ status: 200 }));
    }),
  ),
);

