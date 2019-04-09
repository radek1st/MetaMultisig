var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var cors = require('cors')

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

var port = process.env.PORT || 8080;        // set our port

//dict of users to pending signatures array
let contracts = {};

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

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

//first signature
//req.body.
router.post('/contracts/:contract/signatures', function(req, res) {
    if(!contracts[req.params.contract].nonces) {
        contracts[req.params.contract].nonces = {}
    }

    //requires user to be one of the signatories
    //user and their signature
    let nonce = contracts[req.params.contract].nonce;

    contracts[req.params.contract].nonces[nonce] = {"signatures":[req.body]};

    let sum = 0;
    for (let sig in contracts[req.params.contract].nonces[nonce].signatures) {
        let user = contracts[req.params.contract].nonces[nonce].signatures[sig].user;
        sum += contracts[req.params.contract].users[user];
    }

    if(sum >= contracts[req.params.contract].threshold) {
        contracts[req.params.contract].nonces[nonce].thresholdReached = true;
    } else {
        contracts[req.params.contract].nonces[nonce].thresholdReached = false;
    }

    contracts[req.params.contract].nonce += 1;
    res.json({ nonce: nonce, details: contracts[req.params.contract].nonces[nonce] });
});

router.get('/contracts/:contract/signatures', function(req, res) {
    if(contracts[req.params.contract].nonce) {
        res.json({ nonces: contracts[req.params.contract].nonces});
    } else {
        res.json( { nonces: {}});
    }
});

router.get('/contracts/:contract/signatures/:nonce', function(req, res) {
    //return the array of signed messages
    res.json(contracts[req.params.contract].nonces[req.params.nonce]);
});

router.post('/contracts/:contract/signatures/:nonce', function(req, res) {
    //return the array of signed messages

    contracts[req.params.contract].nonces[req.params.nonce].signatures.push(req.body);

    let sum = 0;
    for (let sig in contracts[req.params.contract].nonces[req.params.nonce].signatures) {
        let user = contracts[req.params.contract].nonces[req.params.nonce].signatures[sig].user;
        sum += contracts[req.params.contract].users[user];
    }
    console.log("past - sum",sum,"threshold",contracts[req.params.contract].threshold);

    if(sum >= contracts[req.params.contract].threshold) {
        contracts[req.params.contract].nonces[req.params.nonce].thresholdReached = true;
    } else {
        contracts[req.params.contract].nonces[req.params.nonce].thresholdReached = false;
    }

    res.json(contracts[req.params.contract].nonces[req.params.nonce]);
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
