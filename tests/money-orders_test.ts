import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const contractName = 'money-orders';

const MoneyOrderErrors = {
	NotOwner: 100,
	InvalidSignature: 101,
	AlreadyExecuted: 102,
	InsufficientFunds: 1
};

type MoneyOrder = {
	amount: number,
	recipient: string,
	salt: number
}

const contractAddress = (deployer: Account) => `${deployer.address}.${contractName}`;

const depositStacks = (chain: Chain, amount: number, sender: Account) =>
	chain.mineBlock([Tx.contractCall(contractName, 'deposit', [types.uint(amount)], sender.address)]);

const moneyOrderTupleCV = (order: MoneyOrder) =>
	types.tuple({
		amount: types.uint(order.amount),
		recipient: types.principal(order.recipient),
		salt: types.uint(order.salt)
	});

const executeMoneyOrder = (chain: Chain, order: MoneyOrder, signature: string, sender: Account) =>
	chain.mineBlock([
		Tx.contractCall(contractName, 'execute-money-order', [moneyOrderTupleCV(order), signature], sender.address)
	]).receipts[0];

Clarinet.test({
	name: "Executes money orders with valid signatures",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const [contractOwner, recipient] = ['deployer', 'wallet_1'].map(wallet => accounts.get(wallet)!);
		depositStacks(chain, 1000, contractOwner);

		const order: MoneyOrder = {
			amount: 50,
			recipient: recipient.address,
			salt: 1
		};
		// Generated with:
		// npm run sign-money-order 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 50 1
		const signature = '0x98b2a5e2b40461a6cb3eb477eba9daf1babf95a56bd95ba075dc8671c241c770372c250b8bebdd6ee681ef02571419ec60c8a81a23cb167219e46dfb549d78bd00';

		const receipt = executeMoneyOrder(chain, order, signature, contractOwner);
		receipt.result.expectOk().expectBool(true);
		receipt.events.expectSTXTransferEvent(order.amount, contractAddress(contractOwner), recipient.address);
	},
});

Clarinet.test({
	name: "Anyone can submit money orders with valid signatures",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const [contractOwner, recipient] = ['deployer', 'wallet_1'].map(wallet => accounts.get(wallet)!);
		depositStacks(chain, 1000, contractOwner);

		const order: MoneyOrder = {
			amount: 60,
			recipient: recipient.address,
			salt: 2
		};
		// Generated with:
		// npm run sign-money-order 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 60 2
		const signature = '0x0d102fa306e9bc7049237e990369f455fd77fa8defa88e932d36343588e889b3028af88f1ce1eb34d38cc129d4de87fe6d44fad18d866fa223303aeca306881700';

		const receipt = executeMoneyOrder(chain, order, signature, recipient);
		receipt.result.expectOk().expectBool(true);
		receipt.events.expectSTXTransferEvent(order.amount, contractAddress(contractOwner), recipient.address);
	},
});

Clarinet.test({
	name: "Does not execute money orders with invalid signatures",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const [contractOwner, recipient] = ['deployer', 'wallet_1'].map(wallet => accounts.get(wallet)!);
		depositStacks(chain, 1000, contractOwner);

		const order: MoneyOrder = {
			amount: 50,
			recipient: recipient.address,
			salt: 1
		};
		const signature = '0x0000000006e9bc7049237e990369f455fd77fa8defa88e932d36343588e889b3028af88f1ce1eb34d38cc129d4de87fe6d44fad18d866fa223303aeca306881700';

		const receipt = executeMoneyOrder(chain, order, signature, contractOwner);
		receipt.result.expectErr().expectUint(MoneyOrderErrors.InvalidSignature);
		assertEquals(receipt.events.length, 0);
	},
});

