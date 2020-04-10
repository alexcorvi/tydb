var should = require("chai").should(),
	assert = require("chai").assert,
	customUtils = require("../lib/customUtils"),
	fs = require("fs");
describe("customUtils", function () {
	describe("uid", function () {
		// Very small probability of conflict
		it("Generated uids should not be the same", function () {
			customUtils.uid(56).should.not.equal(customUtils.uid(56));
		});
	});
});
