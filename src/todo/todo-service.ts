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
} from "mongodb";

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
			id: ObjectId,
		) => Effect.Effect<Todo.TodoModel | null, GenericTodoRepoError>;
		readonly update: (
			id: ObjectId,
			todo: Todo.TodoRequestDto,
		) => Effect.Effect<UpdateResult<Todo.TodoModel>, GenericTodoRepoError>;
		readonly delete: (
			id: ObjectId,
		) => Effect.Effect<DeleteResult, GenericTodoRepoError>;
		readonly readMany: () => Effect.Effect<
			Todo.TodoModel[],
			GenericTodoRepoError
		>;
	}

	export const TodoCrudService =
		Context.GenericTag<TodoCrudService>("TodoCrudService");

	export const makeTodoCrudService = Effect.gen(function* () {
		const { use } = yield* MongoDatabaseProvider;
		const collection = yield* use((client) =>
			Promise.resolve(client.db("effect").collection<Todo.TodoModel>("todos")),
		);

		// const { client } = yield* MongoDatabaseProvider;
		// const collection = client.db("effect").collection("todos");

		const read = (_id: ObjectId) =>
			Effect.tryPromise({
				try: () => collection.findOne({ _id }),
				catch: (e) => new GenericTodoRepoError(e),
			});

		const create = (todo: Todo.TodoRequestDto) =>
			Effect.gen(function* () {
				const { insertedId } = yield* Effect.tryPromise({
					try: () =>
						(
							collection as unknown as Collection<Omit<Todo.TodoModel, "id">>
						).insertOne(todo),
					catch: (e) => new GenericTodoRepoError(e),
				});
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
			Effect.tryPromise({
				try: () =>
					collection.updateOne({ _id }, { $set: todo }, { upsert: false }),
				catch: (e) => new GenericTodoRepoError(e),
			});

		const delete_ = (_id: ObjectId) =>
			Effect.tryPromise({
				try: () => collection.deleteOne({ _id }),
				catch: (e) => new GenericTodoRepoError(e),
			});

		const readMany = () =>
			Effect.tryPromise({
				try: () => collection.find({}).toArray(),
				catch: (e) => new GenericTodoRepoError(e),
			});

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
