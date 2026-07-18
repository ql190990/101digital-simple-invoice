import path from 'node:path';

/** Absolute path to the persisted auth storage state (resolved from this file's dir). */
export const STORAGE_STATE = path.join(__dirname, '.auth', 'user.json');
