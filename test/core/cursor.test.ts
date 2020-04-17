import { FS_Persistence_Adapter, storage } from "../../src/fs-adapter";
import { Cursor, Datastore } from "@core";
import { assert, expect, should, use } from "chai";
import * as asPromised from "chai-as-promised";
import * as fs from "fs";
import * as path from "path";
import * as _ from "underscore";
import { promisify } from "util";
use(asPromised);
should();

const testDb = "workspace/test.db";

describe("Cursor", () => {
	let d = new Datastore<any>({
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
		await d.loadDatabase();
		d.getAllData().length.should.equal(0);
	});
	describe("Without sorting", () => {
		beforeEach(async () => {
			await d.insert({ age: 5 });
			await d.insert({ age: 57 });
			await d.insert({ age: 52 });
			await d.insert({ age: 23 });
			await d.insert({ age: 89 });
		});
		it("Without query, an empty query or a simple query and no skip or limit", async () => {
			{
				// no query
				const cursor = new Cursor<{ age: number; _id: string }>(d);
				const docs = await cursor.exec();
				docs.length.should.equal(5);
				_.filter(docs, ({ age }) => age === 5)[0].age.should.equal(5);
				_.filter(docs, ({ age }) => age === 57)[0].age.should.equal(57);
				_.filter(docs, ({ age }) => age === 52)[0].age.should.equal(52);
				_.filter(docs, ({ age }) => age === 23)[0].age.should.equal(23);
				_.filter(docs, ({ age }) => age === 89)[0].age.should.equal(89);
			}
			{
				// empty query
				const cursor = new Cursor<{ age: number; _id: string }>(d, {});
				const docs = await cursor.exec();
				docs.length.should.equal(5);
				_.filter(docs, ({ age }) => age === 5)[0].age.should.equal(5);
				_.filter(docs, ({ age }) => age === 57)[0].age.should.equal(57);
				_.filter(docs, ({ age }) => age === 52)[0].age.should.equal(52);
				_.filter(docs, ({ age }) => age === 23)[0].age.should.equal(23);
				_.filter(docs, ({ age }) => age === 89)[0].age.should.equal(89);
			}
			{
				// simple query
				const cursor = new Cursor<{ age: number; _id: string }>(d, {
					age: { $gt: 23 },
				});
				const docs = await cursor.exec();
				docs.length.should.equal(3);
				_.filter(docs, ({ age }) => age === 57)[0].age.should.equal(57);
				_.filter(docs, ({ age }) => age === 52)[0].age.should.equal(52);
				_.filter(docs, ({ age }) => age === 89)[0].age.should.equal(89);
			}
		});
		it("With an empty collection", async () => {
			await d.remove({}, { multi: true });
			const cursor = new Cursor<{ age: number; _id: string }>(d, {});
			const docs = await cursor.exec();
			docs.length.should.equal(0);
		});
		it("With a limit", async () => {
			const cursor = new Cursor(d);
			cursor.limit(3);
			const docs = await cursor.exec();
			docs.length.should.equal(3);
		});
		it("With a skip", (done) => {
			const cursor = new Cursor(d);
			cursor
				.skip(2)
				.exec()
				.then(({ length }) => {
					length.should.equal(3);
					done();
				});
		});
		it("With a limit and a skip and method chaining", (done) => {
			const cursor = new Cursor(d);
			cursor.limit(4).skip(3);
			// Only way to know that the right number of results was skipped is if limit + skip > number of results
			cursor.exec().then(({ length }) => {
				length.should.equal(2);
				// No way to predict which results are returned of course ...
				done();
			});
		});
	}); // ===== End of 'Without sorting' =====

	describe("Sorting of the results", () => {
		beforeEach(async () => {
			await d.insert({ age: 5 });
			await d.insert({ age: 57 });
			await d.insert({ age: 52 });
			await d.insert({ age: 23 });
			await d.insert({ age: 89 });
		});

		it("Using one sort", (done) => {
			let cursor = new Cursor<{ age: number; _id: string }>(d, {});
			cursor.sort({ age: 1 });
			cursor
				.exec()
				.then((docs) => {
					// Results are in ascending order
					for (let i = 0; i < docs.length - 1; i += 1) {
						assert(docs[i].age < docs[i + 1].age);
					}
					cursor.sort({ age: -1 });
					return cursor.exec();
				})
				.then((docs) => {
					// Results are in descending order
					for (let i = 0; i < docs.length - 1; i += 1) {
						assert(docs[i].age > docs[i + 1].age);
					}
					done();
				});
		});
		it("With an empty collection", async () => {
			await d.remove({}, { multi: true });
			const cursor = new Cursor(d);
			cursor.sort({ age: 1 });
			const length = (await cursor.exec()).length;
			length.should.equal(0);
		});
		it("Ability to chain sorting and exec", async () => {
			{
				const cursor = new Cursor<{ age: number; _id: string }>(d);
				const docs = await cursor.sort({ age: 1 }).exec();
				for (let i = 0; i < docs.length - 1; i += 1) {
					expect(docs[i].age).to.be.lessThan(docs[i + 1].age);
				}
				// Results are in ascending order
			}
			{
				const cursor = new Cursor<{ age: number; _id: string }>(d);
				const docs = await cursor.sort({ age: -1 }).exec();
				for (let i = 0; i < docs.length - 1; i += 1) {
					expect(docs[i].age).to.greaterThan(docs[i + 1].age);
				}
			}
		});
		it("Using limit and sort", async () => {
			{
				const cursor = new Cursor<{ _id: string; age: number }>(d);
				const docs = await cursor.sort({ age: 1 }).limit(3).exec();
				docs.length.should.equal(3);
				docs[0].age.should.equal(5);
				docs[1].age.should.equal(23);
				docs[2].age.should.equal(52);
			}
			{
				const cursor = new Cursor<{ _id: string; age: number }>(d);
				const docs = await cursor.sort({ age: -1 }).limit(2).exec();
				docs.length.should.equal(2);
				docs[0].age.should.equal(89);
				docs[1].age.should.equal(57);
				assert.isUndefined(docs[2]);
			}
		});
		it("Using a limit higher than total number of docs shouldnt cause an error", (done) => {
			const cursor = new Cursor<{ _id: string; age: number }>(d);
			cursor
				.sort({ age: 1 })
				.limit(7)
				.exec()
				.then((docs) => {
					docs.length.should.equal(5);
					docs[0].age.should.equal(5);
					docs[1].age.should.equal(23);
					docs[2].age.should.equal(52);
					docs[3].age.should.equal(57);
					docs[4].age.should.equal(89);
					done();
				});
		});
		it("Using limit and skip with sort", async () => {
			{
				const cursor = new Cursor<{ _id: string; age: number }>(d);
				const docs = await cursor
					.sort({ age: 1 })
					.limit(1)
					.skip(2)
					.exec();
				docs.length.should.equal(1);
				docs[0].age.should.equal(52);
			}
			{
				const cursor = new Cursor<{ _id: string; age: number }>(d);
				const docs = await cursor
					.sort({ age: 1 })
					.limit(3)
					.skip(1)
					.exec();
				docs.length.should.equal(3);
				docs[0].age.should.equal(23);
				docs[1].age.should.equal(52);
				docs[2].age.should.equal(57);
			}
			{
				const cursor = new Cursor<{ _id: string; age: number }>(d);
				const docs = await cursor
					.sort({ age: -1 })
					.limit(2)
					.skip(2)
					.exec();
				docs.length.should.equal(2);
				docs[0].age.should.equal(52);
				docs[1].age.should.equal(23);
			}
		});
		it("Using too big a limit and a skip with sort", async () => {
			const cursor = new Cursor<{ _id: string; age: number }>(d);
			const docs = await cursor.sort({ age: 1 }).limit(8).skip(2).exec();
			docs.length.should.equal(3);
			docs[0].age.should.equal(52);
			docs[1].age.should.equal(57);
			docs[2].age.should.equal(89);
		});
		it("Using too big a skip with sort should return no result", async () => {
			{
				const cursor = new Cursor(d);
				const length = (await cursor.sort({ age: 1 }).skip(5).exec())
					.length;
				length.should.equal(0);
			}
			{
				const cursor = new Cursor(d);
				const length = (await cursor.sort({ age: 1 }).skip(7).exec())
					.length;
				length.should.equal(0);
			}
			{
				const cursor = new Cursor(d);
				const length = (
					await cursor.sort({ age: 1 }).limit(3).skip(7).exec()
				).length;
				length.should.equal(0);
			}
			{
				const cursor = new Cursor(d);
				const length = (
					await cursor.sort({ age: 1 }).limit(6).skip(7).exec()
				).length;
				length.should.equal(0);
			}
		});
		it("Sorting strings", async () => {
			await d.remove({}, { multi: true });
			await d.insert({ name: "jako" });
			await d.insert({ name: "jakeb" });
			await d.insert({ name: "sue" });
			{
				const cursor = new Cursor<{ name: string; _id: string }>(d, {});
				const docs = await cursor.sort({ name: 1 }).exec();
				docs.length.should.equal(3);
				docs[0].name.should.equal("jakeb");
				docs[1].name.should.equal("jako");
				docs[2].name.should.equal("sue");
			}
			{
				const cursor = new Cursor<{ name: string; _id: string }>(d, {});
				const docs = await cursor.sort({ name: -1 }).exec();
				docs.length.should.equal(3);
				docs[0].name.should.equal("sue");
				docs[1].name.should.equal("jako");
				docs[2].name.should.equal("jakeb");
			}
		});
		it("Sorting nested fields with dates", async () => {
			await d.remove({}, { multi: true });
			let doc1 = (
				await d.insert({
					event: { recorded: new Date(4) },
				})
			).docs[0];
			let doc2 = (
				await d.insert({
					event: { recorded: new Date(6) },
				})
			).docs[0];
			let doc3 = (
				await d.insert({
					event: { recorded: new Date(2) },
				})
			).docs[0];
			{
				const cursor = new Cursor<{
					_id: string;
					event: { recorded: Date };
				}>(d, {});
				const docs = await cursor
					.sort({ "event.recorded": 1 } as any)
					.exec();
				docs.length.should.equal(3);
				docs[0]._id.should.equal(doc3._id);
				docs[1]._id.should.equal(doc1._id);
				docs[2]._id.should.equal(doc2._id);
			}
			{
				const cursor = new Cursor<{
					_id: string;
					event: { recorded: Date };
				}>(d, {});
				const docs = await cursor
					.sort({ "event.recorded": -1 } as any)
					.exec();
				docs.length.should.equal(3);
				docs[2]._id.should.equal(doc3._id);
				docs[1]._id.should.equal(doc1._id);
				docs[0]._id.should.equal(doc2._id);
			}
		});
		it("Sorting when some fields are undefined", async () => {
			await d.remove({}, { multi: true });
			await d.insert({ name: "jako", other: 2 });
			await d.insert({ name: "jakeb", other: 3 });
			await d.insert({ name: "sue", other: undefined });
			await d.insert({ name: "henry", other: 4 });

			{
				const cursor = new Cursor<{
					_id: string;
					name: string;
					other: number;
				}>(d, {});
				const docs = await cursor.sort({ other: 1 }).exec();
				docs.length.should.equal(4);
				docs[0].name.should.equal("sue");
				assert.isUndefined(docs[0].other);
				docs[1].name.should.equal("jako");
				docs[1].other.should.equal(2);
				docs[2].name.should.equal("jakeb");
				docs[2].other.should.equal(3);
				docs[3].name.should.equal("henry");
				docs[3].other.should.equal(4);
			}
			{
				const cursor = new Cursor<{
					_id: string;
					name: string;
					other: number;
				}>(d, {
					name: {
						$in: ["suzy", "jakeb", "jako"],
					},
				});
				const docs = await cursor.sort({ other: -1 }).exec();
				docs.length.should.equal(2);
				docs[0].name.should.equal("jakeb");
				docs[0].other.should.equal(3);
				docs[1].name.should.equal("jako");
				docs[1].other.should.equal(2);
			}
		});
		it("Sorting when all fields are undefined", async () => {
			await d.remove({}, { multi: true });
			await d.insert({ name: "jako" });
			await d.insert({ name: "jakeb" });
			await d.insert({ name: "sue" });
			{
				const cursor = new Cursor(d, {});
				const length = (await cursor.sort({ other: 1 }).exec()).length;
				length.should.equal(3);
			}
			{
				const cursor = new Cursor(d, {
					name: {
						$in: ["sue", "jakeb", "jakob"],
					},
				});
				const length = (await cursor.sort({ other: -1 }).exec()).length;
				length.should.equal(2);
			}
		});
		it("Multiple consecutive sorts", async () => {
			await d.remove({}, { multi: true });
			await d.insert({ name: "jako", age: 43, nid: 1 });
			await d.insert({ name: "jakeb", age: 43, nid: 2 });
			await d.insert({ name: "sue", age: 12, nid: 3 });
			await d.insert({ name: "zoe", age: 23, nid: 4 });
			await d.insert({ name: "jako", age: 35, nid: 5 });

			{
				const cursor = new Cursor<{
					name: string;
					age: number;
					nid: number;
					_id: string;
				}>(d, {});
				const docs = await cursor
					.sort({
						name: 1,
						age: -1,
					})
					.exec();
				docs.length.should.equal(5);
				docs[0].nid.should.equal(2);
				docs[1].nid.should.equal(1);
				docs[2].nid.should.equal(5);
				docs[3].nid.should.equal(3);
				docs[4].nid.should.equal(4);
			}
			{
				const cursor = new Cursor<{
					name: string;
					age: number;
					nid: number;
					_id: string;
				}>(d, {});
				const docs = await cursor
					.sort({
						name: 1,
						age: 1,
					})
					.exec();
				docs.length.should.equal(5);
				docs[0].nid.should.equal(2);
				docs[1].nid.should.equal(5);
				docs[2].nid.should.equal(1);
				docs[3].nid.should.equal(3);
				docs[4].nid.should.equal(4);
			}
			{
				const cursor = new Cursor<{
					name: string;
					age: number;
					nid: number;
					_id: string;
				}>(d, {});
				const docs = await cursor
					.sort({
						age: 1,
						name: 1,
					})
					.exec();
				docs.length.should.equal(5);
				docs[0].nid.should.equal(3);
				docs[1].nid.should.equal(4);
				docs[2].nid.should.equal(5);
				docs[3].nid.should.equal(2);
				docs[4].nid.should.equal(1);
			}
			{
				const cursor = new Cursor<{
					name: string;
					age: number;
					nid: number;
					_id: string;
				}>(d, {});
				const docs = await cursor
					.sort({
						age: 1,
						name: -1,
					})
					.exec();
				docs.length.should.equal(5);
				docs[0].nid.should.equal(3);
				docs[1].nid.should.equal(4);
				docs[2].nid.should.equal(5);
				docs[3].nid.should.equal(1);
				docs[4].nid.should.equal(2);
			}
		});
		it("Similar data, multiple consecutive sorts", async () => {
			const companies = ["acme", "milkman", "zoinks"];

			interface Entity {
				company: string;
				cost: number;
				nid: number;
			}

			const entities: Entity[] = [];

			await d.remove({}, { multi: true });

			let id = 1;
			for (let i = 0; i < companies.length; i++) {
				for (let j = 5; j <= 100; j += 5) {
					entities.push({
						company: companies[i],
						cost: j,
						nid: id,
					});
					id++;
				}
			}
			for (let i = 0; i < entities.length; i++) {
				const element = entities[i];
				await d.insert(element);
			}

			const cursor = new Cursor<Entity & { _id: string }>(d, {});
			let docs = await cursor
				.sort({
					company: 1,
					cost: 1,
				})
				.exec();
			docs.length.should.equal(60);
			for (let i = 0; i < docs.length; i++) {
				docs[i].nid.should.equal(i + 1);
			}
		});
	}); // ===== End of 'Sorting' =====

	describe("Projections", () => {
		let doc1: any;
		let doc2: any;
		let doc3: any;
		let doc4: any;
		let doc0: any;
		beforeEach(async () => {
			// We don't know the order in which docs wil be inserted but we ensure correctness by testing both sort orders
			doc0 = (
				await d.insert({
					age: 5,
					name: "Jo",
					planet: "B",
					toys: {
						bebe: true,
						ballon: "much",
					},
				})
			).docs[0];

			doc1 = (
				await d.insert({
					age: 57,
					name: "Louis",
					planet: "R",
					toys: {
						ballon: "yeah",
						bebe: false,
					},
				})
			).docs[0];

			doc2 = (
				await d.insert({
					age: 52,
					name: "Grafitti",
					planet: "C",
					toys: { bebe: "kind of" },
				})
			).docs[0];

			doc3 = (
				await d.insert({
					age: 23,
					name: "LM",
					planet: "S",
				})
			).docs[0];

			doc4 = (
				await d.insert({
					age: 89,
					planet: "Earth",
				})
			).docs[0];
		});
		it("Takes all results if no projection or empty object given", (done) => {
			const cursor = new Cursor(d, {});
			cursor.sort({ age: 1 });
			// For easier finding
			cursor
				.exec()
				.then((docs) => {
					docs.length.should.equal(5);
					assert.deepEqual(docs[0], doc0);
					assert.deepEqual(docs[1], doc3);
					assert.deepEqual(docs[2], doc2);
					assert.deepEqual(docs[3], doc1);
					assert.deepEqual(docs[4], doc4);
					cursor.projection({});
					return cursor.exec();
				})
				.then((docs) => {
					docs.length.should.equal(5);
					assert.deepEqual(docs[0], doc0);
					assert.deepEqual(docs[1], doc3);
					assert.deepEqual(docs[2], doc2);
					assert.deepEqual(docs[3], doc1);
					assert.deepEqual(docs[4], doc4);
					done();
				});
		});
		it("Can take only the expected fields", (done) => {
			const cursor = new Cursor(d, {});
			cursor.sort({ age: 1 });
			// For easier finding
			cursor.projection({
				age: 1,
				name: 1,
			});
			cursor
				.exec()
				.then((docs) => {
					docs.length.should.equal(5);
					// Takes the _id by default
					assert.deepEqual(docs[0] as any, {
						age: 5,
						name: "Jo",
						_id: doc0._id,
					});
					assert.deepEqual(docs[1] as any, {
						age: 23,
						name: "LM",
						_id: doc3._id,
					});
					assert.deepEqual(docs[2] as any, {
						age: 52,
						name: "Grafitti",
						_id: doc2._id,
					});
					assert.deepEqual(docs[3] as any, {
						age: 57,
						name: "Louis",
						_id: doc1._id,
					});
					assert.deepEqual(docs[4] as any, {
						age: 89,
						_id: doc4._id,
					});
					// No problems if one field to take doesn't exist
					cursor.projection({
						age: 1,
						name: 1,
						_id: 0,
					});
					return cursor.exec();
				})
				.then((docs) => {
					docs.length.should.equal(5);
					assert.deepEqual(docs[0] as any, {
						age: 5,
						name: "Jo",
					});
					assert.deepEqual(docs[1] as any, {
						age: 23,
						name: "LM",
					});
					assert.deepEqual(docs[2] as any, {
						age: 52,
						name: "Grafitti",
					});
					assert.deepEqual(docs[3] as any, {
						age: 57,
						name: "Louis",
					});
					assert.deepEqual(docs[4] as any, { age: 89 });
					// No problems if one field to take doesn't exist
					done();
				});
		});
		it("Can omit only the expected fields", (done) => {
			const cursor = new Cursor(d, {});
			cursor.sort({ age: 1 });
			// For easier finding
			cursor.projection({
				age: 0,
				name: 0,
			});
			cursor
				.exec()
				.then((docs) => {
					docs.length.should.equal(5);
					// Takes the _id by default
					assert.deepEqual(docs[0], {
						planet: "B",
						_id: doc0._id,
						toys: {
							bebe: true,
							ballon: "much",
						},
					});
					assert.deepEqual(docs[1] as any, {
						planet: "S",
						_id: doc3._id,
					});
					assert.deepEqual(docs[2] as any, {
						planet: "C",
						_id: doc2._id,
						toys: { bebe: "kind of" },
					});
					assert.deepEqual(docs[3] as any, {
						planet: "R",
						_id: doc1._id,
						toys: {
							bebe: false,
							ballon: "yeah",
						},
					});
					assert.deepEqual(docs[4] as any, {
						planet: "Earth",
						_id: doc4._id,
					});
					cursor.projection({
						age: 0,
						name: 0,
						_id: 0,
					});
					return cursor.exec();
				})
				.then((docs) => {
					docs.length.should.equal(5);
					assert.deepEqual(docs[0] as any, {
						planet: "B",
						toys: {
							bebe: true,
							ballon: "much",
						},
					});
					assert.deepEqual(docs[1] as any, { planet: "S" });
					assert.deepEqual(docs[2] as any, {
						planet: "C",
						toys: { bebe: "kind of" },
					});
					assert.deepEqual(docs[3] as any, {
						planet: "R",
						toys: {
							bebe: false,
							ballon: "yeah",
						},
					});
					assert.deepEqual(docs[4] as any, { planet: "Earth" });
					done();
				});
		});
		it("Cannot use both modes except for _id", async () => {
			const cursor = new Cursor(d, {});
			cursor.sort({ age: 1 });
			// For easier finding
			cursor.projection({
				age: 1,
				name: 0,
			});
			await expect(cursor.exec()).to.be.rejectedWith(Error);
			{
				const docs = await cursor
					.projection({
						age: 1,
						_id: 0,
					})
					.exec();

				assert.deepEqual(docs[0] as any, { age: 5 });
				assert.deepEqual(docs[1] as any, { age: 23 });
				assert.deepEqual(docs[2] as any, { age: 52 });
				assert.deepEqual(docs[3] as any, { age: 57 });
				assert.deepEqual(docs[4] as any, { age: 89 });
			}
			{
				cursor.projection({
					age: 0,
					toys: 0,
					planet: 0,
					_id: 1,
				});
				const docs = await cursor.exec();
				assert.deepEqual(docs[0] as any, {
					name: "Jo",
					_id: doc0._id,
				});
				assert.deepEqual(docs[1] as any, {
					name: "LM",
					_id: doc3._id,
				});
				assert.deepEqual(docs[2] as any, {
					name: "Grafitti",
					_id: doc2._id,
				});
				assert.deepEqual(docs[3] as any, {
					name: "Louis",
					_id: doc1._id,
				});
				assert.deepEqual(docs[4] as any, { _id: doc4._id });
			}
		});
		it("Projections on embedded documents - omit type", (done) => {
			const cursor = new Cursor(d, {});
			cursor.sort({ age: 1 });
			// For easier finding
			cursor.projection({
				name: 0,
				planet: 0,
				"toys.bebe": 0,
				_id: 0,
			});
			cursor.exec().then((docs) => {
				assert.deepEqual(docs[0] as any, {
					age: 5,
					toys: { ballon: "much" },
				});
				assert.deepEqual(docs[1] as any, { age: 23 });
				assert.deepEqual(docs[2] as any, {
					age: 52,
					toys: {},
				});
				assert.deepEqual(docs[3] as any, {
					age: 57,
					toys: { ballon: "yeah" },
				});
				assert.deepEqual(docs[4] as any, { age: 89 });
				done();
			});
		});
		it("Projections on embedded documents - pick type", (done) => {
			const cursor = new Cursor(d, {});
			cursor.sort({ age: 1 });
			// For easier finding
			cursor.projection({
				name: 1,
				"toys.ballon": 1,
				_id: 0,
			});
			cursor.exec().then((docs) => {
				assert.deepEqual(docs[0] as any, {
					name: "Jo",
					toys: { ballon: "much" },
				});
				assert.deepEqual(docs[1] as any, { name: "LM" });
				assert.deepEqual(docs[2] as any, { name: "Grafitti" });
				assert.deepEqual(docs[3] as any, {
					name: "Louis",
					toys: { ballon: "yeah" },
				});
				assert.deepEqual(docs[4], {});
				done();
			});
		});
	}); // ==== End of 'Projections' ====
});
