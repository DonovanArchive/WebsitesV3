import { run, test } from "./update-hosts";
import { scaled } from "./shared";
import { execSync } from "node:child_process";

test();

const scale2 = scaled.map(s => `--scale ${s}=2`).join(" ");
const scale1 = scaled.map(s => `--scale ${s}=1`).join(" ");
const list = scaled.join(" ");

const oldIDs: Array<string> = [], newIPs: Record<string, string> = {};
for (const name of scaled) {
	oldIDs.push(execSync(`docker ps -f name=${name} -q | sed -n '1p'`).toString().trim());
}
console.log("Scaling Up");
execSync(`docker compose up -d --no-deps ${scale2} --no-recreate ${list}`, { stdio: "inherit" });

for (const name of scaled) {
	const newID = execSync(`docker ps -f name=${name} -q | sed -n '2p'`).toString().trim();
	const newIP = execSync(`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${newID}`).toString().trim();
	newIPs[name] = newIP;
}

console.log("Writing New Websites Hosts");
run(Object.entries(newIPs).map(([name, ip]) => [ip, `${name.replace(/\./g, "-")}.websites.local`]));
execSync("sudo nginx -s reload", { stdio: "inherit" });
console.log("Nginx Successfully Reloaded");

for (const id of oldIDs) {
	execSync(`docker stop ${id}`, { stdio: "inherit" });
	execSync(`docker rm ${id}`, { stdio: "inherit" });
}
console.log("Old Containers Removed");

console.log("Scaling Down");
execSync(`docker compose up -d --no-deps ${scale1} --no-recreate ${list}`, { stdio: "inherit" });
execSync("sudo nodenv exec docker-hosts --config /root/.docker-hosts.json", { stdio: "inherit" });
console.log("Updating Generic Hosts");

console.log("load shifted");
