export interface Order {
    userId: string;
    total: number;
    status: "pending" | "processing" | "completed" | "cancelled";
    createdAt: Date;
}