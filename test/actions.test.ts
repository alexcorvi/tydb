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
										delete res.affected[index].createdAt;
										delete res.affected[index].updatedAt;
									}
								} else {
									delete res.affected._id;
									delete res.affected.createdAt;
									delete res.affected.updatedAt;
								}
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
										delete res.affected[index].createdAt;
										delete res.affected[index].updatedAt;
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
										delete res.affected[index].createdAt;
										delete res.affected[index].updatedAt;
									}
								} else {
									delete res.affected._id;
									delete res.affected.createdAt;
									delete res.affected.updatedAt;
								}
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
										delete res.affected[index].createdAt;
										delete res.affected[index].updatedAt;
									}
								} else {
									delete res.affected._id;
									delete res.affected.createdAt;
									delete res.affected.updatedAt;
								}
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
										delete res.affected[index].createdAt;
										delete res.affected[index].updatedAt;
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
													createdAt: 0,
													updatedAt: 0,
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

				// result
				// total 35
				describe("Updating", () => {
					before(async () => {
						db.insertOne({
							doc: {
								a: 5,
								x: Math.random(),
								b: {
									c: 10,
									d: 15,
								},
							},
						});
					});
					describe("number of updates", () => {
						describe("update one actually updates one", () => {
							it("Counting should be equal to 11", async () => {
								expect(
									await db.count({ filter: { a: 2 } })
								).toBe(11);
							});
							it("updating one", async () => {
								expect(
									(
										await db.updateOne({
											filter: { a: 2 },
											update: { $set: { a: 22 } },
										})
									).n
								).toBe(1);
							});
							it("Counting updated", async () => {
								expect(
									await db.count({ filter: { a: 22 } })
								).toBe(1);
							});
							it("Counting remaining", async () => {
								expect(
									await db.count({ filter: { a: 2 } })
								).toBe(10);
							});
							it("Reverse", async () => {
								expect(
									(
										await db.updateOne({
											filter: { a: 22 },
											update: { $set: { a: 2 } },
										})
									).n
								).toBe(1);
							});
						});
						describe("update many actually updates many", () => {
							it("Counting should be equal to 11", async () => {
								expect(
									await db.count({ filter: { a: 2 } })
								).toBe(11);
							});
							it("updating many", async () => {
								expect(
									(
										await db.updateMany({
											filter: { a: 2 },
											update: { $set: { a: 22 } },
										})
									).n
								).toBe(11);
							});
							it("Counting updated", async () => {
								expect(
									await db.count({ filter: { a: 22 } })
								).toBe(11);
							});
							it("Counting remaining", async () => {
								expect(
									await db.count({ filter: { a: 2 } })
								).toBe(0);
							});
							it("Reverse", async () => {
								expect(
									(
										await db.updateMany({
											filter: { a: 22 },
											update: { $set: { a: 2 } },
										})
									).n
								).toBe(11);
							});
						});
					});
					describe("updating with filters found", () => {
						describe("Update many", () => {
							it("{a:0}", async () => {
								const res = await db.updateMany({
									filter: { a: 0 },
									update: {
										$set: {
											x: 999,
										},
									},
								});
								expect(res.n).toBe(13);
								expect(
									(
										await db.find({
											filter: { a: 0, x: 999 },
										})
									).length
								).toBe(13);
							});
							it("{a:1}", async () => {
								const res = await db.updateMany({
									filter: { a: 1 },
									update: {
										$set: {
											x: 888,
										},
									},
								});
								expect(res.n).toBe(11);
								expect(
									(
										await db.find({
											filter: { a: 1, x: 888 },
										})
									).length
								).toBe(11);
							});
							it("{a:2}", async () => {
								const res = await db.updateMany({
									filter: { a: 2 },
									update: {
										$set: {
											x: 777,
										},
									},
								});
								expect(res.n).toBe(11);
								expect(
									(
										await db.find({
											filter: { a: 2, x: 777 },
										})
									).length
								).toBe(11);
							});
						});
					});
					describe("updating with filters not found", () => {
						it("number of affected should be 0", async () => {
							const res = await db.updateMany({
								filter: { a: 2, x: 999 },
								update: { $set: { x: -99 } },
							});
							expect(res.n).toBe(0);
						});
						it("affected should be an empty array", async () => {
							const res = await db.updateMany({
								filter: { a: 1, x: 777 },
								update: { $set: { x: -99 } },
							});
							expect(JSON.stringify(res.affected)).toBe(
								JSON.stringify([])
							);
						});
					});
					describe("deep update", () => {
						it("should update", async () => {
							const res = await db.updateOne({
								filter: { a: 5 },
								update: {
									$set: {
										$deep: {
											"b.c": 11,
										},
									},
								},
							});
							expect(res.n).toBe(1);
							expect(res.affected).toBeTruthy();
						});

						it("Look for the updated", async () => {
							const res = await db.find({
								filter: { a: 5, $deep: { "b.c": { $eq: 11 } } },
							});
							expect(res.length).toBe(1);
							expect(res[0].a).toBe(5);
							expect((res[0] as any).b.c).toBe(11);
							expect((res[0] as any).b.d).toBe(15);
						});
					});
					describe("deep update with deep filters", () => {
						it("Should update", async () => {
							const res = await db.updateMany({
								filter: {
									$deep: {
										"b.d": {
											$eq: 15,
										},
									},
								},
								update: {
									$set: {
										$deep: {
											"b.c": 1992,
										},
									},
								},
							});

							expect(res.n).toBe(1);
						});
						it("Look for the updated", async () => {
							const res = await db.find({
								filter: { $deep: { "b.c": { $eq: 1992 } } },
							});
							expect(res.length).toBe(1);
							expect(res[0].a).toBe(5);
							expect((res[0] as any).b.d).toBe(15);
							expect((res[0] as any).b.c).toBe(1992);
						});
					});
				});
				// total docs in DB 36

				describe("Upserting", () => {
					describe("with upsertOne", () => {
						describe("Using upsert with a non-existent document", () => {
							it("Document should be upserted", async () => {
								const res = await db.upsertOne({
									filter: { a: -999 },
									doc: {
										a: -999,
										x: Math.random() * -1,
										b: {
											c: -2,
											d: -3,
										},
									},
								});
								expect(res.n).toBe(1);
								expect(res.upsert).toBe(true);
								let r = (res.affected as any).x;
								const findRes = await db.find({
									filter: { x: r },
								});
								expect(findRes.length).toBe(1);
								expect(findRes[0].a).toBe(-999);
								expect(findRes[0].x).toBe(r);
								expect((findRes[0] as any).b.c).toBe(-2);
								expect((findRes[0] as any).b.d).toBe(-3);
							});
						});
						describe("Using upsert with an already existing document", () => {
							it("Document should not be upserted", async () => {
								const res = await db.upsertOne({
									filter: { a: -999 },
									doc: {
										a: -999,
										x: Math.random() * -1,
										b: {
											c: -2,
											d: -5,
										},
									},
								});
								expect(res.n).toBe(1);
								expect(res.upsert).toBe(false);
								let r = (res.affected as any).x;
								const findRes = await db.find({
									filter: { x: r },
								});
								expect(findRes.length).toBe(1);
								expect(findRes[0].a).toBe(-999);
								expect(findRes[0].x).toBe(r);
								expect((findRes[0] as any).b.c).toBe(-2);
								expect((findRes[0] as any).b.d).toBe(-5);
							});
						});
					});
					describe("with upsertMany", () => {
						describe("Using upsert with a non-existent document", () => {
							it("Document should be upserted", async () => {
								const res = await db.upsertMany({
									filter: { a: -1999 },
									doc: {
										a: -999,
										x: Math.random() * -1,
									},
								});
								expect(res.n).toBe(1);
								expect(res.upsert).toBe(true);
								let r = res.affected[0].x;
								const findRes = await db.find({
									filter: { x: r },
								});
								expect(findRes.length).toBe(1);
								expect(findRes[0].a).toBe(-999);
								expect(findRes[0].x).toBe(r);
							});
						});
						describe("Using upsert with an already existing document", () => {
							it("Document should not be upserted", async () => {
								const res = await db.upsertMany({
									filter: { a: -999 },
									doc: {
										a: -999,
										x: Math.random() * -1,
										b: {
											c: -2,
											d: -5,
										},
									},
								});
								expect(res.n).toBe(2);
								expect(res.upsert).toBe(false);
								let r = res.affected[0].x;
								const findRes = await db.find({
									filter: { x: r },
								});
								expect(findRes.length).toBe(2);
								expect(findRes[0].a).toBe(-999);
								expect(findRes[0].x).toBe(r);
							});
						});
					});
				});
				describe("Removing", () => {
					describe("Removing one document", () => {
						before(async () => {
							await db.insertMany({
								docs: [
									{
										a: 1234,
										x: 5678,
									},
									{
										a: 1234,
										x: 5678,
									},
								],
							});
						});
						it("Should remove only one", async () => {
							const res = await db.removeOne({
								filter: { a: 1234 },
							});
							expect(res.n).toBe(1);
						});
						it("the other one is not removed", async () => {
							expect(
								await db.count({ filter: { a: 1234 } })
							).toBe(1);
						});
					});
					describe("Removing multiple by deep filter", () => {
						before(async () => {
							await db.insertMany({
								docs: [
									{
										a: 247,
										x: 247,
										b: {
											c: 10,
											d: 247,
										},
									},
									{
										a: 247,
										x: 247,
										b: {
											c: 101,
											d: 247,
										},
									},
								],
							});
						});
						it("Should remove all", async () => {
							const res = await db.removeMany({
								filter: { $deep: { "b.d": { $eq: 247 } } },
							});
							expect(res.n).toBe(2);
						});
						it("the other one is not removed", async () => {
							expect(await db.count({ filter: { a: 247 } })).toBe(
								0
							);
						});
					});
				});
				describe("Dropping", () => {
					it("Dropping must be supplied with db name", () => {
						expect(
							db.drop({ dbName: "not-the-name" }).catch()
						).rejects.toEqual(
							new Error(
								"Supplied name of the database is not correct"
							)
						);
					});
					it("Dropping deletes all the database", async () => {
						expect(
							(await db.drop({ dbName: db.name })).n
						).toBeGreaterThan(0);
						expect(await db.count({})).toBe(0);
					});
				});
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
