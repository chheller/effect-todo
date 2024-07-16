import { logger } from "@bogeychan/elysia-logger";

export default logger({
	autoLogging: true,
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
		},
	},
});
