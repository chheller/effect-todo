import { Brand, Context, Effect, Layer } from "effect";
import { MongoDatabaseProvider } from "../database/mongo-database-provider";
import { Schema as S } from "@effect/schema";
import { TypeIdError } from "@effect/platform/Error";
import { TaggedError } from "effect/Data";
import type {
	Collection,
	DeleteResult,
	InsertOneResult,
	ObjectId,
	OptionalId,
	UpdateResult,
	WithId,
	WithoutId,
} from "mongodb";
import { error } from "effect/Console";
import * as _ from "lodash";

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
		) => Effect.Effect<Todo.TodoModel, GenericTodoRepoError>;
		readonly read: (
			_id: ObjectId,
		) => Effect.Effect<WithId<Todo.TodoModel> | null, GenericTodoRepoError>;
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
		const { use, useCollection } = yield* MongoDatabaseProvider;
		const collection = yield* use<TodoModel>("effect", "todos");

		const read = (_id: ObjectId) =>
			useCollection(
				collection,
				({ findOne }) => findOne({ _id }),
				(e) => new GenericTodoRepoError(e),
			);

		const create = (todo: Todo.TodoRequestDto) =>
			Effect.gen(function* () {
				const { insertedId } = yield* useCollection(
					collection,
					({ insertOne }) => insertOne(todo as WithoutId<TodoModel>),
					(e) => new GenericTodoRepoError(e),
				);

				if (insertedId == null) {
					return yield* Effect.fail(
						new GenericTodoRepoError("Failed to insert document"),
					);
				}
				const newTodo = yield* read(insertedId);
				if (newTodo == null) {
					return yield* Effect.fail(
						new GenericTodoRepoError("Failed to read inserted document"),
					);
				}
				return newTodo;
			});

		const update = (_id: ObjectId, todo: Todo.TodoRequestDto) =>
			useCollection(
				collection,
				({ updateOne }) =>
					updateOne({ _id }, { $set: todo }, { upsert: false }),
				(e) => new GenericTodoRepoError(e),
			);

		const delete_ = (_id: ObjectId) =>
			useCollection(
				collection,
				({ deleteOne }) => deleteOne({ _id }),
				(e) => new GenericTodoRepoError(e),
			);

		const readMany = () =>
			useCollection(
				collection,
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
