const assert = require("chai").assert;
const Tree = require("../lib/avl/index").default;

describe("contains check", () => {
	it("should return false if the tree is empty", () => {
		var tree = new Tree();
		assert.isFalse(tree.contains(1));
	});

	it("should return whether the tree contains a node", () => {
		var tree = new Tree();
		assert.isFalse(tree.contains(1));
		assert.isFalse(tree.contains(2));
		assert.isFalse(tree.contains(3));
		tree.insert(3);
		tree.insert(1);
		tree.insert(2);
		assert.isTrue(tree.contains(1));
		assert.isTrue(tree.contains(2));
		assert.isTrue(tree.contains(3));
	});

	it("should return false when the expected parent has no children", () => {
		var tree = new Tree();
		tree.insert(2);
		assert.isFalse(tree.contains(1));
		assert.isFalse(tree.contains(3));
	});
});

describe("balance", () => {
	it("should be balance after in order insert", () => {
		const tree = new Tree();
		tree.insert(1);
		tree.insert(3);
		tree.insert(2);
		tree.insert(4);
		tree.insert(0);
		tree.insert(-10);
		tree.insert(20);

		// console.log(tree.toString());

		assert.isTrue(tree.isBalanced());
	});

	it("should be balance after random insert", () => {
		const tree = new Tree();
		const min = -100,
			max = 100;

		for (let i = 0; i < 20; i++) {
			tree.insert(min + Math.floor((max - min) * Math.random()));
		}

		console.log(tree.toString());

		// console.log(Tree.verifyBalanceFactor(tree._root));
		assert.isTrue(tree.isBalanced());
	});
});

function shuffle(array) {
	let currentIndex = array.length,
		temporaryValue,
		randomIndex;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}

describe("custom comparator", () => {
	it("should function correctly given a non-reverse customCompare", () => {
		const tree = new Tree((a, b) => b - a);
		tree.insert(2);
		tree.insert(1);
		tree.insert(3);
		assert.equal(tree.size, 3);
		assert.equal(tree.min(), 3);
		assert.equal(tree.max(), 1);
		tree.remove(3);
		assert.equal(tree.size, 2);
		assert.equal(tree._root.key, 2);
		assert.equal(tree._root.left, undefined);
		assert.equal(tree._root.right.key, 1);
	});

	it("should support custom keys", () => {
		const comparator = (a, b) => a.value - b.value;
		const tree = new Tree(comparator);
		const objects = new Array(10).fill(0).map((n, i) => {
			return { value: i, data: Math.pow(i, 2) };
		});
		shuffle(objects);

		objects.forEach((o) => tree.insert(o));

		assert.deepEqual(
			tree.keys().map((k) => k.value),
			objects
				.slice()
				.sort(comparator)
				.map((k) => k.value)
		);
	});
});

describe("Duplicate keys", () => {
	it("should allow inserting of duplicate key", () => {
		const tree = new Tree();
		const values = [2, 12, 1, -6, 1];

		values.forEach((v) => {
			tree.insert(v);
			assert.isTrue(tree.isBalanced());
		});

		assert.deepEqual(tree.keys(), [-6, 1, 1, 2, 12]);
		assert.equal(tree.size, 5);
		assert.isTrue(tree.isBalanced());
	});

	it("should allow multiple duplicate keys in a row", () => {
		const tree = new Tree();
		const values = [2, 12, 1, 1, -6, 2, 1, 1, 13];

		values.forEach((v) => {
			tree.insert(v);
			assert.isTrue(tree.isBalanced());
		});

		assert.deepEqual(tree.keys(), [-6, 1, 1, 1, 1, 2, 2, 12, 13]);
		assert.equal(tree.size, 9);
		assert.isTrue(tree.isBalanced());
	});

	it("should remove from a tree with duplicate keys correctly", () => {
		const tree = new Tree();
		const values = [2, 12, 1, 1, -6, 1, 1];

		values.forEach((v) => tree.insert(v));

		let size = tree.size;
		for (let i = 0; i < 4; i++) {
			tree.remove(1);

			if (i < 3) assert.isTrue(tree.contains(1));
			assert.isTrue(tree.isBalanced());
			assert.equal(tree.size, --size);
		}

		assert.isFalse(tree.contains(1));
		assert.isTrue(tree.isBalanced());
	});

	it("should remove from a tree with multiple duplicate keys correctly", () => {
		const tree = new Tree();
		const values = [2, 12, 1, 1, -6, 1, 1, 2, 0, 2];

		values.forEach((v) => tree.insert(v));

		let size = tree.size;
		while (!tree.isEmpty()) {
			tree.pop();

			assert.isTrue(tree.isBalanced());
			assert.equal(tree.size, --size);
		}
	});

	it("should disallow duplicates if noDuplicates is set", () => {
		const tree = new Tree(undefined, true);
		const values = [2, 12, 1, -6, 1];

		values.forEach((v) => {
			tree.insert(v);
			assert.isTrue(tree.isBalanced());
		});

		assert.deepEqual(tree.keys(), [-6, 1, 2, 12]);
		assert.equal(tree.size, 4);
		assert.isTrue(tree.isBalanced());
	});
});

