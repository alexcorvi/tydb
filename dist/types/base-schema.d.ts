export declare class BaseModel<T = any> {
    _id: string;
    updatedAt?: Date;
    createdAt?: Date;
    static new<T>(this: new () => T, data: Partial<NFP<T>>): T;
}
declare type NFPN<T> = {
    [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
export declare type NFP<T> = Pick<T, NFPN<T>>;
export {};
