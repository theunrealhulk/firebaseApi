import type { ResponseProduct } from "../types/response/ResponseProduct.js";
import type { ResponseOrder } from "../types/response/ResponseOrder.js";
import type { ResponseOrderItem } from "../types/response/ResponseOrderItem.js";
import type { Product } from "../models/Product.js";
import type { Order } from "../models/Order.js";
import type { OrderItem } from "../models/OrderItem.js";

export const toResponseProduct = (doc: any): ResponseProduct => {
    const data = doc.data();
    const createdAt = data?.createdAt?.toDate?.()?.toISOString() 
        || new Date().toISOString();
    
    return {
        id: doc.id,
        name: data?.name || "",
        price: data?.price || 0,
        description: data?.description || "",
        createdAt,
    };
};

export const toResponseOrder = async (doc: any, userData?: any): Promise<ResponseOrder> => {
    const data = doc.data();
    const createdAt = data?.createdAt?.toDate?.()?.toISOString() 
        || new Date().toISOString();
    
    return {
        id: doc.id,
        username: userData?.name || "",
        useremail: userData?.email || "",
        status: data?.status || "pending",
        total: data?.total || 0,
        createdAt,
    };
};

export const toResponseOrderItem = async (doc: any, productData?: any): Promise<ResponseOrderItem> => {
    const data = doc.data();
    
    return {
        id: doc.id,
        orderId: data?.orderId || "",
        productName: productData?.name || "",
        productId: data?.productId || "",
        productPrice: data?.price || 0,
        quantity: data?.quantity || 0,
    };
};