describe("empty check", () => {
	it("should return whether the tree is empty", () => {
		const tree = new Tree();

		assert.isTrue(tree.isEmpty());
		tree.insert(1);
		assert.isFalse(tree.isEmpty());
		tree.remove(1);
		assert.isTrue(tree.isEmpty());
	});

	it("should clear the tree", () => {
		const tree = new Tree();
		tree.insert(1);
		tree.insert(2);
		tree.insert(3);
		tree.insert(4);

		tree.clear();
		assert.isTrue(tree.isEmpty());
		assert.equal(tree.size, 0);
	});
});

describe("find", () => {
	it("should return key as the result of search", () => {
		const tree = new Tree();
		assert.equal(tree.find(1), undefined);
		assert.equal(tree.find(2), undefined);
		assert.equal(tree.find(3), undefined);
		tree.insert(1, 4);
		tree.insert(2, 5);
		tree.insert(3, 6);
		assert.equal(tree.find(1).data, 4);
		assert.equal(tree.find(2).data, 5);
		assert.equal(tree.find(3).data, 6);
		assert.isUndefined(tree.find(8));
	});
});

describe("insert", () => {
	it("should return the size of the tree", () => {
		const tree = new Tree();
		tree.insert(1);
		tree.insert(2);
		tree.insert(3);
		tree.insert(4);
		tree.insert(5);
		assert.equal(tree.size, 5);
	});

	/**
	 *         c
	 *        / \           _b_
	 *       b   z         /   \
	 *      / \     ->    a     c
	 *     a   y         / \   / \
	 *    / \           w   x y   z
	 *   w   x
	 */
	it("should correctly balance the left left case", () => {
		const tree = new Tree();
		tree.insert(3);
		tree.insert(2);
		tree.insert(1);
		assert.equal(tree._root.key, 2);
	});

	/**
	 *       c
	 *      / \           _b_
	 *     a   z         /   \
	 *    / \     ->    a     c
	 *   w   b         / \   / \
	 *      / \       w   x y   z
	 *     x   y
	 */
	it("should correctly balance the left right case", () => {
		const tree = new Tree();
		tree.insert(3);
		tree.insert(1);
		tree.insert(2);
		assert.equal(tree._root.key, 2);
	});

	/**
	 *     a
	 *    / \               _b_
	 *   w   b             /   \
	 *      / \     ->    a     c
	 *     x   c         / \   / \
	 *        / \       w   x y   z
	 *       y   z
	 */
	it("should correctly balance the right right case", () => {
		const tree = new Tree();
		tree.insert(1);
		tree.insert(2);
		tree.insert(3);
		assert.equal(tree._root.key, 2);
	});

	/**
	 *     a
	 *    / \             _b_
	 *   w   c           /   \
	 *      / \   ->    a     c
	 *     b   z       / \   / \
	 *    / \         w   x y   z
	 *   x   y
	 */
	it("should correctly balance the right left case", () => {
		const tree = new Tree();
		tree.insert(1);
		tree.insert(3);
		tree.insert(2);
		assert.equal(tree._root.key, 2);
	});

	it("should allow bulk-insert", () => {
		const tree = new Tree();
		const keys = [1, 2, 3, 4];
		const values = [4, 3, 2, 1];
		tree.load(keys, values, true);

		assert.deepEqual(tree.keys(), keys);
		assert.deepEqual(tree.values(), values);
	});

	it("should allow bulk-insert without values", () => {
		const tree = new Tree();
		const keys = [1, 2, 3, 4, 5, 6, 7, 8];
		tree.load(keys, undefined, true);

		assert.deepEqual(tree.keys(), keys);
		assert.deepEqual(
			tree.values(),
			keys.map((k) => undefined)
		);

		//assert.isTrue(tree.isBalanced());
	});

	it("should mark balance properly after bulk-load", () => {
		const tree = new Tree();
		const keys = [1, 2, 3, 4, 5, 6, 7, 8];
		tree.load(keys, undefined, true);

		//tree.insert(0);

		assert.isTrue(tree.isBalanced());
	});
});

