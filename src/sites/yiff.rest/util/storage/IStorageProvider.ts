export default abstract class IStorageProvider {
	baseURL: string;
	protected constructor(baseURL: string) {
		this.baseURL = baseURL;
	}

	abstract delete(path: string): Promise<void>;
	abstract exists(path: string): Promise<boolean>;
	abstract get(path: string): Promise<Buffer | null>;
	abstract put(path: string, data: Buffer): Promise<string>;
}
