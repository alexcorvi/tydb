import { FS_Persistence_Adapter } from "../../src/fs-adapter";
import { Datastore, model } from "@core";
import { assert, expect, should, use } from "chai";
import * as asPromised from "chai-as-promised";
import * as fs from "fs";
import * as _ from "underscore";

use(asPromised);
should();

describe("Model", () => {
	describe("Serialization, deserialization", () => {
		it("Can serialize and deserialize strings", () => {
			let a;
			let b;
			let c;

			a = { test: "Some string" };
			b = model.serialize(a);
			c = model.deserialize(b);
			b.indexOf("\n").should.equal(-1);
			c.test.should.equal("Some string");

			// Even if a property is a string containing a new line, the serialized
			// version doesn't. The new line must still be there upon deserialization
			a = { test: "With a new\nline" };
			b = model.serialize(a);
			c = model.deserialize(b);
			c.test.should.equal("With a new\nline");
			a.test.indexOf("\n").should.not.equal(-1);
			b.indexOf("\n").should.equal(-1);
			c.test.indexOf("\n").should.not.equal(-1);
		});

		it("Can serialize and deserialize booleans", () => {
			let a;
			let b;
			let c;

			a = { test: true };
			b = model.serialize(a);
			c = model.deserialize(b);
			b.indexOf("\n").should.equal(-1);
			c.test.should.equal(true);
		});

		it("Can serialize and deserialize numbers", () => {
			let a;
			let b;
			let c;

			a = { test: 5 };
			b = model.serialize(a);
			c = model.deserialize(b);
			b.indexOf("\n").should.equal(-1);
			c.test.should.equal(5);
		});

		it("Can serialize and deserialize null", () => {
			let a;
			let b;
			let c;

			a = { test: null };
			b = model.serialize(a);
			c = model.deserialize(b);
			b.indexOf("\n").should.equal(-1);
			assert.isNull(a.test);
		});

		it("undefined fields are removed when serialized", () => {
			const a = { bloup: undefined, hello: "world" };
			const b = model.serialize(a);
			const c = model.deserialize(b);

			Object.keys(c).length.should.equal(1);
			c.hello.should.equal("world");
			assert.isUndefined(c.bloup);
		});

		it("Can serialize and deserialize a date", () => {
			let a;
			let b;
			let c;
			const d = new Date();

			a = { test: d };
			b = model.serialize(a);
			c = model.deserialize(b);
			b.indexOf("\n").should.equal(-1);
			b.should.equal(`{"test":{"$$date":${d.getTime()}}}`);
			(c.test instanceof Date).should.equal(true);
			c.test.getTime().should.equal(d.getTime());
		});

		it("Can serialize and deserialize sub objects", () => {
			let a;
			let b;
			let c;
			const d = new Date();

			a = { test: { something: 39, also: d, yes: { again: "yes" } } };
			b = model.serialize(a);
			c = model.deserialize(b);
			b.indexOf("\n").should.equal(-1);
			c.test.something.should.equal(39);
			c.test.also.getTime().should.equal(d.getTime());
			c.test.yes.again.should.equal("yes");
		});

		it("Can serialize and deserialize sub arrays", () => {
			let a;
			let b;
			let c;
			const d = new Date();

			a = { test: [39, d, { again: "yes" }] };
			b = model.serialize(a);
			c = model.deserialize(b);
			b.indexOf("\n").should.equal(-1);
			c.test[0].should.equal(39);
			c.test[1].getTime().should.equal(d.getTime());
			c.test[2].again.should.equal("yes");
		});

		it("Reject field names beginning with a $ sign or containing a dot, except the four edge cases", () => {
			const a1 = { $something: "totest" };
			const a2 = { "with.dot": "totest" };
			const e1 = { $$date: 4321 };
			const e2 = { $$deleted: true };
			const e3 = { $$indexCreated: "indexName" };
			const e4 = { $$indexRemoved: "indexName" };
			let b;

			// Normal cases
			(() => {
				b = model.serialize(a1);
			}).should.throw();
			(() => {
				b = model.serialize(a2);
			}).should.throw();

			// Edge cases
			b = model.serialize(e1);
			b = model.serialize(e2);
			b = model.serialize(e3);
			b = model.serialize(e4);
		});

		it("Can serialize string fields with a new line without breaking the DB", async () => {
			const badString = "world\r\nearth\nother\rline";
			if (fs.existsSync("workspace/test1.db")) {
				fs.unlinkSync("workspace/test1.db");
			}
			fs.existsSync("workspace/test1.db").should.equal(false);
			let db1 = new Datastore({
				ref: "workspace/test1.db",
				persistence_adapter: FS_Persistence_Adapter,
			});
			await db1.loadDatabase();
			await db1.insert({ hello: badString });
			let db2 = new Datastore({
				ref: "workspace/test1.db",
				persistence_adapter: FS_Persistence_Adapter,
			});
			await db2.loadDatabase();
			let docs = await db2.find({});
			docs.length.should.equal(1);
			(docs[0] as any).hello.should.equal(badString);
		});

		it("Can accept objects whose keys are numbers", () => {
			const o = { 42: true };

			const s = model.serialize(o);
		});
	}); // ==== End of 'Serialization, deserialization' ==== //

	describe("Object checking", () => {
		it("Field names beginning with a $ sign are forbidden", () => {
			assert.isDefined(model.checkObject);

			(() => {
				model.checkObject({ $bad: true });
			}).should.throw();

			(() => {
				model.checkObject({
					some: 42,
					nested: { again: "no", $worse: true },
				});
			}).should.throw();

			// This shouldn't throw since "$actuallyok" is not a field name
			model.checkObject({
				some: 42,
				nested: [5, "no", "$actuallyok", true],
			});

			(() => {
				model.checkObject({
					some: 42,
					nested: [
						5,
						"no",
						"$actuallyok",
						true,
						{ $hidden: "useless" },
					],
				});
			}).should.throw();
		});

		it("Field names cannot contain a .", () => {
			assert.isDefined(model.checkObject);

			(() => {
				model.checkObject({ "so.bad": true });
			}).should.throw();

			// Recursive behaviour testing done in the above test on $ signs
		});

		it("Properties with a null value dont trigger an error", () => {
			const obj = { prop: null };

			model.checkObject(obj);
		});

		it("Can check if an object is a primitive or not", () => {
			model.isPrimitiveType(5).should.equal(true);
			model.isPrimitiveType("sdsfdfs").should.equal(true);
			model.isPrimitiveType(0).should.equal(true);
			model.isPrimitiveType(true).should.equal(true);
			model.isPrimitiveType(false).should.equal(true);
			model.isPrimitiveType(new Date()).should.equal(true);
			model.isPrimitiveType([]).should.equal(true);
			model.isPrimitiveType([3, "try"]).should.equal(true);
			model.isPrimitiveType(null).should.equal(true);

			model.isPrimitiveType({}).should.equal(false);
			model.isPrimitiveType({ a: 42 }).should.equal(false);
		});
	}); // ==== End of 'Object checking' ==== //

	describe("Deep copying", () => {
		it("Should be able to deep copy any serializable model", () => {
			const d = new Date();
			const obj = {
				a: ["ee", "ff", 42],
				date: d,
				subobj: { a: "b", b: "c" },
			};
			const res = model.deepCopy(obj);

			res.a.length.should.equal(3);
			res.a[0].should.equal("ee");
			res.a[1].should.equal("ff");
			res.a[2].should.equal(42);
			res.date.getTime().should.equal(d.getTime());
			res.subobj.a.should.equal("b");
			res.subobj.b.should.equal("c");

			obj.a.push("ggg");
			(obj as any).date = "notadate";
			(obj as any).subobj = [];

			// Even if the original object is modified, the copied one isn't
			res.a.length.should.equal(3);
			res.a[0].should.equal("ee");
			res.a[1].should.equal("ff");
			res.a[2].should.equal(42);
			res.date.getTime().should.equal(d.getTime());
			res.subobj.a.should.equal("b");
			res.subobj.b.should.equal("c");
		});

		it("Should deep copy the contents of an array", () => {
			const a = [{ hello: "world" }];
			const b = model.deepCopy(a);

			b[0].hello.should.equal("world");
			b[0].hello = "another";
			b[0].hello.should.equal("another");
			a[0].hello.should.equal("world");
		});

		it("Without the strictKeys option, everything gets deep copied", () => {
			const a = {
				a: 4,
				$e: "rrr",
				"eee.rt": 42,
				nested: { yes: 1, "tt.yy": 2, $nopenope: 3 },
				array: [{ "rr.hh": 1 }, { yes: true }, { $yes: false }],
			};
			const b = model.deepCopy(a);

			assert.deepEqual(a, b);
		});

		it("With the strictKeys option, only valid keys gets deep copied", () => {
			const a = {
				a: 4,
				$e: "rrr",
				"eee.rt": 42,
				nested: { yes: 1, "tt.yy": 2, $nopenope: 3 },
				array: [{ "rr.hh": 1 }, { yes: true }, { $yes: false }],
			};
			const b = model.deepCopy(a, true);

			assert.deepEqual(b as any, {
				a: 4,
				nested: { yes: 1 },
				array: [{}, { yes: true }, {}],
			});
		});
	}); // ==== End of 'Deep copying' ==== //

	describe("Modifying documents", () => {
		it("Queries not containing any modifier just replace the document by the contents of the query but keep its _id", () => {
			const obj = { some: "thing", _id: "keepit" };
			const updateQuery = { replace: "done", bloup: [1, 8] };
			let t;

			t = model.modify(obj, updateQuery);
			(t as any).replace.should.equal("done");
			(t as any).bloup.length.should.equal(2);
			(t as any).bloup[0].should.equal(1);
			(t as any).bloup[1].should.equal(8);

			assert.isUndefined(t.some);
			t._id.should.equal("keepit");
		});

		it("Throw an error if trying to change the _id field in a copy-type modification", () => {
			const obj = { some: "thing", _id: "keepit" };
			const updateQuery = {
				replace: "done",
				bloup: [1, 8],
				_id: "donttryit",
			};

			expect(() => {
				model.modify(obj, updateQuery);
			}).to.throw("You cannot change a document's _id");

			updateQuery._id = "keepit";
			model.modify(obj, updateQuery); // No error thrown
		});

		it("Throw an error if trying to use modify in a mixed copy+modify way", () => {
			const obj = { some: "thing" };
			const updateQuery = { replace: "me", $modify: "metoo" };

			expect(() => {
				model.modify(obj as any, updateQuery);
			}).to.throw("You cannot mix modifiers and normal fields");
		});

		it("Throw an error if trying to use an inexistent modifier", () => {
			const obj = { some: "thing" };
			const updateQuery = {
				$set: { it: "exists" },
				$modify: "not this one",
			};

			expect(() => {
				model.modify(obj as any, updateQuery);
			}).to.throw(/^Unknown modifier .modify/);
		});

		it("Throw an error if a modifier is used with a non-object argument", () => {
			const obj = { some: "thing" };
			const updateQuery = { $set: "this exists" };

			expect(() => {
				model.modify(obj as any, updateQuery);
			}).to.throw(/Modifier .set's argument must be an object/);
		});

		describe("$set modifier", () => {
			it("Can change already set fields without modfifying the underlying object", () => {
				const obj = { some: "thing", yup: "yes", nay: "noes" };
				const updateQuery = {
					$set: { some: "changed", nay: "yes indeed" },
				};
				const modified = model.modify(obj as any, updateQuery);

				Object.keys(modified).length.should.equal(3);
				modified.some.should.equal("changed");
				modified.yup.should.equal("yes");
				modified.nay.should.equal("yes indeed");

				Object.keys(obj).length.should.equal(3);
				obj.some.should.equal("thing");
				obj.yup.should.equal("yes");
				obj.nay.should.equal("noes");
			});

			it("Creates fields to set if they dont exist yet", () => {
				const obj = { yup: "yes" };
				const updateQuery = {
					$set: { some: "changed", nay: "yes indeed" },
				};
				const modified = model.modify(obj as any, updateQuery);

				Object.keys(modified).length.should.equal(3);
				modified.some.should.equal("changed");
				modified.yup.should.equal("yes");
				modified.nay.should.equal("yes indeed");
			});

			it("Can set sub-fields and create them if necessary", () => {
				const obj = { yup: { subfield: "bloup" } };
				const updateQuery = {
					$set: {
						"yup.subfield": "changed",
						"yup.yop": "yes indeed",
						"totally.doesnt.exist": "now it does",
					},
				};
				const modified = model.modify(obj as any, updateQuery);

				_.isEqual(modified, {
					yup: { subfield: "changed", yop: "yes indeed" },
					totally: { doesnt: { exist: "now it does" } },
				}).should.equal(true);
			});

			it("Doesn't replace a falsy field by an object when recursively following dot notation", () => {
				const obj = { nested: false };
				const updateQuery = { $set: { "nested.now": "it is" } };
				const modified = model.modify(obj as any, updateQuery);

				assert.deepEqual(modified, { nested: false }); // Object not modified as the nested field doesn't exist
			});
		}); // End of '$set modifier'

		describe("$unset modifier", () => {
			it("Can delete a field, not throwing an error if the field doesnt exist", () => {
				let obj;
				let updateQuery;
				let modified;

				obj = { yup: "yes", other: "also" };
				updateQuery = { $unset: { yup: true } };
				modified = model.modify(obj as any, updateQuery);
				assert.deepEqual(modified, { other: "also" });

				obj = { yup: "yes", other: "also" };
				updateQuery = { $unset: { nope: true } };
				modified = model.modify(obj as any, updateQuery);
				assert.deepEqual(modified, obj);

				obj = { yup: "yes", other: "also" };
				updateQuery = { $unset: { nope: true, other: true } };
				modified = model.modify(obj as any, updateQuery);
				assert.deepEqual(modified, { yup: "yes" });
			});

			it("Can unset sub-fields and entire nested documents", () => {
				let obj;
				let updateQuery;
				let modified;

				obj = { yup: "yes", nested: { a: "also", b: "yeah" } };
				updateQuery = { $unset: { nested: true } };
				modified = model.modify(obj as any, updateQuery);
				assert.deepEqual(modified, { yup: "yes" });

				obj = { yup: "yes", nested: { a: "also", b: "yeah" } };
				updateQuery = { $unset: { "nested.a": true } };
				modified = model.modify(obj as any, updateQuery);
				assert.deepEqual(modified, {
					yup: "yes",
					nested: { b: "yeah" },
				});

				obj = { yup: "yes", nested: { a: "also", b: "yeah" } };
				updateQuery = {
					$unset: { "nested.a": true, "nested.b": true },
				};
				modified = model.modify(obj as any, updateQuery);
				assert.deepEqual(modified, { yup: "yes", nested: {} });
			});

			it("When unsetting nested fields, should not create an empty parent to nested field", () => {
				let obj: any = model.modify({ argh: true } as any, {
					$unset: { "bad.worse": true },
				});
				assert.deepEqual(obj, { argh: true });

				obj = model.modify(
					{ argh: true, bad: { worse: "oh" } } as any,
					{ $unset: { "bad.worse": true } }
				);
				assert.deepEqual(obj, { argh: true, bad: {} });

				obj = model.modify({ argh: true, bad: {} } as any, {
					$unset: { "bad.worse": true },
				});
				assert.deepEqual(obj, { argh: true, bad: {} });
			});
		}); // End of '$unset modifier'

		describe("$inc modifier", () => {
			it("Throw an error if you try to use it with a non-number or on a non number field", () => {
				(() => {
					const obj = { some: "thing", yup: "yes", nay: 2 };
					const updateQuery = { $inc: { nay: "notanumber" } };
					const modified = model.modify(obj as any, updateQuery);
				}).should.throw();

				(() => {
					const obj = { some: "thing", yup: "yes", nay: "nope" };
					const updateQuery = { $inc: { nay: 1 } };
					const modified = model.modify(obj as any, updateQuery);
				}).should.throw();
			});

			it("Can increment number fields or create and initialize them if needed", () => {
				const obj = { some: "thing", nay: 40 };
				let modified;

				modified = model.modify(obj as any, { $inc: { nay: 2 } });
				_.isEqual(modified, { some: "thing", nay: 42 }).should.equal(
					true
				);

				// Incidentally, this tests that obj was not modified
				modified = model.modify(obj as any, {
					$inc: { inexistent: -6 },
				});
				_.isEqual(modified, {
					some: "thing",
					nay: 40,
					inexistent: -6,
				}).should.equal(true);
			});

			it("Works recursively", () => {
				const obj = { some: "thing", nay: { nope: 40 } };
				let modified;

				modified = model.modify(obj as any, {
					$inc: { "nay.nope": -2, "blip.blop": 123 },
				});
				_.isEqual(modified, {
					some: "thing",
					nay: { nope: 38 },
					blip: { blop: 123 },
				}).should.equal(true);
			});
		}); // End of '$inc modifier'

		describe("$push modifier", () => {
			it("Can push an element to the end of an array", () => {
				const obj = { arr: ["hello"] };
				let modified;

				modified = model.modify(obj as any, {
					$push: { arr: "world" },
				});
				assert.deepEqual(modified, { arr: ["hello", "world"] });
			});

			it("Can push an element to a non-existent field and will create the array", () => {
				const obj = {};
				let modified;

				modified = model.modify(obj as any, {
					$push: { arr: "world" },
				});
				assert.deepEqual(modified, { arr: ["world"] });
			});

			it("Can push on nested fields", () => {
				let obj: any = { arr: { nested: ["hello"] } };
				let modified;

				modified = model.modify(obj as any, {
					$push: { "arr.nested": "world" },
				});
				assert.deepEqual(modified, {
					arr: { nested: ["hello", "world"] },
				});

				obj = { arr: { a: 2 } };
				modified = model.modify(obj as any, {
					$push: { "arr.nested": "world" },
				});
				assert.deepEqual(modified, {
					arr: { a: 2, nested: ["world"] },
				});
			});

			it("Throw if we try to push to a non-array", () => {
				let obj: any = { arr: "hello" };
				let modified;

				(() => {
					modified = model.modify(obj as any, {
						$push: { arr: "world" },
					});
				}).should.throw();

				obj = { arr: { nested: 45 } };
				(() => {
					modified = model.modify(obj as any, {
						$push: { "arr.nested": "world" },
					});
				}).should.throw();
			});

			it("Can use the $each modifier to add multiple values to an array at once", () => {
				const obj = { arr: ["hello"] };
				let modified;

				modified = model.modify(obj as any, {
					$push: { arr: { $each: ["world", "earth", "everything"] } },
				});
				assert.deepEqual(modified, {
					arr: ["hello", "world", "earth", "everything"],
				});

				(() => {
					modified = model.modify(obj as any, {
						$push: { arr: { $each: 45 } },
					});
				}).should.throw();

				(() => {
					modified = model.modify(obj as any, {
						$push: {
							arr: { $each: ["world"], unauthorized: true },
						},
					});
				}).should.throw();
			});

			it("Can use the $slice modifier to limit the number of array elements", () => {
				const obj = { arr: ["hello"] };
				let modified;

				modified = model.modify(obj as any, {
					$push: {
						arr: {
							$each: ["world", "earth", "everything"],
							$slice: 1,
						},
					},
				});
				assert.deepEqual(modified, { arr: ["hello"] });

				modified = model.modify(obj as any, {
					$push: {
						arr: {
							$each: ["world", "earth", "everything"],
							$slice: -1,
						},
					},
				});
				assert.deepEqual(modified, { arr: ["everything"] });

				modified = model.modify(obj as any, {
					$push: {
						arr: {
							$each: ["world", "earth", "everything"],
							$slice: 0,
						},
					},
				});
				assert.deepEqual(modified, { arr: [] });

				modified = model.modify(obj as any, {
					$push: {
						arr: {
							$each: ["world", "earth", "everything"],
							$slice: 2,
						},
					},
				});
				assert.deepEqual(modified, { arr: ["hello", "world"] });

				modified = model.modify(obj as any, {
					$push: {
						arr: {
							$each: ["world", "earth", "everything"],
							$slice: -2,
						},
					},
				});
				assert.deepEqual(modified, { arr: ["earth", "everything"] });

				modified = model.modify(obj as any, {
					$push: {
						arr: {
							$each: ["world", "earth", "everything"],
							$slice: -20,
						},
					},
				});
				assert.deepEqual(modified, {
					arr: ["hello", "world", "earth", "everything"],
				});

				modified = model.modify(obj as any, {
					$push: {
						arr: {
							$each: ["world", "earth", "everything"],
							$slice: 20,
						},
					},
				});
				assert.deepEqual(modified, {
					arr: ["hello", "world", "earth", "everything"],
				});

				modified = model.modify(obj as any, {
					$push: { arr: { $each: [], $slice: 1 } },
				});
				assert.deepEqual(modified, { arr: ["hello"] });

				// $each not specified, but $slice is
				modified = model.modify(obj as any, {
					$push: { arr: { $slice: 1 } },
				});
				assert.deepEqual(modified, { arr: ["hello"] });

				(() => {
					modified = model.modify(obj as any, {
						$push: { arr: { $slice: 1, unauthorized: true } },
					});
				}).should.throw();

				(() => {
					modified = model.modify(obj as any, {
						$push: { arr: { $each: [], unauthorized: true } },
					});
				}).should.throw();
			});
		}); // End of '$push modifier'

		describe("$addToSet modifier", () => {
			it("Can add an element to a set", () => {
				let obj = { arr: ["hello"] };
				let modified;

				modified = model.modify(obj as any, {
					$addToSet: { arr: "world" },
				});
				assert.deepEqual(modified, { arr: ["hello", "world"] });

				obj = { arr: ["hello"] };
				modified = model.modify(obj as any, {
					$addToSet: { arr: "hello" },
				});
				assert.deepEqual(modified, { arr: ["hello"] });
			});

			it("Can add an element to a non-existent set and will create the array", () => {
				const obj = { arr: [] };
				let modified;

				modified = model.modify(obj as any, {
					$addToSet: { arr: "world" },
				});
				assert.deepEqual(modified, { arr: ["world"] });
			});

			it("Throw if we try to addToSet to a non-array", () => {
				const obj = { arr: "hello" };
				let modified;

				(() => {
					modified = model.modify(obj as any, {
						$addToSet: { arr: "world" },
					});
				}).should.throw();
			});

			it("Use deep-equality to check whether we can add a value to a set", () => {
				let obj = { arr: [{ b: 2 }] };
				let modified;

				modified = model.modify(obj as any, {
					$addToSet: { arr: { b: 3 } },
				});
				assert.deepEqual(modified, { arr: [{ b: 2 }, { b: 3 }] });

				obj = { arr: [{ b: 2 }] };
				modified = model.modify(obj as any, {
					$addToSet: { arr: { b: 2 } },
				});
				assert.deepEqual(modified, { arr: [{ b: 2 }] });
			});

			it("Can use the $each modifier to add multiple values to a set at once", () => {
				const obj = { arr: ["hello"] };
				let modified;

				modified = model.modify(obj as any, {
					$addToSet: {
						arr: { $each: ["world", "earth", "hello", "earth"] },
					},
				});
				assert.deepEqual(modified, {
					arr: ["hello", "world", "earth"],
				});

				(() => {
					modified = model.modify(obj as any, {
						$addToSet: { arr: { $each: 45 } },
					});
				}).should.throw();

				(() => {
					modified = model.modify(obj as any, {
						$addToSet: {
							arr: { $each: ["world"], unauthorized: true },
						},
					});
				}).should.throw();
			});
		}); // End of '$addToSet modifier'

		describe("$pop modifier", () => {
			it("Throw if called on a non array, a non defined field or a non integer", () => {
				let obj: any = { arr: "hello" };
				let modified;

				(() => {
					modified = model.modify(obj as any, { $pop: { arr: 1 } });
				}).should.throw();

				obj = { bloup: "nope" } as any;
				(() => {
					modified = model.modify(obj as any, { $pop: { arr: 1 } });
				}).should.throw();

				obj = { arr: [1, 4, 8] };
				(() => {
					modified = model.modify(obj as any, {
						$pop: { arr: true },
					});
				}).should.throw();
			});

			it("Can remove the first and last element of an array", () => {
				let obj;
				let modified;

				obj = { arr: [1, 4, 8] };
				modified = model.modify(obj as any, { $pop: { arr: 1 } });
				assert.deepEqual(modified, { arr: [1, 4] });

				obj = { arr: [1, 4, 8] };
				modified = model.modify(obj as any, { $pop: { arr: -1 } });
				assert.deepEqual(modified, { arr: [4, 8] });

				// Empty arrays are not changed
				obj = { arr: [] };
				modified = model.modify(obj as any, { $pop: { arr: 1 } });
				assert.deepEqual(modified, { arr: [] });
				modified = model.modify(obj as any, { $pop: { arr: -1 } });
				assert.deepEqual(modified, { arr: [] });
			});
		}); // End of '$pop modifier'

		describe("$pull modifier", () => {
			it("Can remove an element from a set", () => {
				let obj = { arr: ["hello", "world"] };
				let modified;

				modified = model.modify(obj as any, {
					$pull: { arr: "world" },
				});
				assert.deepEqual(modified, { arr: ["hello"] });

				obj = { arr: ["hello"] };
				modified = model.modify(obj as any, {
					$pull: { arr: "world" },
				});
				assert.deepEqual(modified, { arr: ["hello"] });
			});

			it("Can remove multiple matching elements", () => {
				const obj = { arr: ["hello", "world", "hello", "world"] };
				let modified;

				modified = model.modify(obj as any, {
					$pull: { arr: "world" },
				});
				assert.deepEqual(modified, { arr: ["hello", "hello"] });
			});

			it("Throw if we try to pull from a non-array", () => {
				const obj = { arr: "hello" };
				let modified;

				(() => {
					modified = model.modify(obj as any, {
						$pull: { arr: "world" },
					});
				}).should.throw();
			});

			it("Use deep-equality to check whether we can remove a value from a set", () => {
				let obj = { arr: [{ b: 2 }, { b: 3 }] };
				let modified;

				modified = model.modify(obj as any, {
					$pull: { arr: { b: 3 } },
				});
				assert.deepEqual(modified, { arr: [{ b: 2 }] });

				obj = { arr: [{ b: 2 }] };
				modified = model.modify(obj as any, {
					$pull: { arr: { b: 3 } },
				});
				assert.deepEqual(modified, { arr: [{ b: 2 }] });
			});

			it("Can use any kind of nedb query with $pull", () => {
				let obj: any = { arr: [4, 7, 12, 2], other: "yup" };
				let modified;

				modified = model.modify(obj as any, {
					$pull: { arr: { $gte: 5 } },
				});
				assert.deepEqual(modified, { arr: [4, 2], other: "yup" });

				obj = { arr: [{ b: 4 }, { b: 7 }, { b: 1 }], other: "yeah" };
				modified = model.modify(obj as any, {
					$pull: { arr: { b: { $gte: 5 } } },
				});
				assert.deepEqual(modified, {
					arr: [{ b: 4 }, { b: 1 }],
					other: "yeah",
				});
			});
		}); // End of '$pull modifier'

		describe("$max modifier", () => {
			it("Will set the field to the updated value if value is greater than current one, without modifying the original object", () => {
				const obj = { some: "thing", number: 10 };
				const updateQuery = { $max: { number: 12 } };
				const modified = model.modify(obj as any, updateQuery);

				modified.should.deep.equal({ some: "thing", number: 12 });
				obj.should.deep.equal({ some: "thing", number: 10 });
			});

			it("Will not update the field if new value is smaller than current one", () => {
				const obj = { some: "thing", number: 10 };
				const updateQuery = { $max: { number: 9 } };
				const modified = model.modify(obj as any, updateQuery);

				modified.should.deep.equal({ some: "thing", number: 10 });
			});

			it("Will create the field if it does not exist", () => {
				const obj = { some: "thing" };
				const updateQuery = { $max: { number: 10 } };
				const modified = model.modify(obj as any, updateQuery);

				modified.should.deep.equal({ some: "thing", number: 10 });
			});

			it("Works on embedded documents", () => {
				const obj = { some: "thing", somethingElse: { number: 10 } };
				const updateQuery = { $max: { "somethingElse.number": 12 } };
				const modified = model.modify(obj as any, updateQuery);

				modified.should.deep.equal({
					some: "thing",
					somethingElse: { number: 12 },
				});
			});
		}); // End of '$max modifier'

		describe("$min modifier", () => {
			it("Will set the field to the updated value if value is smaller than current one, without modifying the original object", () => {
				const obj = { some: "thing", number: 10 };
				const updateQuery = { $min: { number: 8 } };
				const modified = model.modify(obj as any, updateQuery);

				modified.should.deep.equal({ some: "thing", number: 8 });
				obj.should.deep.equal({ some: "thing", number: 10 });
			});

			it("Will not update the field if new value is greater than current one", () => {
				const obj = { some: "thing", number: 10 };
				const updateQuery = { $min: { number: 12 } };
				const modified = model.modify(obj as any, updateQuery);

				modified.should.deep.equal({ some: "thing", number: 10 });
			});

			it("Will create the field if it does not exist", () => {
				const obj = { some: "thing" };
				const updateQuery = { $min: { number: 10 } };
				const modified = model.modify(obj as any, updateQuery);

				modified.should.deep.equal({ some: "thing", number: 10 });
			});

			it("Works on embedded documents", () => {
				const obj = { some: "thing", somethingElse: { number: 10 } };
				const updateQuery = { $min: { "somethingElse.number": 8 } };
				const modified = model.modify(obj as any, updateQuery);

				modified.should.deep.equal({
					some: "thing",
					somethingElse: { number: 8 },
				});
			});
		}); // End of '$min modifier'
	}); // ==== End of 'Modifying documents' ==== //

	describe("Comparing things", () => {
		it("undefined is the smallest", () => {
			const otherStuff: any[] = [
				null,
				"string",
				"",
				-1,
				0,
				5.3,
				12,
				true,
				false,
				new Date(12345),
				{},
				{ hello: "world" },
				[],
				["quite", 5],
			];

			model.compareThings(undefined, undefined).should.equal(0);

			otherStuff.forEach((stuff) => {
				model.compareThings(undefined, stuff).should.equal(-1);
				model.compareThings(stuff, undefined).should.equal(1);
			});
		});

		it("Then null", () => {
			const otherStuff: any[] = [
				"string",
				"",
				-1,
				0,
				5.3,
				12,
				true,
				false,
				new Date(12345),
				{},
				{ hello: "world" },
				[],
				["quite", 5],
			];

			model.compareThings(null, null).should.equal(0);

			otherStuff.forEach((stuff) => {
				model.compareThings(null, stuff).should.equal(-1);
				model.compareThings(stuff, null).should.equal(1);
			});
		});

		it("Then numbers", () => {
			const otherStuff: any[] = [
				"string",
				"",
				true,
				false,
				new Date(4312),
				{},
				{ hello: "world" },
				[],
				["quite", 5],
			];
			const numbers = [-12, 0, 12, 5.7];

			model.compareThings(-12, 0).should.equal(-1);
			model.compareThings(0, -3).should.equal(1);
			model.compareThings(5.7, 2).should.equal(1);
			model.compareThings(5.7, 12.3).should.equal(-1);
			model.compareThings(0, 0).should.equal(0);
			model.compareThings(-2.6, -2.6).should.equal(0);
			model.compareThings(5, 5).should.equal(0);

			otherStuff.forEach((stuff) => {
				numbers.forEach((number) => {
					model.compareThings(number, stuff).should.equal(-1);
					model.compareThings(stuff, number).should.equal(1);
				});
			});
		});

		it("Then strings", () => {
			const otherStuff: any[] = [
				true,
				false,
				new Date(4321),
				{},
				{ hello: "world" },
				[],
				["quite", 5],
			];
			const strings = ["", "string", "hello world"];

			model.compareThings("", "hey").should.equal(-1);
			model.compareThings("hey", "").should.equal(1);
			model.compareThings("hey", "hew").should.equal(1);
			model.compareThings("hey", "hey").should.equal(0);

			otherStuff.forEach((stuff) => {
				strings.forEach((string) => {
					model.compareThings(string, stuff).should.equal(-1);
					model.compareThings(stuff, string).should.equal(1);
				});
			});
		});

		it("Then booleans", () => {
			const otherStuff: any[] = [
				new Date(4321),
				{},
				{ hello: "world" },
				[],
				["quite", 5],
			];
			const bools = [true, false];

			model.compareThings(true, true).should.equal(0);
			model.compareThings(false, false).should.equal(0);
			model.compareThings(true, false).should.equal(1);
			model.compareThings(false, true).should.equal(-1);

			otherStuff.forEach((stuff) => {
				bools.forEach((bool) => {
					model.compareThings(bool, stuff).should.equal(-1);
					model.compareThings(stuff, bool).should.equal(1);
				});
			});
		});

		it("Then dates", () => {
			const otherStuff: any[] = [
				{},
				{ hello: "world" },
				[],
				["quite", 5],
			];
			const dates = [
				new Date(-123),
				new Date(),
				new Date(5555),
				new Date(0),
			];
			const now = new Date();

			model.compareThings(now, now).should.equal(0);
			model.compareThings(new Date(54341), now).should.equal(-1);
			model.compareThings(now, new Date(54341)).should.equal(1);
			model.compareThings(new Date(0), new Date(-54341)).should.equal(1);
			model.compareThings(new Date(123), new Date(4341)).should.equal(-1);

			otherStuff.forEach((stuff) => {
				dates.forEach((date) => {
					model.compareThings(date, stuff).should.equal(-1);
					model.compareThings(stuff, date).should.equal(1);
				});
			});
		});

		it("Then arrays", () => {
			const otherStuff: any[] = [{}, { hello: "world" }];
			const arrays = [[], ["yes"], ["hello", 5]];

			model.compareThings([], []).should.equal(0);
			model.compareThings(["hello"], []).should.equal(1);
			model.compareThings([], ["hello"]).should.equal(-1);
			model.compareThings(["hello"], ["hello", "world"]).should.equal(-1);
			model
				.compareThings(["hello", "earth"], ["hello", "world"])
				.should.equal(-1);
			model
				.compareThings(["hello", "zzz"], ["hello", "world"])
				.should.equal(1);
			model
				.compareThings(["hello", "world"], ["hello", "world"])
				.should.equal(0);

			otherStuff.forEach((stuff) => {
				arrays.forEach((array) => {
					model.compareThings(array, stuff).should.equal(-1);
					model.compareThings(stuff, array).should.equal(1);
				});
			});
		});

		it("And finally objects", () => {
			model.compareThings({}, {}).should.equal(0);
			model.compareThings({ a: 42 }, { a: 312 }).should.equal(-1);
			model.compareThings({ a: "42" }, { a: "312" }).should.equal(1);
			model
				.compareThings({ a: 42, b: 312 }, { b: 312, a: 42 })
				.should.equal(0);
			model
				.compareThings({ a: 42, b: 312, c: 54 }, { b: 313, a: 42 })
				.should.equal(-1);
		});

		it("Can specify custom string comparison function", () => {
			model
				.compareThings("hello", "bloup", (a, b) => (a < b ? -1 : 1))
				.should.equal(1);
			model
				.compareThings("hello", "bloup", (a, b) => (a > b ? -1 : 1))
				.should.equal(-1);
		});
	}); // ==== End of 'Comparing things' ==== //

	describe("Querying", () => {
		describe("Comparing things", () => {
			it("Two things of different types cannot be equal, two identical native things are equal", () => {
				const toTest = [
					null,
					"somestring",
					42,
					true,
					new Date(72998322),
					{ hello: "world" },
				];

				const // Use another array so that we don't test pointer equality
					toTestAgainst = [
						null,
						"somestring",
						42,
						true,
						new Date(72998322),
						{ hello: "world" },
					];

				let i;
				let j;

				for (i = 0; i < toTest.length; i += 1) {
					for (j = 0; j < toTestAgainst.length; j += 1) {
						model
							.areThingsEqual(toTest[i], toTestAgainst[j])
							.should.equal(i === j);
					}
				}
			});

			it("Can test native types null undefined string number boolean date equality", () => {
				const toTest = [
					null,
					undefined,
					"somestring",
					42,
					true,
					new Date(72998322),
					{ hello: "world" },
				];
				const toTestAgainst = [
					undefined,
					null,
					"someotherstring",
					5,
					false,
					new Date(111111),
					{ hello: "mars" },
				];
				let i;

				for (i = 0; i < toTest.length; i += 1) {
					model
						.areThingsEqual(toTest[i], toTestAgainst[i])
						.should.equal(false);
				}
			});

			it("If one side is an array or undefined, comparison fails", () => {
				const toTestAgainst = [
					null,
					undefined,
					"somestring",
					42,
					true,
					new Date(72998322),
					{ hello: "world" },
				];
				let i;

				for (i = 0; i < toTestAgainst.length; i += 1) {
					model
						.areThingsEqual([1, 2, 3], toTestAgainst[i])
						.should.equal(false);
					model
						.areThingsEqual(toTestAgainst[i], [])
						.should.equal(false);

					model
						.areThingsEqual(undefined, toTestAgainst[i])
						.should.equal(false);
					model
						.areThingsEqual(toTestAgainst[i], undefined)
						.should.equal(false);
				}
			});

			it("Can test objects equality", () => {
				model
					.areThingsEqual({ hello: "world" }, {})
					.should.equal(false);
				model
					.areThingsEqual({ hello: "world" }, { hello: "mars" })
					.should.equal(false);
				model
					.areThingsEqual(
						{ hello: "world" },
						{ hello: "world", temperature: 42 }
					)
					.should.equal(false);
				model
					.areThingsEqual(
						{ hello: "world", other: { temperature: 42 } },
						{ hello: "world", other: { temperature: 42 } }
					)
					.should.equal(true);
			});
		});

		describe("Getting a fields value in dot notation", () => {
			it("Return first-level and nested values", () => {
				model
					.getDotValue({ hello: "world" }, "hello")!
					.should.equal("world");
				model
					.getDotValue(
						{ hello: "world", type: { planet: true, blue: true } },
						"type.planet"
					)!
					.should.equal(true);
			});

			it("Return undefined if the field cannot be found in the object", () => {
				assert.isUndefined(
					model.getDotValue({ hello: "world" }, "helloo")
				);
				assert.isUndefined(
					model.getDotValue(
						{ hello: "world", type: { planet: true } },
						"type.plane"
					)
				);
			});

			it("Can navigate inside arrays with dot notation, and return the array of values in that case", () => {
				let dv;

				// Simple array of subdocuments
				dv = model.getDotValue(
					{
						planets: [
							{ name: "Earth", number: 3 },
							{ name: "Mars", number: 2 },
							{ name: "Pluton", number: 9 },
						],
					},
					"planets.name"
				);
				assert.deepEqual(dv, ["Earth", "Mars", "Pluton"]);

				// Nested array of subdocuments
				dv = model.getDotValue(
					{
						nedb: true,
						data: {
							planets: [
								{ name: "Earth", number: 3 },
								{ name: "Mars", number: 2 },
								{ name: "Pluton", number: 9 },
							],
						},
					},
					"data.planets.number"
				);
				assert.deepEqual(dv, [3, 2, 9]);

				// Nested array in a subdocument of an array (yay, inception!)
				dv = model.getDotValue(
					{
						nedb: true,
						data: {
							planets: [
								{ name: "Earth", numbers: [1, 3] },
								{ name: "Mars", numbers: [7] },
								{ name: "Pluton", numbers: [9, 5, 1] },
							],
						},
					},
					"data.planets.numbers"
				);
				assert.deepEqual(dv, [[1, 3], [7], [9, 5, 1]]);
			});

			it("Can get a single value out of an array using its index", () => {
				let dv;

				// Simple index in dot notation
				dv = model.getDotValue(
					{
						planets: [
							{ name: "Earth", number: 3 },
							{ name: "Mars", number: 2 },
							{ name: "Pluton", number: 9 },
						],
					},
					"planets.1"
				);
				assert.deepEqual(dv, { name: "Mars", number: 2 });

				// Out of bounds index
				dv = model.getDotValue(
					{
						planets: [
							{ name: "Earth", number: 3 },
							{ name: "Mars", number: 2 },
							{ name: "Pluton", number: 9 },
						],
					},
					"planets.3"
				);
				assert.isUndefined(dv);

				// Index in nested array
				dv = model.getDotValue(
					{
						nedb: true,
						data: {
							planets: [
								{ name: "Earth", number: 3 },
								{ name: "Mars", number: 2 },
								{ name: "Pluton", number: 9 },
							],
						},
					},
					"data.planets.2"
				);
				assert.deepEqual(dv, { name: "Pluton", number: 9 });

				// Dot notation with index in the middle
				dv = model.getDotValue(
					{
						nedb: true,
						data: {
							planets: [
								{ name: "Earth", number: 3 },
								{ name: "Mars", number: 2 },
								{ name: "Pluton", number: 9 },
							],
						},
					},
					"data.planets.0.name"
				);
				dv.should.equal("Earth");
			});
		});

		describe("Field equality", () => {
			it("Can find documents with simple fields", () => {
				model
					.match({ test: "yeah" }, { test: "yea" })
					.should.equal(false);
				model
					.match({ test: "yeah" }, { test: "yeahh" })
					.should.equal(false);
				model
					.match({ test: "yeah" }, { test: "yeah" })
					.should.equal(true);
			});

			it("Can find documents with the dot-notation", () => {
				model
					.match({ test: { ooo: "yeah" } }, { "test.ooo": "yea" })
					.should.equal(false);
				model
					.match({ test: { ooo: "yeah" } }, { "test.oo": "yeah" })
					.should.equal(false);
				model
					.match({ test: { ooo: "yeah" } }, { "tst.ooo": "yeah" })
					.should.equal(false);
				model
					.match({ test: { ooo: "yeah" } }, { "test.ooo": "yeah" })
					.should.equal(true);
			});

			it("Cannot find undefined", () => {
				model
					.match({ test: undefined }, { test: undefined })
					.should.equal(false);
				model
					.match(
						{ test: { pp: undefined } },
						{ "test.pp": undefined }
					)
					.should.equal(false);
			});

			it("Nested objects are deep-equality matched and not treated as sub-queries", () => {
				model
					.match({ a: { b: 5 } }, { a: { b: 5 } })
					.should.equal(true);
				model
					.match({ a: { b: 5, c: 3 } }, { a: { b: 5 } })
					.should.equal(false);

				model
					.match({ a: { b: 5 } }, { a: { b: { $lt: 10 } } })
					.should.equal(false);
				(() => {
					model.match(
						{ a: { b: 5 } },
						{ a: { $or: [{ b: 10 }, { b: 5 }] } }
					);
				}).should.throw();
			});

			it("Can match for field equality inside an array with the dot notation", () => {
				model
					.match(
						{ a: true, b: ["node", "embedded", "database"] },
						{ "b.1": "node" }
					)
					.should.equal(false);
				model
					.match(
						{ a: true, b: ["node", "embedded", "database"] },
						{ "b.1": "embedded" }
					)
					.should.equal(true);
				model
					.match(
						{ a: true, b: ["node", "embedded", "database"] },
						{ "b.1": "database" }
					)
					.should.equal(false);
			});
		});

		describe("Regular expression matching", () => {
			it("Matching a non-string to a regular expression always yields false", () => {
				const d = new Date();
				const r = new RegExp(d.getTime().toString());

				model
					.match({ test: true }, { test: /true/ })
					.should.equal(false);
				model
					.match({ test: null }, { test: /null/ })
					.should.equal(false);
				model.match({ test: 42 }, { test: /42/ }).should.equal(false);
				model.match({ test: d }, { test: r }).should.equal(false);
			});

			it("Can match strings using basic querying", () => {
				model
					.match({ test: "true" }, { test: /true/ })
					.should.equal(true);
				model
					.match({ test: "babaaaar" }, { test: /aba+r/ })
					.should.equal(true);
				model
					.match({ test: "babaaaar" }, { test: /^aba+r/ })
					.should.equal(false);
				model
					.match({ test: "true" }, { test: /t[ru]e/ })
					.should.equal(false);
			});

			it("Can match strings using the $regex operator", () => {
				model
					.match({ test: "true" }, { test: { $regex: /true/ } })
					.should.equal(true);
				model
					.match({ test: "babaaaar" }, { test: { $regex: /aba+r/ } })
					.should.equal(true);
				model
					.match({ test: "babaaaar" }, { test: { $regex: /^aba+r/ } })
					.should.equal(false);
				model
					.match({ test: "true" }, { test: { $regex: /t[ru]e/ } })
					.should.equal(false);
			});

			it("Will throw if $regex operator is used with a non regex value", () => {
				(() => {
					model.match({ test: "true" }, { test: { $regex: 42 } });
				}).should.throw();

				(() => {
					model.match({ test: "true" }, { test: { $regex: "true" } });
				}).should.throw();
			});

			it("Can use the $regex operator in cunjunction with other operators", () => {
				model
					.match(
						{ test: "helLo" },
						{ test: { $regex: /ll/i, $nin: ["helL", "helLop"] } }
					)
					.should.equal(true);
				model
					.match(
						{ test: "helLo" },
						{ test: { $regex: /ll/i, $nin: ["helLo", "helLop"] } }
					)
					.should.equal(false);
			});

			it("Can use dot-notation", () => {
				model
					.match(
						{ test: { nested: "true" } },
						{ "test.nested": /true/ }
					)
					.should.equal(true);
				model
					.match(
						{ test: { nested: "babaaaar" } },
						{ "test.nested": /^aba+r/ }
					)
					.should.equal(false);

				model
					.match(
						{ test: { nested: "true" } },
						{ "test.nested": { $regex: /true/ } }
					)
					.should.equal(true);
				model
					.match(
						{ test: { nested: "babaaaar" } },
						{ "test.nested": { $regex: /^aba+r/ } }
					)
					.should.equal(false);
			});
		});

		describe("$lt", () => {
			it("Cannot compare a field to an object, an array, null or a boolean, it will return false", () => {
				model
					.match({ a: 5 }, { a: { $lt: { a: 6 } } })
					.should.equal(false);
				model
					.match({ a: 5 }, { a: { $lt: [6, 7] } })
					.should.equal(false);
				model.match({ a: 5 }, { a: { $lt: null } }).should.equal(false);
				model.match({ a: 5 }, { a: { $lt: true } }).should.equal(false);
			});

			it("Can compare numbers, with or without dot notation", () => {
				model.match({ a: 5 }, { a: { $lt: 6 } }).should.equal(true);
				model.match({ a: 5 }, { a: { $lt: 5 } }).should.equal(false);
				model.match({ a: 5 }, { a: { $lt: 4 } }).should.equal(false);

				model
					.match({ a: { b: 5 } }, { "a.b": { $lt: 6 } })
					.should.equal(true);
				model
					.match({ a: { b: 5 } }, { "a.b": { $lt: 3 } })
					.should.equal(false);
			});

			it("Can compare strings, with or without dot notation", () => {
				model
					.match({ a: "nedb" }, { a: { $lt: "nedc" } })
					.should.equal(true);
				model
					.match({ a: "nedb" }, { a: { $lt: "neda" } })
					.should.equal(false);

				model
					.match({ a: { b: "nedb" } }, { "a.b": { $lt: "nedc" } })
					.should.equal(true);
				model
					.match({ a: { b: "nedb" } }, { "a.b": { $lt: "neda" } })
					.should.equal(false);
			});

			it("If field is an array field, a match means a match on at least one element", () => {
				model
					.match({ a: [5, 10] }, { a: { $lt: 4 } })
					.should.equal(false);
				model
					.match({ a: [5, 10] }, { a: { $lt: 6 } })
					.should.equal(true);
				model
					.match({ a: [5, 10] }, { a: { $lt: 11 } })
					.should.equal(true);
			});

			it("Works with dates too", () => {
				model
					.match(
						{ a: new Date(1000) },
						{ a: { $gte: new Date(1001) } }
					)
					.should.equal(false);
				model
					.match(
						{ a: new Date(1000) },
						{ a: { $lt: new Date(1001) } }
					)
					.should.equal(true);
			});
		});

		// General behaviour is tested in the block about $lt. Here we just test operators work
		describe("Other comparison operators: $lte, $gt, $gte, $ne, $in, $exists", () => {
			it("$lte", () => {
				model.match({ a: 5 }, { a: { $lte: 6 } }).should.equal(true);
				model.match({ a: 5 }, { a: { $lte: 5 } }).should.equal(true);
				model.match({ a: 5 }, { a: { $lte: 4 } }).should.equal(false);
			});

			it("$gt", () => {
				model.match({ a: 5 }, { a: { $gt: 6 } }).should.equal(false);
				model.match({ a: 5 }, { a: { $gt: 5 } }).should.equal(false);
				model.match({ a: 5 }, { a: { $gt: 4 } }).should.equal(true);
			});

			it("$gte", () => {
				model.match({ a: 5 }, { a: { $gte: 6 } }).should.equal(false);
				model.match({ a: 5 }, { a: { $gte: 5 } }).should.equal(true);
				model.match({ a: 5 }, { a: { $gte: 4 } }).should.equal(true);
			});

			it("$ne", () => {
				model.match({ a: 5 }, { a: { $ne: 4 } }).should.equal(true);
				model.match({ a: 5 }, { a: { $ne: 5 } }).should.equal(false);
				model.match({ a: 5 }, { b: { $ne: 5 } }).should.equal(true);
				model
					.match({ a: false }, { a: { $ne: false } })
					.should.equal(false);
			});

			it("$in", () => {
				model
					.match({ a: 5 }, { a: { $in: [6, 8, 9] } })
					.should.equal(false);
				model
					.match({ a: 6 }, { a: { $in: [6, 8, 9] } })
					.should.equal(true);
				model
					.match({ a: 7 }, { a: { $in: [6, 8, 9] } })
					.should.equal(false);
				model
					.match({ a: 8 }, { a: { $in: [6, 8, 9] } })
					.should.equal(true);
				model
					.match({ a: 9 }, { a: { $in: [6, 8, 9] } })
					.should.equal(true);

				(() => {
					model.match({ a: 5 }, { a: { $in: 5 } });
				}).should.throw();
			});

			it("$nin", () => {
				model
					.match({ a: 5 }, { a: { $nin: [6, 8, 9] } })
					.should.equal(true);
				model
					.match({ a: 6 }, { a: { $nin: [6, 8, 9] } })
					.should.equal(false);
				model
					.match({ a: 7 }, { a: { $nin: [6, 8, 9] } })
					.should.equal(true);
				model
					.match({ a: 8 }, { a: { $nin: [6, 8, 9] } })
					.should.equal(false);
				model
					.match({ a: 9 }, { a: { $nin: [6, 8, 9] } })
					.should.equal(false);

				// Matches if field doesn't exist
				model
					.match({ a: 9 }, { b: { $nin: [6, 8, 9] } })
					.should.equal(true);

				(() => {
					model.match({ a: 5 }, { a: { $in: 5 } });
				}).should.throw();
			});

			it("$exists", () => {
				model.match({ a: 5 }, { a: { $exists: 1 } }).should.equal(true);
				model
					.match({ a: 5 }, { a: { $exists: true } })
					.should.equal(true);
				model
					.match({ a: 5 }, { a: { $exists: new Date() } })
					.should.equal(true);
				model
					.match({ a: 5 }, { a: { $exists: "" } })
					.should.equal(true);
				model
					.match({ a: 5 }, { a: { $exists: [] } })
					.should.equal(true);
				model
					.match({ a: 5 }, { a: { $exists: {} } })
					.should.equal(true);

				model
					.match({ a: 5 }, { a: { $exists: 0 } })
					.should.equal(false);
				model
					.match({ a: 5 }, { a: { $exists: false } })
					.should.equal(false);
				model
					.match({ a: 5 }, { a: { $exists: null } })
					.should.equal(false);
				model
					.match({ a: 5 }, { a: { $exists: undefined } })
					.should.equal(false);

				model
					.match({ a: 5 }, { b: { $exists: true } })
					.should.equal(false);

				model
					.match({ a: 5 }, { b: { $exists: false } })
					.should.equal(true);
			});
		});

		describe("Comparing on arrays", () => {
			it("Can perform a direct array match", () => {
				model
					.match(
						{
							planets: ["Earth", "Mars", "Pluto"],
							something: "else",
						},
						{ planets: ["Earth", "Mars"] }
					)
					.should.equal(false);
				model
					.match(
						{
							planets: ["Earth", "Mars", "Pluto"],
							something: "else",
						},
						{ planets: ["Earth", "Mars", "Pluto"] }
					)
					.should.equal(true);
				model
					.match(
						{
							planets: ["Earth", "Mars", "Pluto"],
							something: "else",
						},
						{ planets: ["Earth", "Pluto", "Mars"] }
					)
					.should.equal(false);
			});

			it("Can query on the size of an array field", () => {
				// Non nested documents
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ childrens: { $size: 0 } }
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ childrens: { $size: 1 } }
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ childrens: { $size: 2 } }
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ childrens: { $size: 3 } }
					)
					.should.equal(true);

				// Nested documents
				model
					.match(
						{
							hello: "world",
							description: {
								satellites: ["Moon", "Hubble"],
								diameter: 6300,
							},
						},
						{ "description.satellites": { $size: 0 } }
					)
					.should.equal(false);
				model
					.match(
						{
							hello: "world",
							description: {
								satellites: ["Moon", "Hubble"],
								diameter: 6300,
							},
						},
						{ "description.satellites": { $size: 1 } }
					)
					.should.equal(false);
				model
					.match(
						{
							hello: "world",
							description: {
								satellites: ["Moon", "Hubble"],
								diameter: 6300,
							},
						},
						{ "description.satellites": { $size: 2 } }
					)
					.should.equal(true);
				model
					.match(
						{
							hello: "world",
							description: {
								satellites: ["Moon", "Hubble"],
								diameter: 6300,
							},
						},
						{ "description.satellites": { $size: 3 } }
					)
					.should.equal(false);

				// Using a projected array
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.names": { $size: 0 } }
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.names": { $size: 1 } }
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.names": { $size: 2 } }
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.names": { $size: 3 } }
					)
					.should.equal(true);
			});

			it("$size operator works with empty arrays", () => {
				model
					.match({ childrens: [] }, { childrens: { $size: 0 } })
					.should.equal(true);
				model
					.match({ childrens: [] }, { childrens: { $size: 2 } })
					.should.equal(false);
				model
					.match({ childrens: [] }, { childrens: { $size: 3 } })
					.should.equal(false);
			});

			it("Should throw an error if a query operator is used without comparing to an integer", () => {
				(() => {
					model.match({ a: [1, 5] }, { a: { $size: 1.4 } });
				}).should.throw();
				(() => {
					model.match({ a: [1, 5] }, { a: { $size: "fdf" } });
				}).should.throw();
				(() => {
					model.match({ a: [1, 5] }, { a: { $size: { $lt: 5 } } });
				}).should.throw();
			});

			it("Using $size operator on a non-array field should prevent match but not throw", () => {
				model.match({ a: 5 }, { a: { $size: 1 } }).should.equal(false);
			});

			it("Can use $size several times in the same matcher", () => {
				model
					.match(
						{ childrens: ["Riri", "Fifi", "Loulou"] },
						{ childrens: { $size: 3 } }
					)
					.should.equal(true);
				model
					.match(
						{ childrens: ["Riri", "Fifi", "Loulou"] },
						{ childrens: { $size: 4 } }
					)
					.should.equal(false); // Of course this can never be true
			});

			it("Can query array documents with multiple simultaneous conditions", () => {
				// Non nested documents
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ childrens: { $elemMatch: { name: "Dewey", age: 7 } } }
					)
					.should.equal(true);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{
							childrens: {
								$elemMatch: { name: "Dewey", age: 12 },
							},
						}
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ childrens: { $elemMatch: { name: "Louie", age: 3 } } }
					)
					.should.equal(false);

				// Nested documents
				model
					.match(
						{
							outer: {
								childrens: [
									{ name: "Huey", age: 3 },
									{ name: "Dewey", age: 7 },
									{ name: "Louie", age: 12 },
								],
							},
						},
						{
							"outer.childrens": {
								$elemMatch: { name: "Dewey", age: 7 },
							},
						}
					)
					.should.equal(true);
				model
					.match(
						{
							outer: {
								childrens: [
									{ name: "Huey", age: 3 },
									{ name: "Dewey", age: 7 },
									{ name: "Louie", age: 12 },
								],
							},
						},
						{
							"outer.childrens": {
								$elemMatch: { name: "Dewey", age: 12 },
							},
						}
					)
					.should.equal(false);
				model
					.match(
						{
							outer: {
								childrens: [
									{ name: "Huey", age: 3 },
									{ name: "Dewey", age: 7 },
									{ name: "Louie", age: 12 },
								],
							},
						},
						{
							"outer.childrens": {
								$elemMatch: { name: "Louie", age: 3 },
							},
						}
					)
					.should.equal(false);
			});

			it("$elemMatch operator works with empty arrays", () => {
				model
					.match(
						{ childrens: [] },
						{ childrens: { $elemMatch: { name: "Mitsos" } } }
					)
					.should.equal(false);
				model
					.match({ childrens: [] }, { childrens: { $elemMatch: {} } })
					.should.equal(false);
			});

			it("Can use more complex comparisons inside nested query documents", () => {
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{
							childrens: {
								$elemMatch: {
									name: "Dewey",
									age: { $gt: 6, $lt: 8 },
								},
							},
						}
					)
					.should.equal(true);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{
							childrens: {
								$elemMatch: {
									name: "Dewey",
									age: { $in: [6, 7, 8] },
								},
							},
						}
					)
					.should.equal(true);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{
							childrens: {
								$elemMatch: {
									name: "Dewey",
									age: { $gt: 6, $lt: 7 },
								},
							},
						}
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{
							childrens: {
								$elemMatch: {
									name: "Louie",
									age: { $gt: 6, $lte: 7 },
								},
							},
						}
					)
					.should.equal(false);
			});
		});

		describe("Logical operators $or, $and, $not", () => {
			it("Any of the subqueries should match for an $or to match", () => {
				model
					.match(
						{ hello: "world" },
						{ $or: [{ hello: "pluton" }, { hello: "world" }] }
					)
					.should.equal(true);
				model
					.match(
						{ hello: "pluton" },
						{ $or: [{ hello: "pluton" }, { hello: "world" }] }
					)
					.should.equal(true);
				model
					.match(
						{ hello: "nope" },
						{ $or: [{ hello: "pluton" }, { hello: "world" }] }
					)
					.should.equal(false);
				model
					.match(
						{ hello: "world", age: 15 },
						{ $or: [{ hello: "pluton" }, { age: { $lt: 20 } }] }
					)
					.should.equal(true);
				model
					.match(
						{ hello: "world", age: 15 },
						{ $or: [{ hello: "pluton" }, { age: { $lt: 10 } }] }
					)
					.should.equal(false);
			});

			it("All of the subqueries should match for an $and to match", () => {
				model
					.match(
						{ hello: "world", age: 15 },
						{ $and: [{ age: 15 }, { hello: "world" }] }
					)
					.should.equal(true);
				model
					.match(
						{ hello: "world", age: 15 },
						{ $and: [{ age: 16 }, { hello: "world" }] }
					)
					.should.equal(false);
				model
					.match(
						{ hello: "world", age: 15 },
						{ $and: [{ hello: "world" }, { age: { $lt: 20 } }] }
					)
					.should.equal(true);
				model
					.match(
						{ hello: "world", age: 15 },
						{ $and: [{ hello: "pluton" }, { age: { $lt: 20 } }] }
					)
					.should.equal(false);
			});

			it("Subquery should not match for a $not to match", () => {
				model.match({ a: 5, b: 10 }, { a: 5 }).should.equal(true);
				model
					.match({ a: 5, b: 10 }, { $not: { a: 5 } })
					.should.equal(false);
			});

			it("Logical operators are all top-level, only other logical operators can be above", () => {
				(() => {
					model.match(
						{ a: { b: 7 } },
						{ a: { $or: [{ b: 5 }, { b: 7 }] } }
					);
				}).should.throw();
				model
					.match(
						{ a: { b: 7 } },
						{ $or: [{ "a.b": 5 }, { "a.b": 7 }] }
					)
					.should.equal(true);
			});

			it("Logical operators can be combined as long as they are on top of the decision tree", () => {
				model
					.match(
						{ a: 5, b: 7, c: 12 },
						{
							$or: [
								{ $and: [{ a: 5 }, { b: 8 }] },
								{ $and: [{ a: 5 }, { c: { $lt: 40 } }] },
							],
						}
					)
					.should.equal(true);
				model
					.match(
						{ a: 5, b: 7, c: 12 },
						{
							$or: [
								{ $and: [{ a: 5 }, { b: 8 }] },
								{ $and: [{ a: 5 }, { c: { $lt: 10 } }] },
							],
						}
					)
					.should.equal(false);
			});

			it("Should throw an error if a logical operator is used without an array or if an unknown logical operator is used", () => {
				(() => {
					model.match({ a: 5 }, { $or: { a: 6 } });
				}).should.throw();
				(() => {
					model.match({ a: 5 }, { $and: { a: 6 } });
				}).should.throw();
				(() => {
					model.match({ a: 5 }, { $unknown: [{ a: 5 }] });
				}).should.throw();
			});
		});

		describe("Comparison operator $where", () => {
			it("Function should match and not match correctly", () => {
				model
					.match(
						{ a: 4 },
						{
							$where() {
								return this.a === 4;
							},
						}
					)
					.should.equal(true);
				model
					.match(
						{ a: 4 },
						{
							$where() {
								return this.a === 5;
							},
						}
					)
					.should.equal(false);
			});

			it("Should throw an error if the $where function is not, in fact, a function", () => {
				(() => {
					model.match({ a: 4 }, { $where: "not a function" });
				}).should.throw();
			});

			it("Should throw an error if the $where function returns a non-boolean", () => {
				(() => {
					model.match(
						{ a: 4 },
						{
							$where() {
								return "not a boolean";
							},
						}
					);
				}).should.throw();
			});

			it("Should be able to do the complex matching it must be used for", () => {
				const checkEmail = function (this: any) {
					if (!this.firstName || !this.lastName) {
						return false;
					}
					return (
						`${this.firstName.toLowerCase()}.${this.lastName.toLowerCase()}@gmail.com` ===
						this.email
					);
				};
				model
					.match(
						{
							firstName: "John",
							lastName: "Doe",
							email: "john.doe@gmail.com",
						},
						{ $where: checkEmail }
					)
					.should.equal(true);
				model
					.match(
						{
							firstName: "john",
							lastName: "doe",
							email: "john.doe@gmail.com",
						},
						{ $where: checkEmail }
					)
					.should.equal(true);
				model
					.match(
						{
							firstName: "Jane",
							lastName: "Doe",
							email: "john.doe@gmail.com",
						},
						{ $where: checkEmail }
					)
					.should.equal(false);
				model
					.match(
						{
							firstName: "John",
							lastName: "Deere",
							email: "john.doe@gmail.com",
						},
						{ $where: checkEmail }
					)
					.should.equal(false);
				model
					.match(
						{ lastName: "Doe", email: "john.doe@gmail.com" },
						{ $where: checkEmail }
					)
					.should.equal(false);
			});
		});

		describe("Array fields", () => {
			it("Field equality", () => {
				model
					.match({ tags: ["node", "js", "db"] }, { tags: "python" })
					.should.equal(false);
				model
					.match({ tags: ["node", "js", "db"] }, { tagss: "js" })
					.should.equal(false);
				model
					.match({ tags: ["node", "js", "db"] }, { tags: "js" })
					.should.equal(true);
				model
					.match({ tags: ["node", "js", "db"] }, { tags: "js" })
					.should.equal(true);

				// Mixed matching with array and non array
				model
					.match(
						{ tags: ["node", "js", "db"], nedb: true },
						{ tags: "js", nedb: true }
					)
					.should.equal(true);

				// Nested matching
				model
					.match(
						{ number: 5, data: { tags: ["node", "js", "db"] } },
						{ "data.tags": "js" }
					)
					.should.equal(true);
				model
					.match(
						{ number: 5, data: { tags: ["node", "js", "db"] } },
						{ "data.tags": "j" }
					)
					.should.equal(false);
			});

			it("With one comparison operator", () => {
				model
					.match({ ages: [3, 7, 12] }, { ages: { $lt: 2 } })
					.should.equal(false);
				model
					.match({ ages: [3, 7, 12] }, { ages: { $lt: 3 } })
					.should.equal(false);
				model
					.match({ ages: [3, 7, 12] }, { ages: { $lt: 4 } })
					.should.equal(true);
				model
					.match({ ages: [3, 7, 12] }, { ages: { $lt: 8 } })
					.should.equal(true);
				model
					.match({ ages: [3, 7, 12] }, { ages: { $lt: 13 } })
					.should.equal(true);
			});

			it("Works with arrays that are in subdocuments", () => {
				model
					.match(
						{ children: { ages: [3, 7, 12] } },
						{ "children.ages": { $lt: 2 } }
					)
					.should.equal(false);
				model
					.match(
						{ children: { ages: [3, 7, 12] } },
						{ "children.ages": { $lt: 3 } }
					)
					.should.equal(false);
				model
					.match(
						{ children: { ages: [3, 7, 12] } },
						{ "children.ages": { $lt: 4 } }
					)
					.should.equal(true);
				model
					.match(
						{ children: { ages: [3, 7, 12] } },
						{ "children.ages": { $lt: 8 } }
					)
					.should.equal(true);
				model
					.match(
						{ children: { ages: [3, 7, 12] } },
						{ "children.ages": { $lt: 13 } }
					)
					.should.equal(true);
			});

			it("Can query inside arrays thanks to dot notation", () => {
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.age": { $lt: 2 } }
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.age": { $lt: 3 } }
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.age": { $lt: 4 } }
					)
					.should.equal(true);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.age": { $lt: 8 } }
					)
					.should.equal(true);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.age": { $lt: 13 } }
					)
					.should.equal(true);

				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.name": "Louis" }
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.name": "Louie" }
					)
					.should.equal(true);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.name": "Lewi" }
					)
					.should.equal(false);
			});

			it("Can query for a specific element inside arrays thanks to dot notation", () => {
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.0.name": "Louie" }
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.1.name": "Louie" }
					)
					.should.equal(false);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.2.name": "Louie" }
					)
					.should.equal(true);
				model
					.match(
						{
							childrens: [
								{ name: "Huey", age: 3 },
								{ name: "Dewey", age: 7 },
								{ name: "Louie", age: 12 },
							],
						},
						{ "childrens.3.name": "Louie" }
					)
					.should.equal(false);
			});

			it("A single array-specific operator and the query is treated as array specific", () => {
				(() => {
					model.match(
						{ childrens: ["Riri", "Fifi", "Loulou"] },
						{ childrens: { Fifi: true, $size: 3 } }
					);
				}).should.throw();
			});

			it("Can mix queries on array fields and non array filds with array specific operators", () => {
				model
					.match(
						{
							uncle: "Donald",
							nephews: ["Riri", "Fifi", "Loulou"],
						},
						{ nephews: { $size: 2 }, uncle: "Donald" }
					)
					.should.equal(false);
				model
					.match(
						{
							uncle: "Donald",
							nephews: ["Riri", "Fifi", "Loulou"],
						},
						{ nephews: { $size: 3 }, uncle: "Donald" }
					)
					.should.equal(true);
				model
					.match(
						{
							uncle: "Donald",
							nephews: ["Riri", "Fifi", "Loulou"],
						},
						{ nephews: { $size: 4 }, uncle: "Donald" }
					)
					.should.equal(false);

				model
					.match(
						{
							uncle: "Donals",
							nephews: ["Riri", "Fifi", "Loulou"],
						},
						{ nephews: { $size: 3 }, uncle: "Picsou" }
					)
					.should.equal(false);
				model
					.match(
						{
							uncle: "Donald",
							nephews: ["Riri", "Fifi", "Loulou"],
						},
						{ nephews: { $size: 3 }, uncle: "Donald" }
					)
					.should.equal(true);
				model
					.match(
						{
							uncle: "Donald",
							nephews: ["Riri", "Fifi", "Loulou"],
						},
						{ nephews: { $size: 3 }, uncle: "Daisy" }
					)
					.should.equal(false);
			});
		});
	}); // ==== End of 'Querying' ==== //
});
