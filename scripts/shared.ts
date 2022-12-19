import { readdirSync } from "fs";

export const sites = readdirSync(`${__dirname}/../src/sites`);
export const scaled = [...sites, "imgen"];
