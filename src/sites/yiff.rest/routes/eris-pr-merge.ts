import { services } from "@config";
import { Webhooks } from "@octokit/webhooks";
import { Octokit } from "@octokit/rest";

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

export default hook;
