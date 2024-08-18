import { Context, Effect, Layer, Redacted } from "effect";
import * as Mongo from "mongodb";
import { makeMongoConfig, type MongoConfig } from "../config/mongo-config";

export interface MongoDatabaseProvider {
  db: (dbName?: string, options?: Mongo.DbOptions) => Mongo.Db;
  /**
   * Method to create a hook to a particular database and collection
   * @param database The name of the database to use
   * @param collection The name of the collection to use for this provider
   * @param options Combined options
   * @returns
   */
  readonly useDb: <T extends Mongo.BSON.Document>(
    database: string,
    collection: string,
    options?: {
      dbOptions?: Mongo.DbOptions;
      collectionOptions: Mongo.CollectionOptions;
    },
  ) => Effect.Effect<Mongo.Collection<T>, GenericMongoDbException, never>;

  /**
   * @param collection The Mongo collection to lift into an effect
   * @returns A closure that takes a function that operates on the collection, and returns an effect
   *
   * @implNote Do not attempt to destructure the collection methods from the collection passed to the callback. This results in a runtime error due to `this` not being defined
   * as the destructured method loses the context of the original collection object, which is a JS class rather than a functional closure itself
   */
  readonly useCollection: <T extends Mongo.BSON.Document>(
    collection: Mongo.Collection<T>,
  ) => UseCollectionCallback<T>;
}

interface UseCollectionCallback<T extends Mongo.BSON.Document> {
  <K>(
    f: (coll: Mongo.Collection<T>) => Promise<K>,
  ): Effect.Effect<K, GenericMongoDbException, never>;

  <K, E extends Error>(
    f: (coll: Mongo.Collection<T>) => Promise<K>,
    onError: (e: unknown) => E,
  ): Effect.Effect<K, E, never>;
}

/**
 * Generic exception for MongoDbProvider
 */
export class GenericMongoDbException extends Error {
  _tag = "GenericMongoDbException" as const;
  public constructor(e: unknown) {
    super("Caught exception in MongodbProvider", { cause: e });

    this.name = this._tag;
  }
}


/**
 * Method for making a MongoDatabaseProvider service
 * In order to easily enable CQRS, we parameterize the MongoDatabaseProvider over a Config, which can contain a read-only user
 * Additionally, this can be used to easily create new instances of the MongoDatabaseProvider for different databases
 * @param config
 * @returns
 */
export const makeMongoDatabaseProviderAcq = (config: MongoConfig) => {
  const acquireMongoClient = Effect.gen(function* () {
    yield* Effect.logInfo("Acquiring Mongo connection");
    yield* Effect.logDebug(config);
    const mongoClient = new Mongo.MongoClient(config.getMongoUri(), {
      auth: {
        username: config.user,
        password: Redacted.value(config.pwd),
      },
    });
    return yield* Effect.tryPromise({
      try: () => mongoClient.connect(),
      catch: (e) => new GenericMongoDbException(e),
    }).pipe(
      Effect.tapError((e) =>
        Effect.logFatal("Failed to connect to Mongo", e.cause),
      ),
    );
  });

  return Effect.gen(function* () {
    // Acquire a releasable handle on the MongoClient, and specify cleanup behavior for the client
    // TODO: Write a test verifying that the cleanup is called when the scope is discarded
    const client = yield* Effect.acquireRelease(
      acquireMongoClient,
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

    const useCollection =
      <T extends Mongo.BSON.Document>(collection: Mongo.Collection<T>) =>
      <K, E extends Error>(
        f: (collection: Mongo.Collection<T>) => Promise<K>,
        onError?: (e: unknown) => E,
      ) =>
        Effect.tryPromise<K, E | GenericMongoDbException>({
          try: () => f(collection),
          catch: (e) => onError?.(e) ?? new GenericMongoDbException(e),
        });

    return { useDb: use, useCollection, db: client.db };
  });
};

/**
 * Create Providers for CQRS operations, by splitting read and write operations between two separate providers
 */
export const MongoDatabaseReaderProvider =
  Context.GenericTag<MongoDatabaseProvider>("MongoDatabaseReaderProvider");

export const MongoDatabaseWriterProvider =
  Context.GenericTag<MongoDatabaseProvider>("MongoDatabaseWriterProvider");

/**
 * Provide a scoped instance of the MongoDatabaseProvider for reading. When the scope is discarded, the connection is released
 */
export const MongoReaderProviderLive = Layer.scoped(
  MongoDatabaseReaderProvider,
  Effect.flatMap(makeMongoConfig("MONGO_READER"), (config) =>
    makeMongoDatabaseProviderAcq(config),
  ).pipe(Effect.andThen(MongoDatabaseReaderProvider.of)),
);

/**
 * Provide a scoped instance of the MongoDatabaseProvider for writing. When the scope is discarded, the connection is released
 */
export const MongoWriterProviderLive = Layer.scoped(
  MongoDatabaseWriterProvider,
  Effect.flatMap(makeMongoConfig("MONGO_WRITER"), (config) =>
    makeMongoDatabaseProviderAcq(config),
  ).pipe(Effect.andThen(MongoDatabaseWriterProvider.of)),
);
