import { EnsureIndexOptions, Persistence } from "./core";
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
    reloadBeforeOperations?: boolean;
}
export declare class Database<S extends BaseModel<S>> {
    private ref;
    private _datastore;
    private reloadBeforeOperations;
    model: (new () => S) & {
        new: (json: S) => S;
    };
    loaded: Promise<boolean>;
    constructor(options: DatabaseConfigurations<S>);
    private reloadFirst;
    /**
     * insert documents
     */
    insert(docs: S[]): Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Find document(s) that meets a specified criteria
     */
    read({ filter, skip, limit, project, sort, }: {
        filter?: Filter<NFP<S>>;
        skip?: number;
        limit?: number;
        sort?: SchemaKeySort<NFP<S>>;
        project?: SchemaKeyProjection<NFP<S>>;
    }): Promise<S[]>;
    /**
     * Update document(s) that meets the specified criteria
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
     * Update document(s) that meets the specified criteria,
     * and do an insertion if no documents are matched
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
     * Delete document(s) that meets the specified criteria
     *
     */
    delete({ filter, multi, }: {
        filter: Filter<NFP<S>>;
        multi?: boolean;
    }): Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Create an index specified by options
     */
    createIndex(options: EnsureIndexOptions): Promise<{
        affectedIndex: string;
    }>;
    /**
     * Remove an index by passing the field name that it is related to
     */
    removeIndex(fieldName: string): Promise<{
        affectedIndex: string;
    }>;
    /**
     * Reload database from the persistence layer (if it exists)
     */
    reload(): Promise<{}>;
    /**
     * Compact the database persistence layer
     */
    compact(): Promise<{}>;
    /**
     * forcefully unlocks the persistence layer
     * use with caution, and only if you know what you're doing
     */
    forcefulUnlock(): Promise<{}>;
    /**
     * Stop auto compaction of the persistence layer
     */
    stopAutoCompaction(): Promise<{}>;
    /**
     * Set auto compaction defined by an an interval
     */
    resetAutoCompaction(interval: number): Promise<{}>;
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
    private _externalCall;
}
