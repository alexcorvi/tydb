import { Database } from "../src/index";
import expect from "expect";
import * as util from "util";

describe("Actions", async () => {
	describe("Basic actions", () => {
		describe("Connection", () => {
			const dbNameA = "temp/testdb";
			const dbNameB = "temp/testdb_" + Math.random().toString().substr(5);

			async function testAndEmptyDB(
				db: Database<any>,
				initNum: number,
				empty: boolean
			) {
				it("Starts with the given initial number of docs", async () => {
					expect((await db.read({})).length).toBe(initNum);
				});
				it("Documents can be inserted", async () => {
					expect(
						await db.createOne({
							doc: {
								a: 0,
								b: 12,
							},
						})
					).toBeTruthy();
				});
				it("Documents can be read after insertion", async () => {
					expect((await db.read({})).length).toBe(initNum + 1);
				});

				if (!empty) {
					return;
				}

				it("Documents can be removed", async () => {
					expect(await db.drop({ dbName: db.name })).toBeTruthy();
				});
			}

			describe("Connection with an object param", async () => {
				const db = new Database({
					filename: dbNameA,
				});
				testAndEmptyDB(db, 0, true);
			});
			describe("Connection with a string param", () => {
				const db = new Database(dbNameA);
				testAndEmptyDB(db, 0, true);
			});
			describe("Connection with an already created DB", () => {
				describe("First connection", () => {
					const db = new Database(dbNameA);
					testAndEmptyDB(db, 0, false);
				});
				describe("Second connection", () => {
					const db = new Database(dbNameA);
					testAndEmptyDB(db, 1, true);
				});
			});
		});
		describe("Backup & Restore", async () => {
			const db = new Database<{ a: number }>("temp/db_test");
			it("Inserting first batch", async () => {
				expect(
					(
						await db.insertMany({
							docs: [
								{ a: 1 },
								{ a: 2 },
								{ a: 3 },
								{ a: 4 },
								{ a: 5 },
							],
						})
					).n
				).toBe(5);
			});
			it("Counting before backing up", async () => {
				expect(await db.count()).toBe(5);
			});
			it("Backing up", async () => {
				expect(await db.backup("temp/db_test.bak")).toBe(undefined);
			});
			it("Inserting second batch", async () => {
				expect(
					(
						await db.insertMany({
							docs: [
								{ a: 6 },
								{ a: 7 },
								{ a: 8 },
								{ a: 9 },
								{ a: 10 },
							],
						})
					).n
				).toBe(5);
			});
			it("Counting before restoring", async () => {
				expect(await db.count()).toBe(10);
			});
			it("Restoring", async () => {
				expect(await db.restore("temp/db_test.bak")).toBe(undefined);
			});
			it("Counting after restoring", async () => {
				expect(await db.count()).toBe(5);
			});
		});
	});

	describe("Database actions", () => {
		async function testDBActions(
			db: Database<{
				a: number;
				b?: { c: number; d: number };
				x: number;
			}>,
			flag: string
		) {
			describe(`database: ${db.name}, connection flag: ${flag}`, () => {
				describe("Dropping the old data in favor of a new clean DB", () => {
					it("Should drop successfully", async () => {
						await db.drop({ dbName: db.name });
					});
					it("Database must be clean", async () => {
						expect(await db.count()).toBe(0);
					});
				});

				describe("creating", () => {
					function create(doc: any) {
						const docs = [doc, doc, doc, doc];
						describe("CreateOne", () => {
							let res: any;
							before(async () => {
								res = await db.createOne({ doc });
							});
							it("Number of affected", async () => {
								expect(res.n).toBe(1);
							});
							it("Affected", () => {
								if (util.isArray(res.affected)) {
									for (
										let index = 0;
										index < res.affected.length;
										index++
									) {
										delete res.affected[index]._id;
									}
								} else delete res.affected._id;
								expect(JSON.stringify(res.affected)).toBe(
									JSON.stringify(doc)
								);
							});
						});
						describe("CreateMany", () => {
							let res: any;
							before(async () => {
								res = await db.createMany({ docs });
							});
							it("Number of affected", async () => {
								expect(res.n).toBe(4);
							});
							it("Affected", () => {
								if (util.isArray(res.affected)) {
									for (
										let index = 0;
										index < res.affected.length;
										index++
									) {
										delete res.affected[index]._id;
									}
								}
								expect(JSON.stringify(res.affected)).toBe(
									JSON.stringify(docs)
								);
							});
						});
						describe("insert", () => {
							let res: any;
							before(async () => {
								res = await db.insert({ doc });
							});
							it("Number of affected", async () => {
								expect(res.n).toBe(1);
							});
							it("Affected", () => {
								if (util.isArray(res.affected)) {
									for (
										let index = 0;
										index < res.affected.length;
										index++
									) {
										delete res.affected[index]._id;
									}
								} else delete res.affected._id;
								expect(JSON.stringify(res.affected)).toBe(
									JSON.stringify(doc)
								);
							});
						});
						describe("insertOne", async () => {
							let res: any;
							before(async () => {
								res = await db.insertOne({ doc });
							});
							it("Number of affected", async () => {
								expect(res.n).toBe(1);
							});
							it("Affected", () => {
								if (util.isArray(res.affected)) {
									for (
										let index = 0;
										index < res.affected.length;
										index++
									) {
										delete res.affected[index]._id;
									}
								} else delete res.affected._id;
								expect(JSON.stringify(res.affected)).toBe(
									JSON.stringify(doc)
								);
							});
						});
						describe("insertMany", async () => {
							let res: any;
							before(async () => {
								res = await db.insertMany({ docs });
							});
							it("Number of affected", async () => {
								expect(res.n).toBe(4);
							});
							it("Affected", () => {
								if (util.isArray(res.affected)) {
									for (
										let index = 0;
										index < res.affected.length;
										index++
									) {
										delete res.affected[index]._id;
									}
								}
								expect(JSON.stringify(res.affected)).toBe(
									JSON.stringify(docs)
								);
							});
						});
					}

					describe("Creating a:0", () => {
						const doc = {
							a: 0,
							x: Math.floor(Math.random() * 100),
						};
						create(doc);
						// we have 11 documents with {a:0}
					});
					describe("Creating a:1", () => {
						const doc = {
							a: 1,
							x: Math.floor(Math.random() * 100),
						};
						create(doc);
						// we have 11 documents with {a:0}
					});
					describe("Creating a:2", () => {
						const doc = {
							a: 2,
							x: Math.floor(Math.random() * 100),
						};
						create(doc);
						// we have 11 documents with {a:0}
					});
				});

				// result:
				// {a:0} = 11
				// {a:1} = 11
				// {a:2} = 11
				// total = 33

				describe("Reading", () => {
					describe("read all documents without filter", () => {
						it("Document count", async () => {
							expect(await db.count()).toBe(33);
						});
						it("Document read", async () => {
							expect((await db.read({})).length).toBe(33);
						});
					});
					describe("filtered documents", async () => {
						it("{a:0} docs", async () => {
							expect(
								(
									await db.read({
										filter: {
											a: 0,
										},
									})
								).length
							).toBe(11);
						});
						it("{a:1} docs", async () => {
							expect(
								(
									await db.read({
										filter: {
											a: 1,
										},
									})
								).length
							).toBe(11);
						});
						it("{a:2} docs", async () => {
							expect(
								(
									await db.read({
										filter: {
											a: 2,
										},
									})
								).length
							).toBe(11);
						});
					});
					describe("skipping documents", async () => {
						it("Without filter", async () => {
							expect(
								(
									await db.read({
										skip: 3,
									})
								).length
							).toBe(30);
						});
						it("With filter", async () => {
							expect(
								(
									await db.read({
										filter: {
											a: 1,
										},
										skip: 1,
									})
								).length
							).toBe(10);
						});
					});
					describe("limiting documents", async () => {
						it("Without filter", async () => {
							expect(
								(
									await db.read({
										limit: 5,
									})
								).length
							).toBe(5);
						});
						it("With filter", async () => {
							expect(
								(
									await db.read({
										filter: {
											a: 2,
										},
										limit: 7,
									})
								).length
							).toBe(7);
						});
						it("More than DB contents - without filter", async () => {
							expect(
								(
									await db.read({
										limit: 50,
									})
								).length
							).toBe(33);
						});
						it("More than DB contents - with filter", async () => {
							expect(
								(
									await db.read({
										limit: 12,
										filter: {
											a: 0,
										},
									})
								).length
							).toBe(11);
						});
					});
					describe("projecting documents", async () => {
						describe("Projecting - excluding", async () => {
							it("number", async () => {
								expect(
									Object.keys(
										(
											await db.read({
												project: {
													_id: 0,
													a: 0,
												},
											})
										)[0]
									).length
								).toBe(1);
							});
							it("literal", async () => {
								expect(
									Object.keys(
										(
											await db.read({
												project: {
													_id: 0,
													a: 0,
												},
											})
										)[0]
									)[0]
								).toBe("x");
							});
						});

						describe("Projecting - including", async () => {
							it("number", async () => {
								expect(
									Object.keys(
										(
											await db.read({
												project: {
													_id: 0,
													x: 1,
												},
											})
										)[0]
									).length
								).toBe(1);
							});
							it("literal", async () => {
								expect(
									Object.keys(
										(
											await db.read({
												project: {
													_id: 0,
													x: 1,
												},
											})
										)[0]
									)[0]
								).toBe("x");
							});
						});
					});
					describe("sorting documents", async () => {
						it("Sorting ascending doesn't equal descending", async () => {
							expect(
								(await db.read({ sort: { a: -1 } }))[0].x
							).not.toBe(
								(await db.read({ sort: { a: 1 } }))[0].x
							);
						});
					});
					describe("Deep filtering", () => {
						before(async () => {
							await db.insert({
								doc: {
									x: 0,
									a: 0,
									b: {
										c: 10,
										d: 0,
									},
								},
							});
							await db.insert({
								doc: {
									x: 0,
									a: 0,
									b: {
										c: 100,
										d: 0,
									},
								},
							});
						});
						it("Find the two documents", async () => {
							expect(
								(
									await db.find({
										filter: {
											a: 0,
											$deep: { "b.d": { $eq: 0 } },
										},
									})
								).length
							).toBe(2);
						});
						it("Find one document", async () => {
							expect(
								(
									await db.find({
										filter: {
											a: 0,
											$deep: { "b.c": { $eq: 10 } },
										},
									})
								).length
							).toBe(1);
						});
						it("Find the other document", async () => {
							expect(
								(
									await db.find({
										filter: {
											$deep: { "b.c": { $eq: 100 } },
										},
									})
								).length
							).toBe(1);
						});
					});
				});

				return;
				describe("Updating", () => {
					describe("updating with filters found");
					describe("deep update");
					describe("updating with filters not found");
				});
				describe("Upserting", () => {});
				describe("Counting", () => {});
				describe("Removing", () => {});
				describe("Dropping", () => {});
			});
		}

		describe("Single Database instance", async () => {
			await testDBActions(
				new Database("temp/single_db_operations"),
				"singleDB"
			);
		});

		describe("Multiple instances database actions", () => {});
	});
});
