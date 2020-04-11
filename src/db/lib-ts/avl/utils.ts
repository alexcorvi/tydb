import { Comparator, Node } from "./types";

/**
 * Prints tree horizontally
 */
export function print(
	root: Node | undefined,
	printNode = (n: Node) => n.key
): string {
	var out: string[] = [];
	row(root, "", true, (v) => out.push(v), printNode);
	return out.join("");
}

/**
 * Prints level of the tree
 */
function row(
	root: Node | undefined,
	prefix: string,
	isTail: boolean,
	out: (x: string) => void,
	printNode: (n: Node) => string
) {
	if (root) {
		out(`${prefix}${isTail ? "└── " : "├── "}${printNode(root)}\n`);
		const indent = prefix + (isTail ? "    " : "│   ");
		if (root.left) row(root.left, indent, false, out, printNode);
		if (root.right) row(root.right, indent, true, out, printNode);
	}
}

/**
 * Is the tree balanced (none of the subtrees differ in height by more than 1)
 * @param  {Node}    root
 * @return {Boolean}
 */
export function isBalanced(root?: Node): boolean {
	if (root === null || root === undefined) return true; // If node is empty then return true

	// Get the height of left and right sub trees
	var lh = height(root.left);
	var rh = height(root.right);

	if (
		Math.abs(lh - rh) <= 1 &&
		isBalanced(root.left) &&
		isBalanced(root.right)
	)
		return true;

	// If we reach here then tree is not height-balanced
	return false;
}

/**
 * The function Compute the 'height' of a tree.
 * Height is the number of nodes along the longest path
 * from the root node down to the farthest leaf node.
 *
 */
function height(node?: Node): number {
	return node ? 1 + Math.max(height(node.left), height(node.right)) : 0;
}

export function loadRecursive<Key, Value>(
	parent: Node | undefined,
	keys: Key[],
	values: Value[],
	start: number,
	end: number
): Node | undefined {
	const size = end - start;
	if (size > 0) {
		const middle = start + Math.floor(size / 2);
		const key = keys[middle];
		const data = values[middle];
		const node: any = { key, data, parent };
		node.left = loadRecursive(node, keys, values, start, middle);
		node.right = loadRecursive(node, keys, values, middle + 1, end);
		return node;
	}
	return undefined;
}

export function markBalance(node: Node | undefined): number {
	if (node === undefined) return 0;
	const lh = markBalance(node.left);
	const rh = markBalance(node.right);

	node.balanceFactor = lh - rh;
	return Math.max(lh, rh) + 1;
}

export function sort<Key, Value>(
	keys: Key[],
	values: Value[],
	left: number,
	right: number,
	compare: Comparator<any>
) {
	if (left >= right) return;

	// eslint-disable-next-line no-bitwise
	const pivot = keys[(left + right) >> 1];
	let i = left - 1;
	let j = right + 1;

	// eslint-disable-next-line no-constant-condition
	while (true) {
		do i++;
		while (compare(keys[i], pivot) < 0);
		do j--;
		while (compare(keys[j], pivot) > 0);
		if (i >= j) break;

		let tmp: any = keys[i];
		keys[i] = keys[j];
		keys[j] = tmp;

		tmp = values[i];
		values[i] = values[j];
		values[j] = tmp;
	}

	sort(keys, values, left, j, compare);
	sort(keys, values, j + 1, right, compare);
}
