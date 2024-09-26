import { Schema as S } from "@effect/schema";
import { Model } from "@effect/sql";
import type { JSONSchema7 } from "json-schema";
import { ObjectId } from "mongodb";

export const ObjectIdFromSelf = S.instanceOf(ObjectId);
export const ValidHexString = S.String.pipe(S.pattern(/^[0-9a-fA-F]+$/));
export const ObjectIdSchema = S.transform(
  S.compose(S.String.pipe(S.length(24)), ValidHexString).annotations({
    identifier: "ObjectId",
    jsonSchema: {
      type: "string",
      pattern: "^[0-9a-fA-F]+$",
      minLength: 24,
      maxLength: 24,
    } as const satisfies JSONSchema7,
  }),
  ObjectIdFromSelf,
  {
    decode: (s) => ObjectId.createFromHexString(s),
    encode: (id) => id.toHexString(),
  },
);

export const ObjectIdUrlParamSchema = S.Struct({
  id: ObjectIdSchema,
}).pipe(S.pluck("id"));

export const ObjectIdField = Model.Field({
  json: ObjectIdSchema,
  jsonUpdate: ObjectIdSchema,
  update: ObjectIdFromSelf,
  select: ObjectIdFromSelf,
});
