pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

library SignatureValidator {

    /// @dev Validates that a hash was signed by a specified signer.
    /// @param hash Hash which was signed.
    /// @param signature ECDSA signature {v}{r}{s}.
    /// @return Returns whether signature is from a specified user.
    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65);

        uint8 v = uint8(signature[64]);
        bytes32 r;
        bytes32 s;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
        }

        return ecrecover(hash, v, r, s);
    }
}

contract OffchainMultisig {
    mapping(address => uint) public keyholders;
    uint totalWeight;
    uint public threshold;
    uint public nextNonce;

    bytes32 constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(address verifyingContract)");
    bytes32 constant TRANSACTION_TYPEHASH = keccak256("Transaction(address destination,uint256 value,bytes data,uint256 nonce)");

    event KeyholderChanged(address indexed keyholder, uint weight);
    event ThresholdChanged(uint threshold);
    event Transaction(address indexed destination, uint value, bytes data, uint nonce, bytes returndata, address[] signatories);
    event Deposit(address indexed sender, uint value);

    constructor(address[] memory addresses, uint[] memory weights, uint _threshold) public {
        require(addresses.length == weights.length);
        threshold = _threshold;
        emit ThresholdChanged(_threshold);
        for (uint i = 0; i < addresses.length; i++) {
            emit KeyholderChanged(addresses[i], weights[i]);
            keyholders[addresses[i]] = weights[i];
            totalWeight += weights[i];
        }
        require(threshold > 0, "Threshold must be greater than zero.");
        require(threshold <= totalWeight, "Threshold must not be larger than the sum of all weights.");
    }

    modifier selfOnly {
        require(msg.sender == address(this));
        _;
    }

    function setKeyholderWeight(address keyholder, uint weight) external selfOnly {
        totalWeight -= keyholders[keyholder];
        totalWeight += weight;
        require(threshold <= totalWeight, "Weight change would make approvals impossible.");

        emit KeyholderChanged(keyholder, weight);
        keyholders[keyholder] = weight;
    }

    function setThreshold(uint _threshold) external selfOnly {
        threshold = _threshold;
        require(threshold > 0, "Threshold must be greater than zero.");
        require(threshold <= totalWeight, "Threshold change would make approvals impossible.");
    }

    function multicall(address payable[] memory destinations, uint[] memory values, bytes[] memory datas) public selfOnly {
        require(destinations.length == values.length);
        require(destinations.length == datas.length);

        for (uint i = 0; i < destinations.length; i++) {
            (bool success,) = destinations[i].call.value(values[i])(datas[i]);
            require(success);
        }
    }

function getTransactionHash(address destination, uint value, bytes memory data, uint nonce) public view returns (bytes32) {
// Per https://eips.ethereum.org/EIPS/eip-712
return keccak256(abi.encodePacked(
hex"1901",
keccak256(abi.encode(
DOMAIN_TYPEHASH,
address(this)
)),
keccak256(abi.encode(
TRANSACTION_TYPEHASH,
destination,
value,
keccak256(data),
nonce
))
));
}

function submit(address payable destination, uint value, bytes memory data, uint nonce, bytes[] memory sigs) public {
require(nonce == nextNonce, "Nonces must be sequential.");
nextNonce++;

address[] memory signatories = new address[](sigs.length);
bytes32 txhash = getTransactionHash(destination, value, data, nonce);
uint weight = 0;
for (uint i = 0; i < sigs.length; i++) {
address signer = SignatureValidator.recover(txhash, sigs[i]);
signatories[i] = signer;
require(i == 0 || signer > signatories[i - 1], "Signatures must be in address order.");
weight += keyholders[signer];
}
require(weight >= threshold, "Signatories do not have required weight.");

(bool result, bytes memory ret) = destination.call.value(value)(data);
require(result, "Transaction failed.");
emit Transaction(destination, value, data, nonce, ret, signatories);
}

function() external payable {
emit Deposit(msg.sender, msg.value);
}
}
