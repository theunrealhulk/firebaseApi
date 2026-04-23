import 'express-serve-static-core';
import type { DecodedIdToken } from "firebase-admin";
import type { RegisterRequest, LoginRequest } from "./requests/auth.js";
declare global {
    namespace Express {
        interface Request {
            user?: DecodedIdToken;
            body: RegisterRequest | LoginRequest;
        }
    }
}
export { };