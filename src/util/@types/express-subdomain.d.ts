declare module "express-subdomain" {
	import type express from "express";
	function main(subdomain: string, ...handlers: Array<express.Handler>);
	export = main;
}
