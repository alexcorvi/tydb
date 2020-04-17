import { Cursor } from "./cursor";
import { Index } from "./indexes";
import { Persistence } from "./persistence";
import * as types from "@types";
import Q from "p-queue";
interface EnsureIndexOptions {
    fieldName: string;
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
}
export interface DataStoreOptions {
    ref: string;
    afterSerialization?(line: string): string;
    beforeDeserialization?(line: string): string;
    corruptAlertThreshold?: number;
}
interface UpdateOptions {
    multi?: boolean;
    upsert?: boolean;
}
export declare class Datastore<G extends Partial<types.BaseSchema> & {
    [key: string]: any;
}> {
    filename: string;
    timestampData: boolean;
    persistence: Persistence<G>;
    q: Q;
    indexes: {
        [key: string]: Index<string, G>;
    };
    ttlIndexes: {
        [key: string]: number;
    };
    constructor(options: DataStoreOptions);
    /**
     * Load the database from the datafile, and trigger the execution of buffered commands if any
     */
    loadDatabase(): Promise<void>;
    /**
     * Get an array of all the data in the database
     */
    getAllData(): G[];
    /**
     * Reset all currently defined indexes
     */
    resetIndexes(newData?: any): void;
    /**
     * Ensure an index is kept for this field. Same parameters as lib/indexes
     * For now this function is synchronous, we need to test how much time it takes
     * We use an async API for consistency with the rest of the code
     */
    ensureIndex(options: EnsureIndexOptions): Promise<void>;
    /**
     * Remove an index
     */
    removeIndex(fieldName: string): Promise<void>;
    /**
     * Add one or several document(s) to all indexes
     */
    addToIndexes<T extends G>(doc: T | T[]): void;
    /**
     * Remove one or several document(s) from all indexes
     */
    removeFromIndexes<T extends G>(doc: T | T[]): void;
    /**
     * Update one or several documents in all indexes
     * To update multiple documents, oldDoc must be an array of { oldDoc, newDoc } pairs
     * If one update violates a constraint, all changes are rolled back
     */
    updateIndexes<T extends G>(oldDoc: T, newDoc: T): void;
    updateIndexes<T extends G>(updates: Array<{
        oldDoc: T;
        newDoc: T;
    }>): void;
    private _isBasicType;
    /**
     * This will return the least number of candidates,
     * using Index if possible
     * when failing it will return all the database
     */
    private _leastCandidates;
    /**
     * Return the list of candidates for a given query
     * Crude implementation for now, we return the candidates given by the first usable index if any
     * We try the following query types, in this order: basic match, $in match, comparison match
     * One way to make it better would be to enable the use of multiple indexes if the first usable index
     * returns too much data. I may do it in the future.
     *
     * Returned candidates will be scanned to find and remove all expired documents
     */
    getCandidates(query: any, dontExpireStaleDocs?: boolean): Promise<G[]>;
    /**
     * Insert a new document
     */
    private _insert;
    /**
     * Create a new _id that's not already in use
     */
    private createNewId;
    /**
     * Prepare a document (or array of documents) to be inserted in a database
     * Meaning adds _id and timestamps if necessary on a copy of newDoc to avoid any side effect on user input
     */
    private prepareDocumentForInsertion;
    /**
     * If newDoc is an array of documents, this will insert all documents in the cache
     */
    private _insertInCache;
    /**
     * If one insertion fails (e.g. because of a unique constraint), roll back all previous
     * inserts and throws the error
     */
    private _insertMultipleDocsInCache;
    insert(newDoc: G | G[]): Promise<types.Result<G>>;
    /**
     * Count all documents matching the query
     */
    count(query: any): Promise<number>;
    /**
     * Find all documents matching the query
     */
    find(query: any): Promise<G[]>;
    /**
     * Find all documents matching the query
     */
    cursor(query: any): Cursor<G>;
    /**
     * Update all docs matching query
     */
    private _update;
    update(query: any, updateQuery: any, options: UpdateOptions): Promise<types.Result<G> & {
        upsert: boolean;
    }>;
    /**
     * Remove all docs matching the query
     * For now very naive implementation (similar to update)
     */
    private _remove;
    remove(query: any, options?: {
        multi: boolean;
    }): Promise<types.Result<G>>;
}
export {};
