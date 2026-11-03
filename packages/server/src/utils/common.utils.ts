import crypto from 'node:crypto';

export const getId = () => crypto.randomBytes(4).toString('hex');
