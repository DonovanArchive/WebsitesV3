export interface RawTagImplication {
	antecedent_name: string;
	consequent_name: string;
	created_at: string;
	id: string;
	status: string;
}

export function parse(record: RawTagImplication): TagImplicationData {
	return {
		antecedent_name: record.antecedent_name,
		consequent_name: record.consequent_name,
		created_at:      record.created_at === "" ? null : new Date(record.created_at).toISOString(),
		id:              Number(record.id),
		status:          record.status
	};
}

export interface TagImplicationData {
	antecedent_name: string;
	consequent_name: string;
	created_at: string | null;
	id: number;
	status: string;
}

export class TagImplication {
	antecedent_name: string;
	consequent_name: string;
	created_at: Date | null;
	id: number;
	status: string;
	constructor(data: TagImplicationData) {
		this.antecedent_name = data.antecedent_name;
		this.consequent_name = data.consequent_name;
		this.created_at = data.created_at === null ? null : new Date(data.created_at);
		this.id = data.id;
		this.status = data.status;
	}
}
