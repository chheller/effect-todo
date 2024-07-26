import { Context, Effect, Layer } from "effect";
import * as Mongo from "mongodb";
import { ConfigService } from "../config-service";
import { withConsoleLog } from "effect/Logger";
import { charCodeAt } from "effect/String";
export class GenericMongoDbException extends Error {
	_tag = "GenericMongoDbException" as const;
	public constructor(e: unknown) {
		super(
			e instanceof Error
				? e.message
				: `Wrapped exception was not an exception: ${e}`,
		);
		this.name = this._tag;
	}
}

export const makeMongoDatabaseProviderAcq = Effect.gen(function* () {
	const config = yield* ConfigService;
	// Acquire a releasable handle on the MongoClient, and specify cleanup behavior for the client
	// TODO: Write a test verifying that the cleanup is called when the scope is discarded
	const useClient = yield* Effect.acquireRelease(
		Effect.sync(() => new Mongo.MongoClient(config.get().mongoDBURI)).pipe(
			Effect.andThen((c) =>
				Effect.tryPromise({
					try: () => c.connect(),
					catch: (e) => new GenericMongoDbException(e),
				}),
			),
		),
		(c, _exit) => Effect.promise(() => c.close()),
	);

	const use = <A>(f: (c: Mongo.MongoClient) => PromiseLike<A>) =>
		Effect.tryPromise({
			try: () => f(useClient),
			catch: (e) => new GenericMongoDbException(e),
		});

	return MongoDatabaseProvider.of({ use });
});
export interface MongoDatabaseProvider {
	readonly use: <Res>(
		f: (client: Mongo.MongoClient) => Promise<Res>,
	) => Effect.Effect<Res, GenericMongoDbException, never>;
}

export const MongoDatabaseProvider = Context.GenericTag<MongoDatabaseProvider>(
	"MongoDatabaseProvider",
);

export const MongoDatabaseProviderLive = Layer.scoped(
	MongoDatabaseProvider,
	makeMongoDatabaseProviderAcq,
);
