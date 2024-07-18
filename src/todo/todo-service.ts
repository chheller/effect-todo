import { Brand, Context, Effect, Layer } from "effect";
import { MongoDatabaseProvider } from "../database/mongo-database-provider";
import { Schema as S } from "@effect/schema";
import { TypeIdError } from "@effect/platform/Error";
import { TaggedError } from "effect/Data";

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

	export const TodoModel = S.Struct({
		_id: TodoId,
		...TodoCommonDto.fields,
	});

	export const TodoResponseDto = S.Struct({
		_id: TodoId,
		...TodoCommonDto.fields,
	});

	export type TodoRequestDto = S.Schema.Type<typeof TodoRequestDto>;
	export type TodoResponseDto = S.Schema.Type<typeof TodoResponseDto>;
	export type TodoModel = S.Schema.Type<typeof TodoModel>;

	export interface TodoCrudService {
		readonly create: (
			todo: Todo.TodoRequestDto,
		) => Effect.Effect<Todo.TodoModel, GenericTodoRepoError>;
		readonly read: (
			id: string,
		) => Effect.Effect<Todo.TodoModel | null, GenericTodoRepoError>;
		readonly update: (
			id: string,
			todo: Todo.TodoRequestDto,
		) => Effect.Effect<Todo.TodoModel, GenericTodoRepoError>;
		readonly delete: (id: string) => Effect.Effect<void, GenericTodoRepoError>;
		readonly readMany: () => Effect.Effect<
			Todo.TodoModel[],
			GenericTodoRepoError
		>;
	}

	export const TodoCrudService =
		Context.GenericTag<TodoCrudService>("TodoCrudService");

	export const makeTodoCrudService = Effect.gen(function* () {
		const db = yield* MongoDatabaseProvider;
		const collection = db.client
			.db("effect")
			.collection<Omit<Todo.TodoModel, "_id">>("todos");

		const create = (todo: Todo.TodoRequestDto) =>
			Effect.tryPromise({
				try: () => collection.insertOne(todo),
				catch: (e) => Effect.fail(new GenericTodoRepoError(e)),
			});

		const read = (id: string) =>
			Effect.tryPromise({
				try: () => collection.findOne({ id }),
				catch: (e) => Effect.fail(new GenericTodoRepoError(e)),
			});

		const update = (id: string, todo: Todo.TodoRequestDto) =>
			Effect.tryPromise({
				try: () => collection.updateOne({ id }, todo),
				catch: (e) => Effect.fail(new GenericTodoRepoError(e)),
			}).pipe(Effect.map(() => todo));

		const delete_ = (id: string) =>
			Effect.tryPromise({
				try: () => collection.deleteOne({ id }),
				catch: (e) => Effect.fail(new GenericTodoRepoError(e)),
			}).pipe(Effect.map(() => undefined));

		const readMany = () =>
			Effect.tryPromise({
				try: () => collection.find({}).toArray(),
				catch: (e) => Effect.fail(new GenericTodoRepoError(e)),
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

