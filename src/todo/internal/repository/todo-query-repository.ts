import { Context, Effect, Layer, Predicate } from "effect";
import { NoSuchElementException } from "effect/Cause";
import { BSON, type ObjectId, type WithId } from "mongodb";
import {
  type GenericMongoDbException,
  type MongoDatabaseProvider,
  MongoDatabaseProviderLive,
  MongoDatabaseReaderProvider,
} from "../../../database/mongo-database-provider";
import type { TodoModel } from "../todo-domain";

/**
 * Effect for creating the TodoQueryRepository
 */
export const makeTodoQueryRepository = Effect.gen(function* () {
  const mongoDatabaseProvider = yield* MongoDatabaseReaderProvider;
  const collection = yield* mongoDatabaseProvider.useDb<TodoModel>(
    "effect",
    "todos",
  );
  const useTodos = mongoDatabaseProvider.useCollection(collection);

  const readMany = () =>
    useTodos((_) => _.find({}).toArray()).pipe(
      Effect.withSpan("todo-read-many"),
    );
  const read = (_id: ObjectId) =>
    Effect.filterOrFail(
      useTodos((_) => _.findOne({ _id })),
      Predicate.isNotNull,
      () => new NoSuchElementException("Failed to fetch inserted document"),
    ).pipe(Effect.withSpan("todo-read"));

  return { read, readMany };
});

export class TodoQueryRepository extends Context.Tag("TodoQueryRepository")<
  TodoQueryRepository,
  {
    readonly read: (
      _id: ObjectId,
    ) => Effect.Effect<
      WithId<TodoModel>,
      GenericMongoDbException | NoSuchElementException
    >;
    readonly readMany: () => Effect.Effect<
      TodoModel[],
      GenericMongoDbException
    >;
  }
>() {
  static Layer = Layer.effect(this, makeTodoQueryRepository);
  static Live = Layer.provide(this.Layer, MongoDatabaseProviderLive);
}