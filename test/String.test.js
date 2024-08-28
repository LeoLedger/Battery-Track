const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("String Library", function () {
    let StringTest;
    let stringTest;

    before(async function () {
        StringTest = await ethers.getContractFactory("StringTest");
        stringTest = await StringTest.deploy();
    });

    describe("toString", function () {
        it("Should convert a uint256 to string", async function () {
            const value = 123456;
            expect(await stringTest.uintToString(value)).to.equal("123456");
        });
    });

    describe("memcmp", function () {
        it("Should return true for identical byte arrays", async function () {
            const bytes1 = ethers.toUtf8Bytes("test");
            const bytes2 = ethers.toUtf8Bytes("test");
            expect(await stringTest.memcmp(bytes1, bytes2)).to.equal(true);
        });

        it("Should return false for different byte arrays", async function () {
            const bytes1 = ethers.toUtf8Bytes("test");
            const bytes2 = ethers.toUtf8Bytes("wrong");
            expect(await stringTest.memcmp(bytes1, bytes2)).to.equal(false);
        });
    });

    describe("strcmp", function () {
        it("Should return true for identical strings", async function () {
            expect(await stringTest.strcmp("test", "test")).to.equal(true);
        });

        it("Should return false for different strings", async function () {
            expect(await stringTest.strcmp("string", "strings")).to.equal(false);
        });
    });
});