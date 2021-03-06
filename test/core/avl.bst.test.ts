import { BST, customUtils } from "../../src/core";
import { assert, should } from "chai";
import * as _ from "underscore";
should();

describe("Binary search tree", () => {
	it("Upon creation, left, right are null, key and data can be set", () => {
		{
			let bst = new BST();
			assert.isUndefined(bst.left);
			assert.isUndefined(bst.right);
			bst.hasOwnProperty("key").should.equal(false);
			bst.data.length.should.equal(0);
		}

		{
			let bst = new BST({ key: 6, value: "ggg" });
			assert.isUndefined(bst.left);
			assert.isUndefined(bst.right);
			bst.key!.should.equal(6);
			bst.data.length.should.equal(1);
			bst.data[0].should.equal("ggg");
		}
	});

	describe("Sanity checks", () => {
		it("Can get maxkey and minkey descendants", () => {
			const t = new BST({ key: 10 });
			const l = new BST({ key: 5 });
			const r = new BST({ key: 15 });
			const ll = new BST({ key: 3 });
			const lr = new BST({ key: 8 });
			const rl = new BST({ key: 11 });
			const rr = new BST({ key: 42 });
			t.left = l;
			t.right = r;
			l.left = ll;
			l.right = lr;
			r.left = rl;
			r.right = rr;

			// Getting min and max key descendants
			t.getMinKeyDescendant().key!.should.equal(3);
			t.getMaxKeyDescendant().key!.should.equal(42);

			t.left.getMinKeyDescendant().key!.should.equal(3);
			t.left.getMaxKeyDescendant().key!.should.equal(8);

			t.right.getMinKeyDescendant().key!.should.equal(11);
			t.right.getMaxKeyDescendant().key!.should.equal(42);

			t.right.left!.getMinKeyDescendant().key!.should.equal(11);
			t.right.left!.getMaxKeyDescendant().key!.should.equal(11);

			// Getting min and max keys
			t.getMinKey()!.should.equal(3);
			t.getMaxKey()!.should.equal(42);

			t.left.getMinKey()!.should.equal(3);
			t.left.getMaxKey()!.should.equal(8);

			t.right.getMinKey()!.should.equal(11);
			t.right.getMaxKey()!.should.equal(42);

			t.right.left!.getMinKey()!.should.equal(11);
			t.right.left!.getMaxKey()!.should.equal(11);
		});

		it("Can check a condition against every node in a tree", () => {
			const t = new BST({ key: 10 });
			const l = new BST({ key: 6 });
			const r = new BST({ key: 16 });
			const ll = new BST({ key: 4 });
			const lr = new BST({ key: 8 });
			const rl = new BST({ key: 12 });
			const rr = new BST({ key: 42 });
			t.left = l;
			t.right = r;
			l.left = ll;
			l.right = lr;
			r.left = rl;
			r.right = rr;

			function test(k?: number) {
				if (k && k % 2 !== 0) {
					throw "Key is not even";
				}
			}

			t.forEach(test);

			[l, r, ll, lr, rl, rr].forEach((node) => {
				node.key! += 1;
				(() => {
					t.forEach(test);
				}).should.throw();
				node.key! -= 1;
			});

			t.forEach(test);
		});

		it("Can check that a tree verifies node ordering", () => {
			const t = new BST({ key: 10 });
			const l = new BST({ key: 5 });
			const r = new BST({ key: 15 });
			const ll = new BST({ key: 3 });
			const lr = new BST({ key: 8 });
			const rl = new BST({ key: 11 });
			const rr = new BST({ key: 42 });
			t.left = l;
			t.right = r;
			l.left = ll;
			l.right = lr;
			r.left = rl;
			r.right = rr;

			t.checkNodeOrdering();

			// Let's be paranoid and check all cases...
			l.key = 12;
			(() => {
				t.checkNodeOrdering();
			}).should.throw();
			l.key = 5;

			r.key = 9;
			(() => {
				t.checkNodeOrdering();
			}).should.throw();
			r.key = 15;

			ll.key = 6;
			(() => {
				t.checkNodeOrdering();
			}).should.throw();
			ll.key = 11;
			(() => {
				t.checkNodeOrdering();
			}).should.throw();
			ll.key = 3;

			lr.key = 4;
			(() => {
				t.checkNodeOrdering();
			}).should.throw();
			lr.key = 11;
			(() => {
				t.checkNodeOrdering();
			}).should.throw();
			lr.key = 8;

			rl.key = 16;
			(() => {
				t.checkNodeOrdering();
			}).should.throw();
			rl.key = 9;
			(() => {
				t.checkNodeOrdering();
			}).should.throw();
			rl.key = 11;

			rr.key = 12;
			(() => {
				t.checkNodeOrdering();
			}).should.throw();
			rr.key = 7;
			(() => {
				t.checkNodeOrdering();
			}).should.throw();
			rr.key = 10.5;
			(() => {
				t.checkNodeOrdering();
			}).should.throw();
			rr.key = 42;

			t.checkNodeOrdering();
		});

		it("Checking if a tree's internal pointers (i.e. parents) are correct", () => {
			const t = new BST({ key: 10 });
			const l = new BST({ key: 5 });
			const r = new BST({ key: 15 });
			const ll = new BST({ key: 3 });
			const lr = new BST({ key: 8 });
			const rl = new BST({ key: 11 });
			const rr = new BST({ key: 42 });
			t.left = l;
			t.right = r;
			l.left = ll;
			l.right = lr;
			r.left = rl;
			r.right = rr;

			(() => {
				t.checkInternalPointers();
			}).should.throw();
			l.parent = t;
			(() => {
				t.checkInternalPointers();
			}).should.throw();
			r.parent = t;
			(() => {
				t.checkInternalPointers();
			}).should.throw();
			ll.parent = l;
			(() => {
				t.checkInternalPointers();
			}).should.throw();
			lr.parent = l;
			(() => {
				t.checkInternalPointers();
			}).should.throw();
			rl.parent = r;
			(() => {
				t.checkInternalPointers();
			}).should.throw();
			rr.parent = r;

			t.checkInternalPointers();
		});

		it("Can get the number of inserted keys", () => {
			const bst: any = new BST();

			bst.getNumberOfKeys().should.equal(0);
			bst.insert(10);
			bst.getNumberOfKeys().should.equal(1);
			bst.insert(5);
			bst.getNumberOfKeys().should.equal(2);
			bst.insert(3);
			bst.getNumberOfKeys().should.equal(3);
			bst.insert(8);
			bst.getNumberOfKeys().should.equal(4);
			bst.insert(15);
			bst.getNumberOfKeys().should.equal(5);
			bst.insert(12);
			bst.getNumberOfKeys().should.equal(6);
			bst.insert(37);
			bst.getNumberOfKeys().should.equal(7);
		});
	});

	describe("Insertion", () => {
		it("Insert at the root if its the first insertion", () => {
			const bst: any = new BST();

			bst.insert(10, "some data");

			bst.checkIsBST();
			(bst as any).key.should.equal(10);
			_.isEqual(bst.data, ["some data"]).should.equal(true);
			assert.isUndefined(bst.left);
			assert.isUndefined(bst.right);
		});

		it("Insert on the left if key is less than the root's", () => {
			const bst: any = new BST();

			bst.insert(10, "some data");
			bst.insert(7, "some other data");

			bst.checkIsBST();
			assert.isUndefined(bst.right);
			(bst as any).left.key!.should.equal(7);
			_.isEqual((bst as any).left.data, ["some other data"]).should.equal(
				true
			);
			assert.isUndefined((bst as any).left.left);
			assert.isUndefined((bst as any).left.right);
		});

		it("Insert on the right if key is greater than the root's", () => {
			const bst: any = new BST();

			bst.insert(10, "some data");
			bst.insert(14, "some other data");

			bst.checkIsBST();
			assert.isUndefined(bst.left);
			(bst as any).right.key!.should.equal(14);
			_.isEqual((bst as any).right.data, [
				"some other data",
			]).should.equal(true);
			assert.isUndefined((bst as any).right.left);
			assert.isUndefined((bst as any).right.right);
		});

		it("Recursive insertion on the left works", () => {
			const bst: any = new BST();

			bst.insert(10, "some data");
			bst.insert(7, "some other data");
			bst.insert(1, "hello");
			bst.insert(9, "world");

			bst.checkIsBST();
			assert.isUndefined(bst.right);
			(bst as any).left.key!.should.equal(7);
			_.isEqual((bst as any).left.data, ["some other data"]).should.equal(
				true
			);

			(bst as any).left.left.key!.should.equal(1);
			_.isEqual((bst as any).left.left.data, ["hello"]).should.equal(
				true
			);

			(bst as any).left.right.key!.should.equal(9);
			_.isEqual((bst as any).left.right.data, ["world"]).should.equal(
				true
			);
		});

		it("Recursive insertion on the right works", () => {
			const bst: any = new BST();

			bst.insert(10, "some data");
			bst.insert(17, "some other data");
			bst.insert(11, "hello");
			bst.insert(19, "world");

			bst.checkIsBST();
			assert.isUndefined(bst.left);
			(bst as any).right.key!.should.equal(17);
			_.isEqual((bst as any).right.data, [
				"some other data",
			]).should.equal(true);

			(bst as any).right.left.key!.should.equal(11);
			_.isEqual((bst as any).right.left.data, ["hello"]).should.equal(
				true
			);

			(bst as any).right.right.key!.should.equal(19);
			_.isEqual((bst as any).right.right.data, ["world"]).should.equal(
				true
			);
		});

		it("If uniqueness constraint not enforced, we can insert different data for same key", () => {
			const bst: any = new BST();

			bst.insert(10, "some data");
			bst.insert(3, "hello");
			bst.insert(3, "world");

			bst.checkIsBST();
			(bst as any).left.key!.should.equal(3);
			_.isEqual((bst as any).left.data, ["hello", "world"]).should.equal(
				true
			);

			(bst as any).insert(12, "a");
			(bst as any).insert(12, "b");

			(bst as any).checkIsBST();
			(bst as any).right.key!.should.equal(12);
			_.isEqual((bst as any).right.data, ["a", "b"]).should.equal(true);
		});

		it("If uniqueness constraint is enforced, we cannot insert different data for same key", () => {
			const bst = new BST<number, string>({ unique: true });

			bst.insert(10, "some data");
			bst.insert(3, "hello");
			try {
				bst.insert(3, "world");
			} catch (e) {
				e.errorType.should.equal("uniqueViolated");
				e.key!.should.equal(3);
			}

			bst.checkIsBST();
			(bst as any).left.key!.should.equal(3);
			_.isEqual((bst as any).left.data, ["hello"]).should.equal(true);

			(bst as any).insert(12, "a");
			try {
				(bst as any).insert(12, "world");
			} catch (e) {
				e.errorType.should.equal("uniqueViolated");
				e.key!.should.equal(12);
			}

			(bst as any).checkIsBST();
			(bst as any).right.key!.should.equal(12);
			_.isEqual((bst as any).right.data, ["a"]).should.equal(true);
		});

		it("Can insert 0 or the empty string", () => {
			let bst = new BST<number, string>();

			bst.insert(0, "some data");

			bst.checkIsBST();
			bst.key!.should.equal(0);
			_.isEqual(bst.data, ["some data"]).should.equal(true);
			assert.isUndefined(bst.left);
			assert.isUndefined(bst.right);
			{
				let bst = new BST<string, string>();

				bst.insert("", "some other data");

				bst.checkIsBST();
				bst.key!.should.equal("");
				_.isEqual(bst.data, ["some other data"]).should.equal(true);
				assert.isUndefined(bst.left);
				assert.isUndefined(bst.right);
			}
		});

		it("Can insert a lot of keys and still get a BST (sanity check)", () => {
			const bst = new BST({ unique: true });

			customUtils.getRandomArray(100).forEach((n) => {
				bst.insert(n, "some data");
			});

			bst.checkIsBST();
		});

		it("All children get a pointer to their parent, the root doesnt", () => {
			const bst = new BST<number, string>();

			bst.insert(10, "root");
			bst.insert(5, "yes");
			bst.insert(15, "no");

			bst.checkIsBST();

			assert.isUndefined(bst.parent);
			bst.left!.parent!.should.equal(bst);
			bst.right!.parent!.should.equal(bst);
		});
	}); // ==== End of 'Insertion' ==== //

	describe("Search", () => {
		it("Can find data in a BST", () => {
			const bst: any = new BST();
			let i;

			customUtils.getRandomArray(100).forEach((n) => {
				bst.insert(n, `some data for ${n}`);
			});

			bst.checkIsBST();

			for (i = 0; i < 100; i += 1) {
				_.isEqual(bst.search(i), [`some data for ${i}`]).should.equal(
					true
				);
			}
		});

		it("If no data can be found, return an empty array", () => {
			const bst: any = new BST();

			customUtils.getRandomArray(100).forEach((n) => {
				if (n !== 63) {
					bst.insert(n, `some data for ${n}`);
				}
			});

			bst.checkIsBST();

			bst.search(-2).length.should.equal(0);
			bst.search(100).length.should.equal(0);
			bst.search(101).length.should.equal(0);
			bst.search(63).length.should.equal(0);
		});

		it("Can find ascending ordered data in a BST", () => {
			var bst = new BST<number, any>();
			customUtils.getRandomArray(100).forEach(function (n) {
				bst.insert(n, { key: n, value: "some data for " + n });
			});

			bst.checkIsBST();

			var key = bst.getMinKey();
			key!.should.equal(0);
			for (let i = 1; i <= 100; i += 1) {
				var next = bst.searchAfter(key!);
				if (i == 100) next.should.deep.equal([]);
				else {
					next.length.should.equal(1);
					let x = next[0];
					x.key.should.equal(i);
					x.key.should.above(key);
					key = x.key;
				}
			}
		});

		it("Can find descending ordered data in a BST", () => {
			const bst = new BST<number, any>();
			let i;

			customUtils.getRandomArray(100).forEach((n) => {
				bst.insert(n, { key: n, value: `some data for ${n}` });
			});

			bst.checkIsBST();

			let key = bst.getMaxKey();
			key!.should.equal(99);
			for (i = 1; i <= 100; i += 1) {
				let next: any = bst.searchBefore(key as any);
				if (i == 100) next.should.deep.equal([]);
				else {
					next.length.should.equal(1);
					next = next[0];
					next.key!.should.equal(99 - i);
					next.key!.should.below(key);
					key = next.key;
				}
			}
		});

		it("Can find nearest key in a BST", () => {
			const bst: any = new BST();
			[10, 5, 15, 3, 8, 13, 18].forEach((k) => {
				bst.insert(k, `data ${k}`);
			});

			bst.checkIsBST();

			let search: any = bst.searchNearest(6);
			assert.deepEqual(search[0], "data 5");

			search = bst.searchNearest(20);
			assert.deepEqual(search[0], "data 18");

			search = bst.searchNearest(-50);
			assert.deepEqual(search[0], "data 3");
		});

		it("Can find nearest key greater than search key in a BST", () => {
			const bst: any = new BST();
			[10, 5, 15, 3, 8, 13, 18, 100].forEach((k) => {
				bst.insert(k, `data ${k}`);
			});

			bst.checkIsBST();

			let search: any = bst.searchNearestGte(19);
			assert.deepEqual(search[0], "data 100");

			search = bst.searchNearestGte(101);
			assert.isUndefined(search);

			search = bst.searchNearestGte(7);
			assert.deepEqual(search[0], "data 8");

			search = bst.searchNearestGte(6);
			assert.deepEqual(search[0], "data 8");

			search = bst.searchNearestGte(-10);
			assert.deepEqual(search[0], "data 3");
		});

		it("Can find nearest key less than search key in a BST", () => {
			const bst: any = new BST();
			[10, 5, 15, 3, 8, 13, 18, 100].forEach((k) => {
				bst.insert(k, `data ${k}`);
			});

			bst.checkIsBST();

			let search: any = bst.searchNearestLte(99);
			assert.deepEqual(search[0], "data 18");

			search = bst.searchNearestLte(0);
			assert.isUndefined(search);

			search = bst.searchNearestLte(7);
			assert.deepEqual(search[0], "data 5");

			search = bst.searchNearestLte(6);
			assert.deepEqual(search[0], "data 5");

			search = bst.searchNearestLte(100000);
			assert.deepEqual(search[0], "data 100");
		});

		it("Can find nearest key with two equal keys in BST", () => {
			const bst: any = new BST();
			[10, 5, 15, 3, 8, 8, 13, 18, 100].forEach((k) => {
				bst.insert(k, `data ${k}`);
			});

			bst.checkIsBST();

			const search = bst.searchNearestLte(8);
			assert.deepEqual(search, ["data 8", "data 8"]);
		});

		it("Can search for data between two bounds", () => {
			const bst: any = new BST();

			[10, 5, 15, 3, 8, 13, 18].forEach((k) => {
				bst.insert(k, `data ${k}`);
			});

			assert.deepEqual(bst.betweenBounds({ $gte: 8, $lte: 15 }), [
				"data 8",
				"data 10",
				"data 13",
				"data 15",
			]);
			assert.deepEqual(bst.betweenBounds({ $gt: 8, $lt: 15 }), [
				"data 10",
				"data 13",
			]);
		});

		it("Bounded search can handle cases where query contains both $lt and $lte, or both $gt and $gte", () => {
			const bst: any = new BST();

			[10, 5, 15, 3, 8, 13, 18].forEach((k) => {
				bst.insert(k, `data ${k}`);
			});

			assert.deepEqual(bst.betweenBounds({ $gt: 8, $gte: 8, $lte: 15 }), [
				"data 10",
				"data 13",
				"data 15",
			]);
			assert.deepEqual(bst.betweenBounds({ $gt: 5, $gte: 8, $lte: 15 }), [
				"data 8",
				"data 10",
				"data 13",
				"data 15",
			]);
			assert.deepEqual(bst.betweenBounds({ $gt: 8, $gte: 5, $lte: 15 }), [
				"data 10",
				"data 13",
				"data 15",
			]);

			assert.deepEqual(
				bst.betweenBounds({ $gte: 8, $lte: 15, $lt: 15 }),
				["data 8", "data 10", "data 13"]
			);
			assert.deepEqual(
				bst.betweenBounds({ $gte: 8, $lte: 18, $lt: 15 }),
				["data 8", "data 10", "data 13"]
			);
			assert.deepEqual(
				bst.betweenBounds({ $gte: 8, $lte: 15, $lt: 18 }),
				["data 8", "data 10", "data 13", "data 15"]
			);
		});

		it("Bounded search can work when one or both boundaries are missing", () => {
			const bst: any = new BST();

			[10, 5, 15, 3, 8, 13, 18].forEach((k) => {
				bst.insert(k, `data ${k}`);
			});

			assert.deepEqual(bst.betweenBounds({ $gte: 11 }), [
				"data 13",
				"data 15",
				"data 18",
			]);
			assert.deepEqual(bst.betweenBounds({ $lte: 9 }), [
				"data 3",
				"data 5",
				"data 8",
			]);
		});
	}); /// ==== End of 'Search' ==== //

	describe("Deletion", () => {
		it("Deletion does nothing on an empty tree", () => {
			const bst: any = new BST();
			const bstu = new BST({ unique: true });

			bst.getNumberOfKeys().should.equal(0);
			bstu.getNumberOfKeys().should.equal(0);

			bst.delete(5);
			bstu.delete(5);

			bst.hasOwnProperty("key").should.equal(false);
			bstu.hasOwnProperty("key").should.equal(false);

			bst.data.length.should.equal(0);
			bstu.data.length.should.equal(0);

			bst.getNumberOfKeys().should.equal(0);
			bstu.getNumberOfKeys().should.equal(0);
		});

		it("Deleting a non-existent key doesnt have any effect", () => {
			const bst: any = new BST();

			[10, 5, 3, 8, 15, 12, 37].forEach((k) => {
				bst.insert(k, `some ${k}`);
			});

			function checkBst() {
				[10, 5, 3, 8, 15, 12, 37].forEach((k) => {
					_.isEqual(bst.search(k), [`some ${k}`]).should.equal(true);
				});
			}

			checkBst();
			bst.getNumberOfKeys().should.equal(7);

			bst.delete(2);
			checkBst();
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(7);
			bst.delete(4);
			checkBst();
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(7);
			bst.delete(9);
			checkBst();
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(7);
			bst.delete(6);
			checkBst();
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(7);
			bst.delete(11);
			checkBst();
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(7);
			bst.delete(14);
			checkBst();
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(7);
			bst.delete(20);
			checkBst();
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(7);
			bst.delete(200);
			checkBst();
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(7);
		});

		it("Able to delete the root if it is also a leaf", () => {
			const bst: any = new BST();

			bst.insert(10, "hello");
			bst.key!.should.equal(10);
			_.isEqual(bst.data, ["hello"]).should.equal(true);
			bst.getNumberOfKeys().should.equal(1);

			bst.delete(10);
			bst.hasOwnProperty("key").should.equal(false);
			bst.data.length.should.equal(0);
			bst.getNumberOfKeys().should.equal(0);
		});

		it("Able to delete leaf nodes that are non-root", () => {
			let bst: any;

			function recreateBst() {
				bst = new BST();

				// With this insertion order the tree is well balanced
				// So we know the leaves are 3, 8, 12, 37
				[10, 5, 3, 8, 15, 12, 37].forEach((k) => {
					bst.insert(k, `some ${k}`);
				});

				bst.getNumberOfKeys().should.equal(7);
			}

			function checkOnlyOneWasRemoved(theRemoved: number) {
				[10, 5, 3, 8, 15, 12, 37].forEach((k) => {
					if (k === theRemoved) {
						bst.search(k).length.should.equal(0);
					} else {
						_.isEqual(bst.search(k), [`some ${k}`]).should.equal(
							true
						);
					}
				});

				bst.getNumberOfKeys().should.equal(6);
			}

			recreateBst();
			bst.delete(3);
			bst.checkIsBST();
			checkOnlyOneWasRemoved(3);
			assert.isUndefined(bst.left.left);

			recreateBst();
			bst.delete(8);
			bst.checkIsBST();
			checkOnlyOneWasRemoved(8);
			assert.isUndefined(bst.left.right);

			recreateBst();
			bst.delete(12);
			bst.checkIsBST();
			checkOnlyOneWasRemoved(12);
			assert.isUndefined(bst.right.left);

			recreateBst();
			bst.delete(37);
			bst.checkIsBST();
			checkOnlyOneWasRemoved(37);
			assert.isUndefined(bst.right.right);
		});

		it("Able to delete the root if it has only one child", () => {
			let bst: any;

			// Root has only one child, on the left
			bst = new BST();
			[10, 5, 3, 6].forEach((k) => {
				bst.insert(k, `some ${k}`);
			});
			bst.getNumberOfKeys().should.equal(4);
			bst.delete(10);
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(3);
			[5, 3, 6].forEach((k) => {
				_.isEqual(bst.search(k), [`some ${k}`]).should.equal(true);
			});
			bst.search(10).length.should.equal(0);

			// Root has only one child, on the right
			bst = new BST();
			[10, 15, 13, 16].forEach((k) => {
				bst.insert(k, `some ${k}`);
			});
			bst.getNumberOfKeys().should.equal(4);
			bst.delete(10);
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(3);
			[15, 13, 16].forEach((k) => {
				_.isEqual(bst.search(k), [`some ${k}`]).should.equal(true);
			});
			bst.search(10).length.should.equal(0);
		});

		it("Able to delete non root nodes that have only one child", () => {
			let bst: any;

			function recreateBst() {
				bst = new BST();

				[10, 5, 15, 3, 1, 4, 20, 17, 25].forEach((k) => {
					bst.insert(k, `some ${k}`);
				});

				bst.getNumberOfKeys().should.equal(9);
			}

			function checkOnlyOneWasRemoved(theRemoved: any) {
				[10, 5, 15, 3, 1, 4, 20, 17, 25].forEach((k) => {
					if (k === theRemoved) {
						bst.search(k).length.should.equal(0);
					} else {
						_.isEqual(bst.search(k), [`some ${k}`]).should.equal(
							true
						);
					}
				});

				bst.getNumberOfKeys().should.equal(8);
			}

			recreateBst();
			bst.delete(5);
			bst.checkIsBST();
			checkOnlyOneWasRemoved(5);

			recreateBst();
			bst.delete(15);
			bst.checkIsBST();
			checkOnlyOneWasRemoved(15);
		});

		it("Can delete the root if it has 2 children", () => {
			let bst: any;

			bst = new BST();
			[10, 5, 3, 8, 15, 12, 37].forEach((k) => {
				bst.insert(k, `some ${k}`);
			});
			bst.getNumberOfKeys().should.equal(7);
			bst.delete(10);
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(6);
			[5, 3, 8, 15, 12, 37].forEach((k) => {
				_.isEqual(bst.search(k), [`some ${k}`]).should.equal(true);
			});
			bst.search(10).length.should.equal(0);
		});

		it("Can delete a non-root node that has two children", () => {
			let bst: any;

			bst = new BST();
			[10, 5, 3, 1, 4, 8, 6, 9, 15, 12, 11, 13, 20, 19, 42].forEach(
				(k) => {
					bst.insert(k, `some ${k}`);
				}
			);
			bst.getNumberOfKeys().should.equal(15);
			bst.delete(5);
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(14);
			[10, 3, 1, 4, 8, 6, 9, 15, 12, 11, 13, 20, 19, 42].forEach((k) => {
				_.isEqual(bst.search(k), [`some ${k}`]).should.equal(true);
			});
			bst.search(5).length.should.equal(0);

			bst = new BST();
			[10, 5, 3, 1, 4, 8, 6, 9, 15, 12, 11, 13, 20, 19, 42].forEach(
				(k) => {
					bst.insert(k, `some ${k}`);
				}
			);
			bst.getNumberOfKeys().should.equal(15);
			bst.delete(15);
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(14);
			[10, 5, 3, 1, 4, 8, 6, 9, 12, 11, 13, 20, 19, 42].forEach((k) => {
				_.isEqual(bst.search(k), [`some ${k}`]).should.equal(true);
			});
			bst.search(15).length.should.equal(0);
		});

		it("If no value is provided, it will delete the entire node even if there are multiple pieces of data", () => {
			const bst: any = new BST();

			bst.insert(10, "yes");
			bst.insert(5, "hello");
			bst.insert(3, "yes");
			bst.insert(5, "world");
			bst.insert(8, "yes");

			assert.deepEqual(bst.search(5), ["hello", "world"]);
			bst.getNumberOfKeys().should.equal(4);

			bst.delete(5);
			bst.search(5).length.should.equal(0);
			bst.getNumberOfKeys().should.equal(3);
		});

		it("Can remove only one value from an array", () => {
			const bst: any = new BST();

			bst.insert(10, "yes");
			bst.insert(5, "hello");
			bst.insert(3, "yes");
			bst.insert(5, "world");
			bst.insert(8, "yes");

			assert.deepEqual(bst.search(5), ["hello", "world"]);
			bst.getNumberOfKeys().should.equal(4);

			bst.delete(5, "hello");
			assert.deepEqual(bst.search(5), ["world"]);
			bst.getNumberOfKeys().should.equal(4);
		});

		it("Removes nothing if value doesnt match", () => {
			const bst: any = new BST();

			bst.insert(10, "yes");
			bst.insert(5, "hello");
			bst.insert(3, "yes");
			bst.insert(5, "world");
			bst.insert(8, "yes");

			assert.deepEqual(bst.search(5), ["hello", "world"]);
			bst.getNumberOfKeys().should.equal(4);

			bst.delete(5, "nope");
			assert.deepEqual(bst.search(5), ["hello", "world"]);
			bst.getNumberOfKeys().should.equal(4);
		});

		it("If value provided but node contains only one value, remove entire node", () => {
			const bst: any = new BST();

			bst.insert(10, "yes");
			bst.insert(5, "hello");
			bst.insert(3, "yes2");
			bst.insert(5, "world");
			bst.insert(8, "yes3");

			assert.deepEqual(bst.search(3), ["yes2"]);
			bst.getNumberOfKeys().should.equal(4);

			bst.delete(3, "yes2");
			bst.search(3).length.should.equal(0);
			bst.getNumberOfKeys().should.equal(3);
		});

		it("Can remove the root from a tree with height 2 when the root has two children (special case)", () => {
			const bst: any = new BST();

			bst.insert(10, "maybe");
			bst.insert(5, "no");
			bst.insert(15, "yes");
			bst.getNumberOfKeys().should.equal(3);

			bst.delete(10);
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(2);
			assert.deepEqual(bst.search(5), ["no"]);
			assert.deepEqual(bst.search(15), ["yes"]);
		});

		it("Can remove the root from a tree with height 3 when the root has two children (special case where the two children themselves have children)", () => {
			const bst: any = new BST();

			bst.insert(10, "maybe");
			bst.insert(5, "no");
			bst.insert(15, "yes");
			bst.insert(2, "no");
			bst.insert(35, "yes");
			bst.getNumberOfKeys().should.equal(5);

			bst.delete(10);
			bst.checkIsBST();
			bst.getNumberOfKeys().should.equal(4);
			assert.deepEqual(bst.search(5), ["no"]);
			assert.deepEqual(bst.search(15), ["yes"]);
		});
	}); // ==== End of 'Deletion' ==== //

	it("Can use undefined as key but not value", () => {
		function compareKeys<NSD>(a: NSD, b: NSD) {
			if (a === undefined && b === undefined) {
				return 0;
			}
			if (a === undefined) {
				return -1;
			}
			if (b === undefined) {
				return 1;
			}

			if (a < b) {
				return -1;
			}
			if (a > b) {
				return 1;
			}
			if (a === b) {
				return 0;
			}
			return 0;
		}

		const bst = new BST({ compareKeys });

		bst.insert(2);
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(1);
		assert.deepEqual(bst.search(2), []);
		assert.deepEqual(bst.search(undefined), []);

		bst.insert(undefined, "hello");
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(2);
		assert.deepEqual(bst.search(2), []);
		assert.deepEqual(bst.search(undefined), ["hello"]);

		bst.insert(undefined, "world");
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(2);
		assert.deepEqual(bst.search(2), []);
		assert.deepEqual(bst.search(undefined), ["hello", "world"]);

		bst.insert(4);
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(3);
		assert.deepEqual(bst.search(2), []);
		assert.deepEqual(bst.search(4), []);
		assert.deepEqual(bst.search(undefined), ["hello", "world"]);

		bst.delete(undefined, "hello");
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(3);
		assert.deepEqual(bst.search(2), []);
		assert.deepEqual(bst.search(4), []);
		assert.deepEqual(bst.search(undefined), ["world"]);

		bst.delete(undefined);
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(2);
		assert.deepEqual(bst.search(2), []);
		assert.deepEqual(bst.search(4), []);
		assert.deepEqual(bst.search(undefined), []);

		bst.delete(2, undefined);
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(1);
		assert.deepEqual(bst.search(2), []);
		assert.deepEqual(bst.search(4), []);
		assert.deepEqual(bst.search(undefined), []);

		bst.delete(4);
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(0);
		assert.deepEqual(bst.search(2), []);
		assert.deepEqual(bst.search(4), []);
		assert.deepEqual(bst.search(undefined), []);
	});

	it("Can use null as key and value", () => {
		function compareKeys<T>(a: T, b: T) {
			if (a === null && b === null) {
				return 0;
			}
			if (a === null) {
				return -1;
			}
			if (b === null) {
				return 1;
			}

			if (a < b) {
				return -1;
			}
			if (a > b) {
				return 1;
			}
			if (a === b) {
				return 0;
			}
			return 0;
		}

		const bst = new BST({ compareKeys });

		bst.insert(2, null);
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(1);
		assert.deepEqual(bst.search(2), [null]);
		assert.deepEqual(bst.search(null), []);

		bst.insert(null, "hello");
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(2);
		assert.deepEqual(bst.search(2), [null]);
		assert.deepEqual(bst.search(null), ["hello"]);

		bst.insert(null, "world");
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(2);
		assert.deepEqual(bst.search(2), [null]);
		assert.deepEqual(bst.search(null), ["hello", "world"]);

		bst.insert(4, null);
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(3);
		assert.deepEqual(bst.search(2), [null]);
		assert.deepEqual(bst.search(4), [null]);
		assert.deepEqual(bst.search(null), ["hello", "world"]);

		bst.delete(null, "hello");
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(3);
		assert.deepEqual(bst.search(2), [null]);
		assert.deepEqual(bst.search(4), [null]);
		assert.deepEqual(bst.search(null), ["world"]);

		bst.delete(null);
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(2);
		assert.deepEqual(bst.search(2), [null]);
		assert.deepEqual(bst.search(4), [null]);
		assert.deepEqual(bst.search(null), []);

		bst.delete(2, null);
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(1);
		assert.deepEqual(bst.search(2), []);
		assert.deepEqual(bst.search(4), [null]);
		assert.deepEqual(bst.search(null), []);

		bst.delete(4);
		bst.checkIsBST();
		bst.getNumberOfKeys().should.equal(0);
		assert.deepEqual(bst.search(2), []);
		assert.deepEqual(bst.search(4), []);
		assert.deepEqual(bst.search(null), []);
	});

	describe("Execute on every node (=tree traversal)", () => {
		it("Can execute a function on every node", () => {
			const bst = new BST<number, string>();
			const keys: number[] = [];
			let executed = 0;
			bst.insert(10, "yes");
			bst.insert(5, "hello");
			bst.insert(3, "yes2");
			bst.insert(8, "yes3");
			bst.insert(15, "yes3");
			bst.insert(159, "yes3");
			bst.insert(11, "yes3");

			bst.executeOnEveryNode(({ key }) => {
				keys.push(key!);
				executed += 1;
			});

			assert.deepEqual(keys, [3, 5, 8, 10, 11, 15, 159]);
			executed.should.equal(7);
		});
	}); // ==== End of 'Execute on every node' ==== //

	// This test performs several inserts and deletes at random, always checking the content
	// of the tree are as expected and the binary search tree constraint is respected
	// This test is important because it can catch bugs other tests can't
	// By their nature, BSTs can be hard to test (many possible cases, bug at one operation whose
	// effect begins to be felt only after several operations etc.)
	describe("Randomized test (takes much longer than the rest of the test suite)", () => {
		const bst: any = new BST();
		const data = {};

		// Check a bst against a simple key => [data] object
		function checkDataIsTheSame(bst: any, data: any) {
			const bstDataElems = [];

			// bstDataElems is a simple array containing every piece of data in the tree
			bst.executeOnEveryNode((node: any) => {
				let i;
				for (i = 0; i < node.data.length; i += 1) {
					bstDataElems.push(node.data[i]);
				}
			});

			// Number of key and number of pieces of data match
			bst.getNumberOfKeys().should.equal(Object.keys(data).length);
			_.reduce(
				_.map(data, ({ length }) => length),
				(memo, n: any) => memo + n,
				0
			).should.equal(bstDataElems.length);

			// Compare data
			Object.keys(data).forEach((key) => {
				checkDataEquality(bst.search(key), data[key]);
			});
		}

		// Check two pieces of data coming from the bst and data are the same
		function checkDataEquality(fromBst: any[], fromData: any[]) {
			if (fromBst.length === 0) {
				if (fromData) {
					fromData.length.should.equal(0);
				}
			}

			assert.deepEqual(fromBst, fromData);
		}

		// Tests the tree structure (deletions concern the whole tree, deletion of some data in a node is well tested above)
		it("Inserting and deleting entire nodes", () => {
			// You can skew to be more insertive or deletive, to test all cases
			function launchRandomTest(nTests: number, proba: number) {
				let i;
				let key;
				let dataPiece;
				let possibleKeys;

				for (i = 0; i < nTests; i += 1) {
					if (Math.random() > proba) {
						// Deletion
						possibleKeys = Object.keys(data);

						if (possibleKeys.length > 0) {
							key =
								possibleKeys[
									Math.floor(
										possibleKeys.length * Math.random()
									)
								];
						} else {
							key = Math.floor(70 * Math.random()).toString();
						}

						delete (data as any)[key];
						bst.delete(key);
					} else {
						// Insertion
						key = Math.floor(70 * Math.random()).toString();
						dataPiece = Math.random().toString().substring(0, 6);
						bst.insert(key, dataPiece);
						if ((data as any)[key]) {
							(data as any)[key].push(dataPiece);
						} else {
							(data as any)[key] = [dataPiece];
						}
					}

					// Check the bst constraint are still met and the data is correct
					bst.checkIsBST();
					checkDataIsTheSame(bst, data);
				}
			}

			launchRandomTest(1000, 0.65);
			launchRandomTest(2000, 0.35);
		});
	}); // ==== End of 'Randomized test' ==== //
});
