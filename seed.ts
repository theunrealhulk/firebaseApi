import { db, auth } from "./utils/firebase.js";
import { faker } from "@faker-js/faker";
import type { Product } from "./models/Product.js";
import type { Order } from "./models/Order.js";
import type { OrderItem } from "./models/OrderItem.js";

const NUM_PRODUCTS = 1000;
const NUM_USERS = 8;
const ORDERS_PER_USER = 16;
const ITEMS_PER_ORDER_MIN = 5;
const ITEMS_PER_ORDER_MAX = 10;

const seedProducts = async () => {
    console.log("Seeding products...");
    const productIds: string[] = [];

    for (let i = 0; i < NUM_PRODUCTS; i++) {
        const productRef = db.collection("products").doc();
        productIds.push(productRef.id);
        
        const product: Product = {
            name: faker.commerce.productName(),
            price: parseFloat(faker.commerce.price()),
            description: faker.commerce.productDescription(),
            isActive: true,
            createdAt: new Date(),
        };
        
        await productRef.set(product);
        
        if ((i + 1) % 100 === 0) {
            console.log(`Created ${i + 1} products...`);
        }
    }

    console.log(`Created ${NUM_PRODUCTS} products!`);
    return productIds;
};

const seedUsers = async () => {
    console.log("Seeding users...");
    const userIds: string[] = [];

    for (let i = 0; i < NUM_USERS; i++) {
        const email = faker.internet.email();
        const password = "Password123!";
        
        try {
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: faker.person.fullName(),
            });
            userIds.push(userRecord.uid);
            console.log(`Created user ${i + 1}: ${email}`);
        } catch (err: any) {
            console.log(`Failed to create user ${email}: ${err.message}`);
        }
    }

    console.log(`Created ${userIds.length} users!`);
    return userIds;
};

const seedOrders = async (userIds: string[], productIds: string[]) => {
    console.log("Seeding orders...");
    let totalOrders = 0;

    for (let u = 0; u < userIds.length; u++) {
        const userId = userIds[u];
        
        for (let o = 0; o < ORDERS_PER_USER; o++) {
            const orderRef = db.collection("orders").doc();
            const orderId = orderRef.id;
            const numItems = faker.number.int({ min: ITEMS_PER_ORDER_MIN, max: ITEMS_PER_ORDER_MAX });
            
            let total = 0;
            
            for (let i = 0; i < numItems; i++) {
                const productId = faker.helpers.arrayElement(productIds);
                const quantity = faker.number.int({ min: 1, max: 5 });
                const price = faker.number.int({ min: 10, max: 500 });
                total += quantity * price;

                const itemRef = db.collection("orderItems").doc();
                const orderItem: OrderItem = {
                    orderId,
                    productId,
                    quantity,
                    price,
                };
                
                await itemRef.set(orderItem);
            }

            const order: Order = {
                userId: userId!,
                total,
                status: faker.helpers.arrayElement(["pending", "processing", "completed", "cancelled"]),
                createdAt: new Date(),
            };
            
            await orderRef.set(order);
            totalOrders++;
            
            if ((u * ORDERS_PER_USER + o + 1) % 50 === 0) {
                console.log(`Created ${u * ORDERS_PER_USER + o + 1} orders...`);
            }
        }

        console.log(`Created ${ORDERS_PER_USER} orders for user ${u + 1}...`);
    }

    console.log(`Created ${totalOrders} total orders!`);
};

const seed = async () => {
    console.log("Starting seed...\n");

    try {
        const productIds = await seedProducts();
        console.log("");

        const userIds = await seedUsers();
        console.log("");

        await seedOrders(userIds, productIds);
        console.log("");

        console.log("✅ Seed completed!");
    } catch (err) {
        console.error("Seed failed:", err);
    }
};

seed();