import { assert, expect, should, use } from "chai";
import * as asPromised from "chai-as-promised";
import * as fs from "fs";
import * as path from "path";
import * as _ from "underscore";
import { promisify } from "util";
import {
	Datastore,
	Cursor,
	Index,
	Persistence,
	customUtils,
	BST,
	storage,
	AVLTree,
} from "@core";
use(asPromised);
should();

describe("customUtils", () => {
	describe("uid", () => {
		// Very small probability of conflict
		it("Generated uids should not be the same", () => {
			customUtils.uid().should.not.equal(customUtils.uid());
		});

		it("Generated random strings should not be the same", () => {
			customUtils
				.randomString(56)
				.should.not.equal(customUtils.randomString(56));
		});
	});
});
