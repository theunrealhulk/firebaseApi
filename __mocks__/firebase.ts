export const auth = {
    createUser: () => Promise.resolve({ uid: "", email: "", displayName: "" }),
    getUser: () => Promise.resolve({ uid: "", email: "", displayName: "" }),
    deleteUser: () => Promise.resolve(),
    setCustomUserClaims: () => Promise.resolve(),
    revokeRefreshTokens: () => Promise.resolve(),
    verifyIdToken: () => Promise.resolve({ uid: "", role: "" }),
    listUsers: () => Promise.resolve({ users: [] }),
};

export const db = {
    collection: () => ({
        doc: () => ({
            id: "mock-id",
            set: () => Promise.resolve(),
            get: () => Promise.resolve({ exists: true, id: "mock-id", data: () => ({}) }),
            update: () => Promise.resolve(),
            delete: () => Promise.resolve(),
            collection: () => ({
                doc: () => ({
                    id: "mock-id",
                    set: () => Promise.resolve(),
                    get: () => Promise.resolve({ docs: [], size: 0 }),
                }),
                get: () => Promise.resolve({ docs: [], size: 0 }),
            }),
        }),
        get: () => Promise.resolve({ docs: [], size: 0 }),
        add: () => Promise.resolve({ id: "mock-id" }),
    }),
    doc: () => ({
        id: "mock-id",
        set: () => Promise.resolve(),
        get: () => Promise.resolve({ exists: true, id: "mock-id", data: () => ({}) }),
        update: () => Promise.resolve(),
        delete: () => Promise.resolve(),
    }),
    batch: () => ({
        set: () => ({}),
        commit: () => Promise.resolve(),
    }),
};

export default { auth, db };