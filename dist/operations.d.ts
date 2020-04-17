import { Datastore } from "@core";
import { BaseSchema, Filter, SchemaKeyProjection, SchemaKeySort, UpdateOperators, FieldLevelQueryOperators } from "@types";
export declare class Operations<S extends BaseSchema> {
    private _datastore;
    constructor(_datastore: Datastore<S>);
    private _connect;
    /**
     * Put one document
     */
    insert(docs: S[]): Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Put one document
     */
    create: (docs: S[]) => Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Database cursor
     */
    cursor(filter: Filter<S>): Promise<import("./core").Cursor<S>>;
    /**
     * Find documents that meets a specified criteria
     */
    read({ filter, skip, limit, project, sort, }: {
        filter?: Filter<S>;
        skip?: number;
        limit?: number;
        sort?: SchemaKeySort<S>;
        project?: SchemaKeyProjection<S>;
    }): Promise<S[]>;
    /**
     * Find documents that meets a specified criteria
     */
    find: ({ filter, skip, limit, project, sort, }: {
        filter?: import("./types/common").Partial<{ [key in keyof S]: S[key] | FieldLevelQueryOperators<S[key]>; }> | import("./types").TopLevelQueryOperators<S> | undefined;
        skip?: number | undefined;
        limit?: number | undefined;
        sort?: import("./types/common").Partial<{ [key in keyof S]: 0 | 1 | -1; }> | undefined;
        project?: import("./types/common").Partial<{ [key in keyof S]: 0 | 1; }> | undefined;
    }) => Promise<S[]>;
    /**
     * Update many documents that meets the specified criteria
     */
    update({ filter, update, multi, }: {
        filter: Filter<S>;
        update: UpdateOperators<S>;
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
        filter: Filter<S>;
        update: S;
        multi?: boolean;
    }): Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Delete many documents that meets the specified criteria
     *
     */
    delete({ filter, multi, }: {
        filter: Filter<S>;
        multi: boolean;
    }): Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Count documents that meets the specified criteria
     */
    count({ filter, }?: {
        filter?: Filter<S>;
    }): Promise<number>;
}
