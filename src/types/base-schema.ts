export interface BaseSchema {
	_id?: string;
	updatedAt?: Date;
	createdAt?: Date;
}

export type SF<S> = S & BaseSchema & { _id: string };
export type SP<S> = S & Partial<BaseSchema>;
