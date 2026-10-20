// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {AccessControl} from "../lib/openzeppelin-contracts/contracts/access/AccessControl.sol";
import {ECDSA} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";

contract TitleLockRegistry is AccessControl, EIP712 {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 private constant TRANSFER_TYPEHASH = keccak256(
        "Transfer(bytes32 dealId,bytes32 parcelId,bytes32 previousHash,bytes32 newHash,bytes32 documentHash,address buyer,address registrar,uint256 deadline)"
    );
    struct Transfer {
        bytes32 dealId;
        bytes32 parcelId;
        bytes32 previousHash;
        bytes32 newHash;
        bytes32 documentHash;
        address buyer;
        address registrar;
        uint256 deadline;
    }
    struct Parcel {
        bytes32 stateHash;
        address[] owners;
    }
    mapping(bytes32 => Parcel) private parcels;
    mapping(bytes32 => bytes32) public executedDeals;
    mapping(bytes32 => uint256) public executedAt;

    event PropertyAnchored(bytes32 indexed parcelId, bytes32 stateHash);
    event OwnershipTransferred(bytes32 indexed dealId, bytes32 indexed parcelId,
        bytes32 previousHash, bytes32 newHash, bytes32 documentHash, address buyer, address registrar);

    constructor() EIP712("TitleLock", "1") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function anchor(bytes32 parcelId, bytes32 stateHash, address[] calldata owners) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(parcels[parcelId].stateHash == bytes32(0), "Already anchored");
        require(stateHash != bytes32(0) && owners.length > 0, "Invalid baseline");
        for (uint256 i; i < owners.length; i++) {
            require(owners[i] != address(0), "Zero owner");
            for (uint256 j; j < i; j++) require(owners[i] != owners[j], "Duplicate owner");
        }
        parcels[parcelId].stateHash = stateHash;
        parcels[parcelId].owners = owners;
        emit PropertyAnchored(parcelId, stateHash);
    }

    function stateOf(bytes32 parcelId) external view returns(bytes32, address[] memory) {
        return (parcels[parcelId].stateHash, parcels[parcelId].owners);
    }

    function transferDigest(Transfer calldata data) public view returns(bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(TRANSFER_TYPEHASH, data)));
    }

    function executeTransfer(Transfer calldata data, bytes[] calldata ownerSignatures, bytes calldata registrarSignature)
        external onlyRole(REGISTRAR_ROLE) {
        require(data.registrar == msg.sender, "Wrong registrar");
        require(block.timestamp <= data.deadline, "Approval expired");
        require(executedDeals[data.dealId] == bytes32(0), "Deal already used");
        Parcel storage parcel = parcels[data.parcelId];
        require(parcel.stateHash != bytes32(0) && parcel.stateHash == data.previousHash, "Ownership mismatch");
        require(data.newHash != bytes32(0) && data.newHash != data.previousHash && data.buyer != address(0), "Invalid target");
        require(ownerSignatures.length == parcel.owners.length, "Every owner required");
        bytes32 digest = transferDigest(data);
        require(ECDSA.recover(digest, registrarSignature) == msg.sender, "Registrar signature invalid");
        for (uint256 i; i < parcel.owners.length; i++) {
            require(ECDSA.recover(digest, ownerSignatures[i]) == parcel.owners[i], "Owner signature invalid");
        }
        parcel.stateHash = data.newHash;
        delete parcel.owners;
        parcel.owners.push(data.buyer);
        executedDeals[data.dealId] = data.newHash;
        executedAt[data.dealId] = block.timestamp;
        emit OwnershipTransferred(data.dealId, data.parcelId, data.previousHash, data.newHash,
            data.documentHash, data.buyer, msg.sender);
    }
}
