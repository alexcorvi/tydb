interface Result {
	n: number;
}

export interface OperatedOne<Schema> extends Result {
	affected: Schema | null;
}

export interface OperatedMany<Schema> extends Result {
	affected: Schema[];
}
