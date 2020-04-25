import { FS_Persistence_Adapter } from "../../src/adapters/fs-adapter";
import { Database } from "../../src/index";
import { BaseModel } from "../../src/types/base-schema";
import { expect } from "chai";
import { existsSync, unlinkSync } from "fs";

interface Child {
	name: string;
	age: number;
}

class Employee extends BaseModel<Employee> {
	name: string = "";
	rooms: string[] = [];
	events: number[] = [];
	age: number = 9;
	male: boolean = false;
	children: Child[] = [];
	props: {
		h: number;
		w: number;
	} = { h: 0, w: 0 };

	additional: boolean | undefined;
	variant: number | string | undefined;

	isFemale() {
		return !this.male;
	}
	lastLogin: Date | undefined;
	get female() {
		return !this.male;
	}
}

describe.only("Operators tests", () => {
	let dbName = "workspace/operators.db";

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
		await db.insert([
			Employee.new({
				name: "alex",
				age: 28,
				male: true,
				children: [],
				rooms: ["a", "b", "c"],
				events: [2, 4, 6],
				props: { h: 174, w: 59 },
				variant: "str",
			}),
			Employee.new({
				name: "dina",
				age: 27,
				male: false,
				children: [],
				rooms: ["a", "c"],
				events: [3, 6, 9],
				props: { h: 165, w: 69 },
				variant: 12,
			}),
			Employee.new({
				name: "john",
				age: 35,
				male: true,
				rooms: ["a", "b", "c", "d"],
				events: [5, 10, 15],
				children: [
					{
						name: "jim",
						age: 3,
					},
					{
						name: "tom",
						age: 4,
					},
					{
						name: "roy",
						age: 8,
					},
				],
				props: { h: 160, w: 69 },
				additional: true,
			}),
		]);
	});

	describe("Query Selectors", () => {
		describe("Comparison", () => {
			it("$eq", async () => {
				{
					// basic
					const res = await db.find({
						filter: { name: { $eq: "john" } },
					});
					expect(res.length).eq(1);
					expect(res[0].age).eq(35);
				}
				{
					// deep
					const res = await db.find({
						filter: { $deep: { "props.h": { $eq: 160 } } },
					});
					expect(res.length).eq(1);
					expect(res[0].age).eq(35);
				}
				{
					// in array
					const res = await db.find({
						filter: { rooms: { $eq: "d" } },
					});
					expect(res.length).eq(1);
					expect(res[0].age).eq(35);
				}
			});
			it("$ne", async () => {
				{
					// basic
					const res = await db.find({
						filter: { name: { $ne: "john" } },
					});
					expect(res.length).eq(2);
					expect(res.findIndex((x) => x.age === 35)).eq(-1);
				}
				{
					// deep
					const res = await db.find({
						filter: { $deep: { "props.h": { $ne: 160 } } },
					});
					expect(res.length).eq(2);
					expect(res.findIndex((x) => x.age === 35)).eq(-1);
				}
				{
					// in array
					const res = await db.find({
						filter: { rooms: { $ne: "d" } },
					});
					expect(res.length).eq(2);
					expect(res.findIndex((x) => x.age === 35)).eq(-1);
				}
			});
			it("$gt", async () => {
				{
					// basic
					const res = await db.find({
						filter: { age: { $gt: 27 } },
					});
					expect(res.length).eq(2);
					expect(res.findIndex((x) => x.name === "dina")).eq(-1);
				}
				{
					// deep
					const res = await db.find({
						filter: { $deep: { "props.h": { $gt: 160 } } },
					});
					expect(res.length).eq(2);
					expect(res.findIndex((x) => x.age === 35)).eq(-1);
				}
				{
					// in array
					const res = await db.find({
						filter: { events: { $gt: 12 } },
					});
					expect(res.length).eq(1);
					expect(res.findIndex((x) => x.age === 35)).eq(0);
				}
			});
			it("$lt", async () => {
				{
					// basic
					const res = await db.find({
						filter: { age: { $lt: 28 } },
					});
					expect(res.length).eq(1);
					expect(res.findIndex((x) => x.name === "dina")).eq(0);
				}
				{
					// deep
					const res = await db.find({
						filter: { $deep: { "props.h": { $lt: 165 } } },
					});
					expect(res.length).eq(1);
					expect(res.findIndex((x) => x.age === 35)).eq(0);
				}
				{
					// in array
					const res = await db.find({
						filter: { events: { $lt: 3 } },
					});
					expect(res.length).eq(1);
					expect(res.findIndex((x) => x.age === 28)).eq(0);
				}
			});
			it("$gte", async () => {
				{
					// basic
					const res = await db.find({
						filter: { age: { $gte: 28 } },
					});
					expect(res.length).eq(2);
					expect(res.findIndex((x) => x.name === "dina")).eq(-1);
				}
				{
					// deep
					const res = await db.find({
						filter: { $deep: { "props.h": { $gte: 165 } } },
					});
					expect(res.length).eq(2);
					expect(res.findIndex((x) => x.age === 35)).eq(-1);
				}
				{
					// in array
					const res = await db.find({
						filter: { events: { $gte: 15 } },
					});
					expect(res.length).eq(1);
					expect(res.findIndex((x) => x.age === 35)).eq(0);
				}
			});
			it("$lte", async () => {
				{
					// basic
					const res = await db.find({
						filter: { age: { $lte: 27 } },
					});
					expect(res.length).eq(1);
					expect(res.findIndex((x) => x.name === "dina")).eq(0);
				}
				{
					// deep
					const res = await db.find({
						filter: { $deep: { "props.h": { $lte: 160 } } },
					});
					expect(res.length).eq(1);
					expect(res.findIndex((x) => x.age === 35)).eq(0);
				}
				{
					// in array
					const res = await db.find({
						filter: { events: { $lte: 2 } },
					});
					expect(res.length).eq(1);
					expect(res.findIndex((x) => x.age === 28)).eq(0);
				}
			});
			it("$in", async () => {
				{
					// basic
					const res = await db.find({
						filter: { age: { $in: [28, 27, 39] } },
					});
					expect(res.length).eq(2);
					expect(res.findIndex((x) => x.name === "john")).eq(-1);
				}
				{
					// deep
					const res = await db.find({
						filter: { $deep: { "props.h": { $in: [160] } } },
					});
					expect(res.length).eq(1);
					expect(res.findIndex((x) => x.age === 35)).eq(0);
				}
				{
					// in array
					const res = await db.find({
						filter: { events: { $in: [2, 4, 6, 8] } },
					});
					expect(res.length).eq(2);
					expect(res.findIndex((x) => x.age === 35)).eq(-1);
				}
			});
			it("$nin", async () => {
				{
					// basic
					const res = await db.find({
						filter: { age: { $nin: [28, 27, 39] } },
					});
					expect(res.length).eq(1);
					expect(res.findIndex((x) => x.name === "john")).eq(0);
				}
				{
					// deep
					const res = await db.find({
						filter: { $deep: { "props.h": { $nin: [165, 174] } } },
					});
					expect(res.length).eq(1);
					expect(res.findIndex((x) => x.age === 35)).eq(0);
				}
				{
					// in array
					const res = await db.find({
						filter: { events: { $nin: [6, 12] } },
					});
					expect(res.length).eq(1);
					expect(res.findIndex((x) => x.age === 35)).eq(0);
				}
			});
		});
		describe("Logical", () => {
			it("$and", async () => {
				const res = await db.find({
					filter: {
						$and: [
							{
								events: {
									$lte: 12,
								},
							},
							{
								events: {
									$gt: 9,
								},
							},
						],
					},
				});
				expect(res.length).eq(1);
				expect(res[0].name).eq("john");
			});
			it("$nor", async () => {
				const res = await db.find({
					filter: {
						$nor: [
							{
								age: {
									$lt: 28,
								},
							},
							{
								age: {
									$gt: 30,
								},
							},
						],
					},
				});
				expect(res.length).eq(1);
				expect(res[0].name).eq("alex");
			});
			it("$not", async () => {
				const res = await db.find({
					filter: {
						events: {
							$not: { $lt: 10 },
						},
					},
				});
				expect(res.length).eq(1);
				expect(res[0].name).eq("john");
			});
			it("$or", async () => {
				const res = await db.find({
					filter: {
						$or: [
							{
								age: {
									$lt: 28,
								},
							},
							{
								age: {
									$gt: 30,
								},
							},
						],
					},
				});
				expect(res.length).eq(2);
				expect(res.findIndex((x) => x.name === "alex")).eq(-1);
			});
		});
		describe("Element", () => {
			it("$exists", async () => {
				{
					const res = await db.find({
						filter: { additional: { $exists: true } },
					});
					expect(res.length).eq(1);
					expect(res[0].name).eq("john");
				}
				{
					const res = await db.find({
						filter: { additional: { $exists: false } },
					});
					expect(res.length).eq(2);
					expect(res.findIndex((x) => x.name === "john")).eq(-1);
				}
			});
			it("$type", async () => {
				{
					const res = await db.find({
						filter: { variant: { $type: "number" } },
					});
					expect(res.length).eq(1);
					expect(res[0].name).eq("dina");
				}
				{
					const res = await db.find({
						filter: { variant: { $type: "string" } },
					});
					expect(res.length).eq(1);
					expect(res[0].name).eq("alex");
				}
				{
					const res = await db.find({
						filter: {
							$nor: [
								{ variant: { $type: "string" } },
								{ variant: { $type: "number" } },
							],
						},
					});
					expect(res.length).eq(1);
					expect(res[0].name).eq("john");
				}
			});
		});
		describe("Evaluation", () => {
			it("$mod", async () => {
				const res = await db.find({
					filter: {
						age: {
							$mod: [5, 0],
						},
					},
				});
				expect(res.length).eq(1);
				expect(res[0].name).eq("john");
			});
			it("$regex", async () => {
				const res = await db.find({
					filter: {
						name: {
							$regex: /a/,
						},
					},
				});
				expect(res.length).eq(2);
				expect(res.findIndex((x) => x.name === "john")).eq(-1);
			});
			it("$where", async () => {
				const res = await db.find({
					filter: {
						$where: function () {
							return (
								this.rooms.indexOf("b") > -1 && this.age > 30
							);
						},
					},
				});
				expect(res.length).eq(1);
				expect(res[0].name).eq("john");
			});
		});
		describe("Array", () => {
			it("$all", async () => {
				const res = await db.find({
					filter: {
						rooms: {
							$all: ["b", "c"],
						},
					},
				});
				expect(res.length).eq(2);
				expect(res.find((x) => x.name === "dina")).eq(undefined);
			});
			it("$elemMatch", async () => {
				{
					const res = await db.find({
						filter: {
							events: {
								$elemMatch: {
									$gt: 12,
								},
							},
						},
					});
					expect(res.length).eq(1);
					expect(res[0].name).eq("john");
				}
				{
					const res = await db.find({
						filter: {
							events: {
								$elemMatch: {
									$not: {
										$lt: 12,
									},
								},
							},
						},
					});
					expect(res.length).eq(1);
					expect(res[0].name).eq("john");
				}
			});
			it("$size", async () => {
				const res = await db.find({
					filter: {
						rooms: {
							$size: 2,
						},
					},
				});
				expect(res.length).eq(1);
				expect(res[0].name).eq("dina");
			});
		});
	});

	describe("Update Operators", () => {
		describe("Field update operators", () => {
			it("$currentDate", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$currentDate: {
							lastLogin: true,
						},
					},
				});
				await db.update({
					filter: { name: "dina" },
					update: {
						$currentDate: {
							lastLogin: { $type: "date" },
						},
					},
				});
				await db.update({
					filter: { name: "alex" },
					update: {
						$currentDate: {
							lastLogin: { $type: "timestamp" },
						},
					},
				});
				expect(
					(await db.find({ filter: { name: "john" } }))[0]
						.lastLogin instanceof Date
				).eq(true);

				expect(
					(await db.find({ filter: { name: "dina" } }))[0]
						.lastLogin instanceof Date
				).eq(true);

				expect(
					typeof (await db.find({ filter: { name: "alex" } }))[0]
						.lastLogin === "number"
				).eq(true);
			});
			it("$inc", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$inc: {
							age: 1,
						},
					},
				});
				expect((await db.find({ filter: { name: "john" } }))[0].age).eq(
					36
				);
				await db.update({
					filter: { name: "john" },
					update: {
						$inc: {
							age: 1,
						},
					},
				});
				expect((await db.find({ filter: { name: "john" } }))[0].age).eq(
					37
				);
				await db.update({
					filter: { name: "john" },
					update: {
						$inc: {
							age: 3,
						},
					},
				});
				expect((await db.find({ filter: { name: "john" } }))[0].age).eq(
					40
				);
				await db.update({
					filter: { name: "john" },
					update: {
						$inc: {
							age: -5,
						},
					},
				});
				expect((await db.find({ filter: { name: "john" } }))[0].age).eq(
					35
				);
			});
			it("$mul", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$mul: {
							age: 2,
						},
					},
				});
				expect((await db.find({ filter: { name: "john" } }))[0].age).eq(
					70
				);
			});
			it("$min", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$min: {
							age: 37,
						},
					},
				});
				expect((await db.find({ filter: { name: "john" } }))[0].age).eq(
					35
				);
				await db.update({
					filter: { name: "john" },
					update: {
						$min: {
							age: 32,
						},
					},
				});
				expect((await db.find({ filter: { name: "john" } }))[0].age).eq(
					32
				);
			});
			it("$max", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$max: {
							age: 32,
						},
					},
				});
				expect((await db.find({ filter: { name: "john" } }))[0].age).eq(
					35
				);
				await db.update({
					filter: { name: "john" },
					update: {
						$max: {
							age: 37,
						},
					},
				});
				expect((await db.find({ filter: { name: "john" } }))[0].age).eq(
					37
				);
			});
			it("$rename", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$rename: {
							rooms: "_rooms",
						},
					},
				});
				expect(
					((await db.find({ filter: { name: "john" } })) as any)[0]
						._rooms.length
				).eq(4);
			});
			it("$set", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$set: {
							$deep: {
								"props.h": 192,
							},
						},
					},
				});
				expect(
					(await db.find({ filter: { name: "john" } }))[0].props.h
				).eq(192);
				await db.update({
					filter: { name: "john" },
					update: {
						$set: {
							age: 90,
						},
					},
				});
				expect((await db.find({ filter: { name: "john" } }))[0].age).eq(
					90
				);
			});
			it("$unset", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$unset: {
							$deep: {
								"props.h": 192,
							},
						},
					},
				});
				expect(
					(await db.find({ filter: { name: "john" } }))[0].props.h
				).eq(undefined);
				await db.update({
					filter: { name: "john" },
					update: {
						$unset: {
							additional: "",
						},
					},
				});
				expect(
					(await db.find({ filter: { name: "john" } }))[0].additional
				).eq(undefined);
			});
			it("$setOnInsert", async () => {
				await db.upsert({
					filter: { name: "john" },
					update: {
						$set: { name: "joe" },
						$setOnInsert: Employee.new({ name: "joe" }),
					},
				});
				expect((await db.find({ filter: { name: "joe" } }))[0].age).eq(
					35
				);
				await db.upsert({
					filter: { name: "elizabeth" },
					update: {
						$set: { name: "beth" },
						$setOnInsert: Employee.new({ name: "beth" }),
					},
				});
				expect((await db.find({ filter: { name: "beth" } }))[0].age).eq(
					9
				);
			});
		});
		describe("Array update operators", () => {
			it("$addToSet", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$addToSet: {
							rooms: "f",
						},
					},
				});
				await db.update({
					filter: { name: "john" },
					update: {
						$addToSet: {
							rooms: {
								$each: ["a", "n"],
							},
						},
					},
				});
				const doc = (await db.find({ filter: { name: "john" } }))[0];
				expect(doc.rooms.length).eq(6);
				expect(doc.rooms[doc.rooms.length - 1]).eq("n");
				expect(doc.rooms[doc.rooms.length - 2]).eq("f");
			});
			it("$pop", async () => {
				{
					await db.update({
						filter: { name: "john" },
						update: {
							$pop: {
								rooms: -1,
							},
						},
					});
					const doc = (
						await db.find({ filter: { name: "john" } })
					)[0];
					expect(doc.rooms.length).eq(3);
					expect(JSON.stringify(doc.rooms)).eq(
						JSON.stringify(["b", "c", "d"])
					);
				}
				{
					await db.update({
						filter: { name: "john" },
						update: {
							$pop: {
								rooms: 1,
							},
						},
					});
					const doc = (
						await db.find({ filter: { name: "john" } })
					)[0];
					expect(doc.rooms.length).eq(2);
					expect(JSON.stringify(doc.rooms)).eq(
						JSON.stringify(["b", "c"])
					);
				}
			});
			it("$pull", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$pull: {
							rooms: "a",
							events: {
								$lte: 10,
							},
						},
					},
				});
				const doc = (await db.find({ filter: { name: "john" } }))[0];
				expect(JSON.stringify(doc.rooms)).eq(
					JSON.stringify(["b", "c", "d"])
				);
				expect(JSON.stringify(doc.events)).eq(JSON.stringify([15]));
			});
			it("$pullAll", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$pullAll: {
							rooms: ["a"],
							events: [5, 10],
						},
					},
				});
				const doc = (await db.find({ filter: { name: "john" } }))[0];
				expect(JSON.stringify(doc.rooms)).eq(
					JSON.stringify(["b", "c", "d"])
				);
				expect(JSON.stringify(doc.events)).eq(JSON.stringify([15]));
			});
			it("$push", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$push: {
							events: 5,
						},
					},
				});
				const doc = (await db.find({ filter: { name: "john" } }))[0];
				expect(JSON.stringify(doc.events)).eq(
					JSON.stringify([5, 10, 15, 5])
				);
			});
			it("$push $each", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$push: {
							events: {
								$each: [5, 10, 15],
							},
						},
					},
				});
				const doc = (await db.find({ filter: { name: "john" } }))[0];
				expect(JSON.stringify(doc.events)).eq(
					JSON.stringify([5, 10, 15, 5, 10, 15])
				);
			});
			it("$push $each $position", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$push: {
							events: {
								$each: [5, 10, 15],
								$position: 1,
							},
						},
					},
				});
				const doc = (await db.find({ filter: { name: "john" } }))[0];
				expect(JSON.stringify(doc.events)).eq(
					JSON.stringify([5, 5, 10, 15, 10, 15])
				);
			});
			it("$push $each $slice", async () => {
				await db.update({
					filter: { name: "john" },
					update: {
						$push: {
							events: {
								$each: [5, 10, 15],
								$position: 1,
								$slice: 3,
							},
						},
					},
				});
				const doc = (await db.find({ filter: { name: "john" } }))[0];
				expect(JSON.stringify(doc.events)).eq(
					JSON.stringify([5, 5, 10])
				);
			});
			it("$push $each $sort", async () => {
				{
					await db.update({
						filter: { name: "john" },
						update: {
							$push: {
								events: {
									$each: [5, 10, 15],
									$sort: 1,
								},
							},
						},
					});
					const doc = (
						await db.find({ filter: { name: "john" } })
					)[0];
					expect(JSON.stringify(doc.events)).eq(
						JSON.stringify([5, 5, 10, 10, 15, 15])
					);
				}
				{
					await db.update({
						filter: { name: "john" },
						update: {
							$push: {
								events: {
									$each: [5, 10, 15],
									$sort: -1,
								},
							},
						},
					});
					const doc = (
						await db.find({ filter: { name: "john" } })
					)[0];
					expect(JSON.stringify(doc.events)).eq(
						JSON.stringify([15, 15, 15, 10, 10, 10, 5, 5, 5])
					);
				}
			});
			describe("variations on the sort mechanism", () => {
				it("$push $each $sort 1", async () => {
					await db.update({
						filter: { name: "john" },
						update: {
							$push: {
								children: {
									$each: [{ name: "tim", age: 3 }],
									$sort: {
										age: 1,
										name: 1,
									},
								},
							},
						},
					});
					const doc = (
						await db.find({ filter: { name: "john" } })
					)[0];
					expect(JSON.stringify(doc.children.map((x) => x.name))).eq(
						JSON.stringify(["jim", "tim", "tom", "roy"])
					);
				});
				it("$push $each $sort 2", async () => {
					await db.update({
						filter: { name: "john" },
						update: {
							$push: {
								children: {
									$each: [{ name: "tim", age: 3 }],
									$sort: {
										age: 1,
										name: -1,
									},
								},
							},
						},
					});
					const doc = (
						await db.find({ filter: { name: "john" } })
					)[0];
					expect(JSON.stringify(doc.children.map((x) => x.name))).eq(
						JSON.stringify(["tim", "jim", "tom", "roy"])
					);
				});
				it("$push $each $sort 3", async () => {
					await db.update({
						filter: { name: "john" },
						update: {
							$push: {
								children: {
									$each: [{ name: "tim", age: 3 }],
									$sort: {
										age: -1,
										name: -1,
									},
								},
							},
						},
					});
					const doc = (
						await db.find({ filter: { name: "john" } })
					)[0];
					expect(JSON.stringify(doc.children.map((x) => x.name))).eq(
						JSON.stringify(["roy", "tom", "tim", "jim"])
					);
				});
				it("$push $each $sort 4", async () => {
					await db.update({
						filter: { name: "john" },
						update: {
							$push: {
								children: {
									$each: [{ name: "tim", age: 3 }],
									$sort: {
										age: -1,
										name: 1,
									},
								},
							},
						},
					});
					const doc = (
						await db.find({ filter: { name: "john" } })
					)[0];
					expect(JSON.stringify(doc.children.map((x) => x.name))).eq(
						JSON.stringify(["roy", "tom", "jim", "tim"])
					);
				});
			});
		});
	});
});
