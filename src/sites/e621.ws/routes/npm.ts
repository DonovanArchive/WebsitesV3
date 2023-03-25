import { Router, static as serveStatic } from "express";
import chunk = require("chunk");
import type { PathLike } from "fs";
import { access, readFile } from "fs/promises";
import { execSync } from "child_process";

const app = Router();

const exists = async(path: PathLike) => access(path).then(() => true).catch(() => false);
const baseDir = "/data/docs";
app
	.get("/", async(req,res) => res.render("npm/index"))
	.use("/e621-mod-actions", Router()
		.get("/", async(req, res) => {
			const versions = chunk(await exists(`${baseDir}/e621-mod-actions/versions.json`) ? JSON.parse(await readFile(`${baseDir}/e621-mod-actions/versions.json`, "utf8")) as Array<string> : [], 4);
			return res.render("npm/versions", { versions, name: "e621-mod-actions" });
		})
		.get("/latest*", async(req, res) => {
			const tags = execSync("git ls-remote --tags https://github.com/DonovanDMC/E621ModActions").toString().split("\n").filter(Boolean).map(line => line.split("\t").slice(-1)[0].replace("refs/tags/", ""));
			const latest = tags.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(-1)[0];
			return res.redirect(302, `/e621-mod-actions/${latest}${req.path.replace("/latest", "")}`);
		})
		.use("/:name", async(req,res, next) => {
			if (await access(`${baseDir}/e621-mod-actions/${req.params.name}`).then(() => true, () => false)) serveStatic(`${baseDir}/e621-mod-actions/${req.params.name}`)(req, res, next);
			else return next();
		})
	)
	.use("/e621", Router()
		.get("/", async(req, res) => {
			const versions = chunk(await exists(`${baseDir}/e621/versions.json`) ? JSON.parse(await readFile(`${baseDir}/e621/versions.json`, "utf8")) as Array<string> : [], 4);
			return res.render("npm/versions", { versions, name: "e621" });
		})
		.get("/latest*", async(req, res) => {
			const tags = execSync("git ls-remote --tags https://github.com/DonovanDMC/E621").toString().split("\n").filter(Boolean).map(line => line.split("\t").slice(-1)[0].replace("refs/tags/", ""));
			const latest = tags.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(-1)[0];
			return res.redirect(302, `/e621/${latest}${req.path.replace("/latest", "")}`);
		})
		.use("/:name", async(req,res, next) => {
			if (await access(`${baseDir}/e621/${req.params.name}`).then(() => true, () => false)) serveStatic(`${baseDir}/e621/${req.params.name}`)(req, res, next);
			else return next();
		})
	)
	.use(async(req, res) => res.status(404).end("Not Found"));

export default app;
