export declare type Keys<Obj> = keyof Obj;
export declare type Partial<T> = {
    [P in keyof T]?: T[P];
};