describe("Keys and values", () => {
	it("should return sorted keys", () => {
		const t = new Tree((a, b) => b - a);
		t.insert(5);
		t.insert(-10);
		t.insert(0);
		t.insert(33);
		t.insert(2);

		assert.deepEqual(t.keys(), [33, 5, 2, 0, -10]);
	});

	it("should return sorted keys", () => {
		const t = new Tree();
		t.insert(5);
		t.insert(-10);
		t.insert(0);
		t.insert(33);
		t.insert(2);

		assert.deepEqual(t.keys(), [-10, 0, 2, 5, 33]);
	});

	it("should return sorted values", () => {
		const t = new Tree();
		t.insert(5, "D");
		t.insert(-10, "A");
		t.insert(0, "B");
		t.insert(33, "E");
		t.insert(2, "C");

		assert.deepEqual(t.keys(), [-10, 0, 2, 5, 33]);
		assert.deepEqual(t.values(), ["A", "B", "C", "D", "E"]);
	});

	it("should return sorted values", () => {
		const t = new Tree((a, b) => b - a);
		t.insert(5, "D");
		t.insert(-10, "A");
		t.insert(0, "B");
		t.insert(33, "E");
		t.insert(2, "C");

		assert.deepEqual(t.keys(), [33, 5, 2, 0, -10]);
		assert.deepEqual(t.values(), ["E", "D", "C", "B", "A"]);
	});

	it("should return sorted values after bulk insert", () => {
		const t = new Tree();
		t.load([5, -10, 0, 33, 2], ["D", "A", "B", "E", "C"], true);

		assert.deepEqual(t.keys(), [-10, 0, 2, 5, 33]);
		assert.deepEqual(t.values(), ["A", "B", "C", "D", "E"]);
	});
});

describe("find min and max", () => {
	it("should return the maximum key in the tree", () => {
		const tree = new Tree();
		tree.insert(3);
		tree.insert(5);
		tree.insert(1);
		tree.insert(4);
		tree.insert(2);
		assert.equal(tree.max(), 5);
	});

	it("should return undefined for max if the tree is empty", () => {
		const tree = new Tree();
		assert.isUndefined(tree.max());
	});

	it("should return the minimum key in the tree", () => {
		const tree = new Tree();
		tree.insert(5);
		tree.insert(3);
		tree.insert(1);
		tree.insert(4);
		tree.insert(2);
		assert.equal(tree.min(), 1);
	});

	it("should return the max node", () => {
		const tree = new Tree();
		tree.insert(3);
		tree.insert(5, 10);
		tree.insert(1);
		tree.insert(4);
		tree.insert(2);
		const node = tree.maxNode();
		assert.equal(node.key, 5);
		assert.equal(node.data, 10);
	});

	it("should return undefined for maxNode if the tree is empty", () => {
		const tree = new Tree();
		assert.isUndefined(tree.maxNode());
	});

	it("should return the min node", () => {
		const tree = new Tree();
		tree.insert(5);
		tree.insert(3);
		tree.insert(1, 20);
		tree.insert(4);
		tree.insert(2);
		const node = tree.minNode();
		assert.equal(node.key, 1);
		assert.equal(node.data, 20);
	});

	it("should return undefined for min if the tree is empty", () => {
		const tree = new Tree();
		assert.isUndefined(tree.min());
	});

	it("should support removing min node", () => {
		const tree = new Tree();
		tree.insert(5);
		tree.insert(3);
		tree.insert(1);
		tree.insert(4);
		tree.insert(2);
		assert.equal(tree.pop().key, 1);
	});

	it("should support removing max node", () => {
		const tree = new Tree();
		tree.insert(5);
		tree.insert(3);
		tree.insert(1);
		tree.insert(4);
		tree.insert(2);
		assert.equal(tree.popMax().key, 5);
	});

	it("should return undefined for minNode if the tree is empty", () => {
		const tree = new Tree();
		assert.isUndefined(tree.minNode());
	});
});

