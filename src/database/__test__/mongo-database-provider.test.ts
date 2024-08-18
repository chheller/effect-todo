import { Effect, Layer } from "effect";
import { it } from "../../effect/bun:test";
import { expect } from "bun:test";
import {
  MongoDatabaseReaderProviderTest,
  MongoDatabaseWriterProviderTest,
  MongoMemoryServerProviderLive,
} from "../mongo-database-test-provider";
import {
  MongoDatabaseReaderProvider,
  MongoDatabaseWriterProvider,
} from "../mongo-database-provider";

const provide = Effect.provide(
  Layer.merge(
    MongoDatabaseReaderProviderTest,
    MongoDatabaseWriterProviderTest,
  ).pipe(Layer.provide(MongoMemoryServerProviderLive)),
);

it.effect("should be able to connect to the database", () =>
  provide(
    Effect.gen(function* () {
      // Arrange
      const readerDb = yield* MongoDatabaseReaderProvider;
      const writerDb = yield* MongoDatabaseWriterProvider;

      const readerColl = yield* readerDb.useDb("effect", "test");
      const writerColl = yield* writerDb.useDb("effect", "test");

      const useWriteTest = writerDb.useCollection(writerColl);
      const useReadTest = readerDb.useCollection(readerColl);
      // Act
      const insertedResult = yield* useWriteTest((_) =>
        _.insertOne({ test: "test" }),
      );
      const readResult = yield* useReadTest((_) =>
        _.findOne({ _id: insertedResult.insertedId }),
      );
      // yield* Effect.sleep(10000000);
      // Assert
      expect(insertedResult).not.toBeNull();
      expect(readResult).not.toBeNull();
    }),
  ),
);