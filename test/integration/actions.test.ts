import { FS_Persistence_Adapter } from "../../src/adapters/fs-adapter";
import { Database } from "../../src/index";
import { BaseModel } from "../../src/types/base-schema";
import { expect } from "chai";
import { existsSync, unlinkSync } from "fs";

interface Toy {
	name: string;
	price: number;
}

interface Child {
	fullName: string;
	toys: Toy[];
}

class Employee extends BaseModel<Employee> {
	name: string = "";
	age: number = 9;
	male: boolean = false;
	arr: Child[] = [];
	d?: {
		a: {
			x: number;
		};
	};

	isFemale() {
		return !this.male;
	}

	get female() {
		return !this.male;
	}
}

class Simple extends BaseModel {
	a: number = 1;
}

describe("Actions", async () => {
	describe("Connection", () => {
		it("Connection with an object param", (done) => {
			const db = new Database<Simple>({ ref: "ref", model: Simple });
			db.loaded
				.then(() => done())
				.catch((e) => {
					throw e;
				});
		});
		it("Connection with an already created DB", (done) => {
			const db1 = new Database({ ref: "ref", model: Simple });
			const db2 = new Database({ ref: "ref", model: Simple });
			Promise.all([db1.loaded, db2.loaded])
				.then(() => done())
				.catch((e) => {
					throw e;
				});
		});
	});

	describe.only("Operations", () => {
		let dbName = "workspace/integration.db";

		let db = new Database<Employee>({
			ref: dbName,
			model: Employee,
			persistence_adapter: FS_Persistence_Adapter,
		});

		beforeEach(async () => {
			await db.loaded;
			if (existsSync(dbName)) {
				unlinkSync(dbName);
			}
			if (existsSync(dbName + ".idx.db")) {
				unlinkSync(dbName + ".idx.db");
			}
			await db.reload();
			expect((await db.find({})).length).to.equal(0);
		});

		describe("Creating", () => {
			it("Basic creation", async () => {
				await db.insert([
					Employee.new({
						name: "Alex",
						age: 12,
						arr: [],
						male: true,
					}),
				]);
				const docs = await db.read({});
				expect(docs.length).to.be.equal(1);
				const doc = docs[0];
				expect(doc.name).to.be.equal("Alex");
				expect(doc.age).to.be.equal(12);
				expect(doc.male).to.be.equal(true);
				expect(doc.arr.length).to.be.equal(0);
			});
			it("Creating while giving an ID", async () => {
				await db.insert([
					Employee.new({
						_id: "1234",
						name: "Alex",
						age: 12,
						arr: [],
						male: true,
					}),
				]);
				const docs = await db.read({});
				expect(docs.length).to.be.equal(1);
				const doc = docs[0];
				expect(doc._id).to.be.equal("1234");
			});
			it("Creating multiple in single call", async () => {
				await db.insert([
					Employee.new({
						_id: "1",
						name: "Alex",
						age: 12,
						arr: [],
						male: true,
					}),
					Employee.new({
						_id: "2",
						name: "Dina",
						age: 1,
						arr: [],
						male: false,
					}),
				]);
				const docs = await db.read({});
				expect(docs.length).to.be.equal(2);
				expect(docs.findIndex((x) => x._id === "1")).to.be.greaterThan(
					-1
				);
				expect(docs.findIndex((x) => x._id === "2")).to.be.greaterThan(
					-1
				);
			});
			it("Test signature", async () => {
				{
					// inserting single document
					const r = await db.insert([
						Employee.new({
							name: "Alex",
							age: 12,
							arr: [],
							male: true,
						}),
					]);
					expect(Object.keys(r).length).to.be.equal(2);
					expect(r.number).to.equal(1);
					expect(Array.isArray(r.docs)).to.equal(true);
					expect(r.docs.length).to.equal(1);
					// returning an id
					const doc = r.docs[0];
					expect(typeof doc._id).to.equal("string");
					expect(doc._id.split("-").length).to.be.greaterThan(1);
					// and other info
					expect(doc.name).to.be.equal("Alex");
					expect(doc.age).to.be.equal(12);
					expect(doc.male).to.be.equal(true);
					expect(doc.arr.length).to.be.equal(0);
				}
				{
					// inserting multiple documents
					const r = await db.insert([
						Employee.new({
							name: "Alex",
							age: 12,
							arr: [],
							male: true,
						}),
						Employee.new({
							name: "Dina",
							age: 11,
							arr: [],
							male: false,
						}),
					]);
					expect(Object.keys(r).length).to.be.equal(2);
					expect(r.number).to.equal(2);
					expect(Array.isArray(r.docs)).to.equal(true);
					expect(r.docs.length).to.equal(2);
					// returning an id
					const doc1 = r.docs.find((x) => x.name === "Alex")!;
					expect(typeof doc1._id).to.equal("string");
					expect(doc1._id.split("-").length).to.be.greaterThan(1);
					// and other info
					expect(doc1.name).to.be.equal("Alex");
					expect(doc1.age).to.be.equal(12);
					expect(doc1.male).to.be.equal(true);
					expect(doc1.arr.length).to.be.equal(0);

					const doc2 = r.docs.find((x) => x.name === "Dina")!;
					expect(typeof doc2._id).to.equal("string");
					expect(doc2._id.split("-").length).to.be.greaterThan(1);
					// and other info
					expect(doc2.name).to.be.equal("Dina");
					expect(doc2.age).to.be.equal(11);
					expect(doc2.male).to.be.equal(false);
					expect(doc2.arr.length).to.be.equal(0);
				}
			});
			it.skip("Modeling", async () => {});
		});

		describe("Read", () => {
			beforeEach(async () => {
				await db.insert([
					Employee.new({ name: "a", age: 1, arr: [], male: true }),
					Employee.new({ name: "b", age: 2, arr: [], male: false }),
					Employee.new({ name: "c", age: 3, arr: [], male: true }),
					Employee.new({
						name: "d",
						age: 4,
						arr: [],
						male: false,
						d: { a: { x: 10 } },
					}),
					Employee.new({
						name: "e",
						age: 5,
						arr: [],
						male: true,
						d: { a: { x: 20 } },
					}),
				]);
			});
			it("Basic filter", async () => {
				{
					const res = await db.read({ filter: { name: "a" } });
					expect(res.length).to.be.eq(1);
					expect(res[0].name).to.be.eq("a");
					expect(res[0].age).to.be.eq(1);
					expect(res[0].male).to.be.eq(true);
				}
				{
					const res = await db.read({ filter: { name: "b" } });
					expect(res.length).to.be.eq(1);
					expect(res[0].name).to.be.eq("b");
					expect(res[0].age).to.be.eq(2);
					expect(res[0].male).to.be.eq(false);
				}
				{
					const res = await db.read({
						filter: {
							age: {
								$lt: 3,
							},
						},
						sort: {
							age: 1,
						},
					});
					expect(res.length).to.be.eq(2);
					const doc1 = res.find((x) => x.name === "a")!;
					const doc2 = res.find((x) => x.name === "b")!;
					expect(doc1.name).to.be.eq("a");
					expect(doc1.age).to.be.eq(1);
					expect(doc1.male).to.be.eq(true);
					expect(doc2.name).to.be.eq("b");
					expect(doc2.age).to.be.eq(2);
					expect(doc2.male).to.be.eq(false);
				}
			});
			it("Deep filter", async () => {
				{
					const res = await db.read({
						filter: { $deep: { "d.a.x": { $eq: 10 } } },
					});
					expect(res.length).to.be.eq(1);
					expect(res[0].name).to.be.eq("d");
					expect(res[0].age).to.be.eq(4);
					expect(res[0].male).to.be.eq(false);
				}
				{
					const res = await db.read({
						filter: { $deep: { "d.a.x": { $eq: 20 } } },
					});
					expect(res.length).to.be.eq(1);
					expect(res[0].name).to.be.eq("e");
					expect(res[0].age).to.be.eq(5);
					expect(res[0].male).to.be.eq(true);
				}
				{
					const res = await db.read({
						filter: {
							$deep: {
								"d.a.x": { $lt: 20 },
							},
						},
					});
					expect(res.length).to.be.eq(1);
					expect(res.length).to.be.eq(1);
					expect(res[0].name).to.be.eq("d");
					expect(res[0].age).to.be.eq(4);
					expect(res[0].male).to.be.eq(false);
				}
			});
			it("with no filter", async () => {
				const res = await db.find({});
				expect(res.length).to.be.eq(5);
				expect(res.findIndex((x) => x.age === 1)).to.be.greaterThan(-1);
				expect(res.findIndex((x) => x.age === 2)).to.be.greaterThan(-1);
				expect(res.findIndex((x) => x.age === 3)).to.be.greaterThan(-1);
				expect(res.findIndex((x) => x.age === 4)).to.be.greaterThan(-1);
				expect(res.findIndex((x) => x.age === 5)).to.be.greaterThan(-1);
			});
			it("limiting", async () => {
				const res = await db.find({ limit: 3 });
				expect(res.length).to.be.eq(3);
			});
			it("skipping", async () => {
				const res = await db.find({ skip: 3 });
				expect(res.length).to.be.eq(2);
			});
			it("projecting", async () => {
				const res = await db.find({
					filter: { name: "a" },
					project: { _id: 0, male: 1 },
				});
				expect(res[0]).to.be.deep.equal({ male: true });
			});
			it("deep projecting", async () => {
				const res = await db.find({
					filter: { name: "e" },
					project: { _id: 0, $deep: { "d.a.x": 1 } },
				});
				expect(res[0]).to.be.deep.equal({ d: { a: { x: 20 } } });
			});
			it("sorting", async () => {
				{
					const res1 = await db.find({ sort: { male: 1 } });
					expect(res1[0].male).to.be.eq(false);
					expect(res1[1].male).to.be.eq(false);
					expect(res1[2].male).to.be.eq(true);
					expect(res1[3].male).to.be.eq(true);
					expect(res1[4].male).to.be.eq(true);
				}
				{
					const res2 = await db.find({ sort: { male: -1 } });
					expect(res2[0].male).to.be.eq(true);
					expect(res2[1].male).to.be.eq(true);
					expect(res2[2].male).to.be.eq(true);
					expect(res2[3].male).to.be.eq(false);
					expect(res2[4].male).to.be.eq(false);
				}
			});
			it("deep sorting", async () => {
				const res1 = await db.find({ sort: { $deep: { "d.a.x": 1 } } });
				expect(res1[res1.length - 1].d?.a.x).to.be.equal(20);
				expect(res1[res1.length - 2].d?.a.x).to.be.equal(10);

				const res2 = await db.find({
					sort: { $deep: { "d.a.x": -1 } },
				});
				expect(res2[0].d?.a.x).to.be.equal(20);
				expect(res2[1].d?.a.x).to.be.equal(10);
			});
			describe("Modeling", () => {
				it("Is in fact an instance of the model", async () => {
					const res = await db.find({});
					expect(res[0] instanceof Employee).to.be.equal(true);
				});
				it("Methods exists", async () => {
					const res = await db.find({});
					const doc = res[0];
					expect(typeof doc.isFemale).to.be.eq("function");
				});
				it("filter by getter", async () => {
					const res = await db.find({ filter: { female: true } });
					expect(res.length).to.be.eq(2);
					expect(
						res.findIndex((x) => x.name === "b")
					).to.be.greaterThan(-1);
					expect(
						res.findIndex((x) => x.name === "d")
					).to.be.greaterThan(-1);
				});
				it("sort by getter", async () => {
					{
						const res1 = await db.find({ sort: { female: -1 } });
						expect(res1[0].male).to.be.eq(false);
						expect(res1[1].male).to.be.eq(false);
						expect(res1[2].male).to.be.eq(true);
						expect(res1[3].male).to.be.eq(true);
						expect(res1[4].male).to.be.eq(true);
					}
					{
						const res2 = await db.find({ sort: { female: 1 } });
						expect(res2[0].male).to.be.eq(true);
						expect(res2[1].male).to.be.eq(true);
						expect(res2[2].male).to.be.eq(true);
						expect(res2[3].male).to.be.eq(false);
						expect(res2[4].male).to.be.eq(false);
					}
				});
				it("projecting a getter", async () => {
					const res = await db.find({
						filter: { name: "a" },
						project: { _id: 0, female: 1 },
					});
					expect(res[0]).to.be.deep.equal({ female: false });
				});
				it("run function", async () => {
					const doc = (
						await db.find({ filter: { female: true } })
					)[0];
					expect(doc.isFemale()).to.be.eq(true);
				});
			});
		});

		describe("Update", () => {
			it.skip("Basic filter", () => {});
			it.skip("Deep filter", () => {});
			it.skip("with no filter", () => {});
			it.skip("Using direct update", () => {});
			it.skip("Using update operators", () => {});
			it.skip("Multi update", () => {});
			it.skip("Test signature", () => {});
		});

		describe("Upserting", () => {
			it.skip("Basic filter", () => {});
			it.skip("Deep filter", () => {});
			it.skip("with no filter", () => {});
			it.skip("Using direct update", () => {});
			it.skip("Using update operators", () => {});
			it.skip("Multi update", () => {});
			it.skip("Test signature", () => {});
		});

		describe("Counting", () => {
			it.skip("Basic filter", () => {});
			it.skip("Deep filter", () => {});
			it.skip("with no filter", () => {});
		});

		describe("Delete", () => {
			it.skip("Basic filter", () => {});
			it.skip("Deep filter", () => {});
			it.skip("with no filter", () => {});
			it.skip("multi delete", () => {});
			it.skip("Test signature", () => {});
		});
	});
});
