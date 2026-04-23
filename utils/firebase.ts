import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
    readFileSync(path.join(__dirname, "../config/serviceAccountKey.json"), "utf8")
);

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (err) {
    // App already initialized or error - continue
}

export const auth: admin.auth.Auth = admin.auth();
export const db: admin.firestore.Firestore = admin.firestore();