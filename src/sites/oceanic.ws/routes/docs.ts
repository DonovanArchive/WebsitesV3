import githubRoute from "./github";
import { createNodeMiddleware } from "@octokit/webhooks";
import { Router, static as serveStatic } from "express";
import chunk = require("chunk");
import type { PathLike } from "fs";
import { access, readFile } from "fs/promises";
import { execSync } from "child_process";

const app = Router();

const exists = async(path: PathLike) => access(path).then(() => true).catch(() => false);
const baseDir = "/data/docs";
app
	.get("/", async(req, res) => {
		const versions = chunk(await exists(`${baseDir}/versions.json`) ? JSON.parse(await readFile(`${baseDir}/versions.json`, "utf8")) as Array<string> : [], 4);
		return res.render("docs", { versions });
	})
	.use("/hook", createNodeMiddleware(githubRoute, { path: "/" }))
	.get("/latest*", async(req, res) => {
		const tags = execSync("git ls-remote --tags https://github.com/OceanicJS/Oceanic").toString().split("\n").filter(Boolean).map(line => line.split("\t").slice(-1)[0].replace("refs/tags/", ""));
		const latest = tags.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(-1)[0];
		return res.redirect(302, `/${latest}${req.path.replace("/latest", "")}`);
	})
	.use("/:name", async(req,res, next) => {
		if (await access(`${baseDir}/${req.params.name}`).then(() => true, () => false)) serveStatic(`${baseDir}/${req.params.name}`)(req, res, next);
		else return next();
	})
	.use(async(req, res) => res.status(404).end("Not Found"));
/* .use(async(req, res, next) => {
		if (req.originalUrl.split("/")[2] === "assets") {
			req.url = `/${req.url.split("/").slice(3).join("/")}`;
			serveStatic(`${baseDir}/${req.originalUrl.split("/")[1]}/docs/assets`)(req, res, next);
			return;
		}
		if (req.originalUrl.split("?")[0].split("/").length < 3) {
			req.url = `/${req.url.split("/").slice(2).join("/")}`;
			serveStatic(`${baseDir}/${req.originalUrl.split("/")[1]}/docs`)(req, res, next);
			return;
		} else {
			const [,version, ...parts] = req.originalUrl.split("?")[0].split("/");
			const other = parts.slice(1).join("/");
			if (!await exists(`${baseDir}/${version}`)) return res.status(404).end("Invalid Version");
			const json = JSON.parse((await readFile(`${baseDir}/${version}/docs/conversions.json`)).toString()) as Parsed;
			let file: string | undefined;
			switch (parts[0]) {
				case "class": {
					file = json.classes[other];
					break;
				}
				case "enum": {
					file = json.enums[other];
					break;
				}
				case "function": {
					file = json.functions[other];
					break;
				}
				case "interface": {
					file = json.interfaces[other];
					break;
				}
				case "type": {
					file = json.types[other];
					break;
				}
				case "variable": {
					file = json.variables[other];
					break;
				}
				case "module": {
					file = json.modules[other];
					break;
				}
			}

			if (!file) {
				req.url = `/${req.url.split("/").slice(2).join("/")}`;
				serveStatic(`${baseDir}/${req.originalUrl.split("/")[1]}/docs`)(req, res, next);
				return;
			}
			res.status(200).sendFile(`${baseDir}/${version}/docs/${file}`);
		}
	}); */
export default app;
