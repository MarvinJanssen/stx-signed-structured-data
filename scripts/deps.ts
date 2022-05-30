// A reference implementation for signing structured data using `stacks.js`. The
// `signStructuredData` function takes `StacksPrivateKey` and a `ClarityValue`
// and will return buffer of length `65` containing the signature in RSV order.

// DO NOT USE REAL SEED PHRASES OR PRIVATE KEYS.

import { ClarityValue, serializeCV, signWithKey, StacksPrivateKey } from '@stacks/transactions';
import { createHash } from 'crypto';

const structuredDataPrefix = Buffer.from([0x53, 0x49, 0x50, 0x30, 0x31, 0x38]);

export const chainIds = {
	mainnet: 1,
	testnet: 2147483648
}

function sha256(data: Buffer): Buffer {
	return createHash('sha256').update(data).digest();
}

export function structuredDataHash(structuredData: ClarityValue): Buffer {
	return sha256(serializeCV(structuredData));
}

export function signStructuredData(privateKey: StacksPrivateKey, domainHash: Buffer, structuredData: ClarityValue): Buffer {
	const messageHash = structuredDataHash(structuredData);
	const input = sha256(Buffer.concat([structuredDataPrefix, domainHash, messageHash]));
	const data = signWithKey(privateKey, input.toString('hex')).data;
	return Buffer.from(data.slice(2) + data.slice(0, 2), 'hex');
}
