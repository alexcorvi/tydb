export declare type Keys<O> = keyof O;
export declare type Partial<T> = {
    [P in keyof T]?: T[P];
};
