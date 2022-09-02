import type { Parsed } from "./oceanic.github";
import githubRoute from "./oceanic.github";
import { createNodeMiddleware } from "@octokit/webhooks";
import { Router, static as serveStatic } from "express";
import type { PathLike } from "fs";
import { access, readFile } from "fs/promises";

const app = Router();

const exists = async(path: PathLike) => access(path).then(() => true).catch(() => false);
const baseDir = "/data/docs";
app
	.get("/", async(req, res) => res.redirect("/dev"))
	.use("/hook", createNodeMiddleware(githubRoute, { path: "/" }))
	.use("/:name", async(req,res, next) => {
		if (await access(`${baseDir}/${req.params.name}`).then(() => true, () => false)) serveStatic(`${baseDir}/${req.param.name}`)(req, res, next);
		else return next();
	})
	.use(async(req, res, next) => {
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
	});
export default app;
