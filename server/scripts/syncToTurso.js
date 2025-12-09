/**
 * Sync Lumina.db data to Turso Database
 * This script reads data from local SQLite and syncs to Turso cloud database
 */

import { createClient } from '@libsql/client';

// Turso Database Configuration
const db = createClient({
    url: 'libsql://lumina-db-pulastya.aws-ap-south-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjQ5NDAyMTAsImlkIjoiYjE1NGI4YjUtMzU1Mi00Yzk4LThkNGEtNWU1NWFiYTU5ZDdhIiwicmlkIjoiMDViNzExZmItZTBlMy00MTg4LWJkOTAtMGVmOTY4ZmQzMTdjIn0.TqzcuqL7mpdUDKoElSomM1AgtbU66LpZAdDmUxqEn-dTk2ilMpb0wllOyt5AuiCDXKf3o_k9azgrVGNI952CAw'
});

// Data extracted from lumina.db
const categories = [
    { id: 1, name: "Electronics & Gadgets", description: "Latest technology and electronic devices" },
    { id: 2, name: "Home & Kitchen", description: "Everything for your home and kitchen needs" },
    { id: 3, name: "Sports & Outdoors", description: "Fitness and outdoor adventure gear" },
    { id: 4, name: "Automotive", description: "Car and bike accessories and tools" }
];

const subcategories = [
    { id: 1, name: "Mobiles & Accessories", category_id: 1 },
    { id: 2, name: "Laptops", category_id: 1 },
    { id: 3, name: "Smart Home Devices", category_id: 1 },
    { id: 4, name: "Wearables", category_id: 1 },
    { id: 5, name: "Gaming Consoles", category_id: 1 },
    { id: 6, name: "PC Peripherals", category_id: 1 },
    { id: 7, name: "Furniture", category_id: 2 },
    { id: 8, name: "Kitchen Tools", category_id: 2 },
    { id: 9, name: "Décor", category_id: 2 },
    { id: 10, name: "Appliances", category_id: 2 },
    { id: 11, name: "Fitness Gear", category_id: 3 },
    { id: 12, name: "Sportswear", category_id: 3 },
    { id: 13, name: "Outdoor Essentials", category_id: 3 },
    { id: 14, name: "Car Accessories", category_id: 4 },
    { id: 15, name: "Bike Accessories", category_id: 4 },
    { id: 16, name: "Tools & Maintenance", category_id: 4 }
];

