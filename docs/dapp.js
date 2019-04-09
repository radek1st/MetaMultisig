const EIP712Domain = [
  { name: "verifyingContract", type: "address" }
];
const Transaction = [
  { name: "destination", type: "address" },
  { name: "value", type: "uint256"},
  { name: "data", type: "bytes" },
  { name: "nonce", type: "uint256" }
];


DApp = {
    transactions: null,
    walletContract: null,
    walletAbi: [{"constant":true,"inputs":[],"name":"threshold","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"destinations","type":"address[]"},{"name":"values","type":"uint256[]"},{"name":"datas","type":"bytes[]"}],"name":"multicall","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"keyholders","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"destination","type":"address"},{"name":"value","type":"uint256"},{"name":"data","type":"bytes"},{"name":"nonce","type":"uint256"},{"name":"sigs","type":"bytes[]"}],"name":"submit","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_threshold","type":"uint256"}],"name":"setThreshold","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"destination","type":"address"},{"name":"value","type":"uint256"},{"name":"data","type":"bytes"},{"name":"nonce","type":"uint256"}],"name":"getTransactionHash","outputs":[{"name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"nextNonce","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"keyholder","type":"address"},{"name":"weight","type":"uint256"}],"name":"setKeyholderWeight","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"addresses","type":"address[]"},{"name":"weights","type":"uint256[]"},{"name":"_threshold","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"keyholder","type":"address"},{"indexed":false,"name":"weight","type":"uint256"}],"name":"KeyholderChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"threshold","type":"uint256"}],"name":"ThresholdChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"destination","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"data","type":"bytes"},{"indexed":false,"name":"nonce","type":"uint256"},{"indexed":false,"name":"returndata","type":"bytes"},{"indexed":false,"name":"signatories","type":"address[]"}],"name":"Transaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"sender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Deposit","type":"event"}],
    emptyAddress: '0x0000000000000000000000000000000000000000',
    walletAddress: "0x44F5027aAACd75aB89b40411FB119f8Ca82fE733",

    init: function() {
        console.log('[x] Initializing DApp.');
        this.initWeb3();
    },

    initWeb3: function() {
        window.addEventListener('load', () => {
            // If web3 is not injected
            if (typeof web3 === 'undefined') {
                // Listen for provider injection
                window.addEventListener('message', ({ data }) => {
                    if (data && data.type && data.type === 'ETHEREUM_PROVIDER_SUCCESS') {
                        // Use injected provider
                        provider = new ethers.providers.Web3Provider(ethereum);
                        console.log('[x] web3 object initialized.');
                        DApp.initContracts();
                    } else {
                        // No web3 instance available show a popup
                        $('#metamaskModal').modal('show');
                    }
                });
                // Request provider
                window.postMessage({ type: 'ETHEREUM_PROVIDER_REQUEST' }, '*');
            }
            // If web3 is injected use it's provider
            else {
                provider = new ethers.providers.Web3Provider(web3.currentProvider);
                console.log('[x] web3 object initialized.');
                DApp.initContracts();
            }
        });
    },

    initContracts: function() {
        DApp.walletContract = new ethers.Contract(DApp.walletAddress, DApp.walletAbi, provider).connect(provider.getSigner());
        console.log('[x] wallet contract initialized.');

        DApp.loadAccount();

        fetch('http://localhost:8080/api/contracts/0x44F5027aAACd75aB89b40411FB119f8Ca82fE733')
            .then(function(response) {
                return response.json();
            })
            .then(function(myJson) {
                $('#threshold').val(myJson.threshold);
                $('#walletAddress').val(myJson.contract);
                let users = Object.keys(myJson.users);
                for(let i in users){
                    $('#keyholders-table').append('<tr><td>' + users[i] + '</td><td>' + myJson.users[users[i]] + '</td></tr>');
                }
            });

            DApp.updateTransactions();
    },

    loadAccount: async function() {
        ethereum.enable().then(function(accounts) {
            DApp.currentAccount = accounts[0];
            console.log("[x] Using account", DApp.currentAccount);

            DApp.initActions();
            DApp.initFrontend();
        });
    },

    getNextNonce: async function() {
        let api = await fetch('http://localhost:8080/api/contracts/0x44F5027aAACd75aB89b40411FB119f8Ca82fE733/nextNonce');
        let apiNonce = (await api.json()).nonce;
        console.log("apiNonce", apiNonce);
        let nextNonce = await DApp.walletContract.nextNonce();
        if(nextNonce < apiNonce) nextNonce = apiNonce;
        console.log("nextNonce", nextNonce);
        return nextNonce;
    },

    initActions: function() {
        $("#send-ether-button").click(function(){
            let nextNonce = DApp.getNextNonce();
            let tx = {
                destination: $("#addressOut").val(),
                value: ethers.utils.parseEther($("#etherOut").val()).toString(),
                data: "0x",
                nonce: nextNonce
            };
            console.log(tx);
            DApp.signAndStore(tx).then(function() {
                DApp.updateTransactions();
            });
        });

        $("#update-threshold-button").click(function(){
            let nextNonce = DApp.getNextNonce();
            let threshold = parseInt($("#newThreshold").val());
            let interface = new ethers.utils.Interface(DApp.walletAbi);
            let data = interface.functions.setThreshold.encode([threshold]);
            let tx = {
              destination: DApp.walletAddress,
              value: "0",
              data: data,
              nonce: nextNonce
            };
            DApp.signAndStore(tx).then(function() {
              DApp.updateTransactions();
            });
        });
        $("#set-weight-button").click(function(){
            let nextNonce = DApp.getNextNonce();
            let weight = parseInt($("#newThreshold").val());
            let interface = new ethers.utils.Interface(DApp.walletAbi);
            let data = interface.functions.setThreshold.encode([weight]);
            let tx = {
                destination: DApp.walletAddress,
                value: "0",
                data: data,
                nonce: nextNonce
            };
            console.log(tx);
            DApp.signAndStore(tx).then(function() {
                DApp.updateTransactions();
            });
        });

        $(".sign-button").click(function(){
          let tx = DApp.transactions[this.dataset.txid];
          DApp.signAndStore(tx.tx).then(function() {
              DApp.updateTransactions();
          });
        });
    },


    updateTransactions: function(){
        fetch('http://localhost:8080/api/contracts/0x44F5027aAACd75aB89b40411FB119f8Ca82fE733/txs')
            .then(function(response) {
                return response.json();
            })
            .then(function(myJson) {
                DApp.transactions = myJson;
                console.log("XXXXX", JSON.stringify(myJson));

                let txs = Object.keys(myJson);
                for(let i in txs){
                    let signatories = Object.keys(myJson[txs[i]].signatories);
                    let sum = 0;
                    for(let i in signatories){
                        let signatory = signatories[i];
                        sum += myJson[txs[i]].signatories[signatory].weight;
                    }
                    //Nonce	Destination	Value	Current Weights Confirmed	Threshold Reached
                    $('#transactions-table').append(
                        '<tr><td>' + myJson[txs[i]].tx.nonce + '</td>'
                        + '<td>' + myJson[txs[i]].tx.destination + '</td>'
                        + '<td>' + myJson[txs[i]].tx.value + '</td>'
                        + '<td>' + myJson[txs[i]].tx.data + '</td>'
                        + '<td>' + signatories.length + '</td>'
                        + '<td>' + sum + '</td>'
                        + '<td>' + '<input type="button" class="sign-button" data-txid="' + txs[i] + '" value="Sign">' + '</td></tr>');
                }
            });

    },

    signAndStore: function(tx){
        let domainData = {
          verifyingContract: "0x44F5027aAACd75aB89b40411FB119f8Ca82fE733"
        };
        console.log(tx);
        let message = {
          destination: tx.destination,
          value: tx.value,
          data: tx.data,
          nonce: tx.nonce
        };
        console.log(message);
        let data = JSON.stringify({
            types: {
                EIP712Domain: EIP712Domain,
                Transaction: Transaction
            },
            domain: domainData,
            primaryType: "Transaction",
            message: message
        });
        return new Promise(function(resolve, reject) {
            ethereum.sendAsync(
            {
                method: "eth_signTypedData_v3",
                params: [DApp.currentAccount, data],
                from: DApp.currentAccount
            }, function(err, result) {
                if(err) {
                  reject(err);
                } else {
                  resolve(result);
                }
            });
        }).then(function(result) {
            return $.post("http://localhost:8080/api/contracts/0x44F5027aAACd75aB89b40411FB119f8Ca82fE733/txs", {
              "tx": tx,
              "signature": result.result
            });
        }).then(function(result) {
            let totalWeight = 0;
            for(let addr in result.signatories) {
              totalWeight += result.signatories[addr].weight;
            }
            if(totalWeight >= result.threshold) {
              return DApp.submitTransaction(result.tx, result.signatories);
            }
        });
    },

    submitTransaction: function(tx, signatories){
        let accounts = Object.keys(signatories);
        accounts.sort();
        let sigs = [];
        for(let i = 0; i < accounts.length; i++) {
          sigs.push(signatories[accounts[i]].signature);
        }
        return DApp.walletContract.submit(tx.destination, tx.value, tx.data, tx.nonce, sigs);
    },

    updateEtherBalance: function(){
        provider.getBalance(DApp.currentAccount).then(function(ethBalance) {
            console.log("user Eth balance", ethBalance);
            $('#userEtherBalance').val(ethers.utils.formatEther(ethBalance));
        });
        provider.getBalance(DApp.walletAddress).then(function(ethBalance) {
            console.log("EX Eth balance", ethBalance);
            $('#walletEtherBalance').val(ethers.utils.formatEther(ethBalance));
        });
    },

    initFrontend: function(){
        $('#userWallet').val(DApp.currentAccount);
        //$('#walletAddress').val(DApp.walletAddress);
        DApp.updateEtherBalance();
        DApp.updateTokenBalance();
    }
}

$(function() {
    DApp.init();
});
