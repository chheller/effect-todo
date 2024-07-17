import { Context, Effect, Layer } from "effect";
import { MongoDatabaseProvider } from "../database/mongo-database-provider";

export type Todo = {
	readonly id: string;
	readonly description: string;
	readonly isDone: boolean;
};

export interface TodoCrudService {
	readonly create: (todo: Todo) => Effect.Effect<Todo, unknown>;
	readonly read: (id: string) => Effect.Effect<Todo | null, unknown>;
	readonly update: (todo: Todo) => Effect.Effect<Todo, unknown>;
	readonly delete: (id: string) => Effect.Effect<void, unknown>;
	readonly readMany: () => Effect.Effect<Todo[], unknown>;
}

export const TodoCrudService =
	Context.GenericTag<TodoCrudService>("TodoCrudService");

export const makeTodoCrudService = Effect.gen(function* () {
	const db = yield* MongoDatabaseProvider;
	const collection = db.client.db("effect").collection("todos");

	const create = (todo: Todo) =>
		Effect.tryPromise({
			try: () => collection.insertOne(todo),
			catch: (e) => Effect.fail(e),
		}).pipe(Effect.map(() => todo));

	const read = (id: string) =>
		Effect.tryPromise({
			try: () => collection.findOne<Todo>({ id }),
			catch: (e) => Effect.fail(e),
		});

	const update = (todo: Todo) =>
		Effect.tryPromise({
			try: () => collection.updateOne({ id: todo.id }, todo),
			catch: (e) => Effect.fail(e),
		}).pipe(Effect.map(() => todo));

	const delete_ = (id: string) =>
		Effect.tryPromise({
			try: () => collection.deleteOne({ id }),
			catch: (e) => Effect.fail(e),
		}).pipe(Effect.map(() => undefined));

	const readMany = () =>
		Effect.tryPromise({
			try: () => collection.find<Todo>({}).toArray(),
			catch: (e) => Effect.fail(e),
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