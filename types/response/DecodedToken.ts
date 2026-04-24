export interface DecodedToken {
    uid: string;
    email: string;
    email_verified: boolean;
    name: string;
    role: "admin" | "client";
    exp: number;
    iat: number;
}