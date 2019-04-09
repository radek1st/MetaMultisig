let express    = require('express');        // call express
let app        = express();                 // define our app using express
let bodyParser = require('body-parser');
let cors = require('cors');
let sigUtil = require('eth-sig-util');

// let Web3 = require('web3');
// let web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.slock.it/goerli'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const EIP712Domain = [
    { name: "verifyingContract", type: "address" }
];
const Transaction = [
    { name: "destination", type: "address" },
    { name: "value", type: "uint256"},
    { name: "data", type: "bytes" },
    { name: "nonce", type: "uint256" }
];

let port = process.env.PORT || 8080;        // set our port

let hashCode = function(s){
    return JSON.stringify(s).split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
};

//dict of users to pending signatures array
let contracts = {};

// ROUTES FOR OUR API
// =============================================================================
let router = express.Router();              // get an instance of the express Router

router.get('/contracts', function(req, res) {
    res.json({ contracts: Object.keys(contracts) });
});

router.get('/contracts/:contract', function(req, res) {
    res.json({ contract: req.params.contract, users: contracts[req.params.contract].users,
        threshold: contracts[req.params.contract].threshold});
});

router.post('/contracts', function(req, res) {
    console.log(req.body);
    contracts[req.body.contract] = {users: req.body.users, threshold: req.body.threshold, nonce: req.body.nonce};

    res.json({ msg: "added", contract: contracts[req.body.contract]});
});


router.get('/contracts/:contract/nextNonce', function(req, res) {
    if(!contracts[req.params.contract].txs) {
        res.json({nonce: contracts[req.params.contract].nonce});
    } else {
        let txIds = Object.keys(contracts[req.params.contract].txs);
        let maxNonce = contracts[req.params.contract].nonce;
        for(let i in txIds){
            let txId = txIds[i];
            let nonce = contracts[req.params.contract].txs[txId].tx.nonce;
            if(nonce > maxNonce) maxNonce = nonce;
        }
        res.json({ nonce: maxNonce+1});
    }
});

router.post('/contracts/:contract/txs', async function(req, res) {
    if(!contracts[req.params.contract].txs) {
        contracts[req.params.contract].txs = {}
    }

    let tx = req.body.tx;
    let txId = hashCode(tx);
    let signature = req.body.signature;

    //let signer = await web3.eth.personal.ecRecover(JSON.stringify(tx), signature);

    let domainData = {
        verifyingContract: req.params.contract
    };

    let message = {
        destination: tx.destination,
        value: tx.value,
        data: tx.data,
        nonce: tx.nonce
    };

    let data = {
        types: {
            EIP712Domain: EIP712Domain,
            Transaction: Transaction
        },
        domain: domainData,
        primaryType: "Transaction",
        message: message
    };

    let signer = sigUtil.recoverTypedSignature({data:data, sig:signature});

    if(contracts[req.params.contract].users[signer] == undefined) {
        console.log("Signer", signer, "is not a keyholder");
        res.status(400).json({ errorMsg:  "Signer is not a keyholder"});
        return;
    } else {
        console.log("signer", signer, "weight", contracts[req.params.contract].users[signer]);
    }

    if(!contracts[req.params.contract].txs[txId]){
        //create
        contracts[req.params.contract].txs[txId] = {signatures:[signature], txId:txId, tx:tx, signatories:[signer]};
    } else {
        //append signature
        contracts[req.params.contract].txs[txId].signatures.push(signature);
        contracts[req.params.contract].txs[txId].signatures = Array.from(new Set(contracts[req.params.contract].txs[txId].signatures));

        contracts[req.params.contract].txs[txId].signatories.push(signer);
        contracts[req.params.contract].txs[txId].signatories = Array.from(new Set(contracts[req.params.contract].txs[txId].signatories));

        //contracts[req.params.contract].txs[txId].signatories = contracts[req.params.contract].txs[txId].signatories.sort();
    }

    let sum = 0;
    for (let sig in contracts[req.params.contract].txs[txId].signatories) {
        let user = contracts[req.params.contract].txs[txId].signatories[sig].user;
        sum += contracts[req.params.contract].users[user];
    }

    if(sum >= contracts[req.params.contract].threshold) {
        contracts[req.params.contract].txs[txId].thresholdReached = true;
    } else {
        contracts[req.params.contract].txs[txId].thresholdReached = false;
    }

    res.json({ txId: txId, details: contracts[req.params.contract].txs[txId] });
});

router.get('/contracts/:contract/txs', function(req, res) {
    if(contracts[req.params.contract].txs) {
        res.json(contracts[req.params.contract].txs);
    } else {
        res.json( { txs: {}});
    }
});

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);

//fetch pending requests for given address
//submit signed message for given request
