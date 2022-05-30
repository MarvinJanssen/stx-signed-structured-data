import { Clarinet, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const contractName = 'signed-structured-data';

Clarinet.test({
	name: "Can verify signed structured data",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const deployer = accounts.get('deployer')!;
		// Generated with:
		// npm run sign-test-ascii 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 "Hello World" "Dapp Name" 1
		const structuredDataHash = '0x5297eef9765c466d945ad1cb2c81b30b9fed6c165575dc9226e9edf78b8cd9e8';
		const signature = '0x7b30087aec38baa381f9f86c7a33c68dfea4849fd1a1d23671b78efa3272d202797fea39a3924907194129de60d3b1930cc738699942fdd1b4bd7a5d29a1c93f00';
		const response = chain.callReadOnlyFn(contractName, 'verify-signed-structured-data', [structuredDataHash, signature, types.principal(deployer.address)], deployer.address);
		response.result.expectBool(true);
	},
});

Clarinet.test({
	name: "Rejects structured data with invalid signatures",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const deployer = accounts.get('deployer')!;
		const structuredDataHash = '0x5297eef9765c466d945ad1cb2c81b30b9fed6c165575dc9226e9edf78b8cd9e8';
		const signature = '0x00000000ec38baa381f9f86c7a33c68dfea4849fd1a1d23671b78efa3272d202797fea39a3924907194129de60d3b1930cc738699942fdd1b4bd7a5d29a1c93f00';
		const response = chain.callReadOnlyFn(contractName, 'verify-signed-structured-data', [structuredDataHash, signature, types.principal(deployer.address)], deployer.address);
		response.result.expectBool(false);
	},
});

Clarinet.test({
	name: "Rejects structured data signed for different domains (app name)",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const deployer = accounts.get('deployer')!;
		// Generated with:
		// npm run sign-test-ascii 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 "Hello World" "Bogus App" 1
		const structuredDataHash = '0x5297eef9765c466d945ad1cb2c81b30b9fed6c165575dc9226e9edf78b8cd9e8';
		const signature = '0xa06c5f87e4464390ae4e7baf50c14082ca4a8c3a7e35c2f45a842736b40803ba4196ca23485508b9af52e0bb32111e9e900e071b416a08c9a8f093f682ff46b900';
		const response = chain.callReadOnlyFn(contractName, 'verify-signed-structured-data', [structuredDataHash, signature, types.principal(deployer.address)], deployer.address);
		response.result.expectBool(false);
	},
});

Clarinet.test({
	name: "Rejects structured data signed for different domains (chain ID)",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const deployer = accounts.get('deployer')!;
		// Generated with:
		// npm run sign-test-ascii 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 "Hello World" "Dapp Name" 2
		const structuredDataHash = '0x5297eef9765c466d945ad1cb2c81b30b9fed6c165575dc9226e9edf78b8cd9e8';
		const signature = '0x7bcf3700fd2e899eddff664099e0fa3809d01d72b1b6d1c8fb35fa9e2a13577e750482be1a388f445ceec336ce53d9b9b9632ffefa610414afb827906efa648a00';
		const response = chain.callReadOnlyFn(contractName, 'verify-signed-structured-data', [structuredDataHash, signature, types.principal(deployer.address)], deployer.address);
		response.result.expectBool(false);
	},
});
