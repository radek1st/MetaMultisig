
# MetaMultisig - Next Generation Multisig Wallet - Feature Rich, Scaling Off-Chain

## About

### Team 

Nick Johnson and Radek Ostrowski

### Problems

* Current multisig wallets code is complex, people are afraid to touch it.
* Every signatory is deeemed equal, not the case in real businesses.
* Every confirmation from the signatories needs to be on-chain, therefore using more gas and being more expensive.
* The signatories don't clearly see what they are signing, so there is a scope for fraud.
* Also, there is a coordination overhead in getting any transaction multi-signed.
* Lastly, ENS is not supported.

### Solution

MetaMultisigWallet uses off-line message signing for scalability, meta transactions and (de)centralised api.

* Simple code, meaning less chances for exploits and easier to audit.
* Every signatory can be assigned a weight - business ready out of the box!
* Scalable solution, as only one transaction needs to go on-chain. None of the signatories are required to have ether in their account, as they are only used for signing the messages.  
* Anyone can send the transaction to the network as a meta transaction, collecting all the required signatures off-chain and the validation happens on-chain.
* All the required signatories can get notifications (e.g. via email, push notification) about pending transactions which require their attention.
* ENS support for all addresses.

## Setup

Demo version deployed on metamultisig.com and Goerli test network.

### Run API Server

```node server.js```

Create the wallet contract entry:

```
curl -X POST -H "Content-Type: application/json" --data '{"contract":"0x44F5027aAACd75aB89b40411FB119f8Ca82fE733", "nonce":0, "users":{"0xa303ddc620aa7d1390baccc8a495508b183fab59":1,"0x3abf4443f1fd1cc89fc129b44e71dd9c96e260ab":1}, "threshold":1}' http://localhost:8080/api/contracts/
```

Create a sample transaction:

```
curl -X POST -H "Content-Type: application/json" --data '{"tx":{"nonce": "0", "destination": "0xa303ddC620aa7d1390BACcc8A495508B183fab59", "value": "1000000000000000000", "data": "0x"}, "signature": "foo"}' http://localhost:8080/api/contracts/0x44F5027aAACd75aB89b40411FB119f8Ca82fE733/txs
```

### Run UI

```npm run dev```


