import { Clarinet, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const contractName = 'signed-structured-data';

Clarinet.test({
	name: "Can verify signed structured data",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const deployer = accounts.get('deployer')!;
		// Generated with:
		// npm run sign-test-ascii 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 "Hello World" "Dapp Name" 1
		const structuredDataHash = '0x5297eef9765c466d945ad1cb2c81b30b9fed6c165575dc9226e9edf78b8cd9e8';
		const signature = '0xadf75475bef12f6d5b79b4495df307f75c608133bbe456442071a7d797fbf971120cd46d367cebdb284dd32efa135ed977e36ba30377adec04d0d9622cbd1ea201';
		const response = chain.callReadOnlyFn(contractName, 'verify-signed-structured-data', [structuredDataHash, signature, types.principal(deployer.address)], deployer.address);
		response.result.expectBool(true);
	},
});

Clarinet.test({
	name: "Rejects structured data with invalid signatures",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const deployer = accounts.get('deployer')!;
		const structuredDataHash = '0x5297eef9765c466d945ad1cb2c81b30b9fed6c165575dc9226e9edf78b8cd9e8';
		const signature = '0x0000000000f12f6d5b79b4495df307f75c608133bbe456442071a7d797fbf971120cd46d367cebdb284dd32efa135ed977e36ba30377adec04d0d9622cbd1ea201';
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
		const signature = '0x1267022af55cbffa18fc7c8a518a0610231f719230651be04c2c28c9fd1c0ca00c79ab6d29d9bea66ae9aad7eb551d19ff28ce5f3e0fc54848d180c0b3e06aa501';
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
		const signature = '0xcc8d0f82c8ae83b7a4e74bf45407c17eb42ab21ac139e0450ea70dfd46f0ec36026877a69be904372f514071558289fbe997642f9da79831b03a4427404a60ae00';
		const response = chain.callReadOnlyFn(contractName, 'verify-signed-structured-data', [structuredDataHash, signature, types.principal(deployer.address)], deployer.address);
		response.result.expectBool(false);
	},
});
