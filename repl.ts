import * as repl from "repl";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
    readFileSync(path.join(__dirname, "config/serviceAccountKey.json"), "utf8")
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

// Stored queries
const queries = {
    // Auth queries
    async listUsers() {
        const result = await auth.listUsers();
        console.log(`\n=== Users (${result.users.length}) ===`);
        result.users.forEach((u: any) => {
            console.log(`- ${u.email} | ${u.uid} | role: ${u.customClaims?.role || "none"}`);
        });
        return result.users;
    },

    async deleteUser(uid: string) {
        await auth.deleteUser(uid);
        console.log(`Deleted user: ${uid}`);
    },

    async setRole(uid: string, role: "admin" | "client") {
        await auth.setCustomUserClaims(uid, { role });
        console.log(`Set ${uid} as ${role}`);
    },

    // Firestore queries
    async getProducts(limit = 20) {
        const snapshot = await db.collection("products").limit(limit).get();
        console.log(`\n=== Products (${snapshot.size}) ===`);
        snapshot.docs.forEach((doc: any) => {
            console.log(`- ${doc.id}: ${doc.data().name} ($${doc.data().price})`);
        });
        return snapshot.docs;
    },

    async getOrders(limit = 20) {
        const snapshot = await db.collection("orders").limit(limit).get();
        console.log(`\n=== Orders (${snapshot.size}) ===`);
        snapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            console.log(`- ${doc.id} | user: ${data.userId} | total: $${data.total} | status: ${data.status}`);
        });
        return snapshot.docs;
    },

    async getOrderItems(orderId: string) {
        const snapshot = await db.collection("orderItems")
            .where("orderId", "==", orderId)
            .get();
        console.log(`\n=== Order Items for ${orderId} (${snapshot.size}) ===`);
        snapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            console.log(`- ${doc.id} | qty: ${data.quantity} | $${data.price}`);
        });
        return snapshot.docs;
    },

    async getUserOrders(uid: string) {
        const snapshot = await db.collection("orders")
            .where("userId", "==", uid)
            .get();
        console.log(`\n=== Orders for ${uid} (${snapshot.size}) ===`);
        snapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            console.log(`- ${doc.id} | total: $${data.total} | status: ${data.status}`);
        });
        return snapshot.docs;
    },

    async countCollection(collection: string) {
        const snapshot = await db.collection(collection).get();
        console.log(`${collection}: ${snapshot.size} documents`);
        return snapshot.size;
    },

    async stats() {
        console.log("\n=== Database Stats ===");
        const products = await db.collection("products").get();
        const orders = await db.collection("orders").get();
        const orderItems = await db.collection("orderItems").get();
        const users = await auth.listUsers();
        console.log(`Products: ${products.size}`);
        console.log(`Orders: ${orders.size}`);
        console.log(`Order Items: ${orderItems.size}`);
        console.log(`Users: ${users.users.length}`);
    },

    async clearCollection(collection: string) {
        const snapshot = await db.collection(collection).get();
        const batch = db.batch();
        snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Cleared ${snapshot.size} documents from ${collection}`);
    },

    async help() {
        console.log(`
=== Available Commands ===

Auth:
  await queries.listUsers()              - List all users
  await queries.deleteUser(uid)           - Delete user
  await queries.setRole(uid, "admin")     - Set user role

Firestore:
  await queries.getProducts()             - List products (default 20)
  await queries.getProducts(50)          - List 50 products
  await queries.getOrders()               - List orders
  await queries.getOrderItems(orderId)    - Get order items
  await queries.getUserOrders(uid)        - Get user's orders
  await queries.countCollection("products") - Count documents
  await queries.stats()                   - Database statistics

Maintenance:
  await queries.clearCollection("products") - Clear collection
  await queries.help()                    - Show this help
`);
    },
};

// Start REPL
const r = repl.start("firebase> ");
Object.assign(r.context, { admin, auth, db, queries });
console.log(`
Firebase REPL
Type 'await queries.help()' for available commands
`);
r.on("exit", () => process.exit());