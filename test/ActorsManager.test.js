const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ActorsManager", function () {
    let actorsManager, accessManager;
    let owner, authorizedContract, otherAccount, otherAccountTwo, donRouter;
    const VALID_HASH = "QmValidHash";
    const INVALID_HASH = "QmInvalidHash";
    const ACTOR_TYPE = 0;
    const ACTOR_ID = 1;

    beforeEach(async function () {
        [owner, authorizedContract, otherAccount, otherAccountTwo, donRouter] = await ethers.getSigners();

        const AccessManager = await ethers.getContractFactory("AccessManager");
        accessManager = await AccessManager.deploy(owner.address);
        await accessManager.grantAuthorizedContractRole(authorizedContract.address);
        await expect(await accessManager.hasRole(await accessManager.AUTHORIZED_CONTRACT_ROLE(), authorizedContract.address)).to.be.true;

        const ActorsManager = await ethers.getContractFactory("ActorsManager");
        actorsManager = await ActorsManager.deploy(accessManager.target, ethers.encodeBytes32String("donId"), donRouter.address, 1);

        await accessManager.grantAuthorizedContractRole(actorsManager.target);
        await expect(await accessManager.hasRole(await accessManager.AUTHORIZED_CONTRACT_ROLE(), actorsManager.target)).to.be.true;
    });

    describe("Actor Registration", function () {
        it("Should registerActor()", async function () {
            await actorsManager.connect(authorizedContract).registerActor(ACTOR_TYPE, otherAccount.address, VALID_HASH);
            await expect(await actorsManager.connect(authorizedContract).fulfillRequest(await actorsManager.requestIdCounter(), ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes('')))
                .to.emit(actorsManager, "ActorRegistered")
                .withArgs(ACTOR_TYPE, 0, otherAccount.address, VALID_HASH);
        });

        it("Should fail to registerActor() on don function compute error", async function () {
            await actorsManager.connect(authorizedContract).registerActor(ACTOR_TYPE, otherAccount.address, VALID_HASH);
            await expect(await actorsManager.connect(authorizedContract).fulfillRequest(await actorsManager.requestIdCounter(), ethers.toUtf8Bytes(''), ethers.toUtf8Bytes('invalid')))
                .to.emit(actorsManager, "ValidationFailed")
                .withArgs(ACTOR_TYPE, 0, VALID_HASH, ethers.toUtf8Bytes('invalid'));
        });

        it("Should fail to registerActor() with an invalid metadata", async function () {
            await actorsManager.connect(authorizedContract).registerActor(ACTOR_TYPE, otherAccount.address, INVALID_HASH);
            await expect(await actorsManager.connect(authorizedContract).fulfillRequest(await actorsManager.requestIdCounter(), ethers.toUtf8Bytes('false'), ethers.toUtf8Bytes('')))
                .to.emit(actorsManager, "ValidationFailed")
                .withArgs(ACTOR_TYPE, 0, INVALID_HASH, ethers.toUtf8Bytes('false'));
        });

        it("Should fail to registerActor() with invalid actor type", async function () {
            await expect(actorsManager.connect(authorizedContract).registerActor(7, otherAccount.address, VALID_HASH))
                .to.be.revertedWithCustomError(actorsManager, "InvalidActorType");
        });

        it("Should fail to registerActor() without the correct role", async function () {
            await expect(actorsManager.connect(otherAccount).registerActor(ACTOR_TYPE, otherAccount.address, VALID_HASH))
                .to.be.reverted;
        });
    });

    describe("Actor Update", function () {
        it("Should updateActor()", async function () {
            await actorsManager.connect(authorizedContract).updateActor(ACTOR_TYPE, ACTOR_ID, VALID_HASH)
            await expect(await actorsManager.connect(authorizedContract).fulfillRequest(await actorsManager.requestIdCounter(), ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes('')))
                .to.emit(actorsManager, "ActorUpdated")
                .withArgs(ACTOR_TYPE, ACTOR_ID, VALID_HASH);
        });

        it("Should fail to updateActor() on don function compute error", async function () {
            await actorsManager.connect(authorizedContract).updateActor(ACTOR_TYPE, ACTOR_ID, VALID_HASH);
            await expect(await actorsManager.connect(authorizedContract).fulfillRequest(await actorsManager.requestIdCounter(), ethers.toUtf8Bytes(''), ethers.toUtf8Bytes('invalid')))
                .to.emit(actorsManager, "ValidationFailed")
                .withArgs(ACTOR_TYPE, ACTOR_ID, VALID_HASH, ethers.toUtf8Bytes('invalid'));
        });

        it("Should fail to updateActor() with an invalid metadata", async function () {
            await actorsManager.connect(authorizedContract).updateActor(ACTOR_TYPE, ACTOR_ID, INVALID_HASH);
            await expect(await actorsManager.connect(authorizedContract).fulfillRequest(await actorsManager.requestIdCounter(), ethers.toUtf8Bytes('false'), ethers.toUtf8Bytes('')))
                .to.emit(actorsManager, "ValidationFailed")
                .withArgs(ACTOR_TYPE, ACTOR_ID, INVALID_HASH, ethers.toUtf8Bytes('false'));
        });

        it("Should fail to updateActor() with invalid actor type", async function () {
            await expect(actorsManager.connect(authorizedContract).updateActor(7, ACTOR_ID, VALID_HASH))
                .to.be.revertedWithCustomError(actorsManager, "InvalidActorType");
        });

        it("Should fail to updateActor() without the correct role", async function () {
            await expect(actorsManager.connect(otherAccount).updateActor(ACTOR_TYPE, ACTOR_ID, VALID_HASH))
                .to.be.reverted;
        });
    });

    describe("Actor Info", function () {
        it("Should return URI using getActorURI()", async function () {
            await actorsManager.connect(authorizedContract).registerActor(ACTOR_TYPE, otherAccount.address, VALID_HASH);
            await expect(await actorsManager.connect(authorizedContract).fulfillRequest(await actorsManager.requestIdCounter(), ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes('')))
                .to.emit(actorsManager, "ActorRegistered")
                .withArgs(ACTOR_TYPE, 0, otherAccount.address, VALID_HASH);
            const info = await actorsManager.getActorURI(ACTOR_TYPE, 0);
            expect(info).to.equal("ipfs://" + VALID_HASH);
        });

        it("Should fail to call getActorURI() with invalid actor type", async function () {
            await expect(actorsManager.getActorURI(7, ACTOR_ID))
                .to.be.revertedWithCustomError(actorsManager, "InvalidActorType");
        });
    });

    describe("Batch Actor Info", function () {
        it("Should return URIs with getActorsURIsInBatch()", async function () {
            const batchSize = 2;

            await actorsManager.connect(authorizedContract).registerActor(ACTOR_TYPE, otherAccount.address, VALID_HASH);
            await expect(await actorsManager.connect(authorizedContract).fulfillRequest(await actorsManager.requestIdCounter(), ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes('')))
                .to.emit(actorsManager, "ActorRegistered")
                .withArgs(ACTOR_TYPE, 0, otherAccount.address, VALID_HASH);
            await actorsManager.connect(authorizedContract).registerActor(ACTOR_TYPE, otherAccountTwo.address, VALID_HASH);
            await expect(await actorsManager.connect(authorizedContract).fulfillRequest(await actorsManager.requestIdCounter(), ethers.toUtf8Bytes('true'), ethers.toUtf8Bytes('')))
                .to.emit(actorsManager, "ActorRegistered")
                .withArgs(ACTOR_TYPE, 1, otherAccountTwo.address, VALID_HASH);
            const info = await actorsManager.connect(authorizedContract).getActorsURIsInBatch(ACTOR_TYPE, 0, 2);
            expect(info.length).to.equal(batchSize);
        });

        it("Should fail to getActorsURIsInBatch() with invalid actor type", async function () {
            await expect(actorsManager.getActorsURIsInBatch(7, 0, 2))
                .to.be.revertedWithCustomError(actorsManager, "InvalidActorType");
        });

        it("Should fail if batch size exceeds 100", async function () {
            await expect(actorsManager.getActorsURIsInBatch(ACTOR_TYPE, 0, 200))
                .to.be.revertedWithCustomError(actorsManager, "OutOfBounds");
        });

        it("Should fail if start index is out of bounds", async function () {
            await expect(actorsManager.getActorsURIsInBatch(ACTOR_TYPE, 200, 2))
                .to.be.revertedWithCustomError(actorsManager, "OutOfBounds");
        });
    });

    describe("Modifiers", function () {
        it("Should revert if actor type is invalid", async function () {
            await expect(actorsManager.getActorURI(7, ACTOR_ID))
                .to.be.revertedWithCustomError(actorsManager, "InvalidActorType");
        });

        it("Should revert if the account does not have the correct role", async function () {
            await expect(actorsManager.connect(otherAccount).updateActor(ACTOR_TYPE, ACTOR_ID, VALID_HASH))
                .to.be.reverted;
        });
    });
});