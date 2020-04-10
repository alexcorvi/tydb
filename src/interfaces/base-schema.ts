export type FullSchema<S> = BaseSchema & S;
export type InputSchema<S> = Partial<BaseSchema> & S;

export interface BaseSchema {
	_id: string;
	updatedAt: Date;
	createdAt: Date;
}
