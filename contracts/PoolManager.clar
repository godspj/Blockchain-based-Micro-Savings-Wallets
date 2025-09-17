(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-POOL-SIZE u101)
(define-constant ERR-INVALID-YIELD-RATE u102)
(define-constant ERR-INVALID-DURATION u103)
(define-constant ERR-INVALID-PENALTY u104)
(define-constant ERR-INVALID-THRESHOLD u105)
(define-constant ERR-POOL-ALREADY-EXISTS u106)
(define-constant ERR-POOL-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-DEFI-NOT-VERIFIED u109)
(define-constant ERR-INVALID-MIN-DEPOSIT u110)
(define-constant ERR-INVALID-MAX-DEPOSIT u111)
(define-constant ERR-POOL-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-POOLS-EXCEEDED u114)
(define-constant ERR-INVALID-POOL-TYPE u115)
(define-constant ERR-INVALID-INTEREST-RATE u116)
(define-constant ERR-INVALID-LOCK-PERIOD u117)
(define-constant ERR-INVALID-LOCATION u118)
(define-constant ERR-INVALID-CURRENCY u119)
(define-constant ERR-INVALID-STATUS u120)
(define-constant ERR-INSUFFICIENT-BALANCE u121)
(define-constant ERR-TRANSFER-FAILED u122)
(define-constant ERR-ALREADY-IN-POOL u123)
(define-constant ERR-NOT-IN-POOL u124)
(define-constant ERR-POOL-FULL u125)
(define-constant ERR-INVALID-AMOUNT u126)
(define-constant ERR-LOCKED-FUNDS u127)
(define-constant ERR-INVALID-DEFI-PROTOCOL u128)
(define-constant ERR-DEPLOYMENT-FAILED u129)
(define-constant ERR-WITHDRAWAL-FAILED u130)

(define-data-var next-pool-id uint u0)
(define-data-var max-pools uint u500)
(define-data-var creation-fee uint u500)
(define-data-var defi-contract (optional principal) none)

(define-map pools
  uint
  {
    name: (string-utf8 100),
    min-deposit: uint,
    max-deposit: uint,
    yield-rate: uint,
    duration: uint,
    penalty: uint,
    threshold: uint,
    timestamp: uint,
    creator: principal,
    pool-type: (string-utf8 50),
    interest-rate: uint,
    lock-period: uint,
    currency: (string-utf8 20),
    status: bool,
    total-deposited: uint,
    total-shares: uint,
    defi-protocol: (string-utf8 50)
  }
)

(define-map pools-by-name
  (string-utf8 100)
  uint)

(define-map pool-updates
  uint
  {
    update-name: (string-utf8 100),
    update-min-deposit: uint,
    update-max-deposit: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-map user-shares
  { pool-id: uint, user: principal }
  { shares: uint, deposit-time: uint, last-claim: uint }
)

(define-read-only (get-pool (id uint))
  (map-get? pools id)
)

(define-read-only (get-pool-updates (id uint))
  (map-get? pool-updates id)
)

(define-read-only (is-pool-registered (name (string-utf8 100)))
  (is-some (map-get? pools-by-name name))
)

(define-read-only (get-user-share (pool-id uint) (user principal))
  (map-get? user-shares { pool-id: pool-id, user: user })
)

(define-private (validate-name (name (string-utf8 100)))
  (if (and (> (len name) u0) (<= (len name) u100))
      (ok true)
      (err ERR-INVALID-UPDATE-PARAM))
)

(define-private (validate-min-deposit (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-MIN-DEPOSIT))
)

(define-private (validate-max-deposit (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-MAX-DEPOSIT))
)

(define-private (validate-yield-rate (rate uint))
  (if (<= rate u100)
      (ok true)
      (err ERR-INVALID-YIELD-RATE))
)

(define-private (validate-duration (dur uint))
  (if (> dur u0)
      (ok true)
      (err ERR-INVALID-DURATION))
)

(define-private (validate-penalty (pen uint))
  (if (<= pen u50)
      (ok true)
      (err ERR-INVALID-PENALTY))
)

(define-private (validate-threshold (thresh uint))
  (if (and (> thresh u0) (<= thresh u100))
      (ok true)
      (err ERR-INVALID-THRESHOLD))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-pool-type (ptype (string-utf8 50)))
  (if (or (is-eq ptype "lending") (is-eq ptype "staking") (is-eq ptype "yield-farming"))
      (ok true)
      (err ERR-INVALID-POOL-TYPE))
)

