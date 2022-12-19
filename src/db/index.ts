import { services } from "@config";
import Logger from "@util/Logger";
import { Timer } from "@uwu-codes/utils";
import type { Pool } from "mariadb";
import mariadb from "mariadb";
import Redis from "ioredis";

export default class db {
	static pool: Pool;
	static r: Redis;
	static async init(sql = true, redis = true) {
		const start = Timer.start();
		if (sql) await this.initMariaDb();
		if (redis) await this.initRedis();
		const end = Timer.end();
		Logger.getLogger("Database[General]").debug(`Initialization complete in ${Timer.calc(start, end, 0, false)}`);
	}

	static async initMariaDb() {
		const uri = `mariadb://${services.mariadb.host}:${services.mariadb.port}`;
		Logger.getLogger("Database[MariaDB]").debug(`Connecting to ${uri} (ssl: ${services.mariadb.ssl ? "Yes" : "No"})`);
		const start = Timer.start();
		try {
			this.pool = mariadb.createPool({
				...services.mariadb,
				connectionLimit: 5
			});
		} catch (err) {
			Logger.getLogger("Database[MariaDB]").error("Error while connecting:", err);
			return;
		}
		const end = Timer.end();
		Logger.getLogger("Database[MariaDB]").debug(`Successfully connected in ${Timer.calc(start, end, 0, false)}`);
	}

	static async initRedis() {
		return new Promise<void>(resolve => {
			const start = Timer.start();
			Logger.getLogger("Database[Redis]").debug(`Connecting to redis://${services.redis.host}:${services.redis.port} using user "${services.redis.username ?? "default"}", and db ${services.redis.db}`);
			this.r = new Redis(services.redis.port, services.redis.host, {
				username:         services.redis.username,
				password:         services.redis.password,
				db:               services.redis.db,
				connectionName:   "Web",
				enableReadyCheck: true
			});

			this.r
				.on("connect", () => {
					const end = Timer.end();
					Logger.getLogger("Database[Redis]").debug(`Successfully connected in ${Timer.calc(start, end, 0, false)}`);
				})
				.on("ready", () => resolve());
		});
	}

	static get query() { return this.pool.query.bind(this.pool); }
}
