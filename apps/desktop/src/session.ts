// All asynchronous work belongs to the session that started it.
let epoch = 0;
let controller = new AbortController();
export class SessionChangedError extends Error {
  constructor() { super('A sessão foi alterada.'); this.name = 'SessionChangedError'; }
}
export function sessionSnapshot() { return { epoch, signal: controller.signal }; }
export function invalidateSession() { epoch++; controller.abort(); controller = new AbortController(); }
export function isCurrentSession(snapshot: ReturnType<typeof sessionSnapshot>) { return snapshot.epoch === epoch; }
