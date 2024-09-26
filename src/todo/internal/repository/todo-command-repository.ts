import { Effect, Context, Layer } from "effect";
import { NoSuchElementException } from "effect/Cause";
import type { ObjectId, BSON } from "mongodb";
import {
  type GenericMongoDbException,
  MongoDatabaseProviderLive,
  MongoDatabaseWriterProvider,
} from "../../../database/mongo-database-provider";
import { TodoModel } from "../todo-domain";
import { TodoQueryRepository } from "./todo-query-repository";
import { Schema } from "@effect/schema";
import type { ObjectIdSchema } from "../../../database/object-id.schema";
import type { UserIdSchema } from "../../../auth/auth0";
import type { ParseError } from "@effect/schema/ParseResult";

/**
 * Effect for creating the TodoCommandRepository
 */
export const makeTodoCommandRepository = Effect.gen(function* () {
  const queryRepository = yield* TodoQueryRepository;
  const mongoDatabaseProvider = yield* MongoDatabaseWriterProvider;
  const collection = yield* mongoDatabaseProvider.useDb<BSON.Document>(
    "effect",
    "todos",
  );
  const useTodos = mongoDatabaseProvider.useCollection(collection);

  const create = (
    userId: typeof UserIdSchema.Type,
    todo: typeof TodoModel.jsonCreate.Type,
  ) =>
    Schema.encode(TodoModel.insert)({ ...todo, userId }).pipe(
      Effect.flatMap((encodedTodo) =>
        useTodos((_) => _.insertOne(encodedTodo)),
      ),
      Effect.map((_) => _.insertedId),
      Effect.flatMap(queryRepository.read),
      Effect.withSpan("todo-create"),
    );

  const update = (
    _id: ObjectId,
    userId: typeof UserIdSchema.Type,
    todo: typeof TodoModel.jsonUpdate.Type,
  ) =>
    Schema.encode(TodoModel.update)({ ...todo, userId }).pipe(
      Effect.flatMap((encodedTodo) =>
        useTodos((_) =>
          _.updateOne({ _id }, { $set: encodedTodo }, { upsert: false }),
        ),
      ),
      Effect.filterOrFail(
        (_) => _.modifiedCount > 0,
        () => new NoSuchElementException("Todo not found"),
      ),

      Effect.flatMap(() => queryRepository.read(_id)),
      Effect.withSpan("todo-update"),
    );

  const delete_ = (_id: typeof ObjectIdSchema.Type) =>
    useTodos((_) => _.deleteOne({ _id }))
      .pipe(Effect.withSpan("todo-delete"))
      .pipe(
        Effect.filterOrFail(
          (_) => _.deletedCount > 0,
          () => new NoSuchElementException(),
        ),
        Effect.catchTags({ NoSuchElementException: Effect.logWarning }),
      );

  return {
    create,
    update,
    delete: delete_,
  };
});

export class TodoCommandRepository extends Context.Tag("TodoCommandRepository")<
  TodoCommandRepository,
  {
    readonly create: (
      userId: typeof UserIdSchema.Type,
      todo: typeof TodoModel.jsonCreate.Type,
    ) => Effect.Effect<
      typeof TodoModel.select.Type,
      GenericMongoDbException | NoSuchElementException | ParseError
    >;

    readonly update: (
      _id: ObjectId,
      userId: typeof UserIdSchema.Type,
      todo: typeof TodoModel.jsonUpdate.Type,
    ) => Effect.Effect<
      typeof TodoModel.select.Type,
      GenericMongoDbException | NoSuchElementException | ParseError
    >;

    readonly delete: (
      _id: typeof ObjectIdSchema.Type,
    ) => Effect.Effect<void, GenericMongoDbException | ParseError>;
  }
>() {
  static Layer = Layer.effect(this, makeTodoCommandRepository);
  static Live = Layer.provide(
    this.Layer,
    Layer.merge(MongoDatabaseProviderLive, TodoQueryRepository.Live),
  );
}