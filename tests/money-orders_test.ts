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
		const signature = '0x0cee864510ad388bb23a88f7601135226db3def81d8af357e64660797ab4a25c25e91e6e31c0e1f7c5ce22b7d02289262bb572442ec3e7975d3024bc1326270301';

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
		const signature = '0xea36f6d76e450900c0d9bc9e0441ac9a3744964924823c662a1a44a9166b1dd00a09039607e4de07b2ae011911e6e488f1b2378d41ec4167997e977a08914f5901';

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
		const signature = '0x000000000000388bb23a88f7601135226db3def81d8af357e64660797ab4a25c25e91e6e31c0e1f7c5ce22b7d02289262bb572442ec3e7975d3024bc1326270301';

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
		const signature = '0x397532e34031f0a081d7170844f8fb21092dd8277869e094c7a6d80c81927fdf269741142a316190d82fe9c0143b9bb855449cba37463c16c8ff4fa9ee57aa4300';

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
		const signature = '0x397532e34031f0a081d7170844f8fb21092dd8277869e094c7a6d80c81927fdf269741142a316190d82fe9c0143b9bb855449cba37463c16c8ff4fa9ee57aa4300';

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
		const signature = '0x1f6054146f86f57c8169e09e7b64881f1f930be2caf00c6c95074f20f41ce2551f4435b051a754ba9e44224384dab8fb17481db47e95fb96493c22b27ef431f900';

		chain.mineBlock([
			Tx.contractCall(contractName, 'cancel-money-order', [moneyOrderTupleCV(order)], contractOwner.address)
		]);

		const receipt = executeMoneyOrder(chain, order, signature, contractOwner);
		receipt.result.expectErr().expectUint(MoneyOrderErrors.AlreadyExecuted);
		assertEquals(receipt.events.length, 0);
	},
});
