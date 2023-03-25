import type { PushEvent } from "@octokit/webhooks-types/schema";
import { services } from "@config";
import { Webhooks } from "@octokit/webhooks";
import simpleGit from "simple-git";
import {
	access,
	cp,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile
} from "fs/promises";
import type { PathLike } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";

const hook = new Webhooks({
	secret: services.octo.e621
});
const exists = async(path: PathLike) => access(path).then(() => true).catch(() => false);
const baseDir = "/data/docs/e621-mod-actions";
hook.on("push", async({ payload: data }) => {
	if (data.ref.startsWith("refs/tags/")) {
		void tagPush(data);
	} else if (data.ref === "refs/heads/dev") {
		void devPush(data);
	}
});

async function tagPush(data: PushEvent) {
	const tmp = `${tmpdir()}/${await mkdtemp("e621-mod-actions.")}`;
	await mkdir(tmp, { recursive: true });
	const tag = data.ref.split("/")[2];
	if (await exists(`${baseDir}/${tag}`)) await rm(`${baseDir}/${tag}`, { force: true, recursive: true });
	const git = simpleGit(tmp);
	await git
		.init()
		.addRemote("origin", "https://github.com/DonovanDMC/E621ModActions")
		.fetch("origin", `${tag}:${tag}`)
		.checkout(tag);
	await writeFiles(tmp);
	execSync("npm i --ignore-scripts typedoc typedoc-plugin-extras typedoc-plugin-rename-defaults && npx --yes typedoc", { cwd: tmp, stdio: "inherit" });
	await cp(`${tmp}/docs`, `${baseDir}/${tag}`, { recursive: true });
	await rm(tmp, { force: true, recursive: true });
	const versions = await exists(`${baseDir}/versions.json`) ? JSON.parse(await readFile(`${baseDir}/versions.json`, "utf8")) as Array<string> : [];
	if (!versions.includes(tag)) {
		versions.push(tag);
		await writeFile(`${baseDir}/versions.json`, JSON.stringify(versions));
	}
}

async function devPush(data: PushEvent) {
	const tmp = `${tmpdir()}/${await mkdtemp("e621-mod-actions.")}`;
	await mkdir(tmp, { recursive: true });
	const branch = data.ref.split("/")[2];
	if (await exists(`${baseDir}/${branch}`)) await rm(`${baseDir}/${branch}`, { force: true, recursive: true });
	const git = simpleGit(tmp);
	await git
		.init()
		.addRemote("origin", "https://github.com/DonovanDMC/E621ModActions")
		.fetch("origin", `${branch}:${branch}`)
		.checkout(branch);
	await writeFiles(tmp);
	// make sure to add to .github/workflows/docs.yml
	execSync("npm i --ignore-scripts typedoc typedoc-plugin-extras typedoc-plugin-rename-defaults && npx --yes typedoc", { cwd: tmp, stdio: "inherit" });
	await cp(`${tmp}/docs`, `${baseDir}/${branch}`, { recursive: true });
	await rm(tmp, { force: true, recursive: true });
}

async function writeFiles(tmp: string) {

	await writeFile(`${tmp}/dark.cjs`, "\n\
const { JSX } = require(\"typedoc\");\n\
\n\
// https://github.com/TypeStrong/typedoc/issues/1840#issuecomment-1012736455\n\
exports.load = function load(app) {\n\
	app.renderer.hooks.on(\"head.begin\", () => {\n\
		return JSX.createElement(\"script\", null,\n\
		JSX.createElement(JSX.Raw, { html: \"localStorage.setItem('tsd-theme', localStorage.getItem('tsd-theme') || 'dark')\" }));\n\
	});\n\
}");
	await writeFile(`${tmp}/typedoc.json`, JSON.stringify({
		$schema:     "https://typedoc.org/schema.json",
		name:        "E621 Mod Actions",
		entryPoints: [
			"lib/"
		],
		plugin: [
			"typedoc-plugin-rename-defaults",
			"typedoc-plugin-extras",
			`${tmp}/dark.cjs`
		],
		tsconfig:           "tsconfig.json",
		entryPointStrategy: "expand",
		excludePrivate:     true,
		excludeProtected:   true,
		githubPages:        false,
		hideGenerator:      true,
		gitRemote:          "origin",
		readme:             "README.md",
		out:                "docs",
		json:               "docs/docs.json",
		exclude:            [],
		favicon:            "favicon.ico",
		customTitleLink:    "https://npm.e621.ws/mod-actions"
	}));
	await writeFile(`${tmp}/favicon.ico`, Buffer.from("AAABAAEAIBUAAAEAIAD8CgAAFgAAACgAAAAgAAAAKgAAAAEAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADcbAACZUCpKmVAqnplQKsyZUCrMmVAqnplQKkoYDxMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACZUCoemVAqwJlQKv+ZUCr/mVAq/5lQKv+ZUCr/mVAq/5lQKsCZUCoeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmVAqEJlQKuCZUCr/mVAq/5lQKv+ZUCr/mVAq/5lQ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", "base64"));
}

export default hook;
