;; A reference contract with a minimal implementation to verify signed structured data.
;; The constants and functions are separated for readability.
;; As the structured data itself is app-specific, it is left out of this reference. The
;; `verify-signed-structured-data` function takes a structured data hash, a signature,
;; and a signer, and returns `true` or `false` depending on whether the signature is
;; valid.

;; By Marvin Janssen

(define-constant chain-id u1)
(define-constant structured-data-prefix 0xc0)

(define-constant message-domain-hash (sha256 (to-consensus-buff
	{
		name: "Dapp Name",
		version: "1.0.0",
		chain-id: chain-id
	}
)))

(define-constant structured-data-header (concat structured-data-prefix message-domain-hash))

(define-read-only (verify-signature (hash (buff 32)) (signature (buff 65)) (signer principal))
	(is-eq (principal-of? (unwrap! (secp256k1-recover? hash signature) false)) (ok signer))
)

(define-read-only (verify-signed-structured-data (structured-data-hash (buff 32)) (signature (buff 65)) (signer principal))
	(verify-signature (sha256 (concat structured-data-header structured-data-hash)) signature signer)
)