describe("remove", () => {
	it("should not change the size of a tree with no root", () => {
		const tree = new Tree();
		tree.remove(1);
		assert.equal(tree.size, 0);
	});

	it("should remove a single key", () => {
		const tree = new Tree();
		tree.insert(1);
		tree.remove(1);
		assert.isTrue(tree.isEmpty());
	});

	/**
	 *       _4_                       _2_
	 *      /   \                     /   \
	 *     2     6  -> remove(6) ->  1     4
	 *    / \                             /
	 *   1   3                           3
	 */
	it("should correctly balance the left left case", () => {
		const tree = new Tree();
		tree.insert(4);
		tree.insert(2);
		tree.insert(6);
		tree.insert(3);
		tree.insert(5);
		tree.insert(1);
		tree.insert(7);
		tree.remove(7);
		tree.remove(5);
		tree.remove(6);
		assert.equal(tree._root.key, 2);
		assert.equal(tree._root.left.key, 1);
		assert.equal(tree._root.right.key, 4);
		assert.equal(tree._root.right.left.key, 3);
	});

	/**
	 *       _4_                       _6_
	 *      /   \                     /   \
	 *     2     6  -> remove(2) ->  4     7
	 *          / \                   \
	 *         5   7                  5
	 */
	it("should correctly balance the right right case", () => {
		const tree = new Tree();
		tree.insert(4);
		tree.insert(2);
		tree.insert(6);
		tree.insert(3);
		tree.insert(5);
		tree.insert(1);
		tree.insert(7);
		tree.remove(1);
		tree.remove(3);
		tree.remove(2);
		assert.equal(tree._root.key, 6);
		assert.equal(tree._root.left.key, 4);
		assert.equal(tree._root.left.right.key, 5);
		assert.equal(tree._root.right.key, 7);
	});

	/**
	 *       _6_                       _4_
	 *      /   \                     /   \
	 *     2     7  -> remove(8) ->  2     6
	 *    / \     \                 / \   / \
	 *   1   4     8               1   3 5   7
	 *      / \
	 *     3   5
	 */
	it("should correctly balance the left right case", () => {
		const tree = new Tree();
		tree.insert(6);
		tree.insert(2);
		tree.insert(7);
		tree.insert(1);
		tree.insert(8);
		tree.insert(4);
		tree.insert(3);
		tree.insert(5);
		tree.remove(8);
		assert.equal(tree._root.key, 4);
		assert.equal(tree._root.left.key, 2);
		assert.equal(tree._root.left.left.key, 1);
		assert.equal(tree._root.left.right.key, 3);
		assert.equal(tree._root.right.key, 6);
		assert.equal(tree._root.right.left.key, 5);
		assert.equal(tree._root.right.right.key, 7);
	});

	/**
	 *       _3_                       _5_
	 *      /   \                     /   \
	 *     2     7  -> remove(1) ->  3     7
	 *    /     / \                 / \   / \
	 *   1     5   8               2   4 6   8
	 *        / \
	 *       4   6
	 */
	it("should correctly balance the right left case", () => {
		const tree = new Tree();
		tree.insert(3);
		tree.insert(2);
		tree.insert(7);
		tree.insert(1);
		tree.insert(8);
		tree.insert(5);
		tree.insert(4);
		tree.insert(6);
		tree.remove(1);
		assert.equal(tree._root.key, 5);
		assert.equal(tree._root.left.key, 3);
		assert.equal(tree._root.left.left.key, 2);
		assert.equal(tree._root.left.right.key, 4);
		assert.equal(tree._root.right.key, 7);
		assert.equal(tree._root.right.left.key, 6);
		assert.equal(tree._root.right.right.key, 8);
	});

	it("should take the right child if the left does not exist", () => {
		const tree = new Tree();
		tree.insert(1);
		tree.insert(2);
		tree.remove(1);
		assert.equal(tree._root.key, 2);
	});

	it("should take the left child if the right does not exist", () => {
		const tree = new Tree();
		tree.insert(2);
		tree.insert(1);
		tree.remove(2);
		assert.equal(tree._root.key, 1);
	});

	it("should get the right child if the node has 2 leaf children", () => {
		const tree = new Tree();
		tree.insert(2);
		tree.insert(1);
		tree.insert(3);
		tree.remove(2);
		assert.equal(tree._root.key, 1);
	});

	it("should get the in-order successor if the node has both children", () => {
		const tree = new Tree();
		tree.insert(2);
		tree.insert(1);
		tree.insert(4);
		tree.insert(3);
		tree.insert(5);
		tree.remove(2);
		assert.equal(tree._root.key, 4);
	});
});

