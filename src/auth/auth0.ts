import { Schema } from "@effect/schema";
import { Context, DateTime, Effect, Either, Layer, Redacted } from "effect";
import { TaggedError } from "effect/Data";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { Auth0ConfigProvider } from "./auth0.config";
import type { Auth } from "mongodb";

const _jwtPattern = /^(Bearer\s)(?:[\w-]*\.){2}[\w-]*$/;
export const UserIdSchema = Schema.String.pipe(
  Schema.pattern(/^auth0\|[\w-]{24}$/),
);

const _encodedJwtSchema = Schema.String.pipe(Schema.pattern(_jwtPattern))
  .annotations({
    identifier: "Jwt pattern refinement",
    message: () => `Expected a value matching ${_jwtPattern.source}`,
  })
  .pipe(Schema.Redacted);

const _decodedJwtSchema = Schema.Struct({
  header: Schema.Struct({
    alg: Schema.String,
    typ: Schema.String,
    kid: Schema.String.pipe(Schema.minLength(21)),
  }),
  payload: Schema.Struct({
    iss: Schema.String,
    aud: Schema.Array(Schema.String),
    scope: Schema.String,
    azp: Schema.String,
    sub: UserIdSchema,
    iat: Schema.Number,
    exp: Schema.Number,
  }),
  signature: Schema.NonEmptyString,
});

const decodeJwt = (
  s: typeof _encodedJwtSchema.Type,
): typeof _decodedJwtSchema.Type => {
  const [header, payload, signature] = Redacted.value(s).slice(7).split(".");

  return {
    header: JSON.parse(Buffer.from(header, "base64").toString("utf-8")),
    payload: JSON.parse(Buffer.from(payload, "base64").toString("utf-8")),
    signature: signature,
  };
};

const encodeJwt = ({
  header,
  payload,
  signature,
}: typeof _decodedJwtSchema.Type): typeof _encodedJwtSchema.Type =>
  Redacted.make(
    `Bearer ${Buffer.from(JSON.stringify(header)).toString("base64")}.${Buffer.from(JSON.stringify(payload)).toString("base64")}.${signature}`,
  );

export const AuthorizationSchema = Schema.transform(
  _encodedJwtSchema,
  _decodedJwtSchema,
  {
    decode: decodeJwt,
    encode: encodeJwt,
  },
);

export type AuthorizationToken = typeof AuthorizationSchema.Type;
export const AuthorizationToken =
  Context.GenericTag<AuthorizationToken>("AuthorizationToken");

export type JwtValidationErrorReason =
  | "unparseable"
  | "expired"
  | "unsupported_algorithm"
  | "invalid_signature"
  | "invalid_issuer"
  | "invalid_audience"
  | "invalid_subject"
  | "invalid_scope"
  | "invalid_issued_at"
  | "invalid_expiration"
  | "invalid_claims";
export class JwtValidationError extends TaggedError("JwtValidationError")<{
  message: JwtValidationErrorReason;
}> {}

const make = Effect.gen(function* () {
  const { env, domain } = yield* Auth0ConfigProvider;
  const JWKS = yield* Auth0JwksProvider;
  const validateJwt = (jwt: string) =>
    Effect.gen(function* () {
      const now = (yield* DateTime.now).epochMillis / 1000;
      const parsedJwt = yield* Schema.decodeUnknownEither(AuthorizationSchema)(
        jwt,
      ).pipe(
        Either.mapLeft((e) => {
          console.log(e);
          return new JwtValidationError({ message: "unparseable" });
        }),
      );

      if (parsedJwt.header.alg !== "RS256") {
        yield* new JwtValidationError({
          message: "unsupported_algorithm",
        });
      }
      // TODO: Get this from config
      if (parsedJwt.payload.iss !== `https://${env}-${domain}.us.auth0.com/`) {
        yield* new JwtValidationError({ message: "invalid_issuer" });
      }
      if (!parsedJwt.payload.aud.includes("http://localhost:8080")) {
        yield* new JwtValidationError({ message: "invalid_audience" });
      }
      if (parsedJwt.payload.scope !== "openid profile email") {
        yield* new JwtValidationError({ message: "invalid_scope" });
      }
      if (parsedJwt.payload.iat > now) {
        yield* new JwtValidationError({ message: "invalid_issued_at" });
      }

      if (parsedJwt.payload.exp < now) {
        yield* new JwtValidationError({ message: "expired" });
      }

      yield* Effect.tryPromise({
        try: () => jwtVerify(jwt.slice(7), JWKS),
        catch: (e) => {
          console.log(e);
          return new JwtValidationError({ message: "invalid_claims" });
        },
      });
      return parsedJwt;
    });

  return { validateJwt };
});

export const makeRemoteJwks = Effect.gen(function* () {
  const { env, domain } = yield* Auth0ConfigProvider;
  const jwksUri = `https://${env}-${domain}.us.auth0.com/.well-known/jwks.json`;
  yield* Effect.logInfo(`Fetching JWKS from ${jwksUri}`);
  return createRemoteJWKSet(new URL(jwksUri));
});
export class Auth0JwksProvider extends Context.Tag("Auth0JwksProvider")<
  Auth0JwksProvider,
  ReturnType<typeof createRemoteJWKSet>
>() {
  static Layer = Layer.effect(this, makeRemoteJwks);
  static Live = Layer.provide(this.Layer, Auth0ConfigProvider.Live);
}

export class Auth0 extends Context.Tag("Auth0")<
  Auth0,
  {
    validateJwt: (
      jwt: string,
    ) => Effect.Effect<AuthorizationToken, JwtValidationError, never>;
  }
>() {
  static Layer = Layer.scoped(this, make);
  static Live = this.Layer.pipe(
    Layer.provide(Auth0JwksProvider.Live),
    Layer.provide(Auth0ConfigProvider.Live),
  );
  static Test = Layer.scoped(
    this,
    Effect.gen(function* () {
      const encodedJwt = {
        header: {
          alg: "RS256",
          typ: "JWT",
          kid: "1234567890",
        },
        payload: {
          iss: "https://test-domain.us.auth0.com/",
          aud: ["http://localhost:8080"],
          scope: "openid profile email",
          azp: "test-client-id",
          sub: "auth0|123456789012345678901234",
          iat: 1610582400,
          exp: 1610582500,
        },
        signature: "signature",
      };
      return {
        validateJwt: (
          _jwt: string,
        ): Effect.Effect<AuthorizationToken, JwtValidationError, never> => {
          return Effect.succeed(encodedJwt);
        },
      };
    }),
  );
}
