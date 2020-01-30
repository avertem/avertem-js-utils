var bip39 = require('bip39')
var HDKey = require('hdkey')
var sha256 = require('js-sha256').sha256;
var Buffer = require('buffer/').Buffer
var store = require('store')

export class AvertemKey {
    constructor(mnemonic) {
        this.mnemonic = mnemonic;

        let seed = bip39.mnemonicToSeed(mnemonic);
        let seedBuffer = new Buffer(seed)
        let hdkey = HDKey.fromMasterSeed(seed)

        this.node = hdkey.derive("m/44'/60'/0'/0/0");
        this.pubBuffer = new Buffer(node.publicKey)

        let hash = sha256.create();
        hash.update('Message2 to hash');

        // setup the avertem key information
        this.hashBuffer = new Buffer(hash.arrayBuffer())
        this.hashHex = this.hashBuffer.toString("hex");
        this.signature = this.node.sign(this.hashBuffer);
        this.signatureHex = this.signature.toString("hex");
    }

    getKey() {
        return this.node;
    }
    
    getPublicKey() {
        return this.pubBuffer;
    }

    getLoginHash() {
        return this.hashBuffer;
    }

    getLoginHashHex() {
        return this.hashHex;
    }

    getLoginSignature() {
        return this.signature;
    }

    getLoginSignatureHex() {
        return this.signatureHex;
    }

    sign(value) {
        return this.node.sign(value);
    }

}

export default AvertemKey;