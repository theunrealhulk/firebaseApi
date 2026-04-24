export interface Product {
    name: string;
    price: number;
    description?: string;
    isActive: boolean;
    createdAt: Date;
}