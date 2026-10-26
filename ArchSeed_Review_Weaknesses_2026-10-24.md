# ArchSeed Architectural Review & Weakness Audit

**Date:** 2026-10-24  
**Auditor:** Google AI Studio (Pre-flight Reviewer)  
**Target Repository:** `22cryys56p-beep/ArchSeed_Repo`  
**Scope:** `src/core/`, `src/data/`, `ARCHITECTURE_RECORD.md`, and test characterizations (`tests/core/execution-failure.test.ts`)

---

## 1. Executive Summary

ArchSeed's core architectural pattern (`adapter → core → data`) is exceptionally clean, host-agnostic, and testable. However, auditing the runtime engine and its tests reveals **five distinct architectural weaknesses and open seams** that define its current Stage 1 boundaries.

---

## 2. Detailed Findings

### Weakness 1: The "Ghost Mutation" Problem on Unhandled Exceptions (ACP-003 is still Proposed)

In `src/core/execution.ts`:
```typescript
mutate(mutator) {
  mutator(execution.state); // 1. State changes in memory immediately
  changed = true;
}
...
const outcome = operation(request, context); // 2. If this throws an unhandled error...
if (changed) {
  execution.notifier.notify(); // 3. ...notify is NEVER called
}
```

**The consequence (characterized in `tests/core/execution-failure.test.ts` Test 4):**
If an operation modifies state and then throws an unhandled runtime error:
1. In-memory state has already been modified.
2. The UI is **not** notified.
3. When the *next* unrelated operation succeeds, it triggers `notify()`, and observers suddenly see the leftover, half-baked "ghost" state from the operation that crashed earlier.

**Status:** ACP-003 currently stands at **`Proposed`**, not accepted, because a rollback mechanism (e.g. state cloning or snapshot rollback on throw) has not been implemented.

---

### Weakness 2: 100% Synchronous Execution Pipeline (No Async / Promise Support)

In `src/core/operation.ts`:
```typescript
export type Operation<Request, State, Dependencies, Details = unknown> = 
  (request: Request, context: ...) => Outcome<Details>;
```
The signature returns `Outcome<Details>`, **not `Promise<Outcome<Details>>`**.

**The consequence:**
- Real-world operations often require asynchronous I/O (saving to disk, querying databases, calling an AI model, network requests).
- Any asynchronous I/O must currently happen *outside* ArchSeed's execution boundary, forcing awkward two-stage patterns (fetch outside, then pass into a synchronous mutation).
- To support real-world services cleanly, ArchSeed needs an explicit `executeAsync()` contract that preserves mutation atomicity.

---

### Weakness 3: Shallow Immutability on `get()`

In `src/core/operation.ts`:
```typescript
get(): Readonly<State>;
```
In TypeScript, `Readonly<T>` is **shallow**, not deep.

**The consequence:**
If state contains nested objects or arrays (e.g. `{ activeProject: { blockers: ["A", "B"] } }`), TypeScript prevents reassigning `activeProject`, but **does not prevent** mutating nested structures directly:
```typescript
state.get().activeProject.blockers.push("C"); // Silently mutates memory!
```
This bypasses `mutate()`, bypasses the notifier, and bypasses validation. ArchSeed currently relies on developer discipline rather than runtime immutability (e.g. `Object.freeze()` or structural sharing).

---

### Weakness 4: Coarse, "All-or-Nothing" Broadcast Notifications

In `src/core/notification.ts`:
```typescript
export type StateChangeListener = () => void;
```
When `changed = true`, the notifier simply calls `listener()` with no arguments.

**The consequence:**
- Listeners receive no context on *what* changed.
- As applications grow to multiple views (sidebars, list, detail, orientation bars), every single component must re-evaluate and re-render on every state change, even if the change only affected an unrelated background entity.
- It lacks keyed or scoped subscriptions (e.g. `subscribeTo("quests")`).

---

### Weakness 5: Persistence is Completely Delegated

ArchSeed manages in-memory state with strict discipline, but has **no native persistence contract**.
- It does not know how to serialize state to disk.
- It does not handle file-locking or debounced writes.
- It does not define migration paths when state structures evolve.

In the `campaign/` stress test, a separate `persistence.ts` had to be built from scratch. Every new application built on ArchSeed must reinvent its own persistence layer.

---

## 3. Summary Scorecard

| Architectural Area | Rating | Status | Notes |
| :--- | :---: | :---: | :--- |
| **Separation of Concerns** | ⭐⭐⭐⭐⭐ | Pristine | Adapter strictly isolated to edge; Core & Data are pure. |
| **Testability** | ⭐⭐⭐⭐⭐ | Pristine | 100% unit-testable without mock frameworks or browser DOM. |
| **Exception Safety / Rollback** | ⚠️ Needs Work | Open Seam | ACP-003 is still proposed; unhandled errors leave dirty state. |
| **Async / I/O Pipeline** | ⚠️ Limited | Open Seam | Synchronous only; lacks an async execution contract. |
| **State Immutability** | 🟡 Adequate | Shallow | Relies on TypeScript types rather than deep runtime immutability. |
| **Notification Granularity** | 🟡 Adequate | Coarse | Broadcasts to all listeners; risk of render-thrashing in large apps. |
| **Persistence Integration** | 🟡 Delegated | Unstandardized | Left entirely to application layer. |
