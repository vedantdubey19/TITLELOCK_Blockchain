// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;
import {TitleLockRegistry} from "../src/TitleLockRegistry.sol";
interface Vm {
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function prank(address) external;
    function expectRevert() external;
    function warp(uint256) external;
}
contract TitleLockRegistryTest {
    Vm constant vm=Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    TitleLockRegistry registry;
    address registrar;
    bytes32 constant PROPERTY=keccak256("TEST-PARCEL");
    function setUp() public {
        registry=new TitleLockRegistry();
        registrar=vm.addr(3);
        registry.grantRole(registry.REGISTRAR_ROLE(),registrar);
        address[] memory owners=new address[](2);
        owners[0]=vm.addr(1); owners[1]=vm.addr(2);
        registry.anchor(PROPERTY,keccak256("old"),owners);
    }
    function data() internal view returns(TitleLockRegistry.Transfer memory) {
        return TitleLockRegistry.Transfer(keccak256("deal"),PROPERTY,keccak256("old"),keccak256("new"),keccak256("doc"),address(100),registrar,block.timestamp+24 hours);
    }
    function signature(uint256 key,bytes32 digest) internal returns(bytes memory) {
        (uint8 v,bytes32 r,bytes32 s)=vm.sign(key,digest);return abi.encodePacked(r,s,v);
    }
    function proofs(TitleLockRegistry.Transfer memory d) internal returns(bytes[] memory owners,bytes memory reg) {
        bytes32 digest=registry.transferDigest(d);
        owners=new bytes[](2); owners[0]=signature(1,digest);owners[1]=signature(2,digest);reg=signature(3,digest);
    }
    function testBothPartiesAndEveryOwner() public {
        TitleLockRegistry.Transfer memory d=data(); (bytes[] memory owners,bytes memory reg)=proofs(d);
        vm.prank(registrar); registry.executeTransfer(d,owners,reg);
        (bytes32 state,address[] memory current)=registry.stateOf(PROPERTY);
        require(state==d.newHash && current.length==1 && current[0]==d.buyer,"Incorrect settlement");
        require(registry.executedDeals(d.dealId)==d.newHash,"Missing independent record");
        vm.expectRevert();vm.prank(registrar);registry.executeTransfer(d,owners,reg);
    }
    function testCannotBypassOwnerApproval() public {
        TitleLockRegistry.Transfer memory d=data();(bytes[] memory owners,bytes memory reg)=proofs(d);
        owners[1]=owners[0];vm.expectRevert();vm.prank(registrar);registry.executeTransfer(d,owners,reg);
    }
    function testCannotBypassRegistrarSignature() public {
        TitleLockRegistry.Transfer memory d=data();(bytes[] memory owners,)=proofs(d);
        vm.expectRevert();vm.prank(registrar);registry.executeTransfer(d,owners,owners[0]);
    }
    function testChangedBuyerInvalidatesSignatures() public {
        TitleLockRegistry.Transfer memory d=data();(bytes[] memory owners,bytes memory reg)=proofs(d);
        d.buyer=address(101);vm.expectRevert();vm.prank(registrar);registry.executeTransfer(d,owners,reg);
    }
    function testExpiredSignaturesRejected() public {
        TitleLockRegistry.Transfer memory d=data();(bytes[] memory owners,bytes memory reg)=proofs(d);
        vm.warp(d.deadline+1);vm.expectRevert();vm.prank(registrar);registry.executeTransfer(d,owners,reg);
    }
    function testCannotOverwriteBaseline() public {
        address[] memory owners=new address[](1); owners[0]=address(123);
        vm.expectRevert();registry.anchor(PROPERTY,keccak256("tampered"),owners);
    }
    function testUnauthorizedSenderRejected() public {
        TitleLockRegistry.Transfer memory d=data();(bytes[] memory owners,bytes memory reg)=proofs(d);
        vm.expectRevert();registry.executeTransfer(d,owners,reg);
    }
}
