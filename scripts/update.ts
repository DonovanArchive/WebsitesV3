import { scaled } from "./shared";
import { execSync } from "node:child_process";

const scale2 = scaled.map(s => `--scale ${s}=2`).join(" ");
const scale1 = scaled.map(s => `--scale ${s}=1`).join(" ");
const list = scaled.join(" ");

const oldIDs: Array<string> = [];
for (const name of scaled) {
	oldIDs.push(execSync(`docker ps -f name=${name} -q | sed -n '1p'`).toString().trim());
}
console.log("Scaling Up");
execSync(`docker compose up -d --no-deps ${scale2} --no-recreate ${list}`, { stdio: "inherit" });

execSync("sudo nginx -s reload", { stdio: "inherit" });
console.log("Nginx Successfully Reloaded");

for (const id of oldIDs) {
	execSync(`docker stop ${id}`, { stdio: "inherit" });
	execSync(`docker rm ${id}`, { stdio: "inherit" });
}
console.log("Old Containers Removed");

console.log("Scaling Down");
execSync(`docker compose up -d --no-deps ${scale1} --no-recreate ${list}`, { stdio: "inherit" });

console.log("load shifted");
