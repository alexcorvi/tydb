import { Index } from "@core";
import { assert, should, use } from "chai";
import * as asPromised from "chai-as-promised";
import * as _ from "underscore";

use(asPromised);
should();

describe("Indexes", () => {
	describe("Insertion", () => {
		it("Can insert pointers to documents in the index correctly when they have the field", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);

			// The underlying BST now has 3 nodes which contain the docs where it's expected
			idx.tree.getNumberOfKeys().should.equal(3);
			assert.deepEqual(idx.tree.search("hello"), [{ a: 5, tf: "hello" }]);
			assert.deepEqual(idx.tree.search("world"), [{ a: 8, tf: "world" }]);
			assert.deepEqual(idx.tree.search("bloup"), [{ a: 2, tf: "bloup" }]);

			// The nodes contain pointers to the actual documents
			idx.tree.search("world")[0].should.equal(doc2);
			idx.tree.search("bloup")[0].a = 42;
			doc3.a.should.equal(42);
		});

		it("Inserting twice for the same fieldName in a unique index will result in an error thrown", () => {
			const idx = new Index<any, any>({ fieldName: "tf", unique: true });
			const doc1 = { a: 5, tf: "hello" };
			idx.insert(doc1);
			idx.tree.getNumberOfKeys().should.equal(1);
			(() => {
				idx.insert(doc1);
			}).should.throw();
		});

		it("Inserting twice for a fieldName the docs dont have with a unique index results in an error thrown", () => {
			const idx = new Index<any, any>({
				fieldName: "nope",
				unique: true,
			});
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 5, tf: "world" };
			idx.insert(doc1);
			idx.tree.getNumberOfKeys().should.equal(1);
			(() => {
				idx.insert(doc2);
			}).should.throw();
		});

		it("Inserting twice for a fieldName the docs dont have with a unique and sparse index will not throw, since the docs will be non indexed", () => {
			const idx = new Index<any, any>({
				fieldName: "nope",
				unique: true,
				sparse: true,
			});

			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 5, tf: "world" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.tree.getNumberOfKeys().should.equal(0); // Docs are not indexed
		});

		it("Works with dot notation", () => {
			const idx = new Index<any, any>({ fieldName: "tf.nested" });
			const doc1 = { a: 5, tf: { nested: "hello" } };
			const doc2 = { a: 8, tf: { nested: "world", additional: true } };
			const doc3 = { a: 2, tf: { nested: "bloup", age: 42 } };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);

			// The underlying BST now has 3 nodes which contain the docs where it's expected
			idx.tree.getNumberOfKeys().should.equal(3);
			assert.deepEqual(idx.tree.search("hello"), [doc1]);
			assert.deepEqual(idx.tree.search("world"), [doc2]);
			assert.deepEqual(idx.tree.search("bloup"), [doc3]);

			// The nodes contain pointers to the actual documents
			idx.tree.search("bloup")[0].a = 42;
			doc3.a.should.equal(42);
		});

		it("Can insert an array of documents", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			idx.insert([doc1, doc2, doc3]);
			idx.tree.getNumberOfKeys().should.equal(3);
			assert.deepEqual(idx.tree.search("hello"), [doc1]);
			assert.deepEqual(idx.tree.search("world"), [doc2]);
			assert.deepEqual(idx.tree.search("bloup"), [doc3]);
		});

		it("When inserting an array of elements, if an error is thrown all inserts need to be rolled back", () => {
			const idx = new Index<any, any>({ fieldName: "tf", unique: true });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc2b = { a: 84, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			(() => {
				idx.insert([doc1, doc2, doc2b, doc3]);
			}).should.throw();
			idx.tree.getNumberOfKeys().should.equal(0);
			assert.deepEqual(idx.tree.search("hello"), []);
			assert.deepEqual(idx.tree.search("world"), []);
			assert.deepEqual(idx.tree.search("bloup"), []);
		});

		describe("Array fields", () => {
			it("Inserts one entry per array element in the index", () => {
				const obj = { tf: ["aa", "bb"], really: "yeah" };
				const obj2 = { tf: "normal", yes: "indeed" };
				const idx = new Index<any, any>({ fieldName: "tf" });
				idx.insert(obj);
				idx.getAll().length.should.equal(2);
				idx.getAll()[0].should.equal(obj);
				idx.getAll()[1].should.equal(obj);

				idx.insert(obj2);
				idx.getAll().length.should.equal(3);
			});

			it("Inserts one entry per array element in the index, type-checked", () => {
				const obj = {
					tf: ["42", 42, new Date(42), 42],
					really: "yeah",
				};
				const idx = new Index<any, any>({ fieldName: "tf" });
				idx.insert(obj);
				idx.getAll().length.should.equal(3);
				idx.getAll()[0].should.equal(obj);
				idx.getAll()[1].should.equal(obj);
				idx.getAll()[2].should.equal(obj);
			});

			it("Inserts one entry per unique array element in the index, the unique constraint only holds across documents", () => {
				const obj = { tf: ["aa", "aa"], really: "yeah" };
				const obj2 = { tf: ["cc", "yy", "cc"], yes: "indeed" };
				const idx = new Index<any, any>({
					fieldName: "tf",
					unique: true,
				});
				idx.insert(obj);
				idx.getAll().length.should.equal(1);
				idx.getAll()[0].should.equal(obj);

				idx.insert(obj2);
				idx.getAll().length.should.equal(3);
			});

			it("The unique constraint holds across documents", () => {
				const obj = { tf: ["aa", "aa"], really: "yeah" };
				const obj2 = { tf: ["cc", "aa", "cc"], yes: "indeed" };
				const idx = new Index<any, any>({
					fieldName: "tf",
					unique: true,
				});
				idx.insert(obj);
				idx.getAll().length.should.equal(1);
				idx.getAll()[0].should.equal(obj);

				(() => {
					idx.insert(obj2);
				}).should.throw();
			});

			it("When removing a document, remove it from the index at all unique array elements", () => {
				const obj = { tf: ["aa", "aa"], really: "yeah" };
				const obj2 = { tf: ["cc", "aa", "cc"], yes: "indeed" };
				const idx = new Index<any, any>({ fieldName: "tf" });
				idx.insert(obj);
				idx.insert(obj2);
				idx.getMatching("aa").length.should.equal(2);
				idx.getMatching("aa").indexOf(obj).should.not.equal(-1);
				idx.getMatching("aa").indexOf(obj2).should.not.equal(-1);
				idx.getMatching("cc").length.should.equal(1);

				idx.remove(obj2);
				idx.getMatching("aa").length.should.equal(1);
				idx.getMatching("aa").indexOf(obj).should.not.equal(-1);
				idx.getMatching("aa").indexOf(obj2).should.equal(-1);
				idx.getMatching("cc").length.should.equal(0);
			});

			it("If a unique constraint is violated when inserting an array key, roll back all inserts before the key", () => {
				const obj = { tf: ["aa", "bb"], really: "yeah" };
				const obj2 = { tf: ["cc", "dd", "aa", "ee"], yes: "indeed" };
				const idx = new Index<any, any>({
					fieldName: "tf",
					unique: true,
				});
				idx.insert(obj);
				idx.getAll().length.should.equal(2);
				idx.getMatching("aa").length.should.equal(1);
				idx.getMatching("bb").length.should.equal(1);
				idx.getMatching("cc").length.should.equal(0);
				idx.getMatching("dd").length.should.equal(0);
				idx.getMatching("ee").length.should.equal(0);

				(() => {
					idx.insert(obj2);
				}).should.throw();
				idx.getAll().length.should.equal(2);
				idx.getMatching("aa").length.should.equal(1);
				idx.getMatching("bb").length.should.equal(1);
				idx.getMatching("cc").length.should.equal(0);
				idx.getMatching("dd").length.should.equal(0);
				idx.getMatching("ee").length.should.equal(0);
			});
		}); // ==== End of 'Array fields' ==== //
	}); // ==== End of 'Insertion' ==== //

	describe("Removal", () => {
		it("Can remove pointers from the index, even when multiple documents have the same key", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			const doc4 = { a: 23, tf: "world" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);
			idx.insert(doc4);
			idx.tree.getNumberOfKeys().should.equal(3);

			idx.remove(doc1);
			idx.tree.getNumberOfKeys().should.equal(2);
			idx.tree.search("hello").length.should.equal(0);

			idx.remove(doc2);
			idx.tree.getNumberOfKeys().should.equal(2);
			idx.tree.search("world").length.should.equal(1);
			idx.tree.search("world")[0].should.equal(doc4);
		});

		it("If we have a sparse index, removing a non indexed doc has no effect", () => {
			const idx = new Index<any, any>({
				fieldName: "nope",
				sparse: true,
			});
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 5, tf: "world" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.tree.getNumberOfKeys().should.equal(0);

			idx.remove(doc1);
			idx.tree.getNumberOfKeys().should.equal(0);
		});

		it("Works with dot notation", () => {
			const idx = new Index<any, any>({ fieldName: "tf.nested" });
			const doc1 = { a: 5, tf: { nested: "hello" } };
			const doc2 = { a: 8, tf: { nested: "world", additional: true } };
			const doc3 = { a: 2, tf: { nested: "bloup", age: 42 } };

			const doc4 = {
				a: 2,
				tf: { nested: "world", fruits: ["apple", "carrot"] },
			};

			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);
			idx.insert(doc4);
			idx.tree.getNumberOfKeys().should.equal(3);

			idx.remove(doc1);
			idx.tree.getNumberOfKeys().should.equal(2);
			idx.tree.search("hello").length.should.equal(0);

			idx.remove(doc2);
			idx.tree.getNumberOfKeys().should.equal(2);
			idx.tree.search("world").length.should.equal(1);
			idx.tree.search("world")[0].should.equal(doc4);
		});

		it("Can remove an array of documents", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			idx.insert([doc1, doc2, doc3]);
			idx.tree.getNumberOfKeys().should.equal(3);
			idx.remove([doc1, doc3]);
			idx.tree.getNumberOfKeys().should.equal(1);
			assert.deepEqual(idx.tree.search("hello"), []);
			assert.deepEqual(idx.tree.search("world"), [doc2]);
			assert.deepEqual(idx.tree.search("bloup"), []);
		});
	}); // ==== End of 'Removal' ==== //

	describe("Update", () => {
		it("Can update a document whose key did or didnt change", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			const doc4 = { a: 23, tf: "world" };
			const doc5 = { a: 1, tf: "changed" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);
			idx.tree.getNumberOfKeys().should.equal(3);
			assert.deepEqual(idx.tree.search("world"), [doc2]);

			idx.update(doc2, doc4);
			idx.tree.getNumberOfKeys().should.equal(3);
			assert.deepEqual(idx.tree.search("world"), [doc4]);

			idx.update(doc1, doc5);
			idx.tree.getNumberOfKeys().should.equal(3);
			assert.deepEqual(idx.tree.search("hello"), []);
			assert.deepEqual(idx.tree.search("changed"), [doc5]);
		});

		it("If a simple update violates a unique constraint, changes are rolled back and an error thrown", () => {
			const idx = new Index<any, any>({ fieldName: "tf", unique: true });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			const bad = { a: 23, tf: "world" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);

			idx.tree.getNumberOfKeys().should.equal(3);
			assert.deepEqual(idx.tree.search("hello"), [doc1]);
			assert.deepEqual(idx.tree.search("world"), [doc2]);
			assert.deepEqual(idx.tree.search("bloup"), [doc3]);
			(() => idx.update(doc3, bad)).should.throw();

			// No change
			idx.tree.getNumberOfKeys().should.equal(3);
			assert.deepEqual(idx.tree.search("hello"), [doc1]);
			assert.deepEqual(idx.tree.search("world"), [doc2]);
			assert.deepEqual(idx.tree.search("bloup"), [doc3]);
		});

		it("Can update an array of documents", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			const doc1b = { a: 23, tf: "world" };
			const doc2b = { a: 1, tf: "changed" };
			const doc3b = { a: 44, tf: "bloup" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);
			idx.tree.getNumberOfKeys().should.equal(3);

			idx.update([
				{ oldDoc: doc1, newDoc: doc1b },
				{ oldDoc: doc2, newDoc: doc2b },
				{ oldDoc: doc3, newDoc: doc3b },
			]);

			idx.tree.getNumberOfKeys().should.equal(3);
			idx.getMatching("world").length.should.equal(1);
			idx.getMatching("world")[0].should.equal(doc1b);
			idx.getMatching("changed").length.should.equal(1);
			idx.getMatching("changed")[0].should.equal(doc2b);
			idx.getMatching("bloup").length.should.equal(1);
			idx.getMatching("bloup")[0].should.equal(doc3b);
		});

		it("If a unique constraint is violated during an array-update, all changes are rolled back and an error thrown", () => {
			const idx = new Index<any, any>({ fieldName: "tf", unique: true });
			const doc0 = { a: 432, tf: "notthistoo" };
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			const doc1b = { a: 23, tf: "changed" };

			const // Will violate the constraint (first try)
				doc2b = { a: 1, tf: "changed" };

			const // Will violate the constraint (second try)
				doc2c = { a: 1, tf: "notthistoo" };

			const doc3b = { a: 44, tf: "alsochanged" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);
			idx.tree.getNumberOfKeys().should.equal(3);

			(() => {
				idx.update([
					{ oldDoc: doc1, newDoc: doc1b },
					{ oldDoc: doc2, newDoc: doc2b },
					{ oldDoc: doc3, newDoc: doc3b },
				]);
			}).should.throw();

			idx.tree.getNumberOfKeys().should.equal(3);
			idx.getMatching("hello").length.should.equal(1);
			idx.getMatching("hello")[0].should.equal(doc1);
			idx.getMatching("world").length.should.equal(1);
			idx.getMatching("world")[0].should.equal(doc2);
			idx.getMatching("bloup").length.should.equal(1);
			idx.getMatching("bloup")[0].should.equal(doc3);

			(() => {
				idx.update([
					{ oldDoc: doc1, newDoc: doc1b },
					{ oldDoc: doc2, newDoc: doc2b },
					{ oldDoc: doc3, newDoc: doc3b },
				]);
			}).should.throw();

			idx.tree.getNumberOfKeys().should.equal(3);
			idx.getMatching("hello").length.should.equal(1);
			idx.getMatching("hello")[0].should.equal(doc1);
			idx.getMatching("world").length.should.equal(1);
			idx.getMatching("world")[0].should.equal(doc2);
			idx.getMatching("bloup").length.should.equal(1);
			idx.getMatching("bloup")[0].should.equal(doc3);
		});

		it("If an update doesnt change a document, the unique constraint is not violated", () => {
			const idx = new Index<any, any>({ fieldName: "tf", unique: true });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			const noChange = { a: 8, tf: "world" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);
			idx.tree.getNumberOfKeys().should.equal(3);
			assert.deepEqual(idx.tree.search("world"), [doc2]);

			idx.update(doc2, noChange); // No error thrown
			idx.tree.getNumberOfKeys().should.equal(3);
			assert.deepEqual(idx.tree.search("world"), [noChange]);
		});

		it("Can revert simple and batch updates", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			const doc1b = { a: 23, tf: "world" };
			const doc2b = { a: 1, tf: "changed" };
			const doc3b = { a: 44, tf: "bloup" };

			const batchUpdate = [
				{ oldDoc: doc1, newDoc: doc1b },
				{ oldDoc: doc2, newDoc: doc2b },
				{ oldDoc: doc3, newDoc: doc3b },
			];

			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);
			idx.tree.getNumberOfKeys().should.equal(3);

			idx.update(batchUpdate);

			idx.tree.getNumberOfKeys().should.equal(3);
			idx.getMatching("world").length.should.equal(1);
			idx.getMatching("world")[0].should.equal(doc1b);
			idx.getMatching("changed").length.should.equal(1);
			idx.getMatching("changed")[0].should.equal(doc2b);
			idx.getMatching("bloup").length.should.equal(1);
			idx.getMatching("bloup")[0].should.equal(doc3b);

			idx.revertUpdate(batchUpdate);

			idx.tree.getNumberOfKeys().should.equal(3);
			idx.getMatching("hello").length.should.equal(1);
			idx.getMatching("hello")[0].should.equal(doc1);
			idx.getMatching("world").length.should.equal(1);
			idx.getMatching("world")[0].should.equal(doc2);
			idx.getMatching("bloup").length.should.equal(1);
			idx.getMatching("bloup")[0].should.equal(doc3);

			// Now a simple update
			idx.update(doc2, doc2b);

			idx.tree.getNumberOfKeys().should.equal(3);
			idx.getMatching("hello").length.should.equal(1);
			idx.getMatching("hello")[0].should.equal(doc1);
			idx.getMatching("changed").length.should.equal(1);
			idx.getMatching("changed")[0].should.equal(doc2b);
			idx.getMatching("bloup").length.should.equal(1);
			idx.getMatching("bloup")[0].should.equal(doc3);

			idx.revertUpdate(doc2, doc2b);

			idx.tree.getNumberOfKeys().should.equal(3);
			idx.getMatching("hello").length.should.equal(1);
			idx.getMatching("hello")[0].should.equal(doc1);
			idx.getMatching("world").length.should.equal(1);
			idx.getMatching("world")[0].should.equal(doc2);
			idx.getMatching("bloup").length.should.equal(1);
			idx.getMatching("bloup")[0].should.equal(doc3);
		});
	}); // ==== End of 'Update' ==== //

	describe("Get matching documents", () => {
		it("Get all documents where fieldName is equal to the given value, or an empty array if no match", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			const doc4 = { a: 23, tf: "world" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);
			idx.insert(doc4);

			assert.deepEqual(idx.getMatching("bloup"), [doc3]);
			assert.deepEqual(idx.getMatching("world"), [doc2, doc4]);
			assert.deepEqual(idx.getMatching("nope"), []);
		});

		it("Can get all documents for a given key in a unique index", () => {
			const idx = new Index<any, any>({ fieldName: "tf", unique: true });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);

			assert.deepEqual(idx.getMatching("bloup"), [doc3]);
			assert.deepEqual(idx.getMatching("world"), [doc2]);
			assert.deepEqual(idx.getMatching("nope"), []);
		});

		it("Can get all documents for which a field is undefined", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 2, nottf: "bloup" };
			const doc3 = { a: 8, tf: "world" };
			const doc4 = { a: 7, nottf: "yes" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);

			assert.deepEqual(idx.getMatching("bloup"), []);
			assert.deepEqual(idx.getMatching("hello"), [doc1]);
			assert.deepEqual(idx.getMatching("world"), [doc3]);
			assert.deepEqual(idx.getMatching("yes"), []);
			assert.deepEqual(idx.getMatching(undefined), [doc2]);

			idx.insert(doc4);

			assert.deepEqual(idx.getMatching("bloup"), []);
			assert.deepEqual(idx.getMatching("hello"), [doc1]);
			assert.deepEqual(idx.getMatching("world"), [doc3]);
			assert.deepEqual(idx.getMatching("yes"), []);
			assert.deepEqual(idx.getMatching(undefined), [doc2, doc4]);
		});

		it("Can get all documents for which a field is null", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 2, tf: null };
			const doc3 = { a: 8, tf: "world" };
			const doc4 = { a: 7, tf: null };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);

			assert.deepEqual(idx.getMatching("bloup"), []);
			assert.deepEqual(idx.getMatching("hello"), [doc1]);
			assert.deepEqual(idx.getMatching("world"), [doc3]);
			assert.deepEqual(idx.getMatching("yes"), []);
			assert.deepEqual(idx.getMatching(null), [doc2]);

			idx.insert(doc4);

			assert.deepEqual(idx.getMatching("bloup"), []);
			assert.deepEqual(idx.getMatching("hello"), [doc1]);
			assert.deepEqual(idx.getMatching("world"), [doc3]);
			assert.deepEqual(idx.getMatching("yes"), []);
			assert.deepEqual(idx.getMatching(null), [doc2, doc4]);
		});

		it("Can get all documents for a given key in a sparse index, but not unindexed docs (= field undefined)", () => {
			const idx = new Index<any, any>({ fieldName: "tf", sparse: true });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 2, nottf: "bloup" };
			const doc3 = { a: 8, tf: "world" };
			const doc4 = { a: 7, nottf: "yes" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);
			idx.insert(doc4);

			assert.deepEqual(idx.getMatching("bloup"), []);
			assert.deepEqual(idx.getMatching("hello"), [doc1]);
			assert.deepEqual(idx.getMatching("world"), [doc3]);
			assert.deepEqual(idx.getMatching("yes"), []);
			assert.deepEqual(idx.getMatching(undefined), []);
		});

		it("Can get all documents whose key is in an array of keys", () => {
			// For this test only we have to use objects with _ids as the array version of getMatching
			// relies on the _id property being set, otherwise we have to use a quadratic algorithm
			// or a fingerprinting algorithm, both solutions too complicated and slow given that live nedb
			// indexes documents with _id always set
			const idx = new Index<any, any>({ fieldName: "tf" });

			const doc1 = { a: 5, tf: "hello", _id: "1" };
			const doc2 = { a: 2, tf: "bloup", _id: "2" };
			const doc3 = { a: 8, tf: "world", _id: "3" };
			const doc4 = { a: 7, tf: "yes", _id: "4" };
			const doc5 = { a: 7, tf: "yes", _id: "5" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);
			idx.insert(doc4);
			idx.insert(doc5);

			assert.deepEqual(idx.getMatching([]), []);
			assert.deepEqual(idx.getMatching(["bloup"]), [doc2]);
			assert.deepEqual(idx.getMatching(["bloup", "yes"]), [
				doc2,
				doc4,
				doc5,
			]);
			assert.deepEqual(idx.getMatching(["hello", "no"]), [doc1]);
			assert.deepEqual(idx.getMatching(["nope", "no"]), []);
		});

		it("Can get all documents whose key is between certain bounds", () => {
			const idx = new Index<any, any>({ fieldName: "a" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 2, tf: "bloup" };
			const doc3 = { a: 8, tf: "world" };
			const doc4 = { a: 7, tf: "yes" };
			const doc5 = { a: 10, tf: "yes" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);
			idx.insert(doc4);
			idx.insert(doc5);

			assert.deepEqual(idx.getBetweenBounds({ $lt: 10, $gte: 5 }), [
				doc1,
				doc4,
				doc3,
			]);
			assert.deepEqual(idx.getBetweenBounds({ $lte: 8 }), [
				doc2,
				doc1,
				doc4,
				doc3,
			]);
			assert.deepEqual(idx.getBetweenBounds({ $gt: 7 }), [doc3, doc5]);
		});
	}); // ==== End of 'Get matching documents' ==== //

	describe("Resetting", () => {
		it("Can reset an index without any new data, the index will be empty afterwards", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);

			idx.tree.getNumberOfKeys().should.equal(3);
			idx.getMatching("hello").length.should.equal(1);
			idx.getMatching("world").length.should.equal(1);
			idx.getMatching("bloup").length.should.equal(1);

			idx.reset();
			idx.tree.getNumberOfKeys().should.equal(0);
			idx.getMatching("hello").length.should.equal(0);
			idx.getMatching("world").length.should.equal(0);
			idx.getMatching("bloup").length.should.equal(0);
		});

		it("Can reset an index and initialize it with one document", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };
			const newDoc = { a: 555, tf: "new" };
			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);

			idx.tree.getNumberOfKeys().should.equal(3);
			idx.getMatching("hello").length.should.equal(1);
			idx.getMatching("world").length.should.equal(1);
			idx.getMatching("bloup").length.should.equal(1);

			idx.reset();
			idx.insert(newDoc);
			idx.tree.getNumberOfKeys().should.equal(1);
			idx.getMatching("hello").length.should.equal(0);
			idx.getMatching("world").length.should.equal(0);
			idx.getMatching("bloup").length.should.equal(0);
			idx.getMatching("new")[0].a.should.equal(555);
		});

		it("Can reset an index and initialize it with an array of documents", () => {
			const idx = new Index<any, any>({ fieldName: "tf" });
			const doc1 = { a: 5, tf: "hello" };
			const doc2 = { a: 8, tf: "world" };
			const doc3 = { a: 2, tf: "bloup" };

			const newDocs = [
				{ a: 555, tf: "new" },
				{ a: 666, tf: "again" },
			];

			idx.insert(doc1);
			idx.insert(doc2);
			idx.insert(doc3);

			idx.tree.getNumberOfKeys().should.equal(3);
			idx.getMatching("hello").length.should.equal(1);
			idx.getMatching("world").length.should.equal(1);
			idx.getMatching("bloup").length.should.equal(1);

			idx.reset();
			idx.insert(newDocs);
			idx.tree.getNumberOfKeys().should.equal(2);
			idx.getMatching("hello").length.should.equal(0);
			idx.getMatching("world").length.should.equal(0);
			idx.getMatching("bloup").length.should.equal(0);
			idx.getMatching("new")[0].a.should.equal(555);
			idx.getMatching("again")[0].a.should.equal(666);
		});
	}); // ==== End of 'Resetting' ==== //

	it("Get all elements in the index", () => {
		const idx = new Index<any, any>({ fieldName: "a" });
		const doc1 = { a: 5, tf: "hello" };
		const doc2 = { a: 8, tf: "world" };
		const doc3 = { a: 2, tf: "bloup" };
		idx.insert(doc1);
		idx.insert(doc2);
		idx.insert(doc3);

		assert.deepEqual(idx.getAll(), [
			{ a: 2, tf: "bloup" },
			{ a: 5, tf: "hello" },
			{ a: 8, tf: "world" },
		]);
	});
});