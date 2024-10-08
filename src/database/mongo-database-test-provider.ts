
import { Context, Effect, Layer, Redacted } from "effect";

import { MongoMemoryServer } from "mongodb-memory-server";
import type { MongoConfig } from "../config/mongo-config";
import {
  MongoDatabaseReaderProvider,
  MongoDatabaseWriterProvider,
  makeMongoDatabaseProviderAcq,
} from "./mongo-database-provider";

const extraReaderUser = {
  createUser: "effect_reader",
  pwd: "effect_reader_secret",
  roles: ["readAnyDatabase"],
};

const extraWriterUser = {
  createUser: "effect_writer",
  pwd: "effect_writer_secret",
  roles: ["readWriteAnyDatabase"],
};
// For some reason, mongo memory server doesn't export this interface
interface CreateUser {
  createUser: string;
  pwd: string;
  roles: string[];
}

const setupMemoryDatabase = (server: MongoMemoryServer) =>
  Effect.gen(function* () {
    // No-op for now, but can use this to globally seed the database
  });

export const MongoMemoryServerProvider = Context.GenericTag<MongoMemoryServer>(
  "MongoMemoryServerProvider",
);
export const MongoMemoryServerProviderLive = Layer.scoped(
  MongoMemoryServerProvider,
  Effect.promise(async () => {
    const server = new MongoMemoryServer({
      instance: { dbName: "effect", port: 27017 },

      auth: {
        customRootName: "root",
        customRootPwd: "secret",

        enable: true,
        extraUsers: [extraReaderUser, extraWriterUser],
      },
    });
    await server.start();
    return server;
  }),
);

const makeTestMongoProvider = (user: CreateUser) =>
  Effect.gen(function* () {
    const server = yield* MongoMemoryServerProvider;
    yield* setupMemoryDatabase(server);
    const config: MongoConfig = {
      getMongoUri: () => server.getUri(),
      user: user.createUser,
      pwd: Redacted.make(user.pwd),
      host: "localhost",
      port: 27017,
    };

    return MongoDatabaseReaderProvider.of(
      yield* makeMongoDatabaseProviderAcq(config),
    );
  });

export const MongoDatabaseReaderProviderTest = Layer.scoped(
  MongoDatabaseReaderProvider,
  makeTestMongoProvider(extraReaderUser),
);

export const MongoDatabaseWriterProviderTest = Layer.scoped(
  MongoDatabaseWriterProvider,
  makeTestMongoProvider(extraWriterUser),
);