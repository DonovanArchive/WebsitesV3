import Logger from "../../../util/Logger";
import type { PushEvent } from "@octokit/webhooks-types/schema";
import { services } from "@config";
import { Webhooks } from "@octokit/webhooks";
import simpleGit from "simple-git";
import {
	access,
	cp,
	lstat,
	mkdir,
	readFile,
	rm,
	writeFile
} from "fs/promises";
import type { PathLike } from "fs";
import { mkdtempSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { dirname, resolve } from "path";

const hook = new Webhooks({
	secret: services.octo["oceanic-secret"]
});
const exists = async(path: PathLike) => access(path).then(() => true).catch(() => false);
const baseDir = "/data/docs";
hook.on("push", async({ payload: data }) => {
	if (data.ref.startsWith("refs/tags/")) {
		void push(data, "tag");
	} else if (data.ref.startsWith("refs/heads/")) {
		void push(data, "branch");
	}
});
hook.on("delete", async({ payload: data }) => {
	const branch = data.ref.split("/")[2];
	const path = sanitizedPathFor(branch);
	await checkBranch(path, branch);
	const versions = await exists(`${baseDir}/versions.json`) ? JSON.parse(await readFile(`${baseDir}/versions.json`, "utf8")) as Array<string> : [];
	if (versions.includes(branch)) {
		versions.splice(versions.indexOf(branch), 1);
		await writeFile(`${baseDir}/versions.json`, JSON.stringify(versions));
	}
});

async function push(data: PushEvent, type: "tag" | "branch") {
	const branch = data.ref.split("/")[2];
	const path = sanitizedPathFor(branch);
	await checkBranch(path, branch);
	const tmp = `${tmpdir()}/${mkdtempSync("oceanic.")}`;
	await mkdir(tmp, { recursive: true });
	const git = simpleGit(tmp);
	await git
		.init()
		.addRemote("origin", "https://github.com/OceanicJS/Oceanic")
		.fetch("origin", `${branch}:${branch}`)
		.checkout(branch);
	await rm(`${tmp}/.npmrc`);
	execSync("npx pnpm i --frozen-lockfile --ignore-scripts", { cwd: tmp, stdio: "inherit" });
	execSync("npx pnpm run test:docs", { cwd: tmp, stdio: "inherit" });
	await cp(`${tmp}/docs`, path, { recursive: true });
	await rm(tmp, { force: true, recursive: true });
	const versions = await exists(`${baseDir}/versions.json`) ? JSON.parse(await readFile(`${baseDir}/versions.json`, "utf8")) as Array<string> : [];
	if (!versions.includes(branch)) {
		if (type === "branch") {
			const hasDev = versions[0] === "dev";
			if (hasDev) versions.splice(1, 0, branch);
			else versions.unshift(branch);
		} else {
			versions.push(branch);
		}
		await writeFile(`${baseDir}/versions.json`, JSON.stringify(versions));
	}
}

function sanitizedPathFor(str: string) {
	str = str.replace(/^(\.\.(\/|\\|$))+/, "");
	const p = resolve(baseDir, str);
	if (dirname(p) !== baseDir) {
		// if we smell funny business, exit immediately
		throw new Error(`Dirname of path "${p}" does not match "${baseDir}"`);
	}

	return p;
}

async function checkBranch(path: string, branch: string) {
	if (branch.startsWith("dependabot")) {
		Logger.getLogger("Github").info(`Ignoring dependabot branch ${branch}`);
		return;
	}
	if (branch.includes("/")) {
		Logger.getLogger("Github").warn(`Refusing to process branch "${branch}"`);
		return;
	}
	if (await exists(path)) {
		if (await lstat(path).then(stat => stat.isFile())) {
			throw new Error(`Refusing to overwrite file "${path}" for branch "${branch}"`);
		}
		await rm(path, { force: true, recursive: true });
	}

	return path;
}

// https://github.com/DonovanDMC/Websites/blob/7834354b78053d3f0a6755cdcd703406667c5b11/src/sites/oceanic.ws/routes/github.ts

export default hook;
