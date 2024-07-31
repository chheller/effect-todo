import { TypeIdError } from "@effect/platform/Error";
import { Schema as S } from "@effect/schema";
import { Brand, Context, Effect, Layer, Predicate } from "effect";
import { error } from "effect/Console";
import { TaggedError } from "effect/Data";
import * as _ from "lodash";
import * as fp from "lodash/fp";
import type {
  BSON,
  Collection,
  DeleteResult,
  InsertOneResult,
  ObjectId,
  OptionalId,
  UpdateResult,
  WithId,
  WithoutId,
} from "mongodb";
import { MongoDatabaseProvider } from "../database/mongo-database-provider";
import { NoSuchElementException } from "effect/Cause";
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

  export interface TodoCrudService {
    readonly create: (
      todo: Todo.TodoRequestDto,
    ) => Effect.Effect<
      Todo.TodoModel,
      GenericTodoRepoError | NoSuchElementException
    >;
    readonly read: (
      _id: ObjectId,
    ) => Effect.Effect<
      WithId<Todo.TodoModel>,
      GenericTodoRepoError | NoSuchElementException
    >;
    readonly update: (
      _id: ObjectId,
      todo: Todo.TodoRequestDto,
    ) => Effect.Effect<UpdateResult<Todo.TodoModel>, GenericTodoRepoError>;
    readonly delete: (
      _id: ObjectId,
    ) => Effect.Effect<DeleteResult, GenericTodoRepoError>;
    readonly readMany: () => Effect.Effect<
      Todo.TodoModel[],
      GenericTodoRepoError
    >;
  }

  export const TodoCrudService =
    Context.GenericTag<TodoCrudService>("TodoCrudService");

  export const makeTodoCrudService = Effect.gen(function* () {
    const { useDb, useCollection } = yield* MongoDatabaseProvider;
    const collection = yield* useDb<TodoModel>("effect", "todos");
    const useTodos = useCollection(collection);
    const read = (_id: ObjectId) =>
      Effect.filterOrFail(
        useTodos(
          ({ findOne }) => findOne({ _id }),
          (e) => new GenericTodoRepoError(e),
        ),
        Predicate.isNotNull,
        () => new NoSuchElementException("Failed to fetch inserted document"),
      );

    const create = (todo: Todo.TodoRequestDto) =>
      useTodos(
        ({ insertOne }) => insertOne(todo as WithoutId<TodoModel>),
        (e) => new GenericTodoRepoError(e),
      ).pipe(
        Effect.map((_) => _.insertedId),
        Effect.flatMap(read),
      );

    const update = (_id: ObjectId, todo: Todo.TodoRequestDto) =>
      useTodos(
        ({ updateOne }) =>
          updateOne({ _id }, { $set: todo }, { upsert: false }),
        (e) => new GenericTodoRepoError(e),
      );

    const delete_ = (_id: ObjectId) =>
      useTodos(
        ({ deleteOne }) => deleteOne({ _id }),
        (e) => new GenericTodoRepoError(e),
      );

    const readMany = () =>
      useTodos(
        ({ find }) => find({}).toArray(),
        (e) => new GenericTodoRepoError(e),
      );

    return TodoCrudService.of({
      create,
      read,
      update,
      delete: delete_,
      readMany,
    });
  });

  export const TodoCrudServiceLive = Layer.scoped(
    TodoCrudService,
    makeTodoCrudService,
  );
}
