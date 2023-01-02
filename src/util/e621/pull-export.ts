import "../MonkeyPatch";
import { type RawPost, parse as parsePost } from "./parse/posts";
import { type RawTagAlias, parse as parseTagAlias } from "./parse/tag_aliases";
import { type RawTagImplication, parse as parseTagImplication } from "./parse/tag_implications";
import { type RawTag, parse as parseTag } from "./parse/tags";
import { type RawWikiPage, parse as parseWikiPage } from "./parse/wiki_pages";
import type { RawE621Post } from "../../db/Models/E621Post";
import type { RawE621TagAlias } from "../../db/Models/E621TagAlias";
import type { RawE621TagImplication } from "../../db/Models/E621TagImplication";
import type { RawE621Tag } from "../../db/Models/E621Tag";
import type { RawE621WikiPage } from "../../db/Models/E621WikiPage";
import { services } from "../../config";
import Logger from "../Logger";
import { parse } from "csv-parse";
import { Timer } from "@uwu-codes/utils";
import type { Connection, SqlError } from "mariadb";
import { createConnection } from "mariadb";
import chunk from "chunk";
import debug from "debug";
import { exec } from "child_process";
import { tmpdir } from "os";
import { basename } from "path";
import { createReadStream } from "fs";
import { access } from "fs/promises";
import assert from "assert";

const types = ["posts", "tag_aliases", "tag_implications", "tags", "wiki_pages"] as const;
type ExportType = typeof types[number];
function getURL(type: ExportType, d = new Date(Date.now() - 86400000)) {
	return `https://e621.net/db_export/${type}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}.csv.gz`;
}

async function download(type: ExportType) {
	const name = basename(getURL(type)).replace(/\.gz$/, "");
	const file = `${tmpdir()}/${name}`;
	if (await access(file).then(() => true, () => false)) return file;
	await new Promise<void>((resolve, reject) => {
		exec(`wget -q -O - ${getURL(type)} | gunzip > ${file}`, (err) => err ? reject(err) : resolve());
	});
	return file;
}

type ExportConversion<T extends ExportType> =
	T extends "posts" ? RawE621Post :
		T extends "tag_aliases" ? RawE621TagAlias :
			T extends "tag_implications" ? RawE621TagImplication :
				T extends "tags" ? RawE621Tag :
					T extends "wiki_pages" ? RawE621WikiPage :
						never;

async function getExport<T extends ExportType>(type: T, cb: (record: ExportConversion<T>) => Promise<void>) {
	const parser = parse({
		columns: true,
		onRecord(record: RawPost | RawTagAlias | RawTagImplication | RawTag | RawWikiPage) {
			switch (type) {
				case "posts": return parsePost(record as RawPost);
				case "tag_aliases": return parseTagAlias(record as RawTagAlias);
				case "tag_implications": return parseTagImplication(record as RawTagImplication);
				case "tags": return parseTag(record as RawTag);
				case "wiki_pages": return parseWikiPage(record as RawWikiPage);
			}
		}
	});
	parser.on("readable", async() => {
		let record: unknown;
		while ((record = parser.read() as unknown)) {
			await cb(record as unknown as ExportConversion<T>);
		}
	});
	const file = await download(type);
	return new Promise<void>(resolve => {
		const read = createReadStream(file);
		parser.on("error", (err) => console.error(err.message));
		parser.on("end", () => {
			read.close();
			parser.end();
			resolve();
		});
		read.pipe(parser);
	});
}

async function getConnection() {
	const uri = `mariadb://${services.mariadb.host}:${services.mariadb.port}`;
	Logger.getLogger("E621Refresh[MariaDB]").debug(`Connecting to ${uri} (ssl: ${services.mariadb.ssl ? "Yes" : "No"})`);
	const start = Timer.start();
	const conn = await createConnection({
		...services.mariadb,
		host: "172.19.2.2"
	});
	const end = Timer.end();
	Logger.getLogger("E621Refresh[MariaDB]").debug(`Successfully connected in ${Timer.calc(start, end, 0, false)}`);
	return conn;
}

async function runBatch(conn: Connection, query: string, values: Array<unknown>, retry = 0) {
	debug("e621:refresh:query")(query);
	return conn.batch(query, values)
		.catch(async(err: SqlError) => {
			console.error(query);
			console.error(err);
			if (retry < 2) {
				retry++;
				console.log("Retrying smaller batch insert (%d/2, %d -> %d)...", retry, retry === 1 ? 10000 : 1000, retry === 1 ? 1000 : 100);
				const chunks = chunk(values, retry === 1 ? 1000 : 100);
				for (const part of chunks) {
					await runBatch(conn, query, part, retry);
				}
			} else {
				console.log("Failed to insert %d records.", values.length);
			}
		});
}

export async function refresh() {
	Logger.getLogger("E621Refresh").info("Refreshing e621 database...");
	const db = await getConnection();
	const start = Timer.getTime();
	for (const type of types) {
		const startSpecific = Timer.getTime();
		let records: Array<object> = [], columns: Array<string> | undefined;
		await getExport(type, async(record) => {
			if (!columns) columns = Object.keys(record);
			records.push(record);
			if (records.length >= 10000) {
				console.log("Importing %s #%d - #%d", type, (records[0] as { id: number; }).id, (records[records.length - 1] as { id: number; }).id);
				await runBatch(db, `INSERT INTO e621.${type} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")}) ON DUPLICATE KEY UPDATE ${columns.map(k => `${k}=VALUES(${k})`).join(", ")}`, records.map(r => Object.values(r) as unknown));
				records = [];
			}
		});
		if (records.length > 0) {
			assert(columns);
			console.log("Importing %s #%d - #%d", type, (records[0] as { id: number; }).id, (records[records.length - 1] as { id: number; }).id);
			await runBatch(db, `INSERT INTO e621.${type} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")}) ON DUPLICATE KEY UPDATE ${columns.map(k => `${k}=VALUES(${k})`).join(", ")}`, records.map(r => Object.values(r) as unknown));
			records = [];
		}
		const endSpecific = Timer.getTime();
		Logger.getLogger("E621Refresh").info(`Refreshed ${type} in ${Timer.calc(startSpecific, endSpecific, 0, false)}`);
	}
	const end = Timer.getTime();
	Logger.getLogger("E621Refresh").info(`Refreshed in ${Timer.calc(start, end, 0, false)}`);
	await db.end();
}

void refresh();
