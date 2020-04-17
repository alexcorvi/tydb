import { Operations } from "./operations";
import { DataStoreOptions } from "@core";
import { BaseSchema } from "@types";
export declare class Database<Schema extends BaseSchema> extends Operations<Schema> {
    private _database;
    name: string;
    filePath: string;
    constructor(options: string | (DataStoreOptions & {
        autoCompaction?: number;
    }));
    compact(): void;
    stopAutoCompaction(): void;
    resetAutoCompaction(interval: number): void;
    backup(path: string): Promise<void>;
    restore(path: string): Promise<void>;
}
