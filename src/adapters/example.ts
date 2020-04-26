import { Persistence as Base, PersistenceEvent } from "../core/persistence";

/**
 * This file serves solely as the simplest example of how to write adapters
 * follow up with the comments for more
 */

class Memory_Persistence_Adapter extends Base {
	/**
	 * You will need two separate storages, e.g. arrays, files, hash maps ... etc
	 * one for the documents, and the other for the indexes
	 */
	_memoryIndexes: string[] = [];
	_memoryData: string[] = [];

	/**
	 * This method will be executed once the database is created,
	 * before initialization
	 */
	async init() {}

	/**
	 * If the persistence layer is being locked, you should provide
	 * a method for forcing an unlock
	 */
	async forcefulUnlock() {}

	/**
	 * Reading: two methods, one for indexes and the other for documents
	 * each read method should utilize the event parameter,
	 * and once a line becomes available it should "emit" it like the examples below
	 */
	async readIndexes(event: PersistenceEvent) {
		for (let index = 0; index < this._memoryIndexes.length; index++) {
			const line = this._memoryIndexes[index];
			event.emit("readLine", line);
		}
		event.emit("end", "");
	}
	async readData(event: PersistenceEvent) {
		for (let index = 0; index < this._memoryData.length; index++) {
			const line = this._memoryData[index];
			event.emit("readLine", line);
		}
		event.emit("end", "");
	}

	/**
	 * Writing: two methods, one for indexes and the other for documents
	 * each read method should utilize the event parameter,
	 * and a callback should be provided for when the line is received
	 * also a callback should be provided for the end of the database is reached
	 * the on.end callback would be utilized for example for closing a database, a connection, a file ...etc
	 */
	async rewriteIndexes(event: PersistenceEvent) {
		this._memoryIndexes = [];
		event.on("writeLine", async (data) => {
			this._memoryIndexes.push(data);
		});
		event.on("end", async () => {
			// code to be executed once we're
			// finished with the last line of the database
		});
	}
	async rewriteData(event: PersistenceEvent) {
		this._memoryData = [];
		event.on("writeLine", async (data) => {
			this._memoryData.push(data);
		});
		event.on("end", async () => {
			// code to be executed once we're
			// finished with the last line of the database
		});
	}

	/**
	 * Appending: two methods, one for indexes and the other for documents
	 * for quick appending to the persistence layer, like pushing onto an array, appending to a file,
	 * adding a record to a hashmap ... etc
	 */
	async appendIndex(data: string) {
		this._memoryIndexes.push(data);
	}
	async appendData(data: string) {
		this._memoryData.push(data);
	}
}

/**
 * For more elaborated examples, checkout the other adapter files
 */
