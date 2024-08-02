import { Context, Effect, Layer } from "effect";

export type ApplicationConfiguration = {
  readonly port: number;
  readonly mongoDBURI: string;
  readonly isDevelopment: boolean;
};
export interface ConfigService {
  readonly get: () => ApplicationConfiguration;
}
export const ConfigService = Context.GenericTag<ConfigService>("ConfigService");

export const makeConfigService = Effect.gen(function* () {
  const port = Number.parseInt(process.env.SERVER_PORT ?? "3001", 10);
  const mongoDBURI =
    process.env.MONGODB_URI ?? "mongodb://localhost:27017/effect";
  const isDevelopment = process.env.NODE_ENV === "development";
  const get = () => ({ port, mongoDBURI, isDevelopment }) as const;
  return ConfigService.of({ get });
});

export const ConfigServiceLive = Layer.scoped(ConfigService, makeConfigService);
