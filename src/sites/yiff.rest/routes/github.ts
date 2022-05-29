import { services } from "@config";
import { Webhooks } from "@octokit/webhooks";
import { Octokit } from "@octokit/rest";
import { assert } from "tsafe";
import simpleGit from "simple-git";
import { createHash } from "crypto";
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
	if (data.pusher.name.toLowerCase() !== "erisprupdatebot" && ["refs/heads/everything", "refs/heads/everything-v10"].includes(data.ref)) {
		const workingDir = `${tmpdir()}/${data.after}`;
		await rm(workingDir, { force: true, recursive: true });
		await mkdir(workingDir, { recursive: true });
		const git = simpleGit(workingDir);
		await git
			.init()
			.addRemote("origin", "https://github.com/DonovanDMC/eris")
			.fetch("origin", data.ref);
		execSync(`git config --local credential.helper '!f() { sleep 1; echo "username=ErisPRUpdateBot"; echo "password=${services.octo.auth}"; }; f'`, {
			cwd: workingDir
		});
		await writeFile(`${workingDir}/package.json`, (await readFile(`${workingDir}/package.json`)).toString().replace(/"version":\s?"(\d+)\.(\d+)\.(\d+).*"/, (str, v1: string, v2: string, v3: string) => `"version": "${v1}.${v2}.${v3}-${data.ref.split("/").slice(-1)[0]}.${data.head_commit!.id.slice(0, 7)}"`));
		await git.add("package.json");
		await git.commit("update version");
		await git.push("origin", data.ref);
		await rm(workingDir, { force: true, recursive: true });
	}
});

export default hook;
