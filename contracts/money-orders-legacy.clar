;; READ THIS FIRST:
;; This contract is a re-implementation of the money-orders.clar contract that uses ONLY
;; Stacks 2.0 Clarity features. It can therefore be run using a unmodified canonical
;; Clarinet build. It serves as a contrived example of what would be possible if we have
;; ClarityValue serialisation functions and SIP018 support in wallets.
;; 
;; This contract serializes some Clarity values to wire format, in Clarity. It is costly
;; and limited. For example, serialising principals is impossible, string-utf8 is either
;; impossible or really painful, and complex types cannot have a generalised
;; implementation. (Like responses, tuples, lists, optionals.)
;;
;; For the ideal situation, look at money-orders.clar and signed-structured-data.clar.
;; They are commented out in Clarinet.toml so that a console session for this contract
;; can be started without problems.

;; By Marvin Janssen

;; --- Money orders code

(define-constant contract-owner tx-sender)

(define-constant err-not-owner (err u100))
(define-constant err-invalid-recipient (err u101))
(define-constant err-invalid-signature (err u102))
(define-constant err-already-executed (err u103))

(define-constant chain-id u1)
(define-constant structured-data-prefix 0x534950303138)

(define-constant message-domain-hash (sha256 (serialize-domain
	{
		name: "Money Orders",
		version: "1.0.0",
		chain-id: chain-id
	}
)))

(define-constant structured-data-header (concat structured-data-prefix message-domain-hash))

(define-map money-orders {amount: uint, recipient: (buff 33), salt: uint} uint)

(define-read-only (verify-signature (hash (buff 32)) (signature (buff 65)) (signer principal))
	(is-eq (principal-of? (unwrap! (secp256k1-recover? hash signature) false)) (ok signer))
)

(define-read-only (verify-signed-structured-data (structured-data-hash (buff 32)) (signature (buff 65)) (signer principal))
	(verify-signature (sha256 (concat structured-data-header structured-data-hash)) signature signer)
)

(define-read-only (executed-at (order {amount: uint, recipient: (buff 33), salt: uint}))
	(map-get? money-orders order)
)

(define-public (execute-money-order (order {amount: uint, recipient: (buff 33), salt: uint}) (signature (buff 65)))
	(begin
		(asserts! (is-none (executed-at order)) err-already-executed)
		(asserts! (verify-signed-structured-data (sha256 (serialize-order order)) signature contract-owner) err-invalid-signature)
		(map-set money-orders order block-height)
		(as-contract (stx-transfer? (get amount order) tx-sender (try! (principal-of? (get recipient order)))))
	)
)

(define-public (cancel-money-order (order {amount: uint, recipient: (buff 33), salt: uint}))
	(begin
		(asserts! (is-eq contract-owner tx-sender) err-not-owner)
		(asserts! (is-none (executed-at order)) err-already-executed)
		(ok (map-set money-orders order u0))
	)
)

(define-public (deposit (amount uint))
	(begin
		(asserts! (is-eq contract-owner tx-sender) err-not-owner)
		(stx-transfer? amount tx-sender (as-contract tx-sender))
	)
)

(define-public (withdraw (amount uint))
	(let ((recipient tx-sender))
		(asserts! (is-eq contract-owner tx-sender) err-not-owner)
		(as-contract (stx-transfer? amount tx-sender recipient))
	)
)

;; --- ClarityValue serialisation code beyond this point

(define-constant type-id-int 0x00)
(define-constant type-id-uint 0x01)
(define-constant type-id-buff 0x02)
(define-constant type-id-true 0x03)
(define-constant type-id-false 0x04)
(define-constant type-id-none 0x09)
(define-constant type-id-tuple 0x0c)
(define-constant type-id-string-ascii 0x0d)

(define-read-only (serialize-int (value int))
	(concat
		type-id-int
		(uint128-to-buff-be (if (< value 0) (+ (- u340282366920938463463374607431768211455 (to-uint (- 0 value))) u1) (to-uint value)))
	)
)

(define-read-only (serialize-uint (value uint))
	(concat type-id-uint (uint128-to-buff-be value))
)

