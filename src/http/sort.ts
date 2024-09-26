import { Schema } from "@effect/schema";

export class SortRequestSchema extends Schema.Class<SortRequestSchema>(
  "SortRequestSchema",
)({
  field: Schema.optionalWith(Schema.String, { default: () => "_id" as const }),
  direction: Schema.optionalWith(
    Schema.transform(Schema.Literal("asc", "desc"), Schema.Literal(-1, 1), {
      encode: (number) => (number === 1 ? "asc" : "desc"),
      decode: (str) => (str === "asc" ? -1 : 1),
    }),
    { default: () => 1 as const },
  ),
}) {}

export type SortProps = typeof SortRequestSchema.Type;