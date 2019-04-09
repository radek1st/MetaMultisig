
# MetaMultisig


## Run API Server

```node server.js```

Create the wallet contract entry:

```
curl -X POST -H "Content-Type: application/json" --data '{"contract":"0x44F5027aAACd75aB89b40411FB119f8Ca82fE733", "nonce":0, "users":{"0xa303ddc620aa7d1390baccc8a495508b183fab59":1,"0x3abf4443f1fd1cc89fc129b44e71dd9c96e260ab":1}, "threshold":1}' http://localhost:8080/api/contracts/
```

Create a sample transaction:

```
curl -X POST -H "Content-Type: application/json" --data '{"tx":{"nonce": "0", "destination": "0xa303ddC620aa7d1390BACcc8A495508B183fab59", "value": "1000000000000000000", "data": "0x"}, "signature": "foo"}' http://localhost:8080/api/contracts/0x44F5027aAACd75aB89b40411FB119f8Ca82fE733/txs
```

## Run UI


```npm run dev```


## Init API
## TODO

* update weight (add/remove keyholder)
* show tokens
* change threshold
* propose tx
  * send ether
  * token swap
  * send token
* approve tx
