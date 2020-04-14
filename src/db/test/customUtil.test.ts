import * as customUtils from "../lib/customUtils";
import { assert } from "chai";
import fs from "fs";
const should = require("chai").should();
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
