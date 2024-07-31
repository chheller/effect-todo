import { TypeIdError } from "@effect/platform/Error";
import { Schema as S } from "@effect/schema";
import { Brand, Context, Effect, Layer } from "effect";
import { error } from "effect/Console";
import { TaggedError } from "effect/Data";
import * as _ from "lodash";
import * as fp from "lodash/fp";
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
import { MongoDatabaseProvider } from "../database/mongo-database-provider";
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
			useCollection(
				collection,
				({ insertOne }) => insertOne(todo as WithoutId<TodoModel>),
				(e) => new GenericTodoRepoError(e),
			).pipe(
				Effect.andThen(({ insertedId }) => {
					return read(insertedId);
				}),
				Effect.filterOrFail(
					(x) => x != null,
					() => new GenericTodoRepoError("Failed to fetch inserted document"),
				),
			);

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
