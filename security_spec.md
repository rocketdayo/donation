# Security Specification & Threat Model

## 1. Data Invariants
- Tickets collection (`/tickets/{ticketId}`):
  - Every ticket document must have a valid `ticketNumber` (positive integer), `name` (string <= 100 chars), `timeSlot` (string <= 50 chars), `email` (string <= 200 chars), `attendance` in `['unattended', 'present', 'absent', 'completed']`, and `queueStatus` in `['waiting', 'called', 'interview', 'donating', 'resting', 'done', 'absent']`.
  - Document ID `{ticketId}` must be valid alphanumeric/dash (`isValidId`).
  - Read access allows fetching tickets (for donors querying their tickets by name/email and staff managing the queue).
  - Write access ensures strict schema validation and bounded field lengths.

## 2. The Dirty Dozen Payloads (Negative Tests)
1. Injecting 2MB payload into ticket name -> REJECTED (exceeds 100 chars)
2. Malformed ticketId with special symbols -> REJECTED (fails isValidId)
3. Negative ticketNumber -> REJECTED
4. Invalid queueStatus like 'deleted_admin' -> REJECTED (not in enum)
5. Invalid attendance status like 'hacked' -> REJECTED (not in enum)
6. Shadow fields like `__proto__` -> REJECTED (strict keys / validated fields)
7. Non-string notes exceeding 500 chars -> REJECTED
8. Non-boolean firstTimeDonor -> REJECTED
9. Empty string email -> REJECTED (fails min size)
10. Attempting to write to unauthorized collection `/system_secrets/{secretId}` -> REJECTED (catch-all deny)
11. Setting non-numeric ticketNumber (e.g. string "one") -> REJECTED
12. Attempting to create tickets with missing required fields -> REJECTED
