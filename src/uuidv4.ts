/**
 * Generates a UUIDv4-style identifier using crypto.randomUUID(), falling back to Math.random().
 * When crypto.randomUUID() is available, it should provide a standard, cryptographically strong UUID.
 * The fallback preserves the UUIDv4 shape for compatibility across platforms (Node, React Native,
 * browser JS), but its uniqueness and unpredictability are not as robust as a crypto-backed source.
 *
 * We use this helper for non-security-critical identifiers such as connection IDs and event IDs.
 * Callers should treat fallback-generated values as best-effort unique identifiers, not as
 * security-sensitive or globally uniqueness-guaranteed tokens.
 */
export const uuidv4 = (): string => {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
