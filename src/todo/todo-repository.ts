import { Schema as S } from "@effect/schema";
import { Context, Effect, Layer, Predicate } from "effect";
import { NoSuchElementException } from "effect/Cause";
import type {
  DeleteResult,
  ObjectId,
  UpdateResult,
  WithId,
  WithoutId,
} from "mongodb";
import {
  MongoDatabaseReaderProvider,
  MongoDatabaseWriterProvider,
  type GenericMongoDbException,
} from "../database/mongo-database-provider";
import * as lodash from "lodash";
export namespace Todo {
  export class GenericTodoRepoError extends Error {
    _tag = "GenericTodoRepoError" as const;
    public constructor(e: unknown) {
      super(
        e instanceof Error
          ? e.message
          : `Wrapped exception was not an exception: ${e}`,
      );
      this.name = this._tag;
    }
  }

  export const TodoId = S.String.pipe(S.length(24));

  const TodoCommonDto = S.Struct({
    description: S.String.pipe(S.minLength(1)),
    done: S.Boolean,
  });

  export const TodoRequestDto = S.Struct({
    ...TodoCommonDto.fields,
  });

  export const TodoResponseDto = S.Struct({
    id: TodoId,
    ...TodoCommonDto.fields,
  });

  export type TodoRequestDto = S.Schema.Type<typeof TodoRequestDto>;
  export type TodoResponseDto = S.Schema.Type<typeof TodoResponseDto>;

  export type TodoModel = {
    description: string;
    done: boolean;
    id: ObjectId;
  };

  /**
   * Implement CRQS pattern for Todo by splitting the repository into two parts
   */
  export interface TodoQueryRepository {
    readonly read: (
      _id: ObjectId,
    ) => Effect.Effect<
      WithId<Todo.TodoModel>,
      GenericMongoDbException | NoSuchElementException
    >;
    readonly readMany: () => Effect.Effect<
      Todo.TodoModel[],
      GenericMongoDbException
    >;
  }
  export interface TodoCommandRepository {
    readonly create: (
      todo: Todo.TodoRequestDto,
    ) => Effect.Effect<
      Todo.TodoModel,
      GenericMongoDbException | NoSuchElementException
    >;

    readonly update: (
      _id: ObjectId,
      todo: Todo.TodoRequestDto,
    ) => Effect.Effect<UpdateResult<Todo.TodoModel>, GenericMongoDbException>;

    readonly delete: (
      _id: ObjectId,
    ) => Effect.Effect<DeleteResult, GenericMongoDbException>;
  }

  export const TodoQueryRepository =
    Context.GenericTag<TodoQueryRepository>("TodoQueryRepositry");
  export const TodoCommandRepository =
    Context.GenericTag<TodoCommandRepository>("TodoWriteRepository");

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

    return TodoQueryRepository.of({
      read,
      readMany,
    });
  });
  /**
   * Effect for creating the TodoCommandRepository
   */
  export const makeTodoCommandRepository = Effect.gen(function* () {
    const queryRepository = yield* TodoQueryRepository;
    const mongoDatabaseProvider = yield* MongoDatabaseWriterProvider;
    const collection = yield* mongoDatabaseProvider.useDb<TodoModel>(
      "effect",
      "todos",
    );
    const useTodos = mongoDatabaseProvider.useCollection(collection);

    const create = (todo: Todo.TodoRequestDto) =>
      useTodos((_) => _.insertOne(todo as WithoutId<TodoModel>)).pipe(
        Effect.map((_) => _.insertedId),
        Effect.flatMap(queryRepository.read),
        Effect.withSpan("todo-create"),
      );

    const update = (_id: ObjectId, todo: Todo.TodoRequestDto) =>
      useTodos((_) => _.updateOne({ _id }, { $set: todo }, { upsert: false }));

    const delete_ = (_id: ObjectId) =>
      useTodos((_) => _.deleteOne({ _id })).pipe(
        Effect.withSpan("todo-delete"),
      );

    return TodoCommandRepository.of({
      create,
      update,
      delete: delete_,
    });
  });

  export const TodoCommandRepositoryLive = Layer.scoped(
    TodoCommandRepository,
    makeTodoCommandRepository,
  );

  export const TodoQueryRepositoryLive = Layer.scoped(
    TodoQueryRepository,
    makeTodoQueryRepository,
  );
  
}