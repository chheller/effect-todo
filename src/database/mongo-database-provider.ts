import { Context, Effect, Layer } from "effect";
import * as Mongo from "mongodb";
import { ConfigService } from "../config-service";

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
	const client = yield* Effect.acquireRelease(
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

	const use = <T extends Mongo.BSON.Document>(
		database: string,
		collection: string,
		options?: {
			dbOptions?: Mongo.DbOptions;
			collectionOptions: Mongo.CollectionOptions;
		},
	) =>
		Effect.try({
			try: () =>
				client
					.db(database, options?.dbOptions)
					.collection<T>(collection, options?.collectionOptions),
			catch: (e) => new GenericMongoDbException(e),
		});

	const useCollection = <
		T extends Mongo.BSON.Document,
		K,
		E extends Error = Error,
	>(
		collection: Mongo.Collection<T>,
		f: (collection: Mongo.Collection<T>) => Promise<K>,
		onError?: (e: unknown) => E,
	): Effect.Effect<K, E, never> =>
		Effect.tryPromise<K, E>({
			try: () => f(collection),
			catch: (e) => onError?.(e) ?? (e as E),
		});

	return MongoDatabaseProvider.of({ use, useCollection });
});
export interface MongoDatabaseProvider {
		readonly use: <T extends Mongo.BSON.Document>(
			database: string,
			collection: string,
			options?: {
				dbOptions?: Mongo.DbOptions;
				collectionOptions: Mongo.CollectionOptions;
			},
		) => Effect.Effect<Mongo.Collection<T>, GenericMongoDbException, never>;

		readonly useCollection: <
			T extends Mongo.BSON.Document,
			K,
			E extends Error = Error,
		>(
			collection: Mongo.Collection<T>,
			f: (coll: Mongo.Collection<T>) => Promise<K>,
			onError?: (e: unknown) => E,
		) => Effect.Effect<K, E, never>;
	}

export const MongoDatabaseProvider = Context.GenericTag<MongoDatabaseProvider>(
	"MongoDatabaseProvider",
);

export const MongoDatabaseProviderLive = Layer.scoped(
	MongoDatabaseProvider,
	makeMongoDatabaseProviderAcq,
);
