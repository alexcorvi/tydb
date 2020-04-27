import { FS_Persistence_Adapter, storage } from "../../src/adapters/fs-adapter";
import { customUtils, Datastore, model, Persistence } from "../../src/core";
import { assert, expect, should, use } from "chai";
import asPromised from "chai-as-promised";
import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as _ from "underscore";
import { promisify } from "util";

use(asPromised);
should();

const testDb = "workspace/test.db";

describe("Persistence", () => {
	let d = new Datastore({
		ref: testDb,
		persistence_adapter: FS_Persistence_Adapter,
	});
	beforeEach(async () => {
		d = new Datastore({
			ref: testDb,
			persistence_adapter: FS_Persistence_Adapter,
		});
		d.ref.should.equal(testDb);
		await storage.mkdirp(path.dirname(testDb));
		if (await storage.exists(testDb)) {
			await promisify(fs.unlink)(testDb);
		}
		if (await storage.exists(testDb + ".idx.db")) {
			await promisify(fs.unlink)(testDb + ".idx.db");
		}
		await d.loadDatabase();
		d.getAllData().length.should.equal(0);
	});

	it("Every line represents a document", async () => {
		const now = new Date();

		const rawData = `${model.serialize({
			_id: "1",
			a: 2,
			ages: [1, 5, 12],
		})}\n${model.serialize({
			_id: "2",
			hello: "world",
		})}\n${model.serialize({ _id: "3", nested: { today: now } })}`;

		fs.writeFileSync(testDb, rawData, "utf8");
		await d.loadDatabase();
		const treatedData: any[] = d.getAllData();

		treatedData.sort(
			({ _id: _id1 }, { _id: _id2 }) => (_id1 as any) - (_id2 as any)
		);
		treatedData.length.should.equal(3);
		_.isEqual(treatedData[0], {
			_id: "1",
			a: 2,
			ages: [1, 5, 12],
		}).should.equal(true);
		_.isEqual(treatedData[1], { _id: "2", hello: "world" }).should.equal(
			true
		);
		_.isEqual(treatedData[2], {
			_id: "3",
			nested: { today: now },
		}).should.equal(true);
	});

	it("Badly formatted lines have no impact on the treated data", async () => {
		const now = new Date();
		const obj1 = {
			_id: "1",
			a: 2,
			ages: [1, 5, 12],
		};
		const obj2 = {
			_id: "3",
			nested: { today: now },
		};
		d.persistence.corruptAlertThreshold = 0.34;
		const rawData = `${model.serialize(obj1)}\ngarbage\n${model.serialize(
			obj2
		)}`;
		fs.writeFileSync(testDb, rawData, "utf8");
		await d.loadDatabase();
		const treatedData: any[] = d.getAllData();
		treatedData.sort(({ _id: _id1 }, { _id: _id2 }) => _id1 - _id2);
		treatedData.length.should.equal(2);
		_.isEqual(treatedData[0], obj1).should.equal(true);
		_.isEqual(treatedData[1], obj2).should.equal(true);
	});

	it("Well formatted lines that have no _id are not included in the data", async () => {
		const now = new Date();

		const rawData = `${model.serialize({
			_id: "1",
			a: 2,
			ages: [1, 5, 12],
		})}\n${model.serialize({
			_id: "2",
			hello: "world",
		})}\n${model.serialize({ nested: { today: now } })}`;
		fs.writeFileSync(testDb, rawData, "utf8");
		await d.loadDatabase();
		const treatedData: any[] = d.getAllData();
		treatedData.sort(({ _id: _id1 }, { _id: _id2 }) => _id1 - _id2);
		treatedData.length.should.equal(2);
		_.isEqual(treatedData[0], {
			_id: "1",
			a: 2,
			ages: [1, 5, 12],
		}).should.equal(true);
		_.isEqual(treatedData[1], { _id: "2", hello: "world" }).should.equal(
			true
		);
	});

	it("If two lines concern the same doc (= same _id), the last one is the good version", async () => {
		const now = new Date();

		const rawData = `${model.serialize({
			_id: "1",
			a: 2,
			ages: [1, 5, 12],
		})}\n${model.serialize({
			_id: "2",
			hello: "world",
		})}\n${model.serialize({ _id: "1", nested: { today: now } })}`;
		fs.writeFileSync(testDb, rawData, "utf8");
		await d.loadDatabase();
		const treatedData: any[] = d.getAllData();
		treatedData.sort(({ _id: _id1 }, { _id: _id2 }) => _id1 - _id2);
		treatedData.length.should.equal(2);
		_.isEqual(treatedData[0], {
			_id: "1",
			nested: { today: now },
		}).should.equal(true);
		_.isEqual(treatedData[1], { _id: "2", hello: "world" }).should.equal(
			true
		);
	});

	it("If a doc contains $$deleted: true, that means we need to remove it from the data", async () => {
		const now = new Date();

		const rawData = `${model.serialize({
			_id: "1",
			a: 2,
			ages: [1, 5, 12],
		})}\n${model.serialize({
			_id: "2",
			hello: "world",
		})}\n${model.serialize({
			_id: "1",
			$$deleted: true,
		})}\n${model.serialize({ _id: "3", today: now })}`;
		fs.writeFileSync(testDb, rawData, "utf8");
		await d.loadDatabase();
		const treatedData: any[] = d.getAllData();
		treatedData.sort(({ _id: _id1 }, { _id: _id2 }) => _id1 - _id2);
		treatedData.length.should.equal(2);
		_.isEqual(treatedData[0], { _id: "2", hello: "world" }).should.equal(
			true
		);
		_.isEqual(treatedData[1], { _id: "3", today: now }).should.equal(true);
	});

	it("If a doc contains $$deleted: true, no error is thrown if the doc wasnt in the list before", async () => {
		const now = new Date();

		const rawData = `${model.serialize({
			_id: "1",
			a: 2,
			ages: [1, 5, 12],
		})}\n${model.serialize({
			_id: "2",
			$$deleted: true,
		})}\n${model.serialize({ _id: "3", today: now })}`;
		fs.writeFileSync(testDb, rawData, "utf8");
		await d.loadDatabase();
		const treatedData: any[] = d.getAllData();
		treatedData.sort(({ _id: _id1 }, { _id: _id2 }) => _id1 - _id2);
		treatedData.length.should.equal(2);
		_.isEqual(treatedData[0], {
			_id: "1",
			a: 2,
			ages: [1, 5, 12],
		}).should.equal(true);
		_.isEqual(treatedData[1], { _id: "3", today: now }).should.equal(true);
	});

	it("If a doc contains $$indexCreated, no error is thrown during treatRawData and we can get the index options", async () => {
		const now = new Date();
		fs.unlinkSync(testDb);
		fs.unlinkSync(testDb + ".idx.db");
		const rawData = `${model.serialize({
			_id: "1",
			a: 2,
			ages: [1, 5, 12],
		})}\n${model.serialize({ _id: "3", today: now })}`;
		const rawIndexes = `${model.serialize({
			$$indexCreated: { fieldName: "test", unique: true, sparse: true },
		})}\n`;
		fs.writeFileSync(testDb, rawData, "utf8");
		fs.writeFileSync(testDb + ".idx.db", rawIndexes, "utf8");
		await d.loadDatabase();
		const treatedData: any[] = d.getAllData();
		const indexes = d.indexes;
		Object.keys(indexes).length.should.equal(2);
		assert.deepEqual(
			{
				fieldName: indexes.test.fieldName,
				unique: indexes.test.unique,
				sparse: true,
			},
			{ fieldName: "test", unique: true, sparse: true }
		);

		treatedData.sort(({ _id: _id1 }, { _id: _id2 }) => _id1 - _id2);
		treatedData.length.should.equal(2);
		_.isEqual(treatedData[0], {
			_id: "1",
			a: 2,
			ages: [1, 5, 12],
		}).should.equal(true);
		_.isEqual(treatedData[1], { _id: "3", today: now }).should.equal(true);
	});

	it("Compact database manually", async () => {
		await d.loadDatabase();
		await d.insert({ a: 2 });
		await d.insert({ a: 4 });
		await d.remove({ a: 2 });

		// Here, the underlying file is 3 lines long for only one document
		const data = fs.readFileSync(d.ref, "utf8").split("\n");
		let filledCount = 0;

		data.forEach(({ length }) => {
			if (length > 0) {
				filledCount += 1;
			}
		});
		filledCount.should.equal(3);
		await d.loadDatabase();
		await d.persistence.compactDatafile();

		// Now, the file has been compacted and is only 1 line long
		const data2 = fs.readFileSync(d.ref, "utf8").split("\n");
		let filledCount22 = 0;

		data2.forEach(({ length }) => {
			if (length > 0) {
				filledCount22 += 1;
			}
		});
		filledCount22.should.equal(1);
	});

	it("Calling loadDatabase after the data was modified doesnt change its contents", async () => {
		await d.loadDatabase();
		await d.insert({ a: 1 });
		await d.insert({ a: 2 });
		{
			const data = d.getAllData();
			const doc1 = _.find(data, ({ a }) => a === 1);
			const doc2 = _.find(data, ({ a }) => a === 2);
			data.length.should.equal(2);
			doc1!.a.should.equal(1);
			doc2!.a.should.equal(2);
		}
		{
			await d.loadDatabase();
			const data = d.getAllData();
			const doc1 = _.find(data, ({ a }) => a === 1);
			const doc2 = _.find(data, ({ a }) => a === 2);
			data.length.should.equal(2);
			doc1!.a.should.equal(1);
			doc2!.a.should.equal(2);
		}
	});

	it("Calling loadDatabase after the datafile was removed will reset the database", async () => {
		await d.loadDatabase();
		await d.insert({ a: 1 });
		await d.insert({ a: 2 });
		const data = d.getAllData();
		const doc1 = _.find(data, ({ a }) => a === 1);
		const doc2 = _.find(data, ({ a }) => a === 2);
		data.length.should.equal(2);
		doc1!.a.should.equal(1);
		doc2!.a.should.equal(2);
		await promisify(fs.unlink)(testDb);
		await d.loadDatabase();
		d.getAllData().length.should.equal(0);
	});

	it("Calling loadDatabase after the datafile was modified loads the new data", async () => {
		{
			await d.loadDatabase();
			await d.insert({ a: 1 });
			await d.insert({ a: 2 });

			const data = d.getAllData();
			const doc1 = _.find(data, ({ a }) => a === 1);
			const doc2 = _.find(data, ({ a }) => a === 2);
			data.length.should.equal(2);
			doc1!.a.should.equal(1);
			doc2!.a.should.equal(2);
		}
		{
			fs.writeFileSync(testDb, '{"a":3,"_id":"aaa"}', "utf8");
			await d.loadDatabase();
			const data = d.getAllData();
			const doc1 = _.find(data, ({ a }) => a === 1);
			const doc2 = _.find(data, ({ a }) => a === 2);
			const doc3 = _.find(data, ({ a }) => a === 3);
			data.length.should.equal(1);
			doc3!.a.should.equal(3);
			assert.isUndefined(doc1);
			assert.isUndefined(doc2);
		}
	});

	it("When treating raw data, refuse to proceed if too much data is corrupt, to avoid data loss", async () => {
		const corruptTestFilename = "workspace/corruptTest.db";

		const fakeData =
			'{"_id":"one","hello":"world"}\n' +
			"Some corrupt data\n" +
			'{"_id":"two","hello":"earth"}\n' +
			'{"_id":"three","hello":"you"}\n';

		fs.writeFileSync(corruptTestFilename, fakeData, "utf8");

		// Default corruptAlertThreshold
		let d = new Datastore({
			ref: corruptTestFilename,
			persistence_adapter: FS_Persistence_Adapter,
		});
		await expect(d.loadDatabase()).to.be.rejectedWith(Error);
		fs.writeFileSync(corruptTestFilename, fakeData, "utf8");
		d = new Datastore({
			ref: corruptTestFilename,
			corruptAlertThreshold: 1,
			persistence_adapter: FS_Persistence_Adapter,
		});
		await expect(d.loadDatabase()).not.to.be.rejectedWith(Error);

		fs.writeFileSync(corruptTestFilename, fakeData, "utf8");
		d = new Datastore({
			ref: corruptTestFilename,
			corruptAlertThreshold: 0,
			persistence_adapter: FS_Persistence_Adapter,
		});
		await expect(d.loadDatabase()).to.be.rejectedWith(Error);
	});

	describe("Serialization hooks", () => {
		const as = (s: string) => `before_${s}_after`;
		const bd = (s: string) => s.substring(7, s.length - 6);

		it("Declaring only one hook will throw an exception to prevent data loss", async () => {
			const hookTestFilename = "workspace/hookTest.db";
			await storage.ensureFileDoesntExist(hookTestFilename);
			fs.writeFileSync(hookTestFilename, "Some content", "utf8");

			(() => {
				new Datastore({
					ref: hookTestFilename,
					afterSerialization: as,
					persistence_adapter: FS_Persistence_Adapter,
				});
			}).should.throw();

			// Data file left untouched
			fs.readFileSync(hookTestFilename, "utf8").should.equal(
				"Some content"
			);

			(() => {
				new Datastore({
					ref: hookTestFilename,
					beforeDeserialization: bd,
					persistence_adapter: FS_Persistence_Adapter,
				});
			}).should.throw();

			// Data file left untouched
			fs.readFileSync(hookTestFilename, "utf8").should.equal(
				"Some content"
			);
		});

		it("Declaring two hooks that are not reverse of one another will cause an exception to prevent data loss", async () => {
			const hookTestFilename = "workspace/hookTest.db";
			storage.ensureFileDoesntExist(hookTestFilename);
			fs.writeFileSync(hookTestFilename, "Some content", "utf8");

			(() => {
				new Datastore({
					ref: hookTestFilename,
					afterSerialization: as,
					persistence_adapter: FS_Persistence_Adapter,
					beforeDeserialization(s) {
						return s;
					},
				});
			}).should.throw();

			// Data file left untouched
			fs.readFileSync(hookTestFilename, "utf8").should.equal(
				"Some content"
			);
		});

		it("A serialization hook can be used to transform data before writing new state to disk", async () => {
			const hookTestFilename = "workspace/hookTest.db";
			await storage.ensureFileDoesntExist(hookTestFilename);
			await storage.ensureFileDoesntExist(hookTestFilename + ".idx.db");
			const d = new Datastore({
				ref: hookTestFilename,
				afterSerialization: as,
				beforeDeserialization: bd,
				persistence_adapter: FS_Persistence_Adapter,
			});
			await d.loadDatabase();

			{
				await d.insert({ hello: "world" });
				const _data = fs.readFileSync(hookTestFilename, "utf8");
				const data = _data.split("\n");
				let doc0 = bd(data[0]);
				data.length.should.equal(2);

				data[0].substring(0, 7).should.equal("before_");
				data[0].substring(data[0].length - 6).should.equal("_after");

				doc0 = model.deserialize(doc0);
				Object.keys(doc0).length.should.equal(2);
				(doc0 as any).hello.should.equal("world");
			}
			{
				await d.insert({ p: "Mars" });
				const _data = fs.readFileSync(hookTestFilename, "utf8");

				const data = _data.split("\n");
				let doc0 = bd(data[0]);
				let doc1 = bd(data[1]);
				data.length.should.equal(3);

				data[0].substring(0, 7).should.equal("before_");
				data[0].substring(data[0].length - 6).should.equal("_after");
				data[1].substring(0, 7).should.equal("before_");
				data[1].substring(data[1].length - 6).should.equal("_after");

				doc0 = model.deserialize(doc0);
				Object.keys(doc0).length.should.equal(2);
				(doc0 as any).hello.should.equal("world");

				doc1 = model.deserialize(doc1);
				Object.keys(doc1).length.should.equal(2);
				(doc1 as any).p.should.equal("Mars");
			}
			{
				await d.ensureIndex({ fieldName: "idefix" });
				const _data = fs.readFileSync(hookTestFilename, "utf8");
				const _indexes = fs.readFileSync(
					hookTestFilename + ".idx.db",
					"utf8"
				);
				const data = _data.split("\n");
				const indexes = _indexes.split("\n");
				let doc0 = bd(data[0]);
				let doc1 = bd(data[1]);
				let idx = bd(indexes[0]);
				data.length.should.equal(3);
				indexes.length.should.equal(2);

				data[0].substring(0, 7).should.equal("before_");
				data[0].substring(data[0].length - 6).should.equal("_after");
				data[1].substring(0, 7).should.equal("before_");
				data[1].substring(data[1].length - 6).should.equal("_after");

				doc0 = model.deserialize(doc0);
				Object.keys(doc0).length.should.equal(2);
				(doc0 as any).hello.should.equal("world");

				doc1 = model.deserialize(doc1);
				Object.keys(doc1).length.should.equal(2);
				(doc1 as any).p.should.equal("Mars");

				idx = model.deserialize(idx);
				assert.deepEqual(idx as any, {
					$$indexCreated: { fieldName: "idefix" },
				});
			}
		});

		it("Use serialization hook when persisting cached database or compacting", async () => {
			const hookTestFilename = "workspace/hookTest.db";
			await storage.ensureFileDoesntExist(hookTestFilename);
			await storage.ensureFileDoesntExist(hookTestFilename + ".idx.db");
			const d = new Datastore({
				ref: hookTestFilename,
				afterSerialization: as,
				beforeDeserialization: bd,
				persistence_adapter: FS_Persistence_Adapter,
			});
			await d.loadDatabase();
			await d.insert({ hello: "world" });

			await d.update(
				{ hello: "world" },
				{ $set: { hello: "earth" } },
				{}
			);

			await d.ensureIndex({ fieldName: "idefix" });

			let _id;
			{
				const _data = fs.readFileSync(hookTestFilename, "utf8");
				const _indexes = fs.readFileSync(
					hookTestFilename + ".idx.db",
					"utf8"
				);
				const data = _data.split("\n");
				const indexes = _indexes.split("\n");
				let doc0 = bd(data[0]);
				let doc1 = bd(data[1]);
				let idx = bd(indexes[0]);
				data.length.should.equal(3);
				indexes.length.should.equal(2);
				doc0 = model.deserialize(doc0);
				Object.keys(doc0).length.should.equal(2);
				(doc0 as any).hello.should.equal("world");
				doc1 = model.deserialize(doc1);
				Object.keys(doc1).length.should.equal(2);
				(doc1 as any).hello.should.equal("earth");
				(doc0 as any)._id.should.equal((doc1 as any)._id);
				_id = (doc0 as any)._id;
				idx = model.deserialize(idx);
				assert.deepEqual(idx as any, {
					$$indexCreated: {
						fieldName: "idefix",
					},
				});
			}

			await d.persistence.compactDatafile();
			const _data = fs.readFileSync(hookTestFilename, "utf8");
			const _indexes = fs.readFileSync(
				hookTestFilename + ".idx.db",
				"utf8"
			);
			const data = _data.split("\n");
			const indexes = _indexes.split("\n");
			let doc0 = bd(data[0]);
			let idx = bd(indexes[0]);
			data.length.should.equal(2);
			indexes.length.should.equal(2);
			doc0 = model.deserialize(doc0);
			Object.keys(doc0).length.should.equal(2);
			(doc0 as any).hello.should.equal("earth");
			(doc0 as any)._id.should.equal(_id);
			idx = model.deserialize(idx);
			assert.deepEqual(idx as any, {
				$$indexCreated: {
					fieldName: "idefix",
					unique: false,
					sparse: false,
				},
			});
		});

		it("Deserialization hook is correctly used when loading data", async () => {
			const hookTestFilename = "workspace/hookTest.db";
			await storage.ensureFileDoesntExist(hookTestFilename);
			const d = new Datastore({
				ref: hookTestFilename,
				afterSerialization: as,
				beforeDeserialization: bd,
				persistence_adapter: FS_Persistence_Adapter,
			});
			await d.loadDatabase();
			const doc = (await d.insert({ hello: "world" })).docs[0];
			const _id = (doc as any)._id;
			await d.insert({ yo: "ya" });
			await d.update(
				{ hello: "world" },
				{ $set: { hello: "earth" } },
				{}
			);
			await d.remove({ yo: "ya" });
			await d.ensureIndex({ fieldName: "idefix" });

			{
				const _data = fs.readFileSync(hookTestFilename, "utf8");
				const _indexes = fs.readFileSync(
					hookTestFilename + ".idx.db",
					"utf8"
				);
				const data = _data.split("\n");
				data.length.should.equal(5);
				const indexes = _indexes.split("\n");
				indexes.length.should.equal(2);
				// Everything is deserialized correctly, including deletes and indexes
				const d = new Datastore({
					ref: hookTestFilename,
					afterSerialization: as,
					beforeDeserialization: bd,
					persistence_adapter: FS_Persistence_Adapter,
				});
				await d.loadDatabase();
				const docs = await d.find({});
				docs.length.should.equal(1);
				(docs[0] as any).hello.should.equal("earth");
				(docs[0] as any)._id.should.equal(_id);

				Object.keys(d.indexes).length.should.equal(2);
				Object.keys(d.indexes).indexOf("idefix").should.not.equal(-1);
			}
		});
	}); // ==== End of 'Serialization hooks' ==== //

	describe("Prevent dataloss when persisting data", () => {
		it("Creating a persistent datastore with a bad filename will cause an error", () => {
			(() => {
				new Datastore({
					ref: "workspace/bad.db~",
					persistence_adapter: FS_Persistence_Adapter,
				});
			}).should.throw();
		});

		it("If no file exists, ensureDataFileIntegrity creates an empty datafile", async () => {
			const p = new Persistence({
				db: new Datastore({
					ref: "workspace/it.db",
					persistence_adapter: FS_Persistence_Adapter,
				}),
			});
			if (fs.existsSync("workspace/it.db")) {
				fs.unlinkSync("workspace/it.db");
			}
			if (fs.existsSync("workspace/it.db~")) {
				fs.unlinkSync("workspace/it.db~");
			}
			fs.existsSync("workspace/it.db").should.equal(false);
			fs.existsSync("workspace/it.db~").should.equal(false);
			await storage.ensureDataFileIntegrity(p.ref);
			fs.existsSync("workspace/it.db").should.equal(true);
			fs.existsSync("workspace/it.db~").should.equal(false);
			fs.readFileSync("workspace/it.db", "utf8").should.equal("");
		});

		it("If only datafile exists, ensureDataFileIntegrity will use it", async () => {
			const p = new Persistence({
				db: new Datastore({
					ref: "workspace/it.db",
					persistence_adapter: FS_Persistence_Adapter,
				}),
			});
			if (fs.existsSync("workspace/it.db")) {
				fs.unlinkSync("workspace/it.db");
			}
			if (fs.existsSync("workspace/it.db~")) {
				fs.unlinkSync("workspace/it.db~");
			}
			fs.writeFileSync("workspace/it.db", "something", "utf8");
			fs.existsSync("workspace/it.db").should.equal(true);
			fs.existsSync("workspace/it.db~").should.equal(false);
			await storage.ensureDataFileIntegrity(p.ref);
			fs.existsSync("workspace/it.db").should.equal(true);
			fs.existsSync("workspace/it.db~").should.equal(false);
			fs.readFileSync("workspace/it.db", "utf8").should.equal(
				"something"
			);
		});

		it("If temp datafile exists and datafile doesnt, ensureDataFileIntegrity will use it (cannot happen except upon first use)", async () => {
			const p = new Persistence({
				db: new Datastore({
					ref: "workspace/it.db",
					persistence_adapter: FS_Persistence_Adapter,
				}),
			});

			if (fs.existsSync("workspace/it.db")) {
				fs.unlinkSync("workspace/it.db");
			}
			if (fs.existsSync("workspace/it.db~")) {
				fs.unlinkSync("workspace/it.db~~");
			}

			fs.writeFileSync("workspace/it.db~", "something", "utf8");

			fs.existsSync("workspace/it.db").should.equal(false);
			fs.existsSync("workspace/it.db~").should.equal(true);

			await storage.ensureDataFileIntegrity(p.ref);
			fs.existsSync("workspace/it.db").should.equal(true);
			fs.existsSync("workspace/it.db~").should.equal(false);

			fs.readFileSync("workspace/it.db", "utf8").should.equal(
				"something"
			);
		});

		// Technically it could also mean the write was successful but the rename wasn't, but there is in any case no guarantee that the data in the temp file is whole so we have to discard the whole file
		it("If both temp and current datafiles exist, ensureDataFileIntegrity will use the datafile, as it means that the write of the temp file failed", async () => {
			const theDb = new Datastore({
				ref: "workspace/it.db",
				persistence_adapter: FS_Persistence_Adapter,
			});

			if (fs.existsSync("workspace/it.db")) {
				fs.unlinkSync("workspace/it.db");
			}
			if (fs.existsSync("workspace/it.db~")) {
				fs.unlinkSync("workspace/it.db~");
			}

			fs.writeFileSync(
				"workspace/it.db",
				'{"_id":"0","hello":"world"}',
				"utf8"
			);
			fs.writeFileSync(
				"workspace/it.db~",
				'{"_id":"0","hello":"other"}',
				"utf8"
			);

			fs.existsSync("workspace/it.db").should.equal(true);
			fs.existsSync("workspace/it.db~").should.equal(true);

			await storage.ensureDataFileIntegrity(theDb.persistence.ref);
			fs.existsSync("workspace/it.db").should.equal(true);
			fs.existsSync("workspace/it.db~").should.equal(true);

			fs.readFileSync("workspace/it.db", "utf8").should.equal(
				'{"_id":"0","hello":"world"}'
			);

			await theDb.loadDatabase();
			await theDb.persistence.compactDatafile();
			const docs = await theDb.find({});
			docs.length.should.equal(1);
			(docs[0] as any).hello.should.equal("world");
			fs.existsSync("workspace/it.db").should.equal(true);
			fs.existsSync("workspace/it.db~").should.equal(false);
		});

		it("persistCachedDatabase should update the contents of the datafile and leave a clean state", async () => {
			await d.insert({ hello: "world" });
			const length = (await d.find({})).length;

			length.should.equal(1);

			if (fs.existsSync(testDb)) {
				fs.unlinkSync(testDb);
			}
			if (fs.existsSync(`${testDb}~`)) {
				fs.unlinkSync(`${testDb}~`);
			}
			fs.existsSync(testDb).should.equal(false);

			fs.writeFileSync(`${testDb}~`, "something", "utf8");
			fs.existsSync(`${testDb}~`).should.equal(true);

			await d.persistence.compactDatafile();
			const contents = fs.readFileSync(testDb, "utf8");
			fs.existsSync(testDb).should.equal(true);
			fs.existsSync(`${testDb}~`).should.equal(false);
			if (
				!contents.match(
					/^{"hello":"world","_id":"[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}"}\n$/
				)
			) {
				throw new Error("Datafile contents not as expected");
			}
		});

		it("After a persistCachedDatabase, there should be no temp or old filename", async () => {
			await d.insert({ hello: "world" });
			const length = (await d.find({})).length;
			length.should.equal(1);
			if (fs.existsSync(testDb)) {
				fs.unlinkSync(testDb);
			}
			if (fs.existsSync(`${testDb}~`)) {
				fs.unlinkSync(`${testDb}~`);
			}
			fs.existsSync(testDb).should.equal(false);
			fs.existsSync(`${testDb}~`).should.equal(false);
			fs.writeFileSync(`${testDb}~`, "bloup", "utf8");
			fs.existsSync(`${testDb}~`).should.equal(true);
			await d.persistence.compactDatafile();
			const contents = fs.readFileSync(testDb, "utf8");
			fs.existsSync(testDb).should.equal(true);
			fs.existsSync(`${testDb}~`).should.equal(false);
			if (
				!contents.match(
					/^{"hello":"world","_id":"[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}"}\n$/
				)
			) {
				throw new Error("Datafile contents not as expected");
			}
		});

		it("persistCachedDatabase should update the contents of the datafile and leave a clean state even if there is a temp datafile", async () => {
			await d.insert({ hello: "world" });
			const length = (await d.find({})).length;
			length.should.equal(1);

			if (fs.existsSync(testDb)) {
				fs.unlinkSync(testDb);
			}
			fs.writeFileSync(`${testDb}~`, "blabla", "utf8");
			fs.existsSync(testDb).should.equal(false);
			fs.existsSync(`${testDb}~`).should.equal(true);

			await d.persistence.compactDatafile();
			const contents = fs.readFileSync(testDb, "utf8");
			fs.existsSync(testDb).should.equal(true);
			fs.existsSync(`${testDb}~`).should.equal(false);
			if (
				!contents.match(
					/^{"hello":"world","_id":"[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}"}\n$/
				)
			) {
				throw new Error("Datafile contents not as expected");
			}
		});

		it("persistCachedDatabase should update the contents of the datafile and leave a clean state even if there is a temp datafile", async () => {
			const dbFile = "workspace/test2.db";
			let theDb;

			if (fs.existsSync(dbFile)) {
				fs.unlinkSync(dbFile);
			}
			if (fs.existsSync(`${dbFile}~`)) {
				fs.unlinkSync(`${dbFile}~`);
			}

			theDb = new Datastore({
				ref: dbFile,
				persistence_adapter: FS_Persistence_Adapter,
			});

			await theDb.loadDatabase();
			const contents = fs.readFileSync(dbFile, "utf8");
			fs.existsSync(dbFile).should.equal(true);
			fs.existsSync(`${dbFile}~`).should.equal(false);
			if (contents != "") {
				throw new Error("Datafile contents not as expected");
			}
		});

		it("Persistence works as expected when everything goes fine", async () => {
			const dbFile = "workspace/test2.db";
			let theDb2;
			await storage.ensureFileDoesntExist(dbFile);
			await storage.ensureFileDoesntExist(`${dbFile}~`);
			const theDb = new Datastore({
				ref: dbFile,
				persistence_adapter: FS_Persistence_Adapter,
			});
			await theDb.loadDatabase();
			const length = (await theDb.find({})).length;
			length.should.equal(0);
			const doc1 = (await theDb.insert({ a: "hello" })).docs[0];
			const doc2 = (await theDb.insert({ a: "world" })).docs[0];
			{
				const docs = await theDb.find({});
				docs.length.should.equal(2);
				docs.filter((x) => x._id === (doc1 as any)._id)
					.map((x) => (x as any).a)[0]
					.should.equal("hello");
				docs.filter((x) => x._id === (doc2 as any)._id)
					.map((x) => (x as any).a)[0]
					.should.equal("world");
			}
			{
				const docs = await theDb.find({});
				await theDb.loadDatabase();
				// no change
				docs.length.should.equal(2);
				docs.filter((x) => x._id === (doc1 as any)._id)
					.map((x) => (x as any).a)[0]
					.should.equal("hello");
				docs.filter((x) => x._id === (doc2 as any)._id)
					.map((x) => (x as any).a)[0]
					.should.equal("world");
				fs.existsSync(dbFile).should.equal(true);
				fs.existsSync(`${dbFile}~`).should.equal(false);
			}
			{
				const docs = await theDb.find({});
				theDb2 = new Datastore({
					ref: dbFile,
					persistence_adapter: FS_Persistence_Adapter,
				});
				await theDb2.loadDatabase();
				// no change
				docs.length.should.equal(2);
				docs.filter((x) => x._id === (doc1 as any)._id)
					.map((x) => (x as any).a)[0]
					.should.equal("hello");
				docs.filter((x) => x._id === (doc2 as any)._id)
					.map((x) => (x as any).a)[0]
					.should.equal("world");
				fs.existsSync(dbFile).should.equal(true);
				fs.existsSync(`${dbFile}~`).should.equal(false);
			}
		});

		// Not run on Windows as there is no clean way to set maximum file descriptors. Not an issue as the code itself is tested.
		it("Cannot cause EMFILE errors by opening too many file descriptors", function (done) {
			this.timeout(6000);
			if (process.platform === "win32") {
				return done();
			}
			child_process.execFile(
				"test/core/test_lac/openFdsLaunch.sh",
				(err, stdout) => {
					if (err) {
						return done(err);
					}

					// The subprocess will not output anything to stdout unless part of the test fails
					if (stdout.length !== 0) {
						return done(stdout);
					} else {
						return done();
					}
				}
			);
		});
	}); // ==== End of 'Prevent dataloss when persisting data' ====

	describe("ensureFileDoesntExist", () => {
		it("Doesnt do anything if file already doesnt exist", (done) => {
			storage
				.ensureFileDoesntExist("workspace/nonexisting")
				.then(() => {
					fs.existsSync("workspace/nonexisting").should.equal(false);
					done();
				})
				.catch((e) => assert.isFalse(!!e));
		});

		it("Deletes file if it exists", (done) => {
			fs.writeFileSync("workspace/existing", "hello world", "utf8");
			fs.existsSync("workspace/existing").should.equal(true);

			storage
				.ensureFileDoesntExist("workspace/existing")
				.then(() => {
					fs.existsSync("workspace/existing").should.equal(false);
					done();
				})
				.catch((e) => assert.isFalse(!!e));
		});
	}); // ==== End of 'ensureFileDoesntExist' ====

	describe.skip("Dealing with large databases", function () {
		this.timeout(6000 * 100);
		// preparation
		const dbRef = path.join(__dirname, "./test_lac/big.db");
		async function prepare() {
			const OBJ = {
				hello: "world",
				arr: ["a"],
				text:
					"In incididunt laboris consectetur ut non dolore tempor aute deserunt voluptate eu. Minim mollit consectetur pariatur irure anim ut elit consectetur. Pariatur amet irure adipisicing amet nisi aliqua enim consequat minim labore eu amet minim officia. Reprehenderit non incididunt fugiat aute mollit amet in sint occaecat reprehenderit. Ullamco consequat enim laboris duis consectetur nulla sunt magna minim.",
				_id: "5a2a4713-23ae-4169-9235-f3ae49c95a1f",
				createdAt: { $$date: 1587151303874 },
				updatedAt: { $$date: 1587151303874 },
			};

			await storage.unlink(dbRef);
			await storage.ensureDataFileIntegrity(dbRef);
			const limit = 4000; // means 1 GB of data
			for (let i = 0; i < limit; i++) {
				OBJ._id = customUtils.randomString(100);
				if (i === 987) {
					OBJ._id = "known";
				}
				for (let i = 0; i < 10; i++) {
					OBJ.arr.push(customUtils.randomString(10));
				}
				await storage.appendFile(dbRef, `${model.serialize(OBJ)}\n`);
			}
		}

		const big = new Datastore({
			ref: dbRef,
			persistence_adapter: FS_Persistence_Adapter,
		});

		it("Loading the database", async function () {
			await prepare();
			await big.loadDatabase();
			const t = new Date().getTime();
			const found = await big.find({ _id: "known" });
			assert.isDefined(found[0]);
		});
		it("Writing the database", async function () {
			await big.persistence.compactDatafile();
		});
	}); // ==== End of 'ensureFileDoesntExist' ====
});
