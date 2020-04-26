import { Persistence as Base, PersistenceEvent } from "../core/persistence";
import * as idb from "idb-keyval";
import { Store } from "idb-keyval";

const databases: { [key: string]: Store } = {};

function hash(input: string) {
	var hash = 0;
	for (let i = 0; i < input.length; i++) {
		let chr = input.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0;
	}
	return hash.toString();
}

export class IDB_Persistence_Adapter extends Base {
	async init() {
		databases["data"] = new idb.Store(this.ref, "data");
		databases["indexes"] = new idb.Store(this.ref, "indexes");
	}

	async readIndexes(event: PersistenceEvent) {
		const keys = await idb.keys(databases["indexes"]);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const line = await idb.get<string>(key, databases["indexes"]);
			event.emit("readLine", line);
		}
		event.emit("end", "");
	}

	async readData(event: PersistenceEvent) {
		const keys = await idb.keys(databases["data"]);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const line = await idb.get<string>(key, databases["data"]);
			event.emit("readLine", line);
		}
		event.emit("end", "");
	}

	async rewriteIndexes(event: PersistenceEvent) {
		const keys = await idb.keys(databases["indexes"]);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			await idb.del(key, databases["indexes"]);
		}
		event.on("writeLine", async (data) => {
			await idb.set(hash(data), data, databases["indexes"]);
		});
	}

	async rewriteData(event: PersistenceEvent) {
		const keys = await idb.keys(databases["data"]);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			await idb.del(key, databases["data"]);
		}
		event.on("writeLine", async (data) => {
			await idb.set(hash(data), data, databases["data"]);
		});
	}

	async appendIndex(data: string) {
		await idb.set(hash(data), data, databases["indexes"]);
	}
	async appendData(data: string) {
		await idb.set(hash(data), data, databases["indexes"]);
	}
}
