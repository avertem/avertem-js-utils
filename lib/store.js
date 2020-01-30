var store = require('store')

import {AvertemKey} from './key.js'

const AVERTEM_CREDENTIALS = "avertem_credentials";

class AvertemStore {

    constructor() {
        if (store.get(AVERTEM_CREDENTIALS)) {
            this.credentials = JSON.parse(store.get(AVERTEM_CREDENTIALS));
            this.accountId = this.credentials.accountId;
            this.key = new AvertemKey(this.credentials.mnemonic);
        } else {
            this.accountId = null;
            this.key = null;
        }
    }

    getAccountId() {
        return this.accountId;
    }

    getKey() {
        return this.key;
    }

    persistDetails(accountId, mnemonic) {
        store.set(AVERTEM_CREDENTIALS,JSON.stringify({
            accountId:accountId,
            mnemonic: mnemonic
        }))
        this.accountId = accountId;
        this.key = new AvertemKey(mnemonic);
    }
    
}

export default AvertemStore;