import { services } from "@config";
import { Webhooks } from "@octokit/webhooks";
import { Octokit } from "@octokit/rest";
import { assert } from "tsafe";

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
	console.log(data);
	if (data.pusher.name.toLowerCase() !== "erisprupdatebot" && ["ref/heads/everything", "ref/heads/everything-v10"].includes(data.ref)) {
		const contents = await octo.request("GET /repos/{owner}/{repo}/contents/{path}", {
			owner: "DonovanDMC",
			repo:  "eris",
			path:  "package.json",
			ref:   data.ref
		});
		assert(!Array.isArray(contents.data));
		const newContents = Buffer.from((contents.data as { content: string; }).content, "base64").toString("ascii").replace(/"version":\s?"(\d+)\.(\d+)\.(\d+).*"/, (str, v1: string, v2: string, v3: string) => `"version": "${v1}.${v2}.${v3}-${data.ref.split("/").slice(-1)[0]}.${data.head_commit!.id.slice(0, 7)}"`);
		console.log(data.head_commit!.id, contents, newContents);
	}
});

export default hook;
