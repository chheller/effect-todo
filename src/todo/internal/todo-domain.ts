import { Schema as S } from "@effect/schema";
import type { ObjectId } from "mongodb";

export class GenericTodoRepoError extends Error {
  _tag = "GenericTodoRepoError" as const;
  public constructor(e: unknown) {
    super(
      e instanceof Error
        ? e.message
        : `Wrapped exception was not an exception: ${e}`,
    );
    this.name = this._tag;
  }
}

export const TodoId = S.String.pipe(S.length(24));

const TodoCommonDto = S.Struct({
  description: S.String.pipe(S.minLength(1)),
  done: S.Boolean,
});

export const TodoRequestDto = S.Struct({
  ...TodoCommonDto.fields,
});

export const TodoResponseDto = S.Struct({
  id: TodoId,
  ...TodoCommonDto.fields,
});

export type TodoRequestDto = S.Schema.Type<typeof TodoRequestDto>;
export type TodoResponseDto = S.Schema.Type<typeof TodoResponseDto>;

export type TodoModel = {
  description: string;
  done: boolean;
  id: ObjectId;
};