const products = [
    { id: 1, name: "iPhone 15 Pro", price: 119900, stock: 50, description: "Titanium design, A17 Pro chip, 128GB", category_id: 1, subcategory_id: 1, brand: "Apple", image_url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop" },
    { id: 2, name: "Samsung Galaxy S21 Ultra", price: 114999, stock: 45, description: "108MP camera, 5G, 256GB", category_id: 1, subcategory_id: 1, brand: "Samsung", image_url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop" },
    { id: 3, name: "OnePlus 12", price: 64999, stock: 60, description: "Snapdragon 8 Gen 3, 120Hz display", category_id: 1, subcategory_id: 1, brand: "OnePlus", image_url: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&h=400&fit=crop" },
    { id: 4, name: "iPhone 15 Pro Max", price: 134900, stock: 40, description: "Titanium, 256GB, 6.7-inch display", category_id: 1, subcategory_id: 1, brand: "Apple", image_url: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&h=400&fit=crop" },
    { id: 5, name: "Wireless Earbuds Pro", price: 8999, stock: 150, description: "ANC, 30hrs battery, IPX7 waterproof", category_id: 1, subcategory_id: 1, brand: "Generic", image_url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop" },
    { id: 6, name: "MacBook Air M3", price: 99900, stock: 27, description: "13.6-inch Liquid Retina display, 8GB RAM", category_id: 1, subcategory_id: 2, brand: "Apple", image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop" },
    { id: 7, name: "Dell XPS 15", price: 124999, stock: 23, description: "Intel i7 13th Gen, 16GB RAM, RTX 4060", category_id: 1, subcategory_id: 2, brand: "Dell", image_url: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop" },
    { id: 8, name: "ASUS ROG Gaming Laptop", price: 134999, stock: 18, description: "RTX 4070, 32GB RAM, 15.6-inch 240Hz", category_id: 1, subcategory_id: 2, brand: "ASUS", image_url: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop" },
    { id: 9, name: "Logitech MX Master 3S", price: 8999, stock: 100, description: "Wireless mouse, 8K DPI, ergonomic", category_id: 1, subcategory_id: 6, brand: "Logitech", image_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop" },
    { id: 10, name: "Mechanical Keyboard RGB", price: 4999, stock: 80, description: "Cherry MX switches, customizable RGB", category_id: 1, subcategory_id: 6, brand: "Generic", image_url: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&h=400&fit=crop" },
    { id: 11, name: "Echo Dot 5th Gen", price: 4999, stock: 120, description: "Alexa voice control, smart speaker", category_id: 1, subcategory_id: 3, brand: "Amazon", image_url: "https://images.unsplash.com/photo-1543512214-318c7553f230?w=400&h=400&fit=crop" },
    { id: 12, name: "Smart LED Bulb 4-Pack", price: 1999, stock: 200, description: "WiFi enabled, 16M colors, voice control", category_id: 1, subcategory_id: 3, brand: "Philips", image_url: "https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=400&h=400&fit=crop" },
    { id: 13, name: "Ring Video Doorbell", price: 8999, stock: 50, description: "1080p HD video, motion detection, two-way talk", category_id: 1, subcategory_id: 3, brand: "Ring", image_url: "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=400&fit=crop" },
    { id: 14, name: "Smart Thermostat", price: 12999, stock: 40, description: "Energy saving, app control, learning AI", category_id: 1, subcategory_id: 3, brand: "Nest", image_url: "https://images.unsplash.com/photo-1567925086983-a15a61d8cd0f?w=400&h=400&fit=crop" },
    { id: 15, name: "Apple Watch Series 9", price: 41900, stock: 60, description: "GPS, fitness tracking, always-on display", category_id: 1, subcategory_id: 4, brand: "Apple", image_url: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop" },
    { id: 16, name: "Fitbit Charge 6", price: 14999, stock: 80, description: "Heart rate, GPS, sleep tracking", category_id: 1, subcategory_id: 4, brand: "Fitbit", image_url: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400&h=400&fit=crop" },
    { id: 17, name: "Sony WH-1000XM5", price: 19990, stock: 100, description: "Industry leading noise cancellation", category_id: 1, subcategory_id: 4, brand: "Sony", image_url: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop" },
    { id: 18, name: "Ergonomic Office Chair", price: 24999, stock: 40, description: "Lumbar support, mesh back, adjustable", category_id: 2, subcategory_id: 7, brand: "Generic", image_url: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&h=400&fit=crop" },
    { id: 19, name: "Study Desk with Storage", price: 15999, stock: 30, description: "Wooden, 4ft wide, drawer organizer", category_id: 2, subcategory_id: 7, brand: "Generic", image_url: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=400&fit=crop" },
    { id: 20, name: "Premium Sofa Set", price: 54999, stock: 15, description: "3-seater, fabric upholstery, modern design", category_id: 2, subcategory_id: 7, brand: "Generic", image_url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop" },
    { id: 21, name: "Stainless Steel Cookware Set", price: 5999, stock: 50, description: "10-piece, non-stick, induction compatible", category_id: 2, subcategory_id: 8, brand: "Prestige", image_url: "https://images.unsplash.com/photo-1584990347449-a2d4c2c044c9?w=400&h=400&fit=crop" },
    { id: 22, name: "Electric Kettle 1.5L", price: 1299, stock: 100, description: "Auto shut-off, stainless steel", category_id: 2, subcategory_id: 8, brand: "Philips", image_url: "https://images.unsplash.com/photo-1594213114663-d94db9b17b2e?w=400&h=400&fit=crop" },
    { id: 23, name: "Food Processor 600W", price: 4999, stock: 60, description: "Multi-function, 3 jars, mixer grinder", category_id: 2, subcategory_id: 8, brand: "Bajaj", image_url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400&h=400&fit=crop" },
    { id: 24, name: "Wall Art Canvas Set", price: 2999, stock: 70, description: "3-piece modern abstract, framed", category_id: 2, subcategory_id: 9, brand: "Generic", image_url: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&h=400&fit=crop" },
    { id: 25, name: "LED String Lights 10M", price: 899, stock: 150, description: "Warm white, waterproof, USB powered", category_id: 2, subcategory_id: 9, brand: "Generic", image_url: "https://images.unsplash.com/photo-1513001900722-370f803f498d?w=400&h=400&fit=crop" },
    { id: 26, name: "Decorative Table Lamp", price: 1999, stock: 80, description: "Bedside, touch control, dimmable", category_id: 2, subcategory_id: 9, brand: "Generic", image_url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop" },
    { id: 27, name: "Air Fryer 4L", price: 6999, stock: 55, description: "1400W, digital display, 8 presets", category_id: 2, subcategory_id: 10, brand: "Philips", image_url: "https://images.unsplash.com/photo-1626509653291-18d9a934b9db?w=400&h=400&fit=crop" },
    { id: 28, name: "Vacuum Cleaner Robotic", price: 24999, stock: 25, description: "Auto-charge, app control, 2000Pa suction", category_id: 2, subcategory_id: 10, brand: "Mi", image_url: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=400&fit=crop" },
    { id: 29, name: "Microwave Oven 20L", price: 7999, stock: 40, description: "Solo, 700W, child lock", category_id: 2, subcategory_id: 10, brand: "LG", image_url: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=400&h=400&fit=crop" },
    { id: 30, name: "Yoga Mat Premium", price: 1299, stock: 100, description: "6mm thick, anti-slip, eco-friendly", category_id: 3, subcategory_id: 11, brand: "Generic", image_url: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop" },
    { id: 31, name: "Dumbbell Set 20kg", price: 3499, stock: 50, description: "Adjustable weight, chrome finish", category_id: 3, subcategory_id: 11, brand: "Generic", image_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop" },
    { id: 32, name: "Resistance Bands Set", price: 899, stock: 120, description: "5 bands, different resistance levels", category_id: 3, subcategory_id: 11, brand: "Generic", image_url: "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&h=400&fit=crop" },
    { id: 33, name: "Treadmill Folding", price: 34999, stock: 20, description: "2.5HP motor, 12 programs, LCD display", category_id: 3, subcategory_id: 11, brand: "Generic", image_url: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&h=400&fit=crop" },
    { id: 34, name: "Running Shoes Men", price: 4999, stock: 80, description: "Cushioned sole, breathable mesh", category_id: 3, subcategory_id: 12, brand: "Nike", image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop" },
    { id: 35, name: "Sports T-Shirt Dri-FIT", price: 1299, stock: 150, description: "Moisture-wicking, anti-odor", category_id: 3, subcategory_id: 12, brand: "Adidas", image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop" },
    { id: 36, name: "Gym Shorts Compression", price: 999, stock: 130, description: "Quick-dry, elastic waistband", category_id: 3, subcategory_id: 12, brand: "Puma", image_url: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=400&fit=crop" },
    { id: 37, name: "Camping Tent 4-Person", price: 8999, stock: 30, description: "Waterproof, easy setup, carry bag", category_id: 3, subcategory_id: 13, brand: "Quechua", image_url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=400&fit=crop" },
    { id: 38, name: "Hiking Backpack 50L", price: 3999, stock: 50, description: "Multiple compartments, rain cover", category_id: 3, subcategory_id: 13, brand: "Wildcraft", image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop" },
    { id: 39, name: "Water Bottle Insulated", price: 899, stock: 200, description: "1L, keeps cold 24hrs, BPA-free", category_id: 3, subcategory_id: 13, brand: "Milton", image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop" },
    { id: 40, name: "Car Dashboard Camera", price: 4999, stock: 60, description: "1080p, night vision, loop recording", category_id: 4, subcategory_id: 14, brand: "Generic", image_url: "https://images.unsplash.com/photo-1621266876144-f5351e45d605?w=400&h=400&fit=crop" },
    { id: 41, name: "Car Phone Mount Magnetic", price: 599, stock: 150, description: "360° rotation, strong grip", category_id: 4, subcategory_id: 14, brand: "Generic", image_url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400&h=400&fit=crop" },
    { id: 42, name: "Car Vacuum Cleaner", price: 2499, stock: 70, description: "Portable, 12V, HEPA filter", category_id: 4, subcategory_id: 14, brand: "Black & Decker", image_url: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=400&fit=crop" },
    { id: 43, name: "Tire Pressure Monitor", price: 2999, stock: 50, description: "Digital display, 4 sensors, wireless", category_id: 4, subcategory_id: 14, brand: "Generic", image_url: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=400&h=400&fit=crop" },
    { id: 44, name: "Bike Helmet with LED", price: 1499, stock: 100, description: "Adjustable, ventilated, rear LED light", category_id: 4, subcategory_id: 15, brand: "Generic", image_url: "https://images.unsplash.com/photo-1557803175-2f8c4c543d85?w=400&h=400&fit=crop" },
    { id: 45, name: "Bike Lock Chain Heavy Duty", price: 899, stock: 120, description: "Steel chain, weather resistant", category_id: 4, subcategory_id: 15, brand: "Generic", image_url: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400&h=400&fit=crop" },
    { id: 46, name: "Bike Phone Holder", price: 399, stock: 180, description: "Universal fit, anti-shake, waterproof", category_id: 4, subcategory_id: 15, brand: "Generic", image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop" },
    { id: 47, name: "Car Tool Kit 46-Piece", price: 2999, stock: 40, description: "Screwdrivers, wrenches, pliers, case", category_id: 4, subcategory_id: 16, brand: "Bosch", image_url: "https://images.unsplash.com/photo-1581166397057-235af2b3c6dd?w=400&h=400&fit=crop" },
    { id: 48, name: "Portable Air Compressor", price: 3999, stock: 34, description: "12V, digital gauge, auto shut-off", category_id: 4, subcategory_id: 16, brand: "Generic", image_url: "https://images.unsplash.com/photo-1600493572220-353c267e1678?w=400&h=400&fit=crop" },
    { id: 49, name: "Engine Oil 5W-30 4L", price: 1999, stock: 80, description: "Synthetic, high performance", category_id: 4, subcategory_id: 16, brand: "Castrol", image_url: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=400&fit=crop" },
    { id: 50, name: "PlayStation 5", price: 54990, stock: 0, description: "4K 120Hz gaming console, 825GB SSD", category_id: 1, subcategory_id: 5, brand: "Sony", image_url: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=400&fit=crop" },
    { id: 51, name: "Xbox Series X", price: 52990, stock: 11, description: "4K gaming, 1TB SSD, Game Pass", category_id: 1, subcategory_id: 5, brand: "Microsoft", image_url: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&h=400&fit=crop" },
    { id: 52, name: "Nintendo Switch OLED", price: 34990, stock: 23, description: "7-inch OLED screen, portable gaming", category_id: 1, subcategory_id: 5, brand: "Nintendo", image_url: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400&h=400&fit=crop" }
];

async function syncToTurso() {
    console.log('🚀 Starting Turso database sync from lumina.db...\n');

    try {
        // Step 1: Clear existing data
        console.log('🗑️  Clearing existing data...');
        await db.execute('DELETE FROM order_items');
        await db.execute('DELETE FROM orders');
        await db.execute('DELETE FROM products');
        await db.execute('DELETE FROM subcategories');
        await db.execute('DELETE FROM categories');
        console.log('✅ Existing data cleared\n');

        // Step 2: Reset auto-increment sequences
        console.log('🔄 Resetting sequences...');
        await db.execute('DELETE FROM sqlite_sequence WHERE name IN ("categories", "subcategories", "products", "orders", "order_items")');
        console.log('✅ Sequences reset\n');

        // Step 3: Insert Categories
        console.log('📂 Inserting categories...');
        for (const cat of categories) {
            await db.execute(
                'INSERT INTO categories (id, name, description) VALUES (?, ?, ?)',
                [cat.id, cat.name, cat.description]
            );
        }
        console.log(`✅ ${categories.length} categories inserted\n`);

        // Step 4: Insert Subcategories
        console.log('📁 Inserting subcategories...');
        for (const sub of subcategories) {
            await db.execute(
                'INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)',
                [sub.id, sub.name, sub.category_id]
            );
        }
        console.log(`✅ ${subcategories.length} subcategories inserted\n`);

        // Step 5: Insert Products
        console.log('📦 Inserting products with images...');
        for (const prod of products) {
            await db.execute(
                `INSERT INTO products (id, name, price, stock, description, category_id, subcategory_id, brand, image_url) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [prod.id, prod.name, prod.price, prod.stock, prod.description, prod.category_id, prod.subcategory_id, prod.brand, prod.image_url]
            );
        }
        console.log(`✅ ${products.length} products inserted with image URLs\n`);

        // Verify data
        console.log('📊 Verifying sync...');
        const catCount = await db.execute('SELECT COUNT(*) as count FROM categories');
        const subCount = await db.execute('SELECT COUNT(*) as count FROM subcategories');
        const prodCount = await db.execute('SELECT COUNT(*) as count FROM products');
        const imgCount = await db.execute('SELECT COUNT(*) as count FROM products WHERE image_url IS NOT NULL AND image_url != ""');

        console.log(`   Categories: ${catCount.rows[0].count}`);
        console.log(`   Subcategories: ${subCount.rows[0].count}`);
        console.log(`   Products: ${prodCount.rows[0].count}`);
        console.log(`   Products with images: ${imgCount.rows[0].count}`);

        console.log('\n🎉 Turso database sync complete!');
        console.log('✅ All data from lumina.db has been synced to Turso cloud database.');

    } catch (error) {
        console.error('❌ Error syncing to Turso:', error);
        throw error;
    }
}

// Run the sync
syncToTurso();
