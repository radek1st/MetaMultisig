
# MetaMultisig


## Run API Server

```node server.js```

and  HTTP POST to:

```localhost:8080/api/contracts/```

with JSON body:

```{"contract":"0x44F5027aAACd75aB89b40411FB119f8Ca82fE733", "nonce":0, "users":{"0xa303ddC620aa7d1390BACcc8A495508B183fab59":1,"0x3Abf4443F1Fd1Cc89fc129B44e71dd9c96e260aB":1}, "threshold":1}```

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
