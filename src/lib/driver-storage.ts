const DRIVER_STORAGE_KEY = "numnum-driver-pin";
type DriverStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Storage remembers the credential only; the server still validates every request.
export function readDriverPin(storage: DriverStorage): string {
  try { return storage.getItem(DRIVER_STORAGE_KEY) ?? ""; } catch { return ""; }
}

export function rememberDriverPin(storage: DriverStorage, pin: string) {
  try { storage.setItem(DRIVER_STORAGE_KEY, pin); } catch { /* private mode: login still works */ }
}

export function forgetDriverPin(storage: DriverStorage) {
  try { storage.removeItem(DRIVER_STORAGE_KEY); } catch { /* storage may be unavailable */ }
}