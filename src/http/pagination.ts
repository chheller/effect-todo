import { Schema } from "@effect/schema";

export class PaginationSchema extends Schema.Class<PaginationSchema>(
  "PaginationRequestSchema",
)({
  page: Schema.optionalWith(Schema.Positive, {
    default: () => 1,
    nullable: true,
  }),
  limit: Schema.optionalWith(Schema.Positive, {
    default: () => 25,
    nullable: true,
  }),
}) {}

export class PaginationSearchParamsSchema extends Schema.Class<PaginationSchema>(
  "PaginationRequestSchema",
)({
  page: Schema.optionalWith(
    Schema.NumberFromString.pipe(Schema.greaterThan(0)),
    { default: () => 1 },
  ),
  limit: Schema.optionalWith(
    Schema.NumberFromString.pipe(Schema.greaterThan(0)),
    { default: () => 25 },
  ),
}) {}

export type PaginationProps = typeof PaginationSchema.Type;