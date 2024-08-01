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
  type GenericMongoDbException,
  MongoDatabaseProvider,
} from "../database/mongo-database-provider";

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

  export interface TodoRepository {
    readonly create: (
      todo: Todo.TodoRequestDto,
    ) => Effect.Effect<
      Todo.TodoModel,
      GenericMongoDbException | NoSuchElementException
    >;
    readonly read: (
      _id: ObjectId,
    ) => Effect.Effect<
      WithId<Todo.TodoModel>,
      GenericMongoDbException | NoSuchElementException
    >;
    readonly update: (
      _id: ObjectId,
      todo: Todo.TodoRequestDto,
    ) => Effect.Effect<UpdateResult<Todo.TodoModel>, GenericMongoDbException>;

    readonly delete: (
      _id: ObjectId,
    ) => Effect.Effect<DeleteResult, GenericMongoDbException>;
    readonly readMany: () => Effect.Effect<
      Todo.TodoModel[],
      GenericMongoDbException
    >;
  }

  export const TodoRepository =
    Context.GenericTag<TodoRepository>("TodoRepository");

  export const makeTodoCrudRepository = Effect.gen(function* () {
    const mongoDatabaseProvider = yield* MongoDatabaseProvider;
    const collection = yield* mongoDatabaseProvider.useDb<TodoModel>(
      "effect",
      "todos",
    );
    const useTodos = mongoDatabaseProvider.useCollection(collection);

    const read = (_id: ObjectId) =>
      Effect.filterOrFail(
        useTodos((_) => _.findOne({ _id })),
        Predicate.isNotNull,
        () => new NoSuchElementException("Failed to fetch inserted document"),
      );

    const create = (todo: Todo.TodoRequestDto) =>
      useTodos((_) => _.insertOne(todo as WithoutId<TodoModel>)).pipe(
        Effect.map((_) => _.insertedId),
        Effect.flatMap(read),
      );

    const update = (_id: ObjectId, todo: Todo.TodoRequestDto) =>
      useTodos((_) => _.updateOne({ _id }, { $set: todo }, { upsert: false }));

    const delete_ = (_id: ObjectId) => useTodos((_) => _.deleteOne({ _id }));

    const readMany = () => useTodos((_) => _.find({}).toArray());

    return TodoRepository.of({
      create,
      read,
      update,
      delete: delete_,
      readMany,
    });
  });

  export const TodoRepositoryLive = Layer.scoped(
    TodoRepository,
    makeTodoCrudRepository,
  );
}
