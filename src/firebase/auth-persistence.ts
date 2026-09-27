let authPersistenceReady: Promise<void> | null = null;

export function setAuthPersistenceReady(promise: Promise<void>) {
  authPersistenceReady = promise;
}

export function waitForAuthPersistence(): Promise<void> {
  return authPersistenceReady ?? Promise.resolve();
}
