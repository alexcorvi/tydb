/// <reference types="node" />
import { Persistence, PersistenceEvent } from "../core/persistence";
import * as fs from "fs";
import { appendFile, exists, readFile, rename, unlink, writeFile } from "fs";
declare const _storage: {
    lock: (filename: string) => Promise<unknown>;
    unlock: (filename: string) => Promise<unknown>;
    appendFile: typeof appendFile.__promisify__;
    exists: typeof exists.__promisify__;
    readFile: typeof readFile.__promisify__;
    rename: typeof rename.__promisify__;
    unlink: typeof unlink.__promisify__;
    writeFile: typeof writeFile.__promisify__;
    mkdirp: (targetDir: string) => Promise<string>;
    ensureFileDoesntExist: (file: string) => Promise<void>;
    /**
     * Flush data in OS buffer to storage if corresponding option is set
     * If options is a string, it is assumed that the flush of the file (not dir) called options was requested
     */
    flushToStorage: (options: string | {
        filename: string;
        isDir: boolean;
    }) => Promise<unknown>;
    createWriteableStream: (filename: string) => Promise<fs.WriteStream>;
    writeSingleLine: (stream: fs.WriteStream, line: string) => Promise<unknown>;
    endStream: (stream: fs.WriteStream) => Promise<unknown>;
    readByLine: (filename: string, onLine: (line: string) => void, onClose: () => void) => void;
    beforeWriteFile: (filename: string) => Promise<void>;
    afterWritingFile: (filename: string) => Promise<void>;
    /**
     * Ensure the data file contains all the data, even if there was a crash during a full file write
     */
    ensureDataFileIntegrity: (filename: string) => Promise<unknown>;
};
declare const storage: typeof _storage;
export { storage };
export declare class FS_Persistence_Adapter extends Persistence {
    indexesFilenameExtension: string;
    readFileByLine(event: PersistenceEvent, filename: string): Promise<unknown>;
    writeFileByLine(event: PersistenceEvent, filename: string): Promise<unknown>;
    init(): Promise<void>;
    readIndexes(event: PersistenceEvent): Promise<void>;
    readData(event: PersistenceEvent): Promise<void>;
    rewriteIndexes(event: PersistenceEvent): Promise<void>;
    rewriteData(event: PersistenceEvent): Promise<void>;
    appendIndex(data: string): Promise<void>;
    appendData(data: string): Promise<void>;
}