(define-read-only (serialize-bool (value bool))
	(if value type-id-true type-id-false)
)

(define-read-only (serialize-buff (value (buff 256)))
	(concat
		type-id-buff
	(concat
		(uint32-to-buff-be (len value))
		value
	))
)

(define-read-only (serialize-string-ascii (value (string-ascii 128)))
	(concat
		type-id-string-ascii
	(concat
		(uint32-to-buff-be (len value))
		(string-ascii-to-buff value)
	))
)

(define-read-only (serialize-tuple-key (key (string-ascii 128)))
	(concat
		(unwrap-panic (element-at byte-list (len key)))
		(string-ascii-to-buff key)
	)
)

(define-read-only (serialize-none)
	type-id-none
)

;; --- contract-specific tuple serialisation

(define-constant serialized-key-amount (serialize-tuple-key "amount"))
(define-constant serialized-key-recipient (serialize-tuple-key "recipient"))
(define-constant serialized-key-salt (serialize-tuple-key "salt"))
(define-constant serialized-order-header (concat type-id-tuple (uint32-to-buff-be u3)))

(define-read-only (serialize-order (order {amount: uint, recipient: (buff 33), salt: uint}))
	(concat
		serialized-order-header
	(concat
		serialized-key-amount
	(concat
		(serialize-uint (get amount order))
	(concat
		serialized-key-recipient
	(concat
		(serialize-buff (get recipient order))
	(concat
		serialized-key-salt
		(serialize-uint (get salt order))
	))))))
)

(define-constant serialized-key-name (serialize-tuple-key "name"))
(define-constant serialized-key-version (serialize-tuple-key "version"))
(define-constant serialized-key-chain-id (serialize-tuple-key "chain-id"))
(define-constant serialized-domain-header (concat type-id-tuple (uint32-to-buff-be u3)))

(define-read-only (serialize-domain (domain {name: (string-ascii 100), version: (string-ascii 32), chain-id: uint}))
	(concat
		serialized-domain-header
	(concat
		serialized-key-chain-id
	(concat
		(serialize-uint (get chain-id domain))
	(concat
		serialized-key-name
	(concat
		(serialize-string-ascii (get name domain))
	(concat
		serialized-key-version
		(serialize-string-ascii (get version domain))
	))))))
)

(define-constant byte-list 0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff)
(define-constant ascii-list "//////////////////////////////// !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////")

(define-read-only (byte-to-uint (byte (buff 1)))
	(unwrap-panic (index-of byte-list byte))
)

(define-read-only (uint-to-byte (n uint))
	(unwrap-panic (element-at byte-list (mod n u255)))
)

(define-private (uint-to-buff-iter (b (buff 1)) (p {n: uint, l: uint, a: (buff 16)}))
	{
		a: (if (< (len (get a p)) (get l p))
			(unwrap-panic (as-max-len? (concat (if (is-eq (get n p) u0) 0x00 (unwrap-panic (element-at byte-list (mod (get n p) u256)))) (get a p)) u16))
			(get a p)
		),
		l: (get l p),
		n: (/ (get n p) u256)
	}
)

(define-private (extract-digit (n uint) (digit uint))
	(mod (/ n (pow u10 digit)) u10)
)

(define-read-only (uint128-to-buff-be (n uint))
	(unwrap-panic (as-max-len? (get a (fold uint-to-buff-iter 0x00000000000000000000000000000000 {n: n, l: u16, a: 0x})) u16))
)

(define-read-only (uint32-to-buff-be (n uint))
	(unwrap-panic (as-max-len? (get a (fold uint-to-buff-iter 0x0000000000 {n: n, l: u4, a: 0x})) u4))
)

(define-private (string-ascii-to-buff-iter (c (string-ascii 1)) (a (buff 128)))
	(unwrap-panic (as-max-len? (concat a (unwrap-panic (element-at byte-list (unwrap-panic (index-of ascii-list c))))) u128))
)

(define-read-only (string-ascii-to-buff (str (string-ascii 128)))
	(fold string-ascii-to-buff-iter str 0x)
)
