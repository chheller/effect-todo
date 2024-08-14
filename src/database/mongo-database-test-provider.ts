import { Context, Effect, Layer } from "effect";
import { mock } from "bun:test";
import {
  GenericMongoDbException,
  type MongoDatabaseProvider,
} from "./mongo-database-provider";
import { MongoMemoryServer } from "mongodb-memory-server";

const makeMongoMockProvider = Effect.gen(function* () {
  return yield* Effect.succeed({
    useDb: mock(),
    useCollection: mock(),
  });
});

const makeMongoTestProvider = Effect.gen(function* () {
  const server = new MongoMemoryServer();
  server.
  const uri = yield* Effect.tryPromise({
    try: () => server.getUri(),
    catch: (e) => new GenericMongoDbException(e),
  });
  const dbName = 
  return {
    useDb: Effect.succeed(() => uri),
    useCollection: Effect.succeed(() => dbName),
  };
});

export const MongoReaderProviderMocked = Layer.scoped(
  Context.GenericTag<MongoDatabaseProvider>("MongoReaderProvider"),
  makeMongoMockProvider,
);

export const MongoReaderProviderTest = Layer.scoped(
  Context.GenericTag<MongoDatabaseProvider>("MongoReaderProvider"),
  makeMongoTestProvider,
);