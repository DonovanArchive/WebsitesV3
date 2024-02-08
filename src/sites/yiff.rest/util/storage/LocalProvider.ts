import IStorageProvider from "./IStorageProvider";
import type { PathLike } from "fs";
import { access, readFile, rm, writeFile } from "fs/promises";

const exists = async(path: PathLike) => access(path).then(() => true, () => false);
export default class LocalProvider extends IStorageProvider {
	baseDir: string;
	constructor(baseURL: string, baseDir: string) {
		super(baseURL);
		this.baseDir = baseDir;
	}

	async delete(path: string) {
		if (await exists(`${this.baseDir}/${path}`)) {
			await rm(`${this.baseDir}/${path}`);
		}
	}

	async exists(path: string) {
		return exists(`${this.baseDir}/${path}`);
	}

	async get(path: string) {
		if (!await this.exists(`${this.baseDir}/${path}`)) {
			return null;
		}

		return readFile(`${this.baseDir}/${path}`);
	}

	async put(path: string, data: Buffer) {
		if (await this.exists(`${this.baseDir}/${path}`)) {
			throw new Error(`Attempting to PUT existing file: ${this.baseDir}/${path}`);
		}

		await writeFile(`${this.baseDir}/${path}`, data);
		return `${this.baseURL}/${path}`;
	}

}
