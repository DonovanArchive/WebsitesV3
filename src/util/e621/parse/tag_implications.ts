import type { RawE621TagImplication } from "../../../db/Models/E621TagImplication";

export interface RawTagImplication {
	id: string;
	antecedent_name: string;
	consequent_name: string;
	created_at: string;
	status: string;
}

export function parse(record: RawTagImplication) {
	return {
		id:              Number(record.id),
		antecedent_name: record.antecedent_name,
		consequent_name: record.consequent_name,
		created_at:      record.created_at === "" ? null : new Date(record.created_at).toISOString(),
		status:          record.status
	} satisfies RawE621TagImplication as RawE621TagImplication;
}
