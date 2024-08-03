import { Config } from "effect";

function ServerConfig([hostname, port, isDevelopment]: [
  hostname: string | undefined,
  port: number,
  isDevelopment: boolean,
]) {
  return { hostname, port, isDevelopment };
}

const serverConfig = Config.all([
  Config.string("HOSTNAME").pipe(Config.withDefault(undefined)),
  Config.number("PORT").pipe(Config.withDefault(8080)),
  Config.boolean("IS_DEVELOPMENT").pipe(Config.withDefault(true)),
]);

export const ServerConfigLive = Config.map(
  Config.nested(serverConfig, "SERVER"),
  ServerConfig,
);