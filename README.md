# Stacks Signed Structured Data

Digital signatures are at the heart of blockchains. They allow users to trustlessly transfer assets, invoke smart contracts and more. To perform these actions, a user signs a transaction and broadcasts it to the network. However, there are situations in which signed proofs without having to broadcast transactions are desirable. A few common use-cases include: (1) prove to an external application or entity that a user is in control of an address; (2) authorise an action to be performed by a smart contract at a later stage (like a meta transaction); (3) participate in an off-chain mechanism that is later settled on-chain (like a subnet). 

The challenge lies in producing messages that are both meaningful to humans as well as easy to be processed on-chain. Luckily, Clarity is a strongly-typed interpreted language. Messages can therefore simply be Clarity Values encoded in Stacks wire format.

This repository contains a reference implementation and example contract for the *SIP018: Signed Structured Data* standard. For more background information, see the SIP document.

# Contracts

- `signed-structured-data.clar` contains a minimal implementation to verify signed structured data.

- `money-orders.clar` is an example project utilising signed structured data. It allows the contract deployer to sign so-called *money orders*. These are tuples containing an amount, a recipient, and a salt. Anyone can submit a signed money order to the contract, which after verification will trigger an STX transfer using the details of the order. The contract deployer also has the ability to cancel a money order for as long as it has not been submitted to the contract. Each money order can only be executed exactly once.

# Tests

You need a custom version of `clarinet` with `to-consensus-buff` enabled to run the test files. Instructions on how to get it will be provided as soon as possible. The excitement will have to wait a little bit!

Use `clarinet test` to run the tests. Note that the signatures are hardcoded in the test files and will fail if the wallets in the provided `Devnet.toml` file are changed. The helper commands used to generate the signatures are provided in comments.

```
* Can verify signed structured data ... ok (7ms)
* Rejects structured data with invalid signatures ... ok (7ms)
* Rejects structured data signed for different domains (app name) ... ok (6ms)
* Rejects structured data signed for different domains (chain ID) ... ok (6ms)
* Executes money orders with valid signatures ... ok (10ms)
* Anyone can submit money orders with valid signatures ... ok (9ms)
* Does not execute money orders with invalid signatures ... ok (9ms)
* Cannot submit the same valid money order twice ... ok (12ms)
* Cannot submit valid money order if the contract has insufficient funds ... ok (7ms)
* Owner can cancel a money order ... ok (9ms)
* Nobody else can cancel a money order ... ok (9ms)
* Cannot execute a valid but cancelled money order ... ok (12ms)
```

# Signing structured data

There are two helper scripts in the `scripts` directory that make it easier to sign structured data for use with the provided contract.

- `sign-money-order` is be used to generate a signature for the `money-orders.clar` example contract. When verbose mode is set to `1`, the command will output example contract calls that can be pasted into a `clarinet console` session.

	```
	npm run sign-money-order <private key> <recipient principal> <amount uint> <salt uint> [verbose 0/1]
	
	Example:
	npm run sign-money-order 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 100 1
	```
	
- `sign-test-ascii` is used to generate signatures for the test file of `signed-structured-data.clar` contract.

	```
	npm run sign-test-ascii <private key> "<ASCII string>" "<domain app name>" <chain ID>
	
	Example:
	npm run sign-test-ascii 753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601 "Hello World" "Test App" 1
	```

# Wallet support

Wallets that support SIP018 for signing structured data:

- No wallets support SIP018 at this time.

Please open an issue to add wallets to the list.
