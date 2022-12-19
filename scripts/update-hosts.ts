import { scaled } from "./shared";
import { execSync } from "child_process";
import { accessSync, constants, readFileSync, writeFileSync } from "fs";

export function test() {
	try {
		accessSync("/etc/hosts", constants.W_OK);
	} catch {
		throw new Error("Cannot write to /etc/hosts");
	}
	const lines = readFileSync("/etc/hosts", "utf-8").split("\n");
	const hasStart = lines.includes("# Start Websites");
	const hasEnd = lines.includes("# End Websites");
	if ((hasStart && !hasEnd) || (!hasStart && hasEnd)) throw new Error("Malformed /etc/hosts");
}

export function run(map: Array<[string, string]>) {
	const lines = readFileSync("/etc/hosts", "utf-8").split("\n");
	const start = lines.indexOf("# Start Websites");
	const end = lines.indexOf("# End Websites");

	const newLines = [
		...(start !== -1 ? lines.slice(0, start) : lines),
		"# Start Websites",
		"",
		...map.map(([ip, name]) => `${ip} ${name}`),
		"",
		"# End Websites",
		...(end !== -1 ? lines.slice(end + 1) : [])
	];

	writeFileSync("/etc/hosts", newLines.join("\n"));
}

if (require.main === module) {
	test();

	const ips: Record<string, string> = {};
	for (const name of scaled) {
		const id = execSync(`docker ps -f name=${name} -q | head -n1`).toString().trim();
		const ip = execSync(`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${id}`).toString().trim();
		ips[name] = ip;
	}

	run(Object.entries(ips).map(([name, ip]) => [ip, `${name.replace(/\./g, "-")}.websites.local`]));
}