Clarinet.test({
	name: "Cannot submit the same valid money order twice",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const [contractOwner, recipient] = ['deployer', 'wallet_1'].map(wallet => accounts.get(wallet)!);
		depositStacks(chain, 1000, contractOwner);

		const order: MoneyOrder = {
			amount: 120,
			recipient: recipient.address,
			salt: 50
		};
		// Generated with:
		// npm run sign-money-order 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 120 50
		const signature = '0x300d5bddd36b57fc64556fb6c621676c8f373b425d752d3e623870ca4ea61a3a6236e6eabcb609d40c3227a74fe68412243e64d2af14f036694be67d06995e3300';

		executeMoneyOrder(chain, order, signature, contractOwner);
		const receipt = executeMoneyOrder(chain, order, signature, contractOwner);
		receipt.result.expectErr().expectUint(MoneyOrderErrors.AlreadyExecuted);
		assertEquals(receipt.events.length, 0);
	},
});

Clarinet.test({
	name: "Cannot submit valid money order if the contract has insufficient funds",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const [contractOwner, recipient] = ['deployer', 'wallet_1'].map(wallet => accounts.get(wallet)!);

		const order: MoneyOrder = {
			amount: 120,
			recipient: recipient.address,
			salt: 50
		};
		// Generated with:
		// npm run sign-money-order 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 120 50
		const signature = '0x300d5bddd36b57fc64556fb6c621676c8f373b425d752d3e623870ca4ea61a3a6236e6eabcb609d40c3227a74fe68412243e64d2af14f036694be67d06995e3300';

		const receipt = executeMoneyOrder(chain, order, signature, contractOwner);
		receipt.result.expectErr().expectUint(MoneyOrderErrors.InsufficientFunds);
		assertEquals(receipt.events.length, 0);
	},
});

Clarinet.test({
	name: "Owner can cancel a money order",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const [contractOwner, recipient] = ['deployer', 'wallet_1'].map(wallet => accounts.get(wallet)!);
		depositStacks(chain, 1000, contractOwner);

		const order: MoneyOrder = {
			amount: 150,
			recipient: recipient.address,
			salt: 60
		};

		const block = chain.mineBlock([
			Tx.contractCall(contractName, 'cancel-money-order', [moneyOrderTupleCV(order)], contractOwner.address)
		]);
		const [receipt] = block.receipts;

		receipt.result.expectOk().expectBool(true);
	},
});

Clarinet.test({
	name: "Nobody else can cancel a money order",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const [contractOwner, recipient] = ['deployer', 'wallet_1'].map(wallet => accounts.get(wallet)!);
		depositStacks(chain, 1000, contractOwner);

		const order: MoneyOrder = {
			amount: 180,
			recipient: recipient.address,
			salt: 70
		};

		const block = chain.mineBlock([
			Tx.contractCall(contractName, 'cancel-money-order', [moneyOrderTupleCV(order)], recipient.address)
		]);
		const [receipt] = block.receipts;

		receipt.result.expectErr().expectUint(MoneyOrderErrors.NotOwner);
	},
});

Clarinet.test({
	name: "Cannot execute a valid but cancelled money order",
	async fn(chain: Chain, accounts: Map<string, Account>) {
		const [contractOwner, recipient] = ['deployer', 'wallet_1'].map(wallet => accounts.get(wallet)!);
		depositStacks(chain, 1000, contractOwner);

		const order: MoneyOrder = {
			amount: 150,
			recipient: recipient.address,
			salt: 60
		};
		// Generated with:
		// npm run sign-money-order 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 150 60
		const signature = '0xcf2aadca64ed437d25e7553ec1bafafeae6adb8bd5605c530c117de2c611037862ccde072880fba38d88d249ea5a1cc77649fc44708e9ba0b0636f6f48ff097b01';

		chain.mineBlock([
			Tx.contractCall(contractName, 'cancel-money-order', [moneyOrderTupleCV(order)], contractOwner.address)
		]);

		const receipt = executeMoneyOrder(chain, order, signature, contractOwner);
		receipt.result.expectErr().expectUint(MoneyOrderErrors.AlreadyExecuted);
		assertEquals(receipt.events.length, 0);
	},
});