describe("traversal check", () => {
	it("should traverse the tree in order", () => {
		const tree = new Tree();
		tree.insert(3);
		tree.insert(1);
		tree.insert(0);
		tree.insert(2);

		tree.forEach((n, i) => assert.equal(n.key, i));
	});

	it("should find predecessor for the node", () => {
		const tree = new Tree();
		const keys = [];
		for (let i = 0; i < 10; i++) tree.insert(i);

		for (let i = 1; i < 10; i++) {
			assert.strictEqual(tree.prev(tree.find(i)), tree.find(i - 1));
		}
	});

	it("should find successor for a node", () => {
		const tree = new Tree();
		for (let i = 0; i < 10; i++) tree.insert(i);

		for (let i = 0; i < 9; i++) {
			assert.strictEqual(tree.next(tree.find(i)), tree.find(i + 1));
		}
	});

	it("should return undefined for predecessor of the min node", () => {
		const tree = new Tree();
		for (let i = 0; i < 10; i++) tree.insert(i);

		let min = tree.minNode();
		assert.isUndefined(tree.prev(min));
		tree.remove(min.key);
		min = tree.minNode();
		assert.isUndefined(tree.prev(min));
	});

	it("should return undefined for successor of the max node", () => {
		const tree = new Tree();
		for (let i = 0; i < 10; i++) tree.insert(i);

		let max = tree.maxNode();
		assert.isUndefined(tree.next(max));
		tree.remove(max.key);
		max = tree.maxNode();
		assert.isUndefined(tree.next(max));
	});

	it("should find successor and predecessor for 2-nodes tree", () => {
		const tree = new Tree();
		tree.insert(5);
		tree.insert(10);

		let min = tree.minNode();
		assert.equal(min.key, 5);
		assert.isUndefined(tree.prev(min));
		assert.equal(tree.next(min).key, 10);

		let max = tree.maxNode();
		assert.equal(max.key, 10);
		assert.isUndefined(tree.next(max));
		assert.equal(tree.prev(max).key, 5);
	});

	it("should be able to get a node by its index", () => {
		const tree = new Tree();
		for (let i = 0; i < 10; i++) tree.insert(i);

		for (let i = 0; i < 10; i++) assert.equal(tree.at(i).key, i);

		assert.isUndefined(tree.at(10));
		assert.isUndefined(tree.at(-1));
		assert.isUndefined(tree.at("a"));
	});

	it("should support range walking", () => {
		const tree = new Tree();
		for (let i = 0; i < 10; i++) tree.insert(i);

		const arr = [];
		tree.range(3, 8, (n) => {
			arr.push(n.key);
		});
		assert.deepEqual(arr, [3, 4, 5, 6, 7, 8]);
	});

	it("should support range walking with non-existent low key", () => {
		const tree = new Tree();
		for (let i = 0; i < 10; i++) tree.insert(i);

		const arr = [];
		tree.range(-3, 5, (n) => {
			arr.push(n.key);
		});

		assert.deepEqual(arr, [0, 1, 2, 3, 4, 5]);
	});

	it("should support range walking with non-existent high key", () => {
		const tree = new Tree();
		for (let i = 0; i < 10; i++) tree.insert(i);

		const arr = [];
		tree.range(3, 15, (n) => {
			arr.push(n.key);
		});

		assert.deepEqual(arr, [3, 4, 5, 6, 7, 8, 9]);
	});

	it("should support range walking with both keys out of range", () => {
		const tree = new Tree();
		for (let i = 0; i < 10; i++) tree.insert(i);

		const arr = [];
		tree.range(10, 20, (n) => {
			arr.push(n.key);
		});

		assert.equal(arr.length, 0);

		tree.range(-10, 20, (n) => {
			arr.push(n.key);
		});
		assert.deepEqual(arr, tree.keys());
	});
});
