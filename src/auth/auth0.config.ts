import { Config, Context, Effect, Layer, Redacted } from "effect";

function mapConfig([env, domain, clientId, clientSecret]: [
  env: "dev" | "stage" | "prod",
  domain: string,
  clientId: Redacted.Redacted,
  clientSecret: Redacted.Redacted,
]) {
  return {
    env,
    domain,
    clientId,
    clientSecret,
  };
}

const config = Config.all([
  Config.literal("dev", "stage", "prod")("AUTH0_ENV"),
  Config.string("AUTH0_DOMAIN"),
  Config.redacted("AUTH0_CLIENT_ID"),
  Config.redacted("AUTH0_CLIENT_SECRET"),
]);

export const Auth0Config = Config.map(config, mapConfig);

export type Auth0Config = {
  env: string;
  domain: string;
  clientId: Redacted.Redacted;
  clientSecret: Redacted.Redacted;
};

export class Auth0ConfigProvider extends Context.Tag("Auth0ConfigProvider")<
  Auth0ConfigProvider,
  Auth0Config
>() {
  static Live = Layer.scoped(this, Auth0Config);
  static Test = Layer.scoped(
    this,
    Effect.succeed({
      env: "test",
      domain: "test",
      clientId: Redacted.make("test"),
      clientSecret: Redacted.make("test"),
    }),
  );
}
