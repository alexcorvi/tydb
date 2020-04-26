import * as customUtils from "../core/customUtils";
export class BaseModel<T = any> {
	_id: string = customUtils.uid();
	updatedAt?: Date;
	createdAt?: Date;
	static new<T>(this: new () => T, data: Partial<NFP<T>>): T {
		const instance = new this();
		const keys = Object.keys(data);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i] as keyof T;
			(instance as any)[key] = (data as any)[key];
		}
		return instance;
	}
}

type NFPN<T> = {
	[K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
export type NFP<T> = Pick<T, NFPN<T>>;
