import { Schema } from "@effect/schema";
import type { ParseError } from "@effect/schema/ParseResult";
import { Context, Effect, Layer, Predicate } from "effect";
import { NoSuchElementException } from "effect/Cause";
import type { ObjectId } from "mongodb";
import {
  type GenericMongoDbException,
  MongoDatabaseProviderLive,
  MongoDatabaseReaderProvider,
} from "../../../database/mongo-database-provider";
import type { ObjectIdSchema } from "../../../database/object-id.schema";
import { makePaginatedSearchAggregation } from "../../../database/search-aggregation";
import {
  PaginatedTodoResponse,
  type SearchTodoSchema,
  TodoModel,
} from "../todo-domain";

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

  const search = (search: typeof SearchTodoSchema.Type) =>
    useTodos((_) =>
      _.aggregate([
        { $match: search.match },
        ...makePaginatedSearchAggregation(search),
      ]).next(),
    ).pipe(
      Effect.flatMap(Schema.decodeUnknown(PaginatedTodoResponse)),
      Effect.withSpan("todo-search"),
    );
  const read = (_id: ObjectId) =>
    Effect.filterOrFail(
      useTodos((_) => _.findOne({ _id })),
      Predicate.isNotNull,
      () => new NoSuchElementException("Failed to fetch inserted document"),
    ).pipe(
      Effect.flatMap(Schema.decodeUnknown(TodoModel.select)),
      Effect.withSpan("todo-read"),
    );

  return { read, search };
});

export class TodoQueryRepository extends Context.Tag("TodoQueryRepository")<
  TodoQueryRepository,
  {
    readonly read: (
      _id: typeof ObjectIdSchema.Type,
    ) => Effect.Effect<
      typeof TodoModel.select.Type,
      GenericMongoDbException | NoSuchElementException | ParseError
    >;
    readonly search: (
      search: typeof SearchTodoSchema.Type,
    ) => Effect.Effect<
      typeof PaginatedTodoResponse.Type,
      GenericMongoDbException | ParseError
    >;
  }
>() {
  static Layer = Layer.effect(this, makeTodoQueryRepository);
  static Live = Layer.provide(this.Layer, MongoDatabaseProviderLive);
}