const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChain", function () {
    let SupplyChain, supplyChain, AccessManager, accessManager, BatchManager, batchManager;
    let ActorsManager, actorsManager, owner, addr1;
    let rawMaterialSupplier, rawProcessor, batteryManufacturer, distributor, retailer;
    const VALID_HASH = "QmValidHash";
    const CALLBACK_FUNCTION = "0x12345678";

    beforeEach(async function () {
        [owner, addr1, donRouter, supplyChainStub,
            rawMaterialSupplier, rawProcessor, batteryManufacturer, distributor, retailer
        ] = await ethers.getSigners();

        AccessManager = await ethers.getContractFactory("AccessManager");
        accessManager = await AccessManager.deploy(owner.address);

        await accessManager.grantCompanyUserRole(owner.address);
        await accessManager.grantAdminRole(owner.address);
        await accessManager.grantAuthorizedContractRole(owner.address);

        ActorsManager = await ethers.getContractFactory("ActorsManager");
        actorsManager = await ActorsManager.deploy(accessManager.target, ethers.encodeBytes32String("donId"), donRouter.address, 1);

        BatchManager = await ethers.getContractFactory("BatchManager");
        batchManager = await BatchManager.deploy(accessManager.target, supplyChainStub.address, ethers.encodeBytes32String("donId"), donRouter.address, 1);
        await accessManager.grantAuthorizedContractRole(batchManager.target);

        SupplyChain = await ethers.getContractFactory("SupplyChain");
        supplyChain = await SupplyChain.deploy(accessManager.target, actorsManager.target, batchManager.target);
        await accessManager.grantAuthorizedContractRole(supplyChain.target);
        await batchManager.setSupplyChainAddress(supplyChain.target);
    });

    describe("Deployment", function () {
        it("Should set the correct ACL address", async function () {
            expect(await supplyChain.acl()).to.equal(accessManager.target);
        });

        it("Should deploy the BatchManager contract", async function () {
            expect(await supplyChain.batchManager()).to.be.properAddress;
        });

        it("Should set the correct ActorsManager address", async function () {
            expect(await supplyChain.actorsManager()).to.equal(actorsManager.target);
        });
    });

    describe("Addition & Update", function () {
        it("Should performBatchCreation()", async function () {
            await actorsManager.registerActor(0, rawMaterialSupplier.address, VALID_HASH);
            await batchManager.createBatch(0, VALID_HASH, CALLBACK_FUNCTION);
            await supplyChain.performBatchCreation(0);
            const batches = await supplyChain.getBatchesHarvested(0);
            expect(batches.length).to.equal(1);
            expect(batches[0]).to.equal(0); // batchId
        });

        it("Should performBatchUpdate() for Processed state", async function () {
            const batch = {
                batchId: 0,
                state: 1, // Processed
                isCertified: true,
                qualityControlApproved: true,
                rawMaterialSupplierId: 0,
                rawProcessorId: 0,
                batteryManufacturerId: 0,
                distributorsCount: 0,
                retailersCount: 0,
                distributorIds: [0],
                retailerIds: [0]
            };
            await actorsManager.registerActor(0, rawMaterialSupplier.address, VALID_HASH); // rawMaterialSupplier
            await actorsManager.registerActor(1, rawProcessor.address, VALID_HASH); // rawProcessor

            await supplyChain.addHarvestedBatch(0, VALID_HASH);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchCreation(0);

            await batchManager.updateBatch(batch, VALID_HASH, CALLBACK_FUNCTION);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchUpdate(0);

            const batches = await supplyChain.getBatchesProcessed(0);
            expect(batches.length).to.equal(1);
            expect(batches[0]).to.equal(0);
        });

        it("Should performBatchUpdate() for Packaged state", async function () {
            const batch = {
                batchId: 0,
                state: 2, // Packaged
                isCertified: true,
                qualityControlApproved: true,
                rawMaterialSupplierId: 0,
                rawProcessorId: 0,
                batteryManufacturerId: 0,
                distributorsCount: 0,
                retailersCount: 0,
                distributorIds: [0],
                retailerIds: [0]
            };

            await actorsManager.registerActor(0, rawMaterialSupplier.address, VALID_HASH); // rawMaterialSupplier
            await actorsManager.registerActor(1, rawProcessor.address, VALID_HASH); // rawProcessor
            await actorsManager.registerActor(2, batteryManufacturer.address, VALID_HASH); // batteryManufacturer

            await supplyChain.addHarvestedBatch(0, VALID_HASH);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchCreation(0);

            await batchManager.updateBatch(batch, VALID_HASH, CALLBACK_FUNCTION);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchUpdate(0);

            const batches = await supplyChain.getBatchesPackaged(0);
            expect(batches.length).to.equal(1);
            expect(batches[0]).to.equal(0);
        });

        it("Should performBatchUpdate() for AtDistributors state", async function () {
            const batch = {
                batchId: 0,
                state: 3, // Distributed
                isCertified: true,
                qualityControlApproved: true,
                rawMaterialSupplierId: 0,
                rawProcessorId: 0,
                batteryManufacturerId: 0,
                distributorsCount: 1, // Distributor Added
                retailersCount: 0,
                distributorIds: [0],
                retailerIds: [0]
            };

            await actorsManager.registerActor(0, rawMaterialSupplier.address, VALID_HASH); // rawMaterialSupplier
            await actorsManager.registerActor(1, rawProcessor.address, VALID_HASH); // rawProcessor
            await actorsManager.registerActor(2, batteryManufacturer.address, VALID_HASH); // batteryManufacturer
            await actorsManager.registerActor(3, distributor.address, VALID_HASH); // distributor

            await supplyChain.addHarvestedBatch(0, VALID_HASH);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchCreation(0);

            await batchManager.updateBatch(batch, VALID_HASH, CALLBACK_FUNCTION);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchUpdate(0);

            const batches = await supplyChain.getBatchesDistributed(0);
            expect(batches.length).to.equal(1);
            expect(batches[0]).to.equal(0);
        });

        it("Should performBatchUpdate() for AtRetailers state", async function () {
            const batch = {
                batchId: 0,
                state: 4, // Distributed
                isCertified: true,
                qualityControlApproved: true,
                rawMaterialSupplierId: 0,
                rawProcessorId: 0,
                batteryManufacturerId: 0,
                distributorsCount: 1,
                retailersCount: 1, // Now a Retailer Added
                distributorIds: [0],
                retailerIds: [0]
            };

            await actorsManager.registerActor(0, rawMaterialSupplier.address, VALID_HASH); // rawMaterialSupplier
            await actorsManager.registerActor(1, rawProcessor.address, VALID_HASH); // rawProcessor
            await actorsManager.registerActor(2, batteryManufacturer.address, VALID_HASH); // batteryManufacturer
            await actorsManager.registerActor(3, distributor.address, VALID_HASH); // distributor
            await actorsManager.registerActor(4, retailer.address, VALID_HASH); // retailer

            await supplyChain.addHarvestedBatch(0, VALID_HASH);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchCreation(0);

            await batchManager.updateBatch(batch, VALID_HASH, CALLBACK_FUNCTION);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchUpdate(0);

            const batches = await supplyChain.getBatchesRetailed(0);
            expect(batches.length).to.equal(1);
            expect(batches[0]).to.equal(0);
        });

        it("Should addHarvestedBatch()", async function () {
            await actorsManager.registerActor(0, rawMaterialSupplier.address, VALID_HASH);
            await supplyChain.addHarvestedBatch(0, VALID_HASH);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes("true"), ethers.toUtf8Bytes(""));
            await supplyChain.performBatchCreation(0);
            const batches = await supplyChain.getBatchesHarvested(0);
            expect(batches.length).to.equal(1);
            expect(batches[0]).to.equal(0);
        });

        it("Should revert addHarvestedBatch() if UnAuthorized", async function () {
            await expect(supplyChain.connect(addr1).addHarvestedBatch(1, VALID_HASH))
                .to.be.revertedWithCustomError(supplyChain, "UnAuthorized");
        });

        it("Should updateBatchState()", async function () {
            const batch = {
                batchId: 0,
                state: 1,
                isCertified: true,
                qualityControlApproved: true,
                rawMaterialSupplierId: 1,
                rawProcessorId: 0,
                batteryManufacturerId: 3,
                distributorsCount: 1,
                retailersCount: 1,
                distributorIds: [4],
                retailerIds: [5]
            };
            await actorsManager.registerActor(0, rawMaterialSupplier.address, VALID_HASH);
            await batchManager.createBatch(0, VALID_HASH, CALLBACK_FUNCTION);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.updateBatchState(batch, VALID_HASH);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes("true"), ethers.toUtf8Bytes(""));
            await supplyChain.performBatchUpdate(batch.batchId);
            const batches = await supplyChain.getBatchesProcessed(0);
            expect(batches.length).to.equal(1);
            expect(batches[0]).to.equal(0);
        });

        it("Should revert updateBatchState() if UnAuthorized", async function () {
            const batch = {
                batchId: 0,
                state: 1,
                isCertified: true,
                qualityControlApproved: true,
                rawMaterialSupplierId: 1,
                rawProcessorId: 2,
                batteryManufacturerId: 3,
                distributorsCount: 1,
                retailersCount: 1,
                distributorIds: [4],
                retailerIds: [5]
            };
            await expect(supplyChain.connect(addr1).updateBatchState(batch, VALID_HASH))
                .to.be.revertedWithCustomError(supplyChain, "UnAuthorized");
        });
    });

    describe("Batch retrieval", function () {
        beforeEach(async function () {
            let batch = {
                batchId: 0,
                state: 0, // Distributed
                isCertified: true,
                qualityControlApproved: true,
                rawMaterialSupplierId: 0,
                rawProcessorId: 0,
                batteryManufacturerId: 0,
                distributorsCount: 1,
                retailersCount: 1, // Now a Retailer Added
                distributorIds: [0],
                retailerIds: [0]
            };

            await actorsManager.registerActor(0, rawMaterialSupplier.address, VALID_HASH); // rawMaterialSupplier
            await actorsManager.registerActor(1, rawProcessor.address, VALID_HASH); // rawProcessor
            await actorsManager.registerActor(2, batteryManufacturer.address, VALID_HASH); // batteryManufacturer
            await actorsManager.registerActor(3, distributor.address, VALID_HASH); // distributor
            await actorsManager.registerActor(4, retailer.address, VALID_HASH); // retailer

            await supplyChain.addHarvestedBatch(0, VALID_HASH);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchCreation(0);

            // Update on Processed Stage
            batch.state++;
            await batchManager.updateBatch(batch, VALID_HASH, CALLBACK_FUNCTION);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchUpdate(0);

            // Update on Packaged Stage
            batch.state++;
            await batchManager.updateBatch(batch, VALID_HASH, CALLBACK_FUNCTION);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchUpdate(0);

            // Update on Distributed Stage
            batch.state++;
            await batchManager.updateBatch(batch, VALID_HASH, CALLBACK_FUNCTION);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchUpdate(0);

            // Update on Retailed Stage
            batch.state++;
            await batchManager.updateBatch(batch, VALID_HASH, CALLBACK_FUNCTION);
            await batchManager.fulfillRequest(0, ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes(''));
            await supplyChain.performBatchUpdate(0);
        });

        it("Should getBatchesHarvested(rawMaterialSupplierId)", async function () {
            const batches = await supplyChain.getBatchesHarvested(0);
            expect(batches.length).to.equal(1);
        });

        it("Should getBatchesProcessed(rawProcessorId)", async function () {
            const batches = await supplyChain.getBatchesProcessed(0);
            expect(batches.length).to.equal(1);
        });

        it("Should getBatchesPackaged(batteryManufacturerId)", async function () {
            const batches = await supplyChain.getBatchesPackaged(0);
            expect(batches.length).to.equal(1);
        });

        it("Should getBatchesDistributed(distributorId)", async function () {
            const batches = await supplyChain.getBatchesDistributed(0);
            expect(batches.length).to.equal(1);
        });

        it("Should getBatchesRetailed(retailerId)", async function () {
            const batches = await supplyChain.getBatchesRetailed(0);
            expect(batches.length).to.equal(1);
        });
    });
});
