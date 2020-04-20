export type Keys<O> = keyof O;

export type Partial<T> = { [P in keyof T]?: T[P] };
