import "./util/MonkeyPatch";
import db from "./db";
import type { ExtendedWebsite } from "@lib/Website";
import { readdirSync } from "fs";

const sites = readdirSync(`${__dirname}/sites`).map(s => s.toLowerCase());

const activeSite = process.env.SITE || null;
if (!activeSite) {
	console.error("missing SITE environment variable.");
	process.exit(1);
}

if (!sites.includes(activeSite.toLowerCase())) {
	console.error("Invalid value \"%s\" in SITE environment variable.", activeSite);
	process.exit(1);
}

void db.init().then(() => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const site = require(`${__dirname}/sites/${activeSite}/index.js`) as Record<"default", ExtendedWebsite>;

	void (new site.default()).listen().then(server => process.on("SIGINT", () => server.close()));
});
process
	.on("uncaughtException", (err, origin) => console.error("Uncaught Exception", origin, err))
	.on("unhandledRejection", (reason, promise) => console.error("Unhandled Rejection", reason, promise));
