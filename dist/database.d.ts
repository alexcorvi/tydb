import { Persistence } from "./core";
import { NFP, BaseModel, Filter, SchemaKeyProjection, SchemaKeySort, UpdateOperators, UpsertOperators } from "./types";
export interface DatabaseConfigurations<S extends BaseModel<S>> {
    ref: string;
    model?: (new () => S) & {
        new: (json: S) => S;
    };
    afterSerialization?(line: string): string;
    beforeDeserialization?(line: string): string;
    corruptAlertThreshold?: number;
    timestampData?: boolean;
    persistence_adapter?: typeof Persistence;
    autoCompaction?: number;
}
export declare class Database<S extends BaseModel<S>> {
    private ref;
    private _datastore;
    loaded: Promise<boolean>;
    constructor(options: DatabaseConfigurations<S>);
    /**
     * Put one document
     */
    insert(docs: S[]): Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Find documents that meets a specified criteria
     */
    read({ filter, skip, limit, project, sort, }: {
        filter?: Filter<NFP<S>>;
        skip?: number;
        limit?: number;
        sort?: SchemaKeySort<NFP<S>>;
        project?: SchemaKeyProjection<NFP<S>>;
    }): Promise<S[]>;
    /**
     * Update many documents that meets the specified criteria
     */
    update({ filter, update, multi, }: {
        filter: Filter<NFP<S>>;
        update: UpdateOperators<NFP<S>>;
        multi?: boolean;
    }): Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Update documents that meets the specified criteria,
     * and insert the update query if no documents are matched
     */
    upsert({ filter, update, multi, }: {
        filter: Filter<NFP<S>>;
        update: UpsertOperators<NFP<S>>;
        multi?: boolean;
    }): Promise<{
        docs: S[];
        number: number;
        upsert: boolean;
    }>;
    /**
     * Count documents that meets the specified criteria
     */
    count(filter?: Filter<NFP<S>>): Promise<number>;
    /**
     * Delete many documents that meets the specified criteria
     *
     */
    delete({ filter, multi, }: {
        filter: Filter<NFP<S>>;
        multi?: boolean;
    }): Promise<{
        docs: S[];
        number: number;
    }>;
    reload(): Promise<void>;
    compact(): Promise<void>;
    stopAutoCompaction(): void;
    resetAutoCompaction(interval: number): void;
    /**
     * Put one document
     */
    create: (docs: S[]) => Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Find documents that meets a specified criteria
     */
    find: ({ filter, skip, limit, project, sort, }: {
        filter?: import("./types/common").Partial<{ [key in { [K in keyof S]: S[K] extends Function ? never : K; }[keyof S]]: Pick<S, { [K in keyof S]: S[K] extends Function ? never : K; }[keyof S]>[key] | (Pick<S, { [K in keyof S]: S[K] extends Function ? never : K; }[keyof S]>[key] extends any[] ? import("./types/filter").ArrayFieldLevelQueryOperators<Pick<S, { [K in keyof S]: S[K] extends Function ? never : K; }[keyof S]>[key][0]> : import("./types").AnyFieldLevelQueryOperators<Pick<S, { [K in keyof S]: S[K] extends Function ? never : K; }[keyof S]>[key]>); }> | import("./types").TopLevelQueryOperators<Pick<S, { [K in keyof S]: S[K] extends Function ? never : K; }[keyof S]>> | undefined;
        skip?: number | undefined;
        limit?: number | undefined;
        sort?: import("./types/common").Partial<{ [key_1 in { [K in keyof S]: S[K] extends Function ? never : K; }[keyof S]]: 1 | -1; } & {
            $deep: {
                [key: string]: 1 | -1;
            };
        }> | undefined;
        project?: import("./types/common").Partial<{ [key_2 in { [K in keyof S]: S[K] extends Function ? never : K; }[keyof S]]: 0 | 1; } & {
            $deep: {
                [key: string]: 0 | 1;
            };
        }> | undefined;
    }) => Promise<S[]>;
}
