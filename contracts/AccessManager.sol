// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IAccessControl } from "@openzeppelin/contracts/access/IAccessControl.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { AccessControlEnumerable } from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import { Errors } from "./Errors.sol";

contract AccessManager is AccessControl, AccessControlEnumerable {
    bytes32 public constant AUTHORIZED_CONTRACT_ROLE = keccak256("AUTHORIZED_CONTRACT_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant COMPANY_USER_ROLE = keccak256("COMPANY_USER_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");

    event DefaultAdminRoleTransferred(address indexed defaultAdmin, address previousDefaultAdmin, uint256 timestamp);
    event AuthorizedContractRoleGranted(address indexed contractAddress, uint256 timestamp);
    event AuthorizedContractRoleRevoked(address indexed contractAddress, uint256 timestamp);
    event AdminRoleGranted(address indexed admin, uint256 timestamp);
    event AdminRoleRevoked(address indexed admin, uint256 timestamp);
    event CompanyUserRoleGranted(address indexed companyUser, uint256 timestamp);
    event CompanyUserRoleRevoked(address indexed companyUser, uint256 timestamp);

    /**
    * @dev Throws `UnAuthorized` if called by any account other than the Admin or Default (Super) Admin.
    */
    modifier onlyClearanceLevelA() {
        if (!(hasRole(ADMIN_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender)))
            revert Errors.UnAuthorized("ADMIN_ROLE");
        _;
    }

    /**
    * @dev Throws `UnAuthorized` if called by any account other than company user, Admin or Default (Super) Admin.
    */
    modifier onlyClearanceLevelB() {
        if (!(hasRole(COMPANY_USER_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender)))
            revert Errors.UnAuthorized("COMPANY_USER_ROLE");
        _;
    }

    /**
    * @dev Sets the Default (Super) Admin.
    */
    constructor(address defaultAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }

    /// Authorized Contract Role
    /**
    * @dev grants the AUTHORIZED_CONTRACT_ROLE to the provided address.
    * Necessary for all guarded external calls in between contracts.
    */
    function grantAuthorizedContractRole(address contractAddress) public onlyClearanceLevelA {
        _grantRole(AUTHORIZED_CONTRACT_ROLE, contractAddress);
        emit AuthorizedContractRoleGranted(contractAddress, block.timestamp);
    }

    /**
    * @dev revokes the AUTHORIZED_CONTRACT_ROLE from the provided address.
    */
    function revokeAuthorizedContractRole(address contractAddress) public onlyClearanceLevelA {
        _revokeRole(AUTHORIZED_CONTRACT_ROLE, contractAddress);
        emit AuthorizedContractRoleRevoked(contractAddress, block.timestamp);
    }

    /// Admin Role
    /**
    * @dev grants the ADMIN_ROLE to the provided address.
    * Admins can only be appointed by the Default (Super) Admin.
    */
    function grantAdminRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ADMIN_ROLE, account);
        emit AdminRoleGranted(account, block.timestamp);
    }

    /**
    * @dev revokes the ADMIN_ROLE from the provided address.
    */
    function revokeAdminRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ADMIN_ROLE, account);
        emit AdminRoleRevoked(account, block.timestamp);
    }

    /// Company User Role
    /**
    * @dev grants the COMPANY_USER_ROLE to the provided address.
    * Company User can only be appointed by the by actors of clearance level A.
    * Company User can perform management ops ('with write access' as specified in the specs).
    */
    function grantCompanyUserRole(address account) public onlyClearanceLevelA {
        _grantRole(COMPANY_USER_ROLE, account);
        emit CompanyUserRoleGranted(account, block.timestamp);
    }

    /**
    * @dev revokes the COMPANY_USER_ROLE from the provided address.
    */
    function revokeCompanyUserRole(address account) public onlyClearanceLevelA {
        _revokeRole(COMPANY_USER_ROLE, account);
        emit CompanyUserRoleRevoked(account, block.timestamp);
    }

    /// Consumer Role
    /**
    * @dev grants the CONSUMER_ROLE to the provided address.
    * Consumers gain read-only access, this role can be utilized in a permissioned chain.
    */
    function grantConsumerRole(address account) public onlyClearanceLevelB {
        _grantRole(CONSUMER_ROLE, account);
    }

    /**
    * @dev revokes the CONSUMER_ROLE from the provided address.
    */
    function revokeConsumerRole(address account) public onlyClearanceLevelB {
        _revokeRole(CONSUMER_ROLE, account);
    }

    /// Super User | Default Admin role
    /**
    * @dev grants the DEFAULT_ADMIN_ROLE to the provided account.
    * This is an irreversible step unless the given account agrees to transfer back the role.
    */
    function transferDefaultAdminRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, account);
        emit DefaultAdminRoleTransferred(account, msg.sender, block.timestamp);
    }

    /**
    * @dev To retrieve the current Default (Super) Admin.
    * @return The address with the DEFAULT_ADMIN_ROLE.
    */
    function getCurrentDefaultAdmin() public view returns (address) {
        return getRoleMember(DEFAULT_ADMIN_ROLE, 0);
    }

    /**
    * @dev To get All Authorized Contracts.
    * @return The addresses with the AUTHORIZED_CONTRACT_ROLE.
    */
    function getCurrentContracts() public view returns (address[] memory) {
        uint256 roleMemberCount = getRoleMemberCount(AUTHORIZED_CONTRACT_ROLE);
        address[] memory contracts = new address[](roleMemberCount);
        for (uint256 i = 0; i < roleMemberCount; ) {
            contracts[i] = getRoleMember(AUTHORIZED_CONTRACT_ROLE, i);
            unchecked { ++i; }
        }
        return contracts;
    }

    /**
    * @dev To get All Admins.
    * @return The addresses with the ADMIN_ROLE.
    */
    function getCurrentAdmins() public view returns (address[] memory) {
        uint256 roleMemberCount = getRoleMemberCount(ADMIN_ROLE);
        address[] memory admins = new address[](roleMemberCount);
        for (uint256 i = 0; i < roleMemberCount; ) {
            admins[i] = getRoleMember(ADMIN_ROLE, i);
            unchecked { ++i; }
        }
        return admins;
    }

    /**
    * @dev To get All Company Users.
    * @return The addresses with the COMPANY_USER_ROLE.
    */
    function getCurrentCompanyUsers(uint256 query) public view returns (address[] memory) {
        uint256 roleMemberCount = getRoleMemberCount(COMPANY_USER_ROLE);
        if (roleMemberCount < query) query = roleMemberCount;
        address[] memory companyUsers = new address[](roleMemberCount);
        for (uint256 i = 0; i < query; ) {
            companyUsers[i] = getRoleMember(COMPANY_USER_ROLE, i);
            unchecked { ++i; }
        }
        return companyUsers;
    }

    /**
    * @dev To get All Consumers.
    * @return The addresses with the CONSUMER_ROLE.
    */
    function getCurrentConsumers(uint256 query) public view returns (address[] memory) {
        uint256 roleMemberCount = getRoleMemberCount(CONSUMER_ROLE);
        if (roleMemberCount < query) query = roleMemberCount;
        address[] memory consumers = new address[](roleMemberCount);
        for (uint256 i = 0; i < query; ) {
            consumers[i] = getRoleMember(CONSUMER_ROLE, i);
            unchecked { ++i; }
        }
        return consumers;
    }

    /// Necessary Overrides:
    /**
    * @dev To grant a custom role.
    * @return success status.
    */
    function _grantRole(bytes32 role, address account)
    internal
    override(AccessControl, AccessControlEnumerable)
    returns (bool)
    {
        return super._grantRole(role, account);
    }

    /**
    * @dev To revoke a custom role.
    * @return success status.
    */
    function _revokeRole(bytes32 role, address account)
    internal
    override(AccessControl, AccessControlEnumerable)
    returns (bool)
    {
        return super._revokeRole(role, account);
    }

    function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(AccessControl, AccessControlEnumerable)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
