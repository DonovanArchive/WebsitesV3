import { services } from "@config";
import { Webhooks } from "@octokit/webhooks";
import simpleGit from "simple-git";
import {
	access,
	cp,
	mkdir,
	readdir,
	readFile,
	rm,
	writeFile
} from "fs/promises";
import type { PathLike } from "fs";
import { mkdtempSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";

const hook = new Webhooks({
	secret: services.octo["oceanic-secret"]
});
const exists = async(path: PathLike) => access(path).then(() => true).catch(() => false);
const baseDir = "/data/docs";
hook.on("push", async({ payload: data }) => {
	if (data.ref.startsWith("refs/tags/")) {
		const tmp = `${tmpdir()}/${mkdtempSync("oceanic.")}`;
		await mkdir(tmp, { recursive: true });
		const tag = data.ref.split("/")[2];
		if (await exists(`${baseDir}/${tag}`)) await rm(`${baseDir}/${tag}`, { force: true, recursive: true });
		const git = simpleGit(tmp);
		await git
			.init()
			.addRemote("origin", "https://github.com/OceanicJS/Oceanic")
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
		/* const list = await createList(`${baseDir}/${tag}`, tag);
		await replaceAll(`${baseDir}/${tag}`, list.replacements, list.localReplacements);
		await writeFile(`${baseDir}/${tag}/conversions.json`, JSON.stringify(list, null, "\t")); */
	} else if (data.ref === "refs/heads/dev") {
		const tmp = `${tmpdir()}/${mkdtempSync("oceanic.")}`;
		await mkdir(tmp, { recursive: true });
		const branch = data.ref.split("/")[2];
		if (await exists(`${baseDir}/${branch}`)) await rm(`${baseDir}/${branch}`, { force: true, recursive: true });
		const git = simpleGit(tmp);
		await git
			.init()
			.addRemote("origin", "https://github.com/OceanicJS/Oceanic")
			.fetch("origin", `${branch}:${branch}`)
			.checkout(branch);
		await writeFiles(tmp);
		// make sure to add to .github/workflows/docs.yml
		execSync("npm i --ignore-scripts typedoc typedoc-plugin-extras typedoc-plugin-rename-defaults && npx --yes typedoc", { cwd: tmp, stdio: "inherit" });
		await cp(`${tmp}/docs`, `${baseDir}/${branch}`, { recursive: true });
		await rm(tmp, { force: true, recursive: true });
	}
});

async function writeFiles(tmp: string) {

	await writeFile(`${tmp}/dark.js`, "\n\
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
		name:        "Oceanic",
		entryPoints: [
			"lib/"
		],
		plugin: [
			"typedoc-plugin-rename-defaults",
			"typedoc-plugin-extras",
			`${tmp}/dark.js`
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
		exclude:            [
			"lib/util/Properties.ts"
		],
		favicon:         "favicon.ico",
		customTitleLink: "https://docs.oceanic.ws"
	}));
	await writeFile(`${tmp}/favicon.ico`, Buffer.from("AAABAAEAIBUAAAEAIAD8CgAAFgAAACgAAAAgAAAAKgAAAAEAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADcbAACZUCpKmVAqnplQKsyZUCrMmVAqnplQKkoYDxMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACZUCoemVAqwJlQKv+ZUCr/mVAq/5lQKv+ZUCr/mVAq/5lQKsCZUCoeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmVAqEJlQKuCZUCr/mVAq/5lQKv+ZUCr/mVAq/5lQ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", "base64"));
}

