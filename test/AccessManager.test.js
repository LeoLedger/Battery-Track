const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("AccessManager", function () {
    let AccessManager, accessManager, owner, admin, companyUser, consumer, otherAccount, authorizedContract;

    beforeEach(async function () {
        [owner, admin, companyUser, consumer, otherAccount, authorizedContract] = await ethers.getSigners();
        AccessManager = await ethers.getContractFactory("AccessManager");
        accessManager = await AccessManager.deploy(owner.address);
        return accessManager;
    });

    describe("Deployment", function () {
        it("Should set the correct DEFAULT_ADMIN_ROLE", async function () {
            expect(await accessManager.hasRole(await accessManager.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
        });
    });

    describe("Authorized Contract Role Management", function () {
        it("Should grant AUTHORIZED_CONTRACT_ROLE by DEFAULT_ADMIN_ROLE", async function () {
            await accessManager.grantAuthorizedContractRole(authorizedContract.address);
            expect(await accessManager.hasRole(await accessManager.AUTHORIZED_CONTRACT_ROLE(), authorizedContract.address)).to.be.true;
        });

        it("Should emit AdminRoleGranted event", async function () {
            await expect(accessManager.grantAuthorizedContractRole(authorizedContract.address))
                .to.emit(accessManager, "AuthorizedContractRoleGranted")
                .withArgs(authorizedContract.address, anyValue);
        });

        it("Should revoke ADMIN_ROLE by DEFAULT_ADMIN_ROLE", async function () {
            await accessManager.grantAuthorizedContractRole(authorizedContract.address);
            await accessManager.revokeAuthorizedContractRole(authorizedContract.address);
            expect(await accessManager.hasRole(await accessManager.ADMIN_ROLE(), authorizedContract.address)).to.be.false;
        });

        it("Should emit AdminRoleRevoked event", async function () {
            await accessManager.grantAuthorizedContractRole(authorizedContract.address);
            await expect(accessManager.revokeAuthorizedContractRole(authorizedContract.address))
                .to.emit(accessManager, "AuthorizedContractRoleRevoked")
                .withArgs(authorizedContract.address, anyValue);
        });
    });

    describe("Admin Role Management", function () {
        it("Should grant ADMIN_ROLE by DEFAULT_ADMIN_ROLE", async function () {
            await accessManager.grantAdminRole(admin.address);
            expect(await accessManager.hasRole(await accessManager.ADMIN_ROLE(), admin.address)).to.be.true;
        });

        it("Should emit AdminRoleGranted event", async function () {
            await expect(accessManager.grantAdminRole(admin.address))
                .to.emit(accessManager, "AdminRoleGranted")
                .withArgs(admin.address, anyValue);
        });

        it("Should revoke ADMIN_ROLE by DEFAULT_ADMIN_ROLE", async function () {
            await accessManager.grantAdminRole(admin.address);
            await accessManager.revokeAdminRole(admin.address);
            expect(await accessManager.hasRole(await accessManager.ADMIN_ROLE(), admin.address)).to.be.false;
        });

        it("Should emit AdminRoleRevoked event", async function () {
            await accessManager.grantAdminRole(admin.address);
            await expect(accessManager.revokeAdminRole(admin.address))
                .to.emit(accessManager, "AdminRoleRevoked")
                .withArgs(admin.address, anyValue);
        });
    });

    describe("Company User Role Management", function () {
        it("Should grant COMPANY_USER_ROLE by ADMIN_ROLE", async function () {
            await accessManager.grantAdminRole(admin.address);
            await accessManager.connect(admin).grantCompanyUserRole(companyUser.address);
            expect(await accessManager.hasRole(await accessManager.COMPANY_USER_ROLE(), companyUser.address)).to.be.true;
        });

        it("Should emit CompanyUserRoleGranted event", async function () {
            await accessManager.grantAdminRole(admin.address);
            await expect(accessManager.connect(admin).grantCompanyUserRole(companyUser.address))
                .to.emit(accessManager, "CompanyUserRoleGranted")
                .withArgs(companyUser.address, anyValue);
        });

        it("Should revoke COMPANY_USER_ROLE by ADMIN_ROLE", async function () {
            await accessManager.grantAdminRole(admin.address);
            await accessManager.connect(admin).grantCompanyUserRole(companyUser.address);
            await accessManager.connect(admin).revokeCompanyUserRole(companyUser.address);
            expect(await accessManager.hasRole(await accessManager.COMPANY_USER_ROLE(), companyUser.address)).to.be.false;
        });

        it("Should emit CompanyUserRoleRevoked event", async function () {
            await accessManager.grantAdminRole(admin.address);
            await accessManager.connect(admin).grantCompanyUserRole(companyUser.address);
            await expect(accessManager.connect(admin).revokeCompanyUserRole(companyUser.address))
                .to.emit(accessManager, "CompanyUserRoleRevoked")
                .withArgs(companyUser.address, anyValue);
        });
    });

    describe("Consumer Role Management", function () {
        it("Should grant CONSUMER_ROLE by COMPANY_USER_ROLE", async function () {
            await accessManager.grantAdminRole(admin.address);
            await accessManager.connect(admin).grantCompanyUserRole(companyUser.address);
            await accessManager.connect(companyUser).grantConsumerRole(consumer.address);
            expect(await accessManager.hasRole(await accessManager.CONSUMER_ROLE(), consumer.address)).to.be.true;
        });

        it("Should revoke CONSUMER_ROLE by COMPANY_USER_ROLE", async function () {
            await accessManager.grantAdminRole(admin.address);
            await accessManager.connect(admin).grantCompanyUserRole(companyUser.address);
            await accessManager.connect(companyUser).grantConsumerRole(consumer.address);
            await accessManager.connect(companyUser).revokeConsumerRole(consumer.address);
            expect(await accessManager.hasRole(await accessManager.CONSUMER_ROLE(), consumer.address)).to.be.false;
        });
    });

    describe("Default Admin Role Transfer", function () {
        it("Should transfer DEFAULT_ADMIN_ROLE", async function () {
            await accessManager.transferDefaultAdminRole(admin.address);
            expect(await accessManager.hasRole(await accessManager.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
            expect(await accessManager.hasRole(await accessManager.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.false;
        });

        it("Should emit DefaultAdminRoleTransferred event", async function () {
            await expect(accessManager.transferDefaultAdminRole(admin.address))
                .to.emit(accessManager, "DefaultAdminRoleTransferred")
                .withArgs(admin.address, owner.address, anyValue);
        });
    });

    describe("Clearance Level Modifiers", function () {
        it("Should restrict grantCompanyUserRole to onlyClearanceLevelA", async function () {
            await expect(accessManager.connect(otherAccount).grantCompanyUserRole(companyUser.address)).to.be.revertedWithCustomError(accessManager, "UnAuthorized");
        });

        it("Should restrict grantConsumerRole to onlyClearanceLevelB", async function () {
            await expect(accessManager.connect(otherAccount).grantConsumerRole(consumer.address)).to.be.revertedWithCustomError(accessManager, "UnAuthorized");
        });
    });

    describe("Role Queries", function () {
        it("Should return the current DEFAULT_ADMIN_ROLE", async function () {
            expect(await accessManager.getCurrentDefaultAdmin()).to.equal(owner.address);
        });

        it("Should return all ADMIN_ROLE", async function () {
            await accessManager.grantAuthorizedContractRole(authorizedContract.address);
            const contracts = await accessManager.getCurrentContracts();
            expect(contracts).to.include(authorizedContract.address);
        });

        it("Should return all ADMIN_ROLE", async function () {
            await accessManager.grantAdminRole(admin.address);
            const admins = await accessManager.getCurrentAdmins();
            expect(admins).to.include(admin.address);
        });

        it("Should return all current COMPANY_USER_ROLE", async function () {
            await accessManager.grantAdminRole(admin.address);
            await accessManager.connect(admin).grantCompanyUserRole(companyUser.address);
            const companyUsers = await accessManager.getCurrentCompanyUsers(10);
            expect(companyUsers).to.include(companyUser.address);
        });

        it("Should return the queried number of COMPANY_USER_ROLE", async function () {
            await accessManager.grantAdminRole(admin.address);
            await accessManager.connect(admin).grantCompanyUserRole(companyUser.address);
            const companyUsers = await accessManager.getCurrentCompanyUsers(1);
            expect(companyUsers.length).to.equal(1);
        });

        it("Should return all current CONSUMER_ROLE", async function () {
            await accessManager.grantAdminRole(admin.address);
            await accessManager.connect(admin).grantCompanyUserRole(companyUser.address);
            await accessManager.connect(companyUser).grantConsumerRole(consumer.address);
            const consumers = await accessManager.getCurrentConsumers(10);
            expect(consumers).to.include(consumer.address);
        });

        it("Should return the queried number of CONSUMER_ROLE", async function () {
            await accessManager.grantAdminRole(admin.address);
            await accessManager.connect(admin).grantCompanyUserRole(companyUser.address);
            await accessManager.connect(companyUser).grantConsumerRole(consumer.address);
            const consumers = await accessManager.getCurrentConsumers(1);
            expect(consumers.length).to.equal(1);
        });
    });
});
