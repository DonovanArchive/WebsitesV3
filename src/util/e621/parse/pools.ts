type TF = "t" | "f";
export interface RawPool {
	id: string;
	category: "series" | "collection";
	created_at: string;
	creator_id: string;
	description: string;
	is_active: TF;
	name: string;
	post_ids: string;
	updated_at: string;
}

export function parse(record: RawPool): PoolData {
	return {
		category:    record.category,
		created_at:  new Date(record.created_at).toISOString(),
		creator_id:  Number(record.creator_id),
		description: record.description,
		id:          Number(record.id),
		is_active:   record.is_active === "t",
		name:        record.name,
		// they're in the raw postgres array format ({1,2,3})
		post_ids:    record.post_ids.slice(1, -1),
		updated_at:  record.updated_at === "" ? null : new Date(record.updated_at).toISOString()
	};
}

export interface PoolData {
	id: number;
	category: "series" | "collection";
	created_at: string;
	creator_id: number;
	description: string;
	is_active: boolean;
	name: string;
	post_ids: string;
	updated_at: string | null;
}

export class Pool {
	id: number;
	category: "series" | "collection";
	created_at: Date;
	creator_id: number;
	description: string;
	is_active: boolean;
	name: string;
	post_ids: Array<number>;
	updated_at: Date | null;
	constructor(data: PoolData) {
		this.id = Number(data.id);
		this.category = data.category;
		this.created_at = new Date(data.created_at);
		this.creator_id = data.creator_id;
		this.description = data.description;
		this.is_active = data.is_active;
		this.name = data.name;
		// they're in the raw postgres array format ({1,2,3})
		this.post_ids = data.post_ids.slice(1, -1).split(",").map(Number);
		this.updated_at = data.updated_at === null ? null : new Date(data.updated_at);
	}
}
