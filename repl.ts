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
const r = repl.start("firebase> ");
Object.assign(r.context, { admin, auth, db });
r.on("exit", () => process.exit());