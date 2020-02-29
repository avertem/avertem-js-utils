import * as asn1js from "asn1.js";

import { AvertemKey } from "./key.js"
import { AvertemModel } from "./model.js"

var asn = require('asn1.js');
var protobuf = require("protobufjs");

var bip39 = require('bip39')
var HDKey = require('hdkey')
var sha256 = require('js-sha256').sha256;
var jsEnv = require('browser-or-node');
if (jsEnv.isBrowser) {
    var Buffer = require('buffer/').Buffer;
} else {
    var Buffer = require('buffer').Buffer;
}
var store = require('store')


export class AvertemTransaction {

    constructor(key,transactionValue,parent,sourceAccount,targetAcccount, transactionAction) {

        let Number = asn.define('Number', function() {
            this.int()
        });
        let Version = asn.define('Version', function() {
            this.int()
        });
        let Hash = asn.define('Hash', function() {
            this.octstr()
        });
        let Signature = asn.define('Signature', function() {
            this.octstr()
        });
        let ASNBoolean = asn.define('ASNBoolean', function() {
            this.bool()
        });
        let EncryptedData = asn.define('EncryptedData', function() {
            this.octstr()
        });
        let Int = asn.define('Int', function() {
            this.int()
        });

        let Any = asn.define('Any', function() {
            this.any()
        });

        let Action = asn.define('Action', function() {
            this.seq().obj(
              this.key('version').implicit(0).use(Version),
              this.key('date').implicit(1).utctime(),
              this.key('contract').implicit(2).use(Hash),
              this.key('contractName').implicit(3).utf8str(),
              this.key('parent').implicit(4).use(Hash),
              this.key('model').implicit(5).use(Any)
            );
          });

        

        let Transaction = asn.define('Transaction', function() {
            this.seq().obj(
              this.key('version').implicit(0).use(Version),
              this.key('date').implicit(1).utctime(),
              this.key('value').implicit(2).use(Number),
              this.key('parent').implicit(3).use(Hash),
              this.key('encrypted').implicit(4).use(ASNBoolean),
              this.key('sourceAccount').implicit(5).use(Hash),
              this.key('targetAccount').implicit(6).use(Hash),
              this.key('transactionSignator').implicit(7).use(Hash),
              this.key('creatorId').implicit(8).use(Hash),
              this.key('actions').implicit(9).seqof(Action)
            );
          });
        
        let SignedTransaction = asn.define('SignedTransaction', function() {
            this.seq().obj(
              this.key('version').implicit(0).use(Version),
              this.key('transaction').implicit(1).use(Transaction),
              this.key('transactionHash').implicit(2).use(Hash),
              this.key('signature').implicit(3).use(Signature)
            );
          });
        
        let TransactionTrace = asn.define('TransactionTrace', function() {
            this.seq().obj(
                this.key('traceHash').implicit(0).use(Hash),
                this.key('signature').implicit(1).use(Signature),
                this.key('signatureHash').implicit(2).use(Hash),
            );
        })

        let changeData = asn.define('changeData',function() {
            this.choice ({
                asn1Change: this.any(),
                binaryChange: this.octstr()
            })
        });

        let ChangeSet = asn.define('ChangeSet', function() {
            this.seq().obj(
                this.key('version').implicit(0).use(Version),
                this.key('transactionHash').implicit(1).use(Hash),
                this.key('accountHash').implicit(2).use(Hash),
                this.key('status').implicit(3).enum({ 0: 'init', 1: 'debit', 2: 'processing', 3: 'waiting', 4: 'credit', 5: 'complete', 6: 'nested' }),
                this.key('changes').implicit(4).seqof(changeData)
            );
        });

        let SignedChangeSet = asn.define('SignedChangeSet', function() {
            this.seq().obj(
                this.key('changeSet').implicit(0).use(ChangeSet),
                this.key('changeSetHash').implicit(1).use(Hash),
                this.key('signature').implicit(2).use(Signature)
            );
        });
        
        let TransactionWrapper = asn.define('TransactionWrapper', function() {
            this.seq().obj(
              this.key('version').implicit(0).use(Version),
              this.key('sourceAccount').implicit(1).use(Hash),
              this.key('targetAccount').implicit(2).use(Hash),
              this.key('parent').implicit(3).use(Hash),
              this.key('feeAccount').implicit(4).use(Hash),
              this.key('transactionHash').implicit(5).use(Hash),
              this.key('signature').implicit(6).use(Signature),
              this.key('signedTransaction').implicit(7).use(SignedTransaction),
              this.key('transactionTrace').implicit(8).seqof(TransactionTrace),
              this.key('currentStatus').implicit(9).enum({ 0: 'init', 1: 'debit', 2: 'processing', 3: 'waiting', 4: 'credit', 5: 'complete', 6: 'nested' }),
              this.key('changeSet').implicit(10).seqof(SignedChangeSet)
            );
          });
        
        let EncryptedDataWrapper = asn.define('EncryptedDataWrapper',function() {
            this.seq().obj(
                this.key('version').implicit(0).use(Version),
                this.key('transaction').implicit(1).use(EncryptedData),
                this.key('hash').implicit(2).seqof(Hash)
            )
        });  

        let TransactionMessage = asn.define('TransactionMessage', function() {
            this.seq().obj(
                this.key('version').implicit(0).use(Version),
                this.key('transaction').implicit(1).use(TransactionWrapper),
                this.key('availableTime').implicit(2).use(Int),
                this.key('elapsedTime').implicit(3).use(Int),
                this.key('nestedTransactions').implicit(4).seqof(
                    function() {
                        this.choice ({
                            sideTransaction: this.use(TransactionMessage),
                            encryptedSideTransaction: this.use(EncryptedDataWrapper)
                        })}
                )
            )
        });

        let parentBuff = Buffer.from(parent,"hex");
        let sourceAccountBuff = Buffer.from(sourceAccount,"hex");
        let targetAcccountBuff = Buffer.from(targetAcccount,"hex");

        console.log("The parent is [%o]",parentBuff);

        let transactionJson = {
            version: 1,
            date: new Date(),
            value: parseInt(transactionValue),
            parent: parentBuff,
            encrypted: false,
            sourceAccount: sourceAccountBuff,
            targetAccount: targetAcccountBuff,
            transactionSignator: sourceAccountBuff,
            creatorId: sourceAccountBuff,
            actions: []
          }

        if (transactionAction) {
            let model = new AvertemModel(transactionAction.model)
            var contractHash = null;
            if (transactionAction.contract) {
                contractHash = Buffer.from(transactionAction.contract,"hex");
            }
            let anyModel = Any.encode(model.getRDFDerModel(),"der")
            transactionJson.actions.push({
                version: 1,
                date: new Date(),
                contract: contractHash,
                contractName: transactionAction.contractName,
                parent: parentBuff,
                model: anyModel
            })
        }

        let transactionAsnBuffer = Transaction.encode(transactionJson, 'der');

        
        this.transactionHash = sha256.create();
        this.transactionHash.update(transactionAsnBuffer);
        
        
        if (jsEnv.isBrowser) {
            this.transactionHashValue = this.transactionHash.arrayBuffer()
            this.transactionSignature = new Buffer(key.sign(this.transactionHashValue));
        } else {
            this.transactionHashValue = new Buffer(this.transactionHash.arrayBuffer())
            this.transactionSignature = key.sign(this.transactionHashValue.toString("hex"),"buffer","hex");
        }
        
        let signedTransactionJson = {
            version: 1,
            transaction: transactionJson,
            transactionHash: new Buffer(this.transactionHashValue),
            signature: new Buffer(this.transactionSignature)
        }
        
        let signedTransactionBuffer = SignedTransaction.encode(signedTransactionJson,'der');

        this.signatureHash = sha256.create();
        this.signatureHash.update(this.transactionSignature);

        let transactionTraceJson = {
            traceHash: this.transactionHashValue,
            signature: this.transactionSignature,
            signatureHash: new Buffer(this.signatureHash.arrayBuffer())
        }

        let transactionTraceBuffer = TransactionTrace.encode(transactionTraceJson,'der');
        
        let transactionWrapperJson = {
            version: 1,
            sourceAccount: sourceAccountBuff,
            targetAccount: targetAcccountBuff,
            parent: parentBuff,
            feeAccount: "",
            transactionHash: this.transactionHashValue,
            signature: this.transactionSignature,
            signedTransaction: signedTransactionJson,
            transactionTrace:[ transactionTraceJson ],
            currentStatus: 'init',
            changeSet: []
        }
        
        let transactionWrapperBuffer = TransactionWrapper.encode(transactionWrapperJson,'der')
        
        let transactionMessageJson = {
            version: 1,
            transaction: transactionWrapperJson,
            availableTime: 0,
            elapsedTime: 0,
            nestedTransactions: []
        }

        let protobufJson = {
            "nested" : {
                "Status": {
                    "values" : {
                        INIT:0,
                        ROUTE:1,
                        DEBIT:2,
                        PROCESS:3,
                        CREDIT:4,
                        COMPLETE:10,
                        FAILURE:100,
                        REJECT:200,
                        NESTED:300
                    }
                },
                "Transaction": {
                    "fields": {
                        "transactionHash": {
                            "type": "bytes",
                            "id": 1
                        },
                        "transactionSignature": {
                            "type": "bytes",
                            "id":2
                        },
                        "activeAccount": {
                            "type": "bytes",
                            "id":3
                        },
                        "status": {
                            "type": "Status",
                            "id":4
                        },
                        "asn1TransactionMessage": {
                            "type": "bytes",
                            "id":5
                        },
                        "seconds": {
                            "type": "int64",
                            "id":6
                        }
                    }
                }
            }
          }
        
        let transactionMessageBuffer = TransactionMessage.encode(transactionMessageJson,'der')
        
        let protoRef = protobuf.Root.fromJSON(protobufJson);
        let protoTransaction = protoRef.lookupType("Transaction");
        
        let payload = { 
            "transactionHash": this.transactionHashValue,
            "transactionSignature": this.transactionSignature,
            "status": 0,
            "asn1TransactionMessage": transactionMessageBuffer,
            "seconds": 0
          };
      
        this.protoTrans = protoTransaction.create(payload);
        this.protoTransBuffer = protoTransaction.encode(this.protoTrans).finish();
    }
    
    getProtoTransBuffer() {
        return this.protoTransBuffer;
    }
}

export default AvertemTransaction;
