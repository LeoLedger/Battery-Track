const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("BatchManager", function () {
    let batchManager, accessManager, batch, supplyChainContract;
    let owner, authorizedContract, admin, otherAccount;
    const VALID_HASH = "QmValidHash";
    const INVALID_HASH = "QmInvalidHash";
    const FARMER_ID = 1;
    const CALLBACK_FUNCTION = "0x12345678";
    const DON_ID = ethers.encodeBytes32String("donId");
    const DON_SUBSCRIPTION_ID = 1;
    const batchInfo = {
        batchId: 0,
        state: 1,
        isCertified: true,
        qualityControlApproved: false,
        farmerId: FARMER_ID,
        processorId: 2,
        packagerId: 3,
        distributorsCount: 1,
        retailersCount: 1,
        distributorIds: [4],
        retailerIds: [5]
    };
    const batchInfoTemp = {
        batchId: 0,
        state: 2,
        isCertified: true,
        qualityControlApproved: true,
        farmerId: FARMER_ID,
        processorId: 2,
        packagerId: 3,
        distributorsCount: 1,
        retailersCount: 1,
        distributorIds: [4],
        retailerIds: [5]
    };

    beforeEach(async function () {
        [owner, authorizedContract, admin, otherAccount] = await ethers.getSigners();

        const AccessManager = await ethers.getContractFactory("AccessManager");
        accessManager = await AccessManager.deploy(owner.address);

        await accessManager.grantAuthorizedContractRole(authorizedContract.address);
        await accessManager.grantAdminRole(admin.address);

        const Batch = await ethers.getContractFactory("Batch");
        batch = await Batch.deploy(accessManager.target, "Batch", "B");

        const BatchManager = await ethers.getContractFactory("BatchManager");
        batchManager = await BatchManager.deploy(accessManager.target, owner.address, DON_ID, ethers.ZeroAddress, DON_SUBSCRIPTION_ID);

        await accessManager.grantAuthorizedContractRole(batchManager.target);
    });

    describe("Batch Creation", function () {
        it("Should createBatch()", async function () {
            await batchManager.connect(authorizedContract).createBatch(FARMER_ID, VALID_HASH, CALLBACK_FUNCTION);
            const requestId = await batchManager.requestIdCounter();
            await expect(await batchManager.connect(authorizedContract).fulfillRequest(requestId, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes('')))
                .to.emit(batchManager, "BatchCreated")
                .withArgs(requestId, VALID_HASH, anyValue);
        });

        it("Should fail to createBatch() with invalid metadata", async function () {
            await batchManager.connect(authorizedContract).createBatch(FARMER_ID, INVALID_HASH, CALLBACK_FUNCTION);
            const requestId = await batchManager.requestIdCounter();
            await expect(await batchManager.connect(authorizedContract).fulfillRequest(requestId, ethers.toUtf8Bytes('false'), ethers.toUtf8Bytes('')))
                .to.emit(batchManager, "DataCertificationFailed")
                .withArgs(0, INVALID_HASH, ethers.toUtf8Bytes('false'));
        });

        it("Should fail to createBatch() if UnAuthorized", async function () {
            await expect(batchManager.connect(otherAccount).createBatch(FARMER_ID, VALID_HASH, CALLBACK_FUNCTION))
                .to.be.revertedWithCustomError(batchManager, "UnAuthorized");
        });
    });

    describe("Batch Update", function () {
        it("Should updateBatch()", async function () {
            await batchManager.connect(authorizedContract).createBatch(0, VALID_HASH, CALLBACK_FUNCTION);
            await batchManager.connect(authorizedContract).fulfillRequest(0, ethers.toUtf8Bytes("true"), ethers.toUtf8Bytes(""));
            await batchManager.connect(authorizedContract).updateBatch(batchInfo, VALID_HASH, CALLBACK_FUNCTION);
            const requestId = await batchManager.requestIdCounter();
            await expect(await batchManager.connect(authorizedContract).fulfillRequest(requestId, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes('')))
                .to.emit(batchManager, "BatchStatusUpdated")
                .withArgs(batchInfo.batchId, batchInfo.state, VALID_HASH, anyValue);
        });

        it("Should fail to updateBatch() with invalid metadata", async function () {
            await batchManager.connect(authorizedContract).createBatch(0, VALID_HASH, CALLBACK_FUNCTION);
            await batchManager.connect(authorizedContract).fulfillRequest(0, ethers.toUtf8Bytes("true"), ethers.toUtf8Bytes(""));
            await batchManager.connect(authorizedContract).updateBatch(batchInfo, INVALID_HASH, CALLBACK_FUNCTION);
            const requestId = await batchManager.requestIdCounter();
            await expect(await batchManager.connect(authorizedContract).fulfillRequest(requestId, ethers.toUtf8Bytes('false'), ethers.toUtf8Bytes('')))
                .to.emit(batchManager, "DataCertificationFailed")
                .withArgs(batchInfo.batchId, INVALID_HASH, ethers.toUtf8Bytes('false'));
        });

        it("Should fail to updateBatch() if UnAuthorized", async function () {
            await expect(batchManager.connect(otherAccount).updateBatch(batchInfo, VALID_HASH, CALLBACK_FUNCTION))
                .to.be.revertedWithCustomError(batchManager, "UnAuthorized");
        });

        it("Should setBatch() information", async function () {
            await batchManager.connect(authorizedContract).setBatch(1, batchInfo);
            const result = await batchManager.getUpdatedBatchActors(1);
            expect(result[0]).to.equal(batchInfo.state);
            expect(result[1]).to.equal(batchInfo.processorId);
            expect(result[2]).to.equal(batchInfo.packagerId);
            expect(result[3]).to.equal(batchInfo.distributorsCount);
            expect(result[4]).to.equal(batchInfo.retailersCount);
            expect(result[5][0]).to.equal(batchInfo.distributorIds[0]);
            expect(result[6][0]).to.equal(batchInfo.retailerIds[0]);
        });

        it("Should revert setBatch() if UnAuthorized", async function () {
            await expect(batchManager.connect(otherAccount).setBatch(1, batchInfo))
                .to.be.revertedWithCustomError(batchManager, "UnAuthorized");
        });
    });

    describe("Batch Info & URI", function () {
        it("Should getBatchURI()", async function () {
            await batchManager.connect(authorizedContract).createBatch(FARMER_ID, VALID_HASH, CALLBACK_FUNCTION);
            const requestId = await batchManager.requestIdCounter();
            await batchManager.connect(authorizedContract).fulfillRequest(requestId, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            const uri = await batchManager.getBatchURI(requestId);
            expect(uri).to.equal("ipfs://" + VALID_HASH);
        });

        it("Should getBatchURIsInBatch()", async function () {
            const batchSize = 2;
            await batchManager.connect(authorizedContract).createBatch(FARMER_ID, VALID_HASH, CALLBACK_FUNCTION);
            let requestId = await batchManager.requestIdCounter();
            await batchManager.connect(authorizedContract).fulfillRequest(requestId, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));

            await batchManager.connect(authorizedContract).createBatch(FARMER_ID, VALID_HASH, CALLBACK_FUNCTION);
            requestId = await batchManager.requestIdCounter();
            await batchManager.connect(authorizedContract).fulfillRequest(requestId, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));

            const uris = await batchManager.getBatchURIsInBatch(0, batchSize);
            expect(uris.length).to.equal(batchSize);
        });

        it("Should fail to getBatchURIsInBatch() with invalid cursor", async function () {
            await expect(batchManager.getBatchURIsInBatch(200, 2))
                .to.be.revertedWithCustomError(batchManager, "OutOfBounds");
        });

        it("Should fail to getBatchURIsInBatch() with invalid page size", async function () {
            await expect(batchManager.getBatchURIsInBatch(0, 200))
                .to.be.revertedWithCustomError(batchManager, "OutOfBounds");
        });

        it("Should getUpdatedBatchActors()", async function () {
            await batchManager.connect(authorizedContract).setBatch(1, batchInfo);
            const result = await batchManager.getUpdatedBatchActors(1);
            expect(result[0]).to.equal(batchInfo.state);
            expect(result[1]).to.equal(batchInfo.processorId);
            expect(result[2]).to.equal(batchInfo.packagerId);
            expect(result[3]).to.equal(batchInfo.distributorsCount);
            expect(result[4]).to.equal(batchInfo.retailersCount);
            expect(result[5][0]).to.equal(batchInfo.distributorIds[0]);
            expect(result[6][0]).to.equal(batchInfo.retailerIds[0]);
        });

        it("Should getBatchFarmerId()", async function () {
            await batchManager.connect(authorizedContract).setBatch(1, batchInfoTemp);
            const farmerId = await batchManager.getBatchFarmerId(1);
            expect(farmerId).to.equal(FARMER_ID);
        });
    });

    describe("Access Control", function () {
        it("Should allow admin to setSupplyChainAddress()", async function () {
            await batchManager.connect(admin).setSupplyChainAddress(otherAccount.address);
            expect(await batchManager.supplyChainContract()).to.equal(otherAccount.address);
        });

        it("Should revert setSupplyChainAddress() if UnAuthorized", async function () {
            await expect(batchManager.connect(otherAccount).setSupplyChainAddress(otherAccount.address))
                .to.be.revertedWithCustomError(batchManager, "UnAuthorized");
        });
    });
});
