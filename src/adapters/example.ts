import { Persistence as Base, PersistenceEvent } from "./persistence";

/**
 * This file serves solely as the simplest example of how to write adapters
 */

class Memory_Persistence_Adapter extends Base {
	_memoryIndexes: string[] = [];
	_memoryData: string[] = [];
	async init() {}

	async readIndexes(event: PersistenceEvent) {
		for (let index = 0; index < this._memoryIndexes.length; index++) {
			const line = this._memoryIndexes[index];
			event.emit("readLine", line);
		}
	}

	async readData(event: PersistenceEvent) {
		for (let index = 0; index < this._memoryData.length; index++) {
			const line = this._memoryData[index];
			event.emit("readLine", line);
		}
	}

	async writeIndexes(event: PersistenceEvent) {
		this._memoryIndexes = [];
		event.on("writeLine", async (data) => {
			this._memoryIndexes.push(data);
		});
	}

	async writeData(event: PersistenceEvent) {
		this._memoryData = [];
		event.on("writeLine", async (data) => {
			this._memoryData.push(data);
		});
	}

	async appendIndex(data: string) {
		this._memoryIndexes.push(data);
	}

	async appendData(data: string) {
		this._memoryData.push(data);
	}
}
