import * as asn1js from "asn1.js";

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


export class AvertemModel {

    constructor(jsonData) {

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

        let RDFChange = asn.define('RDFChange', function() {
            this.enum({ 0: 'persist', 1: 'remove', 2: 'none' });
        });

        let RDFObject = asn.define('RDFObject', function() {
            this.seq().obj(
                this.key('value').implicit(0).utf8str(),
                this.key('type').implicit(1).utf8str(),
                this.key('lang').implicit(2).utf8str(),
                this.key('dataType').implicit(3).utf8str()
            );
        });

        let RDFPredicate = asn.define('RDFPredicate', function() {
            this.seq().obj(
                this.key('predicate').implicit(0).utf8str(),
                this.key('rdfObjects').implicit(1).seqof(RDFObject)
            );
        })

        let RDFSubject = asn.define('RDFSubject', function() {
            this.seq().obj(
                this.key('subject').implicit(0).utf8str(),
                this.key('rdfPredicates').implicit(1).seqof(RDFPredicate)
            );
        });

        let RDFNT = asn.define('RDFNT', function() {
            this.seq().obj(
                this.key('version').implicit(0).use(Version),
                this.key('ntSubject').implicit(1).utf8str(),
                this.key('ntPredicate').implicit(2).utf8str(),
                this.key('ntObject').implicit(3).utf8str()
            );
        });

        let RDFNtGroup = asn.define('RDFNtGroup', function() {
            this.seq().obj(
                this.key('version').implicit(0).use(Version),
                this.key('rdfNT').implicit(1).seqof(RDFNT)
            );
        });

        let RDFDataFormat = asn.define('RDFDataFormat', function() {
            this.choice({
                'rdfSubject': this.use(RDFSubject),
                'rdfNtGroup': this.use(RDFNtGroup)
            });
        });

        let RDFModel = asn.define('RDFModel', function() {
            this.seq().obj(
                this.key('action').implicit(0).enum({ 0: 'persist', 1: 'remove', 2: 'none' }),
                this.key('rdfDataFormat').implicit(1).use(RDFDataFormat)
              );
        });

        this.jsonRDFModel = {
            action: 'persist',
            rdfDataFormat: []
        };

        if (jsonData.nts) {
            let jsonRDFNtGroup = {
                version: 1,
                rdfNT: []
            }
            jsonData.nt.forEach((data) => {
                jsonRDFNtGroup.
                    rdfNT.push({
                        version: 1,
                        ntSubject: data.subject,
                        ntPredicate: data.predicate,
                        ntObject: data.object
                    });
            })
            this.jsonRDFModel.rdfDataFormat = [
                {'type': 'rdfNtGroup', 'value': jsonRDFNtGroup}
            ]
        } else if (jsonData.subjects) {
            
            jsonData.subjects.forEach((data) => {

                let jsonRDFSubject = {
                    subject: data.subject,
                    rdfPredicates: []
                }
                data.predicates.forEach((predicate) => {
                    let jsonRDFPredicate = {
                        predicate: predicate.predicate,
                        rdfObjects: [],
                    }
                    predicate.objects.forEach((obj) => {
                        let jsonRDFObject = {
                            value: obj.value,
                            type: (obj.type? obj.type : 'literal'),
                            lang: (obj.lang? obj.lang : 'en'),
                            dataType: obj.dataType
                        }
                        jsonRDFPredicate.rdfObjects.push(jsonRDFObject);
                    }) 
                    jsonRDFSubject.rdfPredicates.push(jsonRDFPredicate);
                })

                this.jsonRDFModel.rdfDataFormat.push({
                    'type': 'rdfSubject', 'value': jsonRDFSubject
                })
            });
        }

        

        this.derRDFModel = RDFModel.encode(this.jsonRDFModel,'der')
    }

    getRDFDerModel() {
        return this.derRDFModel;
    }

    getRDFJsonModel() {
        return this.jsonRDFModel;
    }
};

export default AvertemModel;