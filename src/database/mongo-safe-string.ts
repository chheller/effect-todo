import { Schema } from "@effect/schema";

export const MongoSafeString = Schema.String.pipe(
  Schema.filter((s) => !s.startsWith("$")),
).annotations({
  title: "MongoSafeString",
  message: () => "Invalid string",
  description: "A string that is safe to use in a MongoDB query",
});

interface MongoSafeObject {
  [key: string]: MongoSafeObject | typeof MongoSafeString.Type;
}

export const MongoSafeObject = Schema.Record({
  key: MongoSafeString,
  value: Schema.Union(
    Schema.suspend((): Schema.Schema<MongoSafeObject> => MongoSafeObject),
    MongoSafeString,
  ),
});
