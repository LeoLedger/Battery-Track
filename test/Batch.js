const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Batch", function () {
    let owner, authorizedContract, account1, account2;
    let batch, accessManager;
    const hash = "QmX...TESTHASH";
    const newHash = "QmX...NEWTESTHASH";

    beforeEach(async function () {
        [owner, authorizedContract, account1, account2] = await ethers.getSigners();
        const AccessManager = await ethers.getContractFactory("AccessManager");
        accessManager = await AccessManager.deploy(owner.address);
        await accessManager.grantAuthorizedContractRole(authorizedContract.address);

        const Batch = await ethers.getContractFactory("Batch");
        batch = await Batch.deploy(accessManager.target, "Batch", "B");
        return batch;
    });

    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            expect(await batch.name()).to.equal("Batch");
            expect(await batch.symbol()).to.equal("B");
        });
    });

    describe("Create Batch", function () {
        it("Should createBatch(), set token URI & return the Id", async function () {
            await batch.connect(authorizedContract).createBatch(account1.address, hash);
            const batchId = 0;
            expect(await batch.ownerOf(batchId)).to.equal(account1.address);
            expect(await batch.tokenURI(batchId)).to.equal(`ipfs://${hash}`);
        });

        it("Should increment the batch Id correctly", async function () {
            await batch.connect(authorizedContract).createBatch(account1.address, "hash1");
            await batch.connect(authorizedContract).createBatch(account2.address, "hash2");
            expect(await batch.ownerOf(0)).to.equal(account1.address);
            expect(await batch.ownerOf(1)).to.equal(account2.address);
        });

        it("Should return true if idExists()", async function () {
            expect(await batch.idExists(0)).to.be.false;
            await batch.connect(authorizedContract).createBatch(account1.address, hash);
            expect(await batch.idExists(0)).to.be.true;
        });

        it("Should return false if idExists()", async function () {
            const exists = await batch.idExists(await batch.totalSupply());
            expect(exists).to.be.false;
        });
    });

    describe("Update Batch", function () {
        it("Should updateBatch() token URI", async function () {
            await batch.connect(authorizedContract).createBatch(account1.address, hash);
            const tokenId = 0;
            await batch.connect(authorizedContract).updateBatch(tokenId, newHash);
            expect(await batch.tokenURI(tokenId)).to.equal(`ipfs://${newHash}`);
        });
    });

    describe("ERC721 Overrides", function () {
        it("Should support the necessary interfaces", async function () {
            expect(await batch.supportsInterface("0x80ac58cd")).to.be.true; // ERC721
            expect(await batch.supportsInterface("0x5b5e139f")).to.be.true; // ERC721Metadata
            expect(await batch.supportsInterface("0x780e9d63")).to.be.true; // ERC721Enumerable
        });

        it("Should return the correct tokenURI", async function () {
            await batch.connect(authorizedContract).createBatch(account1.address, hash);
            const tokenId = 0;
            expect(await batch.tokenURI(tokenId)).to.equal(`ipfs://${hash}`);
        });
    });

    describe("Soulbound Tokens", function () {
        it("Should revert on transferFrom()", async function () {
            await batch.connect(authorizedContract).createBatch(account1.address, "hash1");
            const tokenId = 0;
            await expect(batch.connect(account1).transferFrom(account1.address, account2.address, tokenId))
                .to.be.revertedWithCustomError(batch, "SoulBoundTransferNotAllowed");
        });

        it("Should revert on safeTransferFrom()", async function () {
            await batch.connect(authorizedContract).createBatch(account1.address, "hash1");
            const tokenId = 0;
            await expect(batch.connect(account1)["safeTransferFrom(address,address,uint256)"](account1.address, account2.address, tokenId))
                .to.be.revertedWithCustomError(batch, "SoulBoundTransferNotAllowed");
        });

        it("Should revert on safeTransferFrom(data)", async function () {
            await batch.connect(authorizedContract).createBatch(account1.address, "hash1");
            const tokenId = 0;
            await expect(batch.connect(account1)["safeTransferFrom(address,address,uint256,bytes)"](account1.address, account2.address, tokenId, "0x"))
                .to.be.revertedWithCustomError(batch, "SoulBoundTransferNotAllowed");
        });
    });
});
