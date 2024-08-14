import { it } from "../../../effect/bun:test";
import { describe, expect } from "bun:test";
import { TodoQueryRepository } from "../repository/todo-query-repository";
import * as internal from "../todo-handlers";
import { Effect, Layer } from "effect";
import { BSON } from "mongodb";


const TodoQueryRepositoryTest = Layer.scoped(
  TodoQueryRepository,
  Effect.succeed({
    read: () =>
      Effect.succeed({
        _id: new BSON.ObjectId(),
        title: "test",
        completed: false,
      }),
    readMany: () =>
      Effect.succeed([
        { _id: new BSON.ObjectId(), title: "test", completed: false },
      ]),
  } as unknown as TodoQueryRepository),
);

const provideEnv = Effect.provide(TodoQueryRepositoryTest);
describe("Todo Handlers", () => {
  it.effect("should fetch todos", () =>
    provideEnv(
      Effect.gen(function* () {
        const result = yield* internal.getAllTodosHandler;

        expect(result).toEqual(
          expect.objectContaining({
            status: 200,
          }),
        );
      }),
    ),
  );
});

