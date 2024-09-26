import {
  HttpMiddleware,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";

import { Effect } from "effect";
import { Auth0, AuthorizationSchema, AuthorizationToken } from "./auth0";

export const authorizationMiddleware = Effect.map(Auth0, (auth0) =>
  HttpMiddleware.make((app) =>
    Effect.provideServiceEffect(
      app,
      AuthorizationToken,
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const authorization = request.headers.authorization;
        return yield* auth0.validateJwt(authorization);
      }),
    ).pipe(
      // Catch only JwtValidationError exceptions as other exceptions thrown elsewhere in the application may also be caught heres
      Effect.catchTag("JwtValidationError", (e) => {
        return Effect.logError(`Authorization exception, ${e}`).pipe(
          Effect.map(() =>
            HttpServerResponse.unsafeJson(
              { message: "Unauthorized" },
              { status: 401 },
            ),
          ),
        );
      }),
    ),
  ),
);
