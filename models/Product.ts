export interface Product {
    name: string;
    price: number;
    description?: string;
    stock?: number;
    category?: string;
    image?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt?: Date;
}