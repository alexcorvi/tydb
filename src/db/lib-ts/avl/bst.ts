import { BSTOptions } from "./types";
import * as utils from "./utils";

/**
 * Simple binary search tree
 */

class BST<K, V> {
	left: BST<K, V> | undefined;
	right: BST<K, V> | undefined;
	parent: BST<K, V> | undefined;
	key: K | undefined;
	data: V[];
	unique: boolean;
	compareKeys: typeof utils.defaultCompareKeysFunction;
	checkValueEquality: typeof utils.defaultCheckValueEquality;

	constructor(init: BSTOptions<K, V> = {}) {
		this.left = init.left;
		this.right = init.right;
		this.parent = init.parent;
		if (init.hasOwnProperty("key")) {
			this.key = init.key;
		}
		this.data = init.value !== undefined ? [init.value] : [];
		this.unique = init.unique || false;
		this.compareKeys = init.compareKeys || utils.defaultCompareKeysFunction;
		this.checkValueEquality =
			init.checkValueEquality || utils.defaultCheckValueEquality;
	}

	/**
	 * Get the descendant with max key
	 */
	getMaxKeyDescendant(): BST<K, V> {
		if (this.right) {
			return this.right.getMaxKeyDescendant();
		} else {
			return this;
		}
	}

	/**
	 * Get the maximum key
	 */
	getMaxKey(): K | undefined {
		return this.getMaxKeyDescendant().key;
	}

	/**
	 * Get the descendant with min key
	 */
	getMinKeyDescendant(): BST<K, V> {
		if (this.left) {
			return this.left.getMinKeyDescendant();
		} else {
			return this;
		}
	}

	/**
	 * Get the minimum key
	 */
	getMinKey(): K | undefined {
		return this.getMinKeyDescendant().key;
	}

	/**
	 * Check that all nodes (incl. leaves) fullfil condition given by fn
	 * test is a function passed every (key, data) and which throws if the condition is not met
	 */
	forEach(test: (key: K | undefined, value: V[]) => any) {
		if (!this.hasOwnProperty("key")) {
			return;
		}

		test(this.key, this.data);
		if (this.left) {
			this.left.forEach(test);
		}
		if (this.right) {
			this.right.forEach(test);
		}
	}

	/**
	 * Check that the core BST properties on node ordering are verified
	 * Throw if they aren't
	 */
	checkNodeOrdering() {
		const self = this;

		if (!this.hasOwnProperty("key")) {
			return;
		}

		if (this.left) {
			this.left.forEach((k) => {
				if (self.compareKeys(k, self.key) >= 0) {
					throw new Error(
						`Tree with root ${self.key} is not a binary search tree`
					);
				}
			});
			this.left.checkNodeOrdering();
		}
		if (this.right) {
			this.right.forEach((k) => {
				if (self.compareKeys(k, self.key) <= 0) {
					throw new Error(
						`Tree with root ${self.key} is not a binary search tree`
					);
				}
			});
			this.right.checkNodeOrdering();
		}
	}

	/**
	 * Check that all pointers are coherent in this tree
	 */
	checkInternalPointers() {
		if (this.left) {
			if (this.left.parent !== this) {
				throw new Error(`Parent pointer broken for key ${this.key}`);
			}
			this.left.checkInternalPointers();
		}

		if (this.right) {
			if (this.right.parent !== this) {
				throw new Error(`Parent pointer broken for key ${this.key}`);
			}
			this.right.checkInternalPointers();
		}
	}

	/**
	 * Check that a tree is a BST as defined here (node ordering and pointer references)
	 */
	checkIsBST() {
		this.checkNodeOrdering();
		this.checkInternalPointers();
		if (this.parent) {
			throw new Error("The root shouldn't have a parent");
		}
	}

	/**
	 * Get number of keys inserted
	 */
	getNumberOfKeys() {
		if (!this.hasOwnProperty("key")) {
			return 0;
		}
		let res = 1;
		if (this.left) {
			res += this.left.getNumberOfKeys();
		}
		if (this.right) {
			res += this.right.getNumberOfKeys();
		}
		return res;
	}

	// ============================================
	// Methods used to actually work on the tree
	// ============================================

	/**
	 * Create a BST similar (i.e. same options except for key and value) to the current one
	 * Use the same constructor (i.e. BinarySearchTree, AVLTree etc)
	 */
	createSimilar(this: any, options: BSTOptions<K, V> = {}) {
		options.unique = this.unique;
		options.compareKeys = this.compareKeys;
		options.checkValueEquality = this.checkValueEquality;
		return new this.constructor(options);
	}

	/**
	 * Create the left child of this BST and return it
	 */
	createLeftChild(options: BSTOptions<K, V>) {
		const leftChild = this.createSimilar(options);
		leftChild.parent = this;
		this.left = leftChild;
		return leftChild;
	}

	/**
	 * Create the right child of this BST and return it
	 */
	createRightChild(options: BSTOptions<K, V>) {
		const rightChild = this.createSimilar(options);
		rightChild.parent = this;
		this.right = rightChild;
		return rightChild;
	}

	/**
	 * Insert a new element
	 */
	insert(key: K, value: V) {
		// Empty tree, insert as root
		if (!this.hasOwnProperty("key")) {
			this.key = key;
			utils.isDef(value) && this.data.push(value);
			return;
		}

		// Same key as root
		if (this.compareKeys(this.key, key) === 0) {
			if (this.unique) {
				const err = new Error(
					`Can't insert key ${key}, it violates the unique constraint`
				) as any;
				err.key = key;
				err.errorType = "uniqueViolated";
				throw err;
			} else {
				utils.isDef(value) && this.data.push(value);
			}
			return;
		}

		const childNode: BSTOptions<K, V> = { key };
		if (utils.isDef(value)) {
			childNode.value = value;
		}
		if (this.compareKeys(key, this.key) < 0) {
			// Insert in left subtree
			if (this.left) {
				this.left.insert(key, value);
			} else {
				this.createLeftChild(childNode);
			}
		} else {
			if (this.right) {
				this.right.insert(key, value);
			} else {
				this.createRightChild(childNode);
			}
		}
	}

	/**
	 * Search for all data corresponding to a key
	 */
	search(key: K): V[] {
		if (!this.hasOwnProperty("key")) {
			return [];
		}

		if (this.compareKeys(this.key, key) === 0) {
			return this.data;
		}

		if (this.compareKeys(key, this.key) < 0) {
			if (this.left) {
				return this.left.search(key);
			} else {
				return [];
			}
		} else {
			if (this.right) {
				return this.right.search(key);
			} else {
				return [];
			}
		}
	}

	/**
	 * Search for data coming right after a specific key
	 */
	searchAfter(key: K): V[] {
		if (!this.hasOwnProperty("key")) {
			return [];
		}

		if (this.compareKeys(this.key, key) === 0) {
			// if there's a right child, the next key will be there
			var cur = this.right;
			if (cur) {
				// within the right branch, traverse left until leaf
				while (cur.left) cur = cur.left;
				return cur.data;
			}

			// traverse up until you find a bigger key
			cur = this.parent;
			while (cur) {
				if (this.compareKeys(key, cur.key) < 0) return cur.data;
				cur = cur.parent;
			}
			return [];
		}

		if (this.compareKeys(key, this.key) < 0) {
			if (this.left) {
				return this.left.searchAfter(key);
			} else {
				return this.data;
			}
		} else {
			if (this.right) {
				return this.right.searchAfter(key);
			} else {
				// traverse up until you find a bigger key
				var cur = this.parent;
				while (cur) {
					if (this.compareKeys(key, cur.key) < 0) return cur.data;
					cur = cur.parent;
				}
				return [];
			}
		}
	}

	/**
	 * Search for data coming right before a specific key
	 */
	searchBefore(key: K): V[] {
		if (!this.hasOwnProperty("key")) {
			return [];
		}

		if (this.compareKeys(this.key, key) === 0) {
			// if there's a left child, the previous key will be there
			var cur = this.left;
			if (cur) {
				// within the left branch, traverse right until leaf
				while (cur.right) cur = cur.right;
				return cur.data;
			}

			// traverse up until you find a smaller key
			cur = this.parent;
			while (cur) {
				if (this.compareKeys(key, cur.key) > 0) return cur.data;
				cur = cur.parent;
			}
			return [];
		}

		if (this.compareKeys(key, this.key) < 0) {
			if (this.left) {
				return this.left.searchBefore(key);
			} else {
				// traverse up until you find a smaller key
				var cur = this.parent;
				while (cur) {
					if (this.compareKeys(key, cur.key) > 0) return cur.data;
					cur = cur.parent;
				}
				return [];
			}
		} else {
			if (this.right) {
				return this.right.searchBefore(key);
			} else {
				return this.data;
			}
		}
	}