async function createList(path: string, refName: string) {
	const replacements: Array<[string, string]> = [
		["assets/", `/${refName}/assets/`],
		["favicon.ico", `/${refName}/favicon.ico`]
	];
	const localReplacements: Array<{ dir: string; from: string; to: string; }> = [];
	const classes: Record<string, string> = {};
	const enums: Record<string, string> = {};
	const functions: Record<string, string> = {};
	const interfaces: Record<string, string> = {};
	const types: Record<string, string> = {};
	const variables: Record<string, string> = {};
	const modules: Record<string, string> = {};
	for (const file of await readdir(`${path}/classes`)) {
		const [, name] = file.split(".");
		replacements.push([`classes/${file}`, `/${refName}/class/${name}`]);
		localReplacements.push({ dir: "classes", from: file, to: `/${refName}/class/${name}` });
		classes[name] = `classes/${file}`;
	}
	for (const file of await readdir(`${path}/enums`)) {
		const [, name] = file.split(".");
		replacements.push([`enums/${file}`, `/${refName}/enum/${name}`]);
		localReplacements.push({ dir: "enums", from: file, to: `/${refName}/enum/${name}` });
		enums[name] = `enums/${file}`;
	}
	for (const file of await readdir(`${path}/functions`)) {
		const [start, name] = file.split(".");
		const className = start.split("_").slice(-1)[0];
		replacements.push([`functions/${file}`, `/${refName}/function/${className}/${name}`]);
		localReplacements.push({ dir: "functions", from: file, to: `/${refName}/function/${className}/${name}` });
		functions[`${className}/${name}`] = `functions/${file}`;
	}
	for (const file of await readdir(`${path}/interfaces`)) {
		const [, name] = file.split(".");
		replacements.push([`interfaces/${file}`, `/${refName}/interface/${name}`]);
		localReplacements.push({ dir: "interfaces", from: file, to: `/${refName}/interface/${name}` });
		interfaces[name] = `interfaces/${file}`;
	}
	for (const file of await readdir(`${path}/types`)) {
		const [, name] = file.split(".");
		replacements.push([`types/${file}`, `/${refName}/types/${name}`]);
		localReplacements.push({ dir: "types", from: file, to: `/${refName}/type/${name}` });
		types[name] = `types/${file}`;
	}
	for (const file of await readdir(`${path}/variables`)) {
		const [, name] = file.split(".");
		replacements.push([`variables/${file}`, `/${refName}/variable/${name}`]);
		localReplacements.push({ dir: "variables", from: file, to: `/${refName}/variable/${name}` });
		variables[name] = `variables/${file}`;
	}
	for (const file of await readdir(`${path}/modules`)) {
		const name = (await readFile(`${path}/modules/${file}`)).toString().match(/<title>(.*)<\/title>/)?.[1].split("|")[0].trim() || file.replace(".html", "");
		replacements.push([`modules/${file}`, `/${refName}/module/${name}`]);
		localReplacements.push({ dir: "modules", from: file, to: `/${refName}/module/${name}` });
		modules[name] = `modules/${file}`;
	}

	return { classes, enums, functions, interfaces, types, variables, modules, replacements, localReplacements } as Parsed;
}

async function getAllHTML(path: string): Promise<Array<string>> {
	const list: Array<string> = [];
	for (const d of await readdir(path, { withFileTypes: true })) {
		if (d.isDirectory()) list.push(...await getAllHTML(`${path}/${d.name}`));
		else if (d.name.endsWith(".html")) list.push(`${path}/${d.name}`);
	}

	return list;
}

async function replaceAll(path: string, replacements: Array<[string, string]>, localReplacements: Array<{ dir: string; from: string; to: string; }>) {
	const files = (await Promise.all((await getAllHTML(path)).map(async(file) => ({
		[file]: (await readFile(file)).toString()
	})))).reduce((a, b) => ({ ...a, ...b }));
	const original = JSON.parse(JSON.stringify(files)) as typeof files;
	for (const [from, to] of replacements) {
		const reg = new RegExp(`(?:../)*${from}`, "g");
		for (const [file, content] of Object.entries(files)) {
			files[file] = content.replace(reg, to);
		}
	}
	// eslint-disable-next-line prefer-const
	for (let [file, content] of Object.entries(files)) {
		const local = localReplacements.filter(({ dir }) => file.includes(dir));
		if (local.length) local.forEach(l => content = content.replace(l.from, l.to));
		if (content !== original[file]) await writeFile(file, content);
	}
}

export interface Parsed {
	classes: Record<string, string>;
	enums: Record<string, string>;
	functions: Record<string, string>;
	interfaces: Record<string, string>;
	types: Record<string, string>;
	variables: Record<string, string>;
	modules: Record<string, string>;
	replacements: Array<[string, string]>;
	localReplacements: Array<{ dir: string; from: string; to: string; }>;
}

export default hook;
