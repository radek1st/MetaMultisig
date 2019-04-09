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
                        web3 = new Web3(ethereum);
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
                web3 = new Web3(web3.currentProvider);
                console.log('[x] web3 object initialized.');
                DApp.initContracts();
            }
        });
    },

    initContracts: function() {
        DApp.walletContract = new web3.eth.Contract(DApp.walletAbi, DApp.walletAddress);
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
        await ethereum.enable();
        web3.eth.getAccounts(function(error, accounts) {
            if(error) {
                console.error("[x] Error loading accounts", error);
            } else {
                DApp.currentAccount = accounts[0];
                console.log("[x] Using account", DApp.currentAccount);

                DApp.initActions();
                DApp.initFrontend();
            }
        });
    },

    initActions: function() {
        $("#etherIn").on("paste keyup", function() {
            $("#tokenOut").val($("#etherIn").val() * $("#buyRate").val());
        });
        $("#tokenOut").on("paste keyup", function() {
            $("#etherIn").val($("#tokenOut").val() / $("#buyRate").val());
        });
        $("#tokenIn").on("paste keyup", function() {
            $("#etherOut").val($("#tokenIn").val() / $("#sellRate").val());
        });
        $("#etherOut").on("paste keyup", function() {
            $("#tokenIn").val($("#etherOut").val() * $("#sellRate").val());
        });
        $("#buy-tokens-button").click(function(){
            let amount = web3.utils.toWei($("#etherIn").val().toString(), "ether");
            let rate =  $("#buyRate").val();
            console.log("rate", rate);
            let tx = {value: amount, from: DApp.currentAccount};
            console.log("tx", tx);
            DApp.walletContract.methods.buyTokens(rate).send(tx, function(error, res) {
                if(error) {
                    console.log(error);
                } else {
                    console.log("res", res);
                    // /$('#userTokenBalance').val(web3.utils.fromWei(balance, "ether"));
                }
            });
        });
        $("#send-ether-button").click(function(){
            fetch('http://localhost:8080/api/contracts/0x44F5027aAACd75aB89b40411FB119f8Ca82fE733/nextNonce ')
                .then(function(response) {
                    return response.json();
                }).then(function(data) {
                    let tx = {
                      destination: $("#addressOut").val(),
                      value: web3.utils.toWei($("#etherOut").val(), "ether"),
                      data: "0x",
                      nonce: data.nonce
                    };
                    console.log(tx);
                    DApp.signAndStore(tx).then(function() {
                      DApp.updateTransactions();
                    });
                });
        });
        $(".sign-button").click(function(){
          var tx = DApp.transactions[this.dataset.txid];
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
            web3.currentProvider.sendAsync(
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
        return new Promise(function(resolve, reject) {
          let accounts = Object.keys(signatories);
          accounts.sort();
          let sigs = [];
          for(var i = 0; i < accounts.length; i++) {
            sigs.push(signatories[accounts[i]].signature);
          }
          DApp.walletContract.methods.submit(tx.destination, tx.value, tx.data, tx.nonce, sigs).send({from: DApp.currentAccount}, function(err, result) {
            if(err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
    },

    updateEtherBalance: function(){
        web3.eth.getBalance(DApp.currentAccount, function(error, ethBalance) {
            if (error) {
                // handle error
                console.log("Couldn't get user ether balance: ", error);
            } else {
                console.log("user Eth balance", ethBalance);
                $('#userEtherBalance').val(web3.utils.fromWei(ethBalance.toString(), "ether"));
            }
        });
        web3.eth.getBalance(DApp.walletAddress, function(error, ethBalance) {
            if (error) {
                // handle error
                console.log("Couldn't get wallet ether balance: ", error);
            } else {
                console.log("EX Eth balance", ethBalance);
                $('#walletEtherBalance').val(web3.utils.fromWei(ethBalance.toString(), "ether"));
            }
        });
    },

    updateTokenBalance: function(){
        DApp.tokenContract.methods.balanceOf(DApp.currentAccount).call(function(error, balance) {
            if(error) {
                console.log(error);
            } else {
                console.log("user token balance", balance);
                $('#userTokenBalance').val(balance/DApp.tokenDecimalsMultiplier);
            }
        });
        DApp.tokenContract.methods.allowance(DApp.currentAccount, DApp.walletAddress).call(function(error, balance) {
            if(error) {
                console.log(error);
            } else {
                console.log("user token approved", balance);
                $('#userTokenApproved').val(balance/DApp.tokenDecimalsMultiplier);
            }
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
