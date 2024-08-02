import { Effect, Context, Layer } from "effect";
import type { NoSuchElementException } from "effect/Cause";
import type { ObjectId, UpdateResult, DeleteResult, WithoutId } from "mongodb";
import {
  type GenericMongoDbException,
  MongoDatabaseWriterProvider,
} from "../../database/mongo-database-provider";
import type { TodoRequestDto, TodoModel } from "../todo-domain";
import { TodoQueryRepository } from "./todo-query-repository";

/**
 * Effect for creating the TodoCommandRepository
 */
export interface TodoCommandRepository {
  readonly create: (
    todo: TodoRequestDto,
  ) => Effect.Effect<
    TodoModel,
    GenericMongoDbException | NoSuchElementException
  >;

  readonly update: (
    _id: ObjectId,
    todo: TodoRequestDto,
  ) => Effect.Effect<UpdateResult<TodoModel>, GenericMongoDbException>;

  readonly delete: (
    _id: ObjectId,
  ) => Effect.Effect<DeleteResult, GenericMongoDbException>;
}
export const makeTodoCommandRepository = Effect.gen(function* () {
  const queryRepository = yield* TodoQueryRepository;
  const mongoDatabaseProvider = yield* MongoDatabaseWriterProvider;
  const collection = yield* mongoDatabaseProvider.useDb<TodoModel>(
    "effect",
    "todos",
  );
  const useTodos = mongoDatabaseProvider.useCollection(collection);

  const create = (todo: TodoRequestDto) =>
    useTodos((_) => _.insertOne(todo as WithoutId<TodoModel>)).pipe(
      Effect.map((_) => _.insertedId),
      Effect.flatMap(queryRepository.read),
      Effect.withSpan("todo-create"),
    );

  const update = (_id: ObjectId, todo: TodoRequestDto) =>
    useTodos((_) => _.updateOne({ _id }, { $set: todo }, { upsert: false }));

  const delete_ = (_id: ObjectId) =>
    useTodos((_) => _.deleteOne({ _id })).pipe(Effect.withSpan("todo-delete"));

  return TodoCommandRepository.of({
    create,
    update,
    delete: delete_,
  });
});

export const TodoCommandRepository = Context.GenericTag<TodoCommandRepository>(
  "TodoWriteRepository",
);
export const TodoCommandRepositoryLive = Layer.scoped(
  TodoCommandRepository,
  makeTodoCommandRepository,
);
