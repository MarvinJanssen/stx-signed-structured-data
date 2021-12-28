// Helper script to sign money orders with a given private key.

// DO NOT USE REAL SEED PHRASES OR PRIVATE KEYS.

import { createStacksPrivateKey, stringAsciiCV, tupleCV, uintCV } from '@stacks/transactions';
import { principalCV } from '@stacks/transactions/dist/clarity/types/principalCV';
import { chainIds, structuredDataHash, signStructuredData } from './deps';

const domainHash = structuredDataHash(tupleCV({
	'name': stringAsciiCV("Money Orders"),
	'version': stringAsciiCV("1.0.0"),
	'chain-id': uintCV(chainIds.mainnet)
}));

if (process.argv.length !== 6) {
	console.log("Sign Structured Data example\nUsage:\nnpm run sign-money-order <private key> <recipient principal> <amount uint> <salt uint> [verbose 0/1]\nExample:\nnpm run sign-money-order 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 100 1");
	process.exit(0);
}

const recipient = process.argv[3];
const amount = parseInt(process.argv[4]);
const salt = parseInt(process.argv[5]);

const privateKey = createStacksPrivateKey(process.argv[2]);
const moneyOrder = tupleCV({
	'amount': uintCV(amount),
	'recipient': principalCV(recipient),
	'salt': uintCV(salt)
});
const verbose = !!parseInt(process.argv[6] || '1');

const signature = signStructuredData(privateKey, domainHash, moneyOrder);

!verbose
	? console.log(signature.toString('hex'))
	: console.log(`Signature:
${signature.toString('hex')}

Execute this money order with:
(contract-call? .money-orders execute-money-order {amount: u${amount}, recipient: '${recipient}, salt: u${salt}} 0x${signature.toString('hex')})

Or cancel it as the contract-owner with:
(contract-call? .money-orders cancel-money-order {amount: u${amount}, recipient: '${recipient}, salt: u${salt}})`);
