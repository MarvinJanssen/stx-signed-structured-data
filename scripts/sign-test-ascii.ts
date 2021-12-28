// Helper script to generate structured data signatures of string-ascii types for testing.

// DO NOT USE REAL SEED PHRASES OR PRIVATE KEYS.

import { createStacksPrivateKey, stringAsciiCV, tupleCV, uintCV } from '@stacks/transactions';
import { structuredDataHash, signStructuredData } from './deps';

if (process.argv.length !== 6) {
	console.log("Sign Structured Data example\nUsage:\nnpm run sign-test-ascii <private key> \"<ASCII string>\" \"<domain app name>\" <chain ID>\nExample:\nnpm run sign-test-ascii 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 \"Hello World\" \"Test App\" 1");
	process.exit(0);
}

const privateKey = createStacksPrivateKey(process.argv[2]);
const asciiMessage = process.argv[3];
const appDomain = process.argv[4];
const chainId = parseInt(process.argv[5]);

const domainHash = structuredDataHash(tupleCV({
	'name': stringAsciiCV(appDomain),
	'version': stringAsciiCV("1.0.0"),
	'chain-id': uintCV(chainId)
}));

const structuredData = stringAsciiCV(asciiMessage);

const signature = signStructuredData(privateKey, domainHash, structuredData);

console.log(`Domain hash:
${domainHash.toString('hex')}

Structured data hash:
${structuredDataHash(structuredData).toString('hex')}

Signature:
${signature.toString('hex')}`);
