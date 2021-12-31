declare module "simple-thumbnail" {
	import type { WriteStream } from "fs";
	declare function run(url: string, out: path | WriteStream, size: string): Promise<void>;
	export = run;
}
