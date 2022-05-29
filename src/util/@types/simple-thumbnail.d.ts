declare module "simple-thumbnail" {
	import type { WriteStream } from "fs";
	function run(url: string, out: string | WriteStream, size: string): Promise<void>;
	export = run;
}
