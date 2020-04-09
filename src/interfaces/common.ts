export type Keys<Obj> = keyof Obj;

export type Partial<T> = { [P in keyof T]?: T[P] };
