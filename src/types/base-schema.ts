export interface BaseSchema {
	_id: string;
	updatedAt?: Date;
	createdAt?: Date;
}

export type SF<S> = S & BaseSchema;
export type SP<S> = S & Partial<BaseSchema>;