	/**
	 * Search for all data corresponding to a specific key, if that key
	 * does not exist, find the nearest key less than the specified key and its
	 * associated data. Returns undefined if no such key&data can be found.
	 **/
	searchNearestLte(key: K): V[] | undefined {
		const nearest = this._searchNearestLte(key);
		return nearest ? nearest.data : undefined;
	}

	private _searchNearestLte(
		key: K,
		nearestSoFar?: BST<K, V>
	): BST<K, V> | undefined {
		if (!this.hasOwnProperty("key")) {
			return undefined;
		}

		let nearest = undefined;

		if (typeof nearestSoFar != "undefined") {
			nearest = nearestSoFar;
		}

		if (this.compareKeys(key, this.key) === 0) {
			return this;
		}

		if (
			(nearest == undefined ||
				Math.abs(this.compareKeys(this.key, key)) <
					Math.abs(this.compareKeys(key, nearest.key))) &&
			this.compareKeys(this.key, key) <= 0
		) {
			nearest = this;
		}

		if (this.compareKeys(key, this.key) < 0) {
			if (this.left) {
				const leftCandidate = this.left._searchNearestLte(key, nearest);
				if (
					leftCandidate != undefined &&
					(nearest == undefined ||
						Math.abs(this.compareKeys(leftCandidate.key, key)) <
							Math.abs(this.compareKeys(key, nearest.key))) &&
					this.compareKeys(leftCandidate.key, key) <= 0
				) {
					nearest = leftCandidate;
				}
			}
		}

		if (nearest == undefined || this.compareKeys(key, this.key) >= 0) {
			if (this.right) {
				const rightCandidate = this.right._searchNearestLte(
					key,
					nearest
				);
				if (
					rightCandidate != undefined &&
					(nearest == undefined ||
						Math.abs(this.compareKeys(rightCandidate.key, key)) <
							Math.abs(this.compareKeys(key, nearest.key))) &&
					this.compareKeys(rightCandidate.key, key) <= 0
				) {
					nearest = rightCandidate;
				}
			}
		}

		return nearest;
	}

	/**
	 * Search for all data corresponding to a specific key, if that key
	 * does not exist, find the nearest key greater than the specified key and its
	 * associated data. Returns undefined if no such key&data can be found.
	 **/
	searchNearestGte(key: K): V[] | undefined {
		const nearest = this._searchNearestGte(key);
		return nearest ? nearest.data : undefined;
	}

	private _searchNearestGte(
		key: K,
		nearestSoFar?: BST<K, V>
	): BST<K, V> | undefined {
		if (!this.hasOwnProperty("key")) {
			return undefined;
		}

		let nearest = undefined;

		if (typeof nearestSoFar != "undefined") {
			nearest = nearestSoFar;
		}

		if (this.compareKeys(key, this.key) === 0) {
			return this;
		}

		if (
			(nearest == undefined ||
				Math.abs(this.compareKeys(this.key, key)) <
					Math.abs(this.compareKeys(key, nearest.key))) &&
			this.compareKeys(this.key, key) >= 0
		) {
			nearest = this;
		}

		if (this.compareKeys(key, this.key) < 0) {
			if (this.left) {
				const leftCandidate = this.left._searchNearestGte(key, nearest);
				if (
					leftCandidate != undefined &&
					(nearest == undefined ||
						Math.abs(this.compareKeys(leftCandidate.key, key)) <
							Math.abs(this.compareKeys(key, nearest.key))) &&
					this.compareKeys(leftCandidate.key, key) >= 0
				) {
					nearest = leftCandidate;
				}
			}
		}

		if (nearest == undefined || this.compareKeys(key, this.key) >= 0) {
			if (this.right) {
				const rightCandidate = this.right._searchNearestGte(
					key,
					nearest
				);
				if (
					rightCandidate != undefined &&
					(nearest == undefined ||
						Math.abs(this.compareKeys(rightCandidate.key, key)) <
							Math.abs(this.compareKeys(key, nearest.key))) &&
					this.compareKeys(rightCandidate.key, key) >= 0
				) {
					nearest = rightCandidate;
				}
			}
		}

		return nearest;
	}

	/**
	 * Search for all data corresponding to a specific key, if that key
	 * does not exist, find the nearest key and associated data.
	 */
	searchNearest(key: K): V[] | undefined {
		const nearest = this._searchNearest(key);
		return nearest ? nearest.data : undefined;
	}

	private _searchNearest(
		key: K,
		nearestSoFar?: BST<K, V>
	): BST<K, V> | undefined {
		if (!this.hasOwnProperty("key")) {
			return undefined;
		}

		let nearest = undefined;

		if (typeof nearestSoFar != "undefined") {
			nearest = nearestSoFar;
		}

		if (this.compareKeys(key, this.key) === 0) {
			return this;
		}

		if (
			nearest == undefined ||
			Math.abs(this.compareKeys(this.key, key)) <
				Math.abs(this.compareKeys(key, nearest.key))
		) {
			nearest = this;
		}

		if (this.compareKeys(key, this.key) < 0) {
			if (this.left) {
				const leftCandidate = this.left._searchNearest(key, nearest);
				if (
					leftCandidate != undefined &&
					(nearest == undefined ||
						Math.abs(this.compareKeys(leftCandidate.key, key)) <
							Math.abs(this.compareKeys(key, nearest.key)))
				) {
					nearest = leftCandidate;
				}
			}
		} else {
			if (this.right) {
				const rightCandidate = this.right._searchNearest(key, nearest);
				if (
					rightCandidate != undefined &&
					(nearest == undefined ||
						Math.abs(this.compareKeys(rightCandidate.key, key)) <
							Math.abs(this.compareKeys(key, nearest.key)))
				) {
					nearest = rightCandidate;
				}
			}
		}

		return nearest;
	}

	/**
	 * Return a function that tells whether a given key matches a lower bound
	 */
	getLowerBoundMatcher(query: any) {
		const bst = this;

		// No lower bound
		if (!query.hasOwnProperty("$gt") && !query.hasOwnProperty("$gte")) {
			return () => true;
		}

		if (query.hasOwnProperty("$gt") && query.hasOwnProperty("$gte")) {
			if (bst.compareKeys(query.$gte, query.$gt) === 0) {
				return (key: K) => bst.compareKeys(key, query.$gt) > 0;
			}

			if (bst.compareKeys(query.$gte, query.$gt) > 0) {
				return (key: K) => bst.compareKeys(key, query.$gte) >= 0;
			} else {
				return (key: K) => bst.compareKeys(key, query.$gt) > 0;
			}
		}

		if (query.hasOwnProperty("$gt")) {
			return (key: K) => bst.compareKeys(key, query.$gt) > 0;
		} else {
			return (key: K) => bst.compareKeys(key, query.$gte) >= 0;
		}
	}

	/**
	 * Return a function that tells whether a given key matches an upper bound
	 */
	getUpperBoundMatcher(query: any) {
		const self = this;

		// No lower bound
		if (!query.hasOwnProperty("$lt") && !query.hasOwnProperty("$lte")) {
			return () => true;
		}

		if (query.hasOwnProperty("$lt") && query.hasOwnProperty("$lte")) {
			if (self.compareKeys(query.$lte, query.$lt) === 0) {
				return (key: K) => self.compareKeys(key, query.$lt) < 0;
			}

			if (self.compareKeys(query.$lte, query.$lt) < 0) {
				return (key: K) => self.compareKeys(key, query.$lte) <= 0;
			} else {
				return (key: K) => self.compareKeys(key, query.$lt) < 0;
			}
		}

		if (query.hasOwnProperty("$lt")) {
			return (key: K) => self.compareKeys(key, query.$lt) < 0;
		} else {
			return (key: K) => self.compareKeys(key, query.$lte) <= 0;
		}
	}

	/**
	 * Get all data for a key between bounds
	 * Return it in key order
	 */
	betweenBounds(
		query: any,
		lbm: BST<K, V>["getLowerBoundMatcher"],
		ubm: BST<K, V>["getLowerBoundMatcher"]
	) {
		let res: V[] = [];

		if (!this.hasOwnProperty("key")) {
			return [];
		}
		lbm = lbm || this.getLowerBoundMatcher(query);
		ubm = ubm || this.getUpperBoundMatcher(query);
		if (lbm(this.key) && this.left) {
			res = res.concat(this.left.betweenBounds(query, lbm, ubm));
		}
		if (lbm(this.key) && ubm(this.key)) {
			res = res.concat(this.data);
		}
		if (ubm(this.key) && this.right) {
			res = res.concat(this.right.betweenBounds(query, lbm, ubm));
		}
		return res;
	}

	/**
	 * Delete the current node if it is a leaf
	 * Return true if it was deleted
	 */
	deleteIfLeaf() {
		if (this.left || this.right) {
			return false;
		}

		// The leaf is itself a root
		if (!this.parent) {
			delete this.key;
			this.data = [];
			return true;
		}

		if (this.parent.left === this) {
			this.parent.left = undefined;
		} else {
			this.parent.right = undefined;
		}

		return true;
	}

	/**
	 * Delete the current node if it has only one child
	 * Return true if it was deleted
	 */
	deleteIfOnlyOneChild() {
		let child;

		if (this.left && !this.right) {
			child = this.left;
		}
		if (!this.left && this.right) {
			child = this.right;
		}
		if (!child) {
			return false;
		}

		// Root
		if (!this.parent) {
			this.key = child.key;
			this.data = child.data;

			this.left = undefined;
			if (child.left) {
				this.left = child.left;
				child.left.parent = this;
			}

			this.right = undefined;
			if (child.right) {
				this.right = child.right;
				child.right.parent = this;
			}

			return true;
		}

		if (this.parent.left === this) {
			this.parent.left = child;
			child.parent = this.parent;
		} else {
			this.parent.right = child;
			child.parent = this.parent;
		}

		return true;
	}

	/**
	 * Delete a key or just a value
	 */
	delete(key: K, value?: V) {
		if (!this.hasOwnProperty("key")) {
			return;
		}

		if (this.compareKeys(key, this.key) < 0) {
			if (this.left) {
				this.left.delete(key, value);
			}
			return;
		}

		if (this.compareKeys(key, this.key) > 0) {
			if (this.right) {
				this.right.delete(key, value);
			}
			return;
		}

		if (this.compareKeys(key, this.key) !== 0) {
			return;
		}

		// Delete only a value
		if (this.data.length > 1 && utils.isDef(value)) {
			this.data = this.data.filter((d) => {
				return !this.checkValueEquality(d, value);
			});
			return;
		}

		// Delete the whole node
		if (this.deleteIfLeaf()) {
			return;
		}
		if (this.deleteIfOnlyOneChild()) {
			return;
		}

		// We are in the case where the node to delete has two children
		if (Math.random() >= 0.5 && this.left) {
			// Randomize replacement to avoid unbalancing the tree too much
			// Use the in-order predecessor
			let replaceWith = this.left.getMaxKeyDescendant();

			this.key = replaceWith.key;
			this.data = replaceWith.data;

			if (this === replaceWith.parent) {
				// Special case
				this.left = replaceWith.left;
				if (replaceWith.left) {
					replaceWith.left.parent = replaceWith.parent;
				}
			} else if (replaceWith.parent) {
				replaceWith.parent.right = replaceWith.left;
				if (replaceWith.left) {
					replaceWith.left.parent = replaceWith.parent;
				}
			}
		} else if (this.right) {
			// Use the in-order successor
			let replaceWith = this.right.getMinKeyDescendant();

			this.key = replaceWith.key;
			this.data = replaceWith.data;

			if (this === replaceWith.parent) {
				// Special case
				this.right = replaceWith.right;
				if (replaceWith.right) {
					replaceWith.right.parent = replaceWith.parent;
				}
			} else if (replaceWith.parent) {
				replaceWith.parent.left = replaceWith.right;
				if (replaceWith.right) {
					replaceWith.right.parent = replaceWith.parent;
				}
			}
		}
	}

	/**
	 * Execute a function on every node of the tree, in key order
	 */
	executeOnEveryNode(fn: (bst: BST<K, V>) => void) {
		if (this.left) {
			this.left.executeOnEveryNode(fn);
		}
		fn(this);
		if (this.right) {
			this.right.executeOnEveryNode(fn);
		}
	}

	/**
	 * Pretty print a tree
	 */
	prettyPrint(printData: boolean, spacing = "") {
		console.log(`${spacing}* ${this.key}`);
		if (printData) {
			console.log(`${spacing}* ${this.data}`);
		}

		if (!this.left && !this.right) {
			return;
		}

		if (this.left) {
			this.left.prettyPrint(printData, `${spacing}  `);
		} else {
			console.log(`${spacing}  *`);
		}
		if (this.right) {
			this.right.prettyPrint(printData, `${spacing}  `);
		} else {
			console.log(`${spacing}  *`);
		}
	}
}

// Interface
export default BST;
