import indexRoute from "./routes/index";
import { services } from "../../config";
import db from "../../db";
import Website from "@lib/Website";
import { Router } from "express";
import multer from "multer";
import { tmpdir } from "os";
import { readFile } from "fs/promises";

const temp = multer({ dest: tmpdir() });
export default class YiffRocks extends Website {
	constructor() {
		super("yiff.rocks", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.disableNonce()
			.init();

		this
			.addStatic("/app/public")
			.addSubdomain("temp", Router()
				.get("/:id", async(req, res) => {
					const buffer = await db.r.getBuffer(`temp:${req.params.id}`);
					if (buffer === null) return res.status(404).end("Not found");
					// tsc transforms dynamic import statements to require, and file-type is esm, which needs an import statement
					// eslint-disable-next-line no-eval, @typescript-eslint/consistent-type-imports
					const { fileTypeFromBuffer } = await eval("import('file-type')") as typeof import("file-type");
					const info = await fileTypeFromBuffer(buffer);
					return res.status(200).header("Content-Type", info?.mime || "application/octet-stream").end(buffer);
				})
				.use(async(req, res, next) => {
					if (req.headers.authorization !== services.temp) return res.status(401).end();
					return next();
				})
				.put("/:id", temp.single("file"), async(req, res) => {
					if (!req.file) return res.status(400).end("Invalid file.");
					await db.r.setBuffer(`temp:${req.params.id}`, await readFile(req.file.path), "EX", 300, "GET");
					return res.status(201).end(`https://temp.yiff.rocks/${req.params.id}`);
				})
			)
			.addHandler(indexRoute);
	}
}
