import { Context, Effect, Layer, Redacted } from "effect";
import * as Mongo from "mongodb";
import {
  MongoReaderConfigLive,
  MongoWriterConfigLive,
  type MongoConfig,
} from "../config/mongo-config";
export class GenericMongoDbException extends Error {
  _tag = "GenericMongoDbException" as const;
  public constructor(e: unknown) {
    super("Caught exception in MongodbProvider", { cause: e });

    this.name = this._tag;
  }
}

export const makeMongoDatabaseProviderAcq = (config: MongoConfig) =>
  Effect.gen(function* () {
    // Acquire a releasable handle on the MongoClient, and specify cleanup behavior for the client
    // TODO: Write a test verifying that the cleanup is called when the scope is discarded
    const client = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Mongo.MongoClient(config.getMongoUri(), {
            auth: {
              username: config.user,
              password: Redacted.value(config.pwd),
            },
          }),
      ).pipe(
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

    return { useDb: use, useCollection };
  });

export interface MongoDatabaseProvider {
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

export const MongoDatabaseReaderProvider =
  Context.GenericTag<MongoDatabaseProvider>("MongoDatabaseReaderProvider");

export const MongoDatabaseWriterProvider =
  Context.GenericTag<MongoDatabaseProvider>("MongoDatabaseReaderProvider");

export const MongoReaderProviderLive = Layer.scoped(
  MongoDatabaseReaderProvider,
  Effect.flatMap(MongoReaderConfigLive, (config) =>
    makeMongoDatabaseProviderAcq(config),
  ).pipe(Effect.andThen(MongoDatabaseReaderProvider.of)),
);

export const MongoWriterProviderLive = Layer.scoped(
  MongoDatabaseWriterProvider,
  Effect.flatMap(MongoWriterConfigLive, (config) =>
    makeMongoDatabaseProviderAcq(config),
  ).pipe(Effect.andThen(MongoDatabaseWriterProvider.of)),
);
