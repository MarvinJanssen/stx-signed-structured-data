// Helper script to sign money orders with a given private key.

// DO NOT USE REAL SEED PHRASES OR PRIVATE KEYS.

import { createStacksPrivateKey, standardPrincipalCV, contractPrincipalCV, stringAsciiCV, tupleCV, uintCV, bufferCV, PrincipalCV, getAddressFromPublicKey, getPublicKey, publicKeyToString, bufferCVFromString, serializeCV } from '@stacks/transactions';
import { chainIds, structuredDataHash, signStructuredData } from './deps';

const domainHash = structuredDataHash(tupleCV({
	'name': stringAsciiCV("Money Orders"),
	'version': stringAsciiCV("1.0.0"),
	'chain-id': uintCV(chainIds.mainnet)
}));

const principalCV = (principal: string): PrincipalCV => {
	const [address, contractName] = principal.split('.');
	return contractName ? contractPrincipalCV(address, contractName) : standardPrincipalCV(address);
};

if (process.argv.
	length < 6) {
	console.log(`Sign Structured Data example. If you pass a principal for the recipient then it
uses the to-consensus-buff version, if you pass a 33 byte public key, then it
falls back to the money-orders-legacy contract. (Read the contracts for more
information.)

Usage:
npm run sign-money-order <private key> <recipient principal|public key> <amount uint> <salt uint> [verbose 0/1]

Examples:
npm run sign-money-order 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 100 1
npm run sign-money-order 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 03cd2cfdbd2ad9332828a7a13ef62cb999e063421c708e863a7ffed71fb61c88c9 100 1`);
	process.exit(0);
}

const privateKey = createStacksPrivateKey(process.argv[2]);
const recipient = process.argv[3];
const amount = parseInt(process.argv[4]);
const salt = parseInt(process.argv[5]);
const verbose = !!parseInt(process.argv[6] || '1');
const legacy = recipient.length === 66;


const moneyOrder = tupleCV({
	'amount': uintCV(amount),
	'recipient': !legacy ? principalCV(recipient) : bufferCV(Buffer.from(recipient, 'hex')),
	'salt': uintCV(salt)
});

const signature = signStructuredData(privateKey, domainHash, moneyOrder);

if (!legacy) {
	!verbose
		? console.log(signature.toString('hex'))
		: console.log(`Signature:
${signature.toString('hex')}

Execute this money order with:
(contract-call? .money-orders execute-money-order {amount: u${amount}, recipient: '${recipient}, salt: u${salt}} 0x${signature.toString('hex')})

Or cancel it as the contract-owner with:
(contract-call? .money-orders cancel-money-order {amount: u${amount}, recipient: '${recipient}, salt: u${salt}})`);
}
else {
	!verbose
		? console.log(signature.toString('hex'))
		: console.log(`LEGACY MODE! Read money-orders-legacy.clar for more information.

Signature:
${signature.toString('hex')}

Execute this money order with:
(contract-call? .money-orders-legacy execute-money-order {amount: u${amount}, recipient: 0x${recipient}, salt: u${salt}} 0x${signature.toString('hex')})

Or cancel it as the contract-owner with:
(contract-call? .money-orders-legacy cancel-money-order {amount: u${amount}, recipient: 0x${recipient}, salt: u${salt}})`);
}