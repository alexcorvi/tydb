import { Node } from "./avl";
import { BST } from "./bst";
import * as utils from "./utils";

export interface initializationOptions<K, V> {
	key?: K;
	value?: V;
	unique?: boolean;
	compareKeys?: typeof utils.defaultCompareKeysFunction;
	checkValueEquality?: typeof utils.defaultCheckValueEquality;
}

export interface AVLOptions<K, V> extends initializationOptions<K, V> {
	left?: Node<K, V>;
	right?: Node<K, V>;
	parent?: Node<K, V>;
}

export interface BSTOptions<K, V> extends initializationOptions<K, V> {
	left?: BST<K, V>;
	right?: BST<K, V>;
	parent?: BST<K, V>;
}
