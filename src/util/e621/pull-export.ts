/* eslint-disable no-async-promise-executor */
import "../MonkeyPatch";
import type { PostData } from "./parse/posts";
import { type RawPost, parse as parsePost } from "./parse/posts";
import type { TagAliasData } from "./parse/tag_aliases";
import { type RawTagAlias, parse as parseTagAlias } from "./parse/tag_aliases";
import type { TagImplicationData } from "./parse/tag_implications";
import { type RawTagImplication, parse as parseTagImplication } from "./parse/tag_implications";
import type { TagData } from "./parse/tags";
import { type RawTag, parse as parseTag } from "./parse/tags";
import type { WikiPageData } from "./parse/wiki_pages";
import { type RawWikiPage, parse as parseWikiPage } from "./parse/wiki_pages";
import type { RawPool } from "./parse/pools";
import { type PoolData, parse as parsePool } from "./parse/pools";
import Logger from "../Logger";
import { parse } from "csv-parse";
import { Timer } from "@uwu-codes/utils";
import { Database, type RunResult } from "sqlite3";
import { exec } from "child_process";
import { tmpdir } from "os";
import { basename } from "path";
import { createReadStream, mkdirSync, readFileSync } from "fs";
import { access, readFile, readdir } from "fs/promises";


const dir = `${tmpdir()}/e621-import`;
mkdirSync(dir, { recursive: true });
export const db = new Database(`${dir}/e621.db`);
let initialized = false;
export const run = async(sql: string, params?: unknown) => new Promise<RunResult>(async(resolve, reject) => {
	if (!initialized) await init();
	db.run(sql, params, function(err) {
		if (err) reject(err);
		else resolve(this);
	});
});

export const get = async<T = unknown>(sql: string, params?: unknown) => new Promise<T>(async(resolve, reject) => {
	if (!initialized) await init();
	db.get(sql, params, function(err, row: T) {
		if (err) reject(err);
		else resolve(row);
	});
});

export async function init() {
	initialized = true;
	await new Promise<void>(resolve => {
		db.serialize(async() => {
			const d = __filename.endsWith(".ts") ? `${__dirname}/init` : `${__dirname}/../../../../src/util/e621/init`;
			for (const f of await readdir(d)) {
				const sql = await readFile(`${d}/${f}`, "utf8");
				await run(sql);
			}
			resolve();
		});
	});
}
const types = ["pools", "posts", "tag_aliases", "tag_implications", "tags", "wiki_pages"] as const;
type ExportType = typeof types[number];
function getURL(type: ExportType, d = new Date(Date.now() - 86400000)) {
	return `https://e621.net/db_export/${type}-${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${(d.getDate()).toString().padStart(2, "0")}.csv.gz`;
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
	T extends "pools" ? PoolData :
		T extends "posts" ? PostData :
			T extends "tag_aliases" ? TagAliasData :
				T extends "tag_implications" ? TagImplicationData :
					T extends "tags" ? TagData :
						T extends "wiki_pages" ? WikiPageData :
							never;

async function getExport<T extends ExportType>(type: T, cb: (record: ExportConversion<T>, rowCount: number) => Promise<void>) {
	const parser = parse({
		columns: true,
		onRecord(record: RawPool | RawPost | RawTagAlias | RawTagImplication | RawTag | RawWikiPage) {
			switch (type) {
				case "pools": return parsePool(record as RawPool);
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
			await cb(record as unknown as ExportConversion<T>, rowCount);
		}
	});
	const file = await download(type);
	const rowCount = await new Promise<number>((resolve, reject) => {
		exec(`python -c "import sys; import csv; csv.field_size_limit(sys.maxsize); print(sum(1 for i in csv.reader(open('${file}'))))"`, (err, out) => {
			if (err) reject(err);
			else resolve(Number(out));
		});
	});
	console.log("Counted %d rows for %s", rowCount, type);
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

export async function refresh() {
	Logger.getLogger("E621Refresh").info("Refreshing e621 database...");
	const start = Timer.getTime();
	for (const type of types) {
		const startSpecific = Timer.getTime();
		let columns: Array<string> | undefined;
		await run("BEGIN TRANSACTION");
		let i = 0;
		await new Promise<void>(resolve => {
			db.serialize(async() => {
				await getExport(type, async(record, rowCount) => {
					if (!columns) columns = Object.keys(record);
					if ((++i % 25000) === 0) {

						process.stdout.cursorTo(0);
						process.stdout.clearLine(0);
						process.stdout.write(`Collecting for insert... ${Math.round(((i / rowCount) * 100 + Number.EPSILON) * 100) / 100}%`);
					}
					await run(`REPLACE INTO ${type} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`, Object.values(record));
				});
				await run("COMMIT TRANSACTION");
				process.stdout.cursorTo(0);
				process.stdout.clearLine(0);
				resolve();
			});
		});
		const endSpecific = Timer.getTime();
		Logger.getLogger("E621Refresh").info(`Refreshed ${type} in ${Timer.calc(startSpecific, endSpecific, 0, false)}`);
	}
	const end = Timer.getTime();
	Logger.getLogger("E621Refresh").info(`Refreshed in ${Timer.calc(start, end, 0, false)}`);
	await new Promise(resolve => db.close(resolve));
}

const qdir = __filename.endsWith(".ts") ? `${__dirname}/query` : `${__dirname}/../../../../src/util/e621/query`;

export const QueryDictionary = {
	postRatingStats: readFileSync(`${qdir}/post-rating-stats.sql`, "utf8")
};

function pct(a: number, b: number) {
	return (a / b) * 100;
}

export async function getStats() {
	const res = await get<{
		destroyed: number;
		explicit_approved: number;
		explicit_deleted: number;
		explicit_pending: number;
		explicit: number;
		max: number;
		questionable_approved: number;
		questionable_deleted: number;
		questionable_pending: number;
		questionable: number;
		safe_approved: number;
		safe_deleted: number;
		safe_pending: number;
		safe: number;
	}>(QueryDictionary.postRatingStats);
	return {
		destroyed:             [res.destroyed, pct(res.destroyed, res.max)],
		explicit_approved:     [res.explicit_approved, pct(res.explicit_approved, res.explicit)],
		explicit_deleted:      [res.explicit_deleted, pct(res.explicit_deleted, res.explicit)],
		explicit_pending:      [res.explicit_pending, pct(res.explicit_pending, res.explicit)],
		explicit:              [res.explicit, pct(res.explicit, res.max)],
		max:                   [res.max, 100],
		questionable_approved: [res.questionable_approved, pct(res.questionable_approved, res.questionable)],
		questionable_deleted:  [res.questionable_deleted, pct(res.questionable_deleted, res.questionable)],
		questionable_pending:  [res.questionable_pending, pct(res.questionable_pending, res.questionable)],
		questionable:          [res.questionable, pct(res.questionable, res.max)],
		safe_approved:         [res.safe_approved, pct(res.safe_approved, res.safe)],
		safe_deleted:          [res.safe_deleted, pct(res.safe_deleted, res.safe)],
		safe_pending:          [res.safe_pending, pct(res.safe_pending, res.safe)],
		safe:                  [res.safe, pct(res.safe, res.max)]
	};
}
