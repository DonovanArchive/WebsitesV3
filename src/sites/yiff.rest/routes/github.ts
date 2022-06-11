import { services } from "@config";
import { Webhooks } from "@octokit/webhooks";
import { Octokit } from "@octokit/rest";
import simpleGit from "simple-git";
import { tmpdir } from "os";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { execSync } from "child_process";

const octo = new Octokit({ auth: services.octo.auth });
const hook = new Webhooks({
	secret: services.octo.secret
});
hook.on("issue_comment.created", async({ payload: data }) => {
	if (!data.comment.body.toLowerCase().startsWith("@erisprupdatebot merge")) return;
	const { data: { permission } } = await octo.rest.repos.getCollaboratorPermissionLevel({
		owner:    "DonovanDMC",
		repo:     "eris",
		username: data.sender.login
	});
	if (!["write", "admin"].includes(permission)) {
		await octo.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
			owner:        "DonovanDMC",
			repo:         "eris",
			issue_number: data.issue.number,
			body:         `@${data.sender.login} You do not have permission to do that.`
		});
		return;
	}
	try {
		await octo.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge", {
			owner:          "DonovanDMC",
			repo:           "eris",
			pull_number:    data.issue.number,
			commit_title:   `${data.issue.title.split(")")[0]}, pr #${data.issue.number})${data.issue.title.split(")")[1]}`,
			commit_message: ""
		});
	} catch (e) {
		await octo.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
			owner:        "DonovanDMC",
			repo:         "eris",
			issue_number: data.issue.number,
			body:         `Error Merging:\n> ${(e as Error).stack ?? "No Stack"}`
		});
	}
});
hook.on("push", async({ payload: data }) => {
	// console.log(data.pusher.name, data.ref);
	if (data.pusher.name.toLowerCase() !== "erisprupdatebot" && ["refs/heads/everything", "refs/heads/everything-v10"].includes(data.ref)) {
		const workingDir = `${tmpdir()}/${data.after}`;
		await rm(workingDir, { force: true, recursive: true });
		await mkdir(workingDir, { recursive: true });
		const git = simpleGit(workingDir);
		const branch = data.ref.split("/")[2];
		await git
			.init()
			.addRemote("origin", "https://github.com/DonovanDMC/eris")
			.fetch("origin", data.ref)
			.checkout(branch);
		execSync(`git config --local credential.helper '!f() { sleep 1; echo "username=ErisPRUpdateBot"; echo "password=${services.octo.auth}"; }; f'`, {
			cwd: workingDir
		});
		execSync("git config user.name \"ErisPRUpdateBot\"", {
			cwd: workingDir
		});
		execSync(`git config user.email ${Buffer.from("ZXJpc0B5aWZmLnJvY2tz", "base64").toString("ascii")}`, {
			cwd: workingDir
		});
		await writeFile(`${workingDir}/package.json`, (await readFile(`${workingDir}/package.json`)).toString().replace(/"version":\s?"(\d+)\.(\d+)\.(\d+).*"/, (str, v1: string, v2: string, v3: string) => `"version": "${v1}.${v2}.${v3}-${data.ref.split("/").slice(-1)[0]}.${data.head_commit!.id.slice(0, 7)}"`));
		await git.add("package.json");
		await git.commit("Update Version");
		await git.push("origin", branch);
		// if (!existsSync("/root/.npmrc")) writeFileSync("/root/.npmrc", `//registry.npmjs.org/:_authToken=${services.npm}`);
		// await writeFile(`${workingDir}/package.json`, (await readFile(`${workingDir}/package.json`)).toString().replace(/"name": "eris"/, "\"name\": \"eris-dev\""));
		// console.log(workingDir);
		await rm(workingDir, { force: true, recursive: true });
	}
});

export default hook;