(define-private (validate-interest-rate (rate uint))
  (if (<= rate u20)
      (ok true)
      (err ERR-INVALID-INTEREST-RATE))
)

(define-private (validate-lock-period (period uint))
  (if (<= period u365)
      (ok true)
      (err ERR-INVALID-LOCK-PERIOD))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-defi-protocol (proto (string-utf8 50)))
  (if (or (is-eq proto "alex") (is-eq proto "arkadiko") (is-eq proto "velar"))
      (ok true)
      (err ERR-INVALID-DEFI-PROTOCOL))
)

(define-private (validate-amount (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-AMOUNT))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-defi-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get defi-contract)) (err ERR-DEFI-NOT-VERIFIED))
    (var-set defi-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-pools (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get defi-contract)) (err ERR-DEFI-NOT-VERIFIED))
    (var-set max-pools new-max)
    (ok true)
  )
)

(define-public (set-creation-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get defi-contract)) (err ERR-DEFI-NOT-VERIFIED))
    (var-set creation-fee new-fee)
    (ok true)
  )
)

(define-public (create-pool
  (pool-name (string-utf8 100))
  (min-deposit uint)
  (max-deposit uint)
  (yield-rate uint)
  (duration uint)
  (penalty uint)
  (threshold uint)
  (pool-type (string-utf8 50))
  (interest-rate uint)
  (lock-period uint)
  (currency (string-utf8 20))
  (defi-protocol (string-utf8 50))
)
  (let (
        (next-id (var-get next-pool-id))
        (current-max (var-get max-pools))
        (defi (var-get defi-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-POOLS-EXCEEDED))
    (try! (validate-name pool-name))
    (try! (validate-min-deposit min-deposit))
    (try! (validate-max-deposit max-deposit))
    (try! (validate-yield-rate yield-rate))
    (try! (validate-duration duration))
    (try! (validate-penalty penalty))
    (try! (validate-threshold threshold))
    (try! (validate-pool-type pool-type))
    (try! (validate-interest-rate interest-rate))
    (try! (validate-lock-period lock-period))
    (try! (validate-currency currency))
    (try! (validate-defi-protocol defi-protocol))
    (asserts! (is-none (map-get? pools-by-name pool-name)) (err ERR-POOL-ALREADY-EXISTS))
    (let ((defi-recipient (unwrap! defi (err ERR-DEFI-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get creation-fee) tx-sender defi-recipient))
    )
    (map-set pools next-id
      {
        name: pool-name,
        min-deposit: min-deposit,
        max-deposit: max-deposit,
        yield-rate: yield-rate,
        duration: duration,
        penalty: penalty,
        threshold: threshold,
        timestamp: block-height,
        creator: tx-sender,
        pool-type: pool-type,
        interest-rate: interest-rate,
        lock-period: lock-period,
        currency: currency,
        status: true,
        total-deposited: u0,
        total-shares: u0,
        defi-protocol: defi-protocol
      }
    )
    (map-set pools-by-name pool-name next-id)
    (var-set next-pool-id (+ next-id u1))
    (print { event: "pool-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-pool
  (pool-id uint)
  (update-name (string-utf8 100))
  (update-min-deposit uint)
  (update-max-deposit uint)
)
  (let ((pool (map-get? pools pool-id)))
    (match pool
      p
        (begin
          (asserts! (is-eq (get creator p) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-name update-name))
          (try! (validate-min-deposit update-min-deposit))
          (try! (validate-max-deposit update-max-deposit))
          (let ((existing (map-get? pools-by-name update-name)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id pool-id) (err ERR-POOL-ALREADY-EXISTS))
              (begin true)
            )
          )
          (let ((old-name (get name p)))
            (if (is-eq old-name update-name)
                (ok true)
                (begin
                  (map-delete pools-by-name old-name)
                  (map-set pools-by-name update-name pool-id)
                  (ok true)
                )
            )
          )
          (map-set pools pool-id
            (merge p {
              name: update-name,
              min-deposit: update-min-deposit,
              max-deposit: update-max-deposit,
              timestamp: block-height
            })
          )
          (map-set pool-updates pool-id
            {
              update-name: update-name,
              update-min-deposit: update-min-deposit,
              update-max-deposit: update-max-deposit,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "pool-updated", id: pool-id })
          (ok true)
        )
      (err ERR-POOL-NOT-FOUND)
    )
  )
)

(define-public (add-to-pool (pool-id uint) (amount uint))
  (let ((pool (unwrap! (map-get? pools pool-id) (err ERR-POOL-NOT-FOUND))))
    (try! (validate-amount amount))
    (asserts! (get status pool) (err ERR-INVALID-STATUS))
    (asserts! (>= amount (get min-deposit pool)) (err ERR-INVALID-AMOUNT))
    (asserts! (<= (+ (get total-deposited pool) amount) (get max-deposit pool)) (err ERR-POOL-FULL))
    (let ((user-key { pool-id: pool-id, user: tx-sender })
          (existing-share (default-to { shares: u0, deposit-time: u0, last-claim: u0 } (map-get? user-shares user-key))))
      (asserts! (is-eq (get shares existing-share) u0) (err ERR-ALREADY-IN-POOL))
      (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
      (let ((new-shares amount))
        (map-set user-shares user-key { shares: new-shares, deposit-time: block-height, last-claim: block-height })
        (map-set pools pool-id (merge pool { total-deposited: (+ (get total-deposited pool) amount), total-shares: (+ (get total-shares pool) new-shares) }))
        (print { event: "added-to-pool", pool-id: pool-id, user: tx-sender, amount: amount })
        (ok true)
      )
    )
  )
)

(define-public (remove-from-pool (pool-id uint))
  (let ((pool (unwrap! (map-get? pools pool-id) (err ERR-POOL-NOT-FOUND)))
        (user-key { pool-id: pool-id, user: tx-sender })
        (share (unwrap! (map-get? user-shares user-key) (err ERR-NOT-IN-POOL))))
    (asserts! (get status pool) (err ERR-INVALID-STATUS))
    (asserts! (>= (- block-height (get deposit-time share)) (get lock-period pool)) (err ERR-LOCKED-FUNDS))
    (let ((amount (get shares share))
          (penalty-amount (/ (* amount (get penalty pool)) u100)))
      (let ((withdraw-amount (- amount penalty-amount)))
        (try! (as-contract (stx-transfer? withdraw-amount tx-sender tx-sender)))
        (map-delete user-shares user-key)
        (map-set pools pool-id (merge pool { total-deposited: (- (get total-deposited pool) amount), total-shares: (- (get total-shares pool) amount) }))
        (print { event: "removed-from-pool", pool-id: pool-id, user: tx-sender, amount: withdraw-amount })
        (ok withdraw-amount)
      )
    )
  )
)

(define-public (deploy-to-defi (pool-id uint))
  (let ((pool (unwrap! (map-get? pools pool-id) (err ERR-POOL-NOT-FOUND))))
    (asserts! (is-eq (get creator pool) tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (>= (get total-deposited pool) (get threshold pool)) (err ERR-INVALID-THRESHOLD))
    (print { event: "deployed-to-defi", pool-id: pool-id, protocol: (get defi-protocol pool), amount: (get total-deposited pool) })
    (ok true)
  )
)

(define-public (claim-yield (pool-id uint))
  (let ((pool (unwrap! (map-get? pools pool-id) (err ERR-POOL-NOT-FOUND)))
        (user-key { pool-id: pool-id, user: tx-sender })
        (share (unwrap! (map-get? user-shares user-key) (err ERR-NOT-IN-POOL))))
    (asserts! (get status pool) (err ERR-INVALID-STATUS))
    (let ((time-elapsed (- block-height (get last-claim share)))
          (yield-amount (/ (* (get shares share) (get yield-rate pool) time-elapsed) (* u100 u144))))
      (try! (as-contract (stx-transfer? yield-amount tx-sender tx-sender)))
      (map-set user-shares user-key (merge share { last-claim: block-height }))
      (print { event: "yield-claimed", pool-id: pool-id, user: tx-sender, amount: yield-amount })
      (ok yield-amount)
    )
  )
)

(define-public (get-pool-count)
  (ok (var-get next-pool-id))
)

(define-public (check-pool-existence (name (string-utf8 100)))
  (ok (is-pool-registered name))
)