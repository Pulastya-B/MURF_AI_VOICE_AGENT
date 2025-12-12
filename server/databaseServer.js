import express from 'express';
import { createClient } from '@libsql/client';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        /\.onrender\.com$/  // Allow all Render deployments
    ],
    credentials: true
}));
app.use(express.json());

// Serve static invoices
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));

// Turso Database Setup
const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'libsql://lumina-db-pulastya.aws-ap-south-1.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjQ5NDAyMTAsImlkIjoiYjE1NGI4YjUtMzU1Mi00Yzk4LThkNGEtNWU1NWFiYTU5ZDdhIiwicmlkIjoiMDViNzExZmItZTBlMy00MTg4LWJkOTAtMGVmOTY4ZmQzMTdjIn0.TqzcuqL7mpdUDKoElSomM1AgtbU66LpZAdDmUxqEn-dTk2ilMpb0wllOyt5AuiCDXKf3o_k9azgrVGNI952CAw'
});

console.log('✅ Connected to Turso database.');
initializeDatabase();

async function initializeDatabase() {
    try {
        // Categories Table
        await db.execute(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        )`);

        // Subcategories Table
        await db.execute(`CREATE TABLE IF NOT EXISTS subcategories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            FOREIGN KEY (category_id) REFERENCES categories(id),
            UNIQUE(name, category_id)
        )`);

        // Products Table with categories
        await db.execute(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            stock INTEGER NOT NULL,
            description TEXT,
            category_id INTEGER,
            subcategory_id INTEGER,
            brand TEXT,
            image_url TEXT,
            FOREIGN KEY (category_id) REFERENCES categories(id),
            FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
        )`);

        // Orders Table (enhanced)
        await db.execute(`CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            customer_name TEXT,
            product_name TEXT,
            quantity INTEGER,
            customer_email TEXT,
            customer_phone TEXT,
            customer_address TEXT,
            status TEXT DEFAULT 'Processing',
            order_date TEXT,
            delivery_date TEXT,
            delivery_slot TEXT,
            discount_code TEXT,
            subtotal INTEGER DEFAULT 0,
            discount_amount INTEGER DEFAULT 0,
            total_amount INTEGER DEFAULT 0,
            payment_method TEXT DEFAULT 'COD',
            invoice_number TEXT
        )`);

        // Order Items Table (for multiple items per order)
        await db.execute(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT,
            product_id INTEGER,
            product_name TEXT,
            product_price INTEGER,
            quantity INTEGER,
            subtotal INTEGER,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )`);

        // Customers Table
        await db.execute(`CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            phone TEXT,
            address TEXT,
            loyalty_points INTEGER DEFAULT 0,
            last_order_id TEXT
        )`);

        // Refunds Table
        await db.execute(`CREATE TABLE IF NOT EXISTS refunds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT,
            status TEXT,
            amount INTEGER,
            reason TEXT
        )`);

        // Feedback Table
        await db.execute(`CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            rating INTEGER,
            comment TEXT,
            email TEXT
        )`);

        console.log('Database tables initialized successfully.');
        
        // Seed initial data
        await seedInitialData();
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

async function seedInitialData() {
    try {
        // Check if categories exist
        const result = await db.execute("SELECT count(*) as count FROM categories");
        const count = result.rows[0]?.count || 0;
        
        if (count === 0) {
            console.log("Seeding categories...");
            await db.execute("INSERT INTO categories (name, description) VALUES (?, ?)", 
                ["Electronics & Gadgets", "Latest technology and electronic devices"]);
            await db.execute("INSERT INTO categories (name, description) VALUES (?, ?)", 
                ["Home & Kitchen", "Everything for your home and kitchen needs"]);
            await db.execute("INSERT INTO categories (name, description) VALUES (?, ?)", 
                ["Sports & Outdoors", "Fitness and outdoor adventure gear"]);
            await db.execute("INSERT INTO categories (name, description) VALUES (?, ?)", 
                ["Automotive", "Car and bike accessories and tools"]);
            console.log("Categories seeded!");
            
            await seedSubcategories();
        }
    } catch (err) {
        console.error('Error seeding data:', err);
    }
}

async function seedSubcategories() {
    try {
        const result = await db.execute("SELECT count(*) as count FROM subcategories");
        const count = result.rows[0]?.count || 0;
        
        if (count === 0) {
            console.log("Note: Subcategories table is empty. Run populateTurso.js script to seed initial data.");
        } else {
            console.log(`Subcategories table already has ${count} items.`);
        }
        
        // Call next seeding function
        await seedProducts();
    } catch (err) {
        console.error('Error seeding subcategories:', err);
    }
}

// Seed Products (expanded catalog with Unsplash images)
async function seedProducts() {
    const result = await db.execute("SELECT count(*) as count FROM products");
    const count = result.rows[0]?.count || 0;
    
    if (count === 0) {
        console.log("Note: Products table is empty. Run populateTurso.js script to seed initial data.");
        console.log("Seeding functions are disabled to avoid conflicts with Turso migration.");
    } else {
        console.log(`Products table already has ${count} items.`);
    }
    
    // Call next seeding function
    await seedOrders();
}

// Seed Orders (if empty)
async function seedOrders() {
    const result = await db.execute("SELECT count(*) as count FROM orders");
    const count = result.rows[0]?.count || 0;
    
    if (count === 0) {
        console.log("Note: Orders table is empty. This is normal for a fresh installation.");
    } else {
        console.log(`Orders table already has ${count} items.`);
    }
}

// --- Helper Functions for Turso ---
const dbHelpers = {
    all: async (sql, params = []) => {
        const result = await db.execute(sql, params);
        return result.rows;
    },
    get: async (sql, params = []) => {
        const result = await db.execute(sql, params);
        return result.rows[0] || null;
    },
    run: async (sql, params = []) => {
        return await db.execute(sql, params);
    }
};

// --- API Endpoints ---

// Get all products (or search by name, category, subcategory, price range)
app.get('/api/products', async (req, res) => {
    console.log(`[GET] /api/products query:`, req.query);
    const { search, category, subcategory, brand, min_price, max_price } = req.query;
    let query = `SELECT p.*, c.name as category_name, s.name as subcategory_name 
                 FROM products p 
                 LEFT JOIN categories c ON p.category_id = c.id 
                 LEFT JOIN subcategories s ON p.subcategory_id = s.id 
                 WHERE 1=1`;
    let params = [];

    if (search) {
        query += " AND (p.name LIKE ? OR p.description LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
        query += " AND c.name LIKE ?";
        params.push(`%${category}%`);
    }

    if (subcategory) {
        query += " AND s.name LIKE ?";
        params.push(`%${subcategory}%`);
    }

    if (brand) {
        query += " AND p.brand LIKE ?";
        params.push(`%${brand}%`);
    }

    if (min_price) {
        query += " AND p.price >= ?";
        params.push(parseInt(min_price));
    }

    if (max_price) {
        query += " AND p.price <= ?";
        params.push(parseInt(max_price));
    }

    // Order by price for better presentation
    query += " ORDER BY p.price ASC";

    try {
        const rows = await dbHelpers.all(query, params);
        res.json({ products: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all categories
app.get('/api/categories', async (req, res) => {
    console.log(`[GET] /api/categories`);
    try {
        const rows = await dbHelpers.all("SELECT * FROM categories", []);
        res.json({ categories: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get subcategories for a category
app.get('/api/categories/:id/subcategories', async (req, res) => {
    const { id } = req.params;
    console.log(`[GET] /api/categories/${id}/subcategories`);
    try {
        const rows = await dbHelpers.all("SELECT * FROM subcategories WHERE category_id = ?", [id]);
        res.json({ subcategories: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all subcategories
app.get('/api/subcategories', async (req, res) => {
    console.log(`[GET] /api/subcategories`);
    try {
        const rows = await dbHelpers.all(`SELECT s.*, c.name as category_name 
            FROM subcategories s 
            LEFT JOIN categories c ON s.category_id = c.id`, []);
        res.json({ subcategories: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Order Details
app.get('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`[GET] /api/orders/${id}`);
    try {
        const row = await dbHelpers.get("SELECT * FROM orders WHERE id = ?", [id]);
        if (!row) {
            res.json({ status: 'not_found', message: 'Order ID not found' });
        } else {
            res.json({ status: 'found', order: row });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Place Order
app.post('/api/orders', async (req, res) => {
    console.log(`[POST] /api/orders body:`, req.body);
    const { item_name, quantity, address, customer_name } = req.body;
    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`; // 5 digit random ID
    const invoiceNumber = `INV-${orderId}`;
    const orderDate = new Date().toISOString().split('T')[0];

    // Calculate delivery date (random 2-5 days)
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + Math.floor(Math.random() * 4) + 2);
    const deliveryDate = delivery.toISOString().split('T')[0];

    try {
        // Check stock first
        const product = await dbHelpers.get("SELECT * FROM products WHERE name LIKE ?", [`%${item_name}%`]);

        let productPrice = 0;
        let totalAmount = 0;

        if (!product) {
            // Allow ordering even if not in DB for demo flexibility, but warn
            console.log(`Product ${item_name} not found in DB, proceeding anyway.`);
            productPrice = 0;
        } else if (product.stock < quantity) {
            return res.json({ status: 'error', message: `Insufficient stock. Only ${product.stock} left.` });
        } else {
            productPrice = product.price;
            totalAmount = product.price * quantity;
        }

        // Insert Order
        await dbHelpers.run("INSERT INTO orders (id, customer_name, product_name, quantity, customer_address, status, delivery_date, order_date, total_amount, invoice_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
            [orderId, customer_name || 'Guest', item_name, quantity, address || '', 'Processing', deliveryDate, orderDate, totalAmount, invoiceNumber]);

        // Update Stock
        if (product) {
            await dbHelpers.run("UPDATE products SET stock = stock - ? WHERE id = ?", [quantity, product.id]);
        }

        // Update Customer's Last Order ID
        if (customer_name && customer_name !== 'Guest') {
            try {
                await dbHelpers.run("UPDATE customers SET last_order_id = ? WHERE name LIKE ?", [orderId, `%${customer_name}%`]);
                console.log(`Linked order ${orderId} to customer ${customer_name}`);
            } catch (err) {
                console.error("Failed to link order to customer:", err);
            }
        }

        // Generate PDF Invoice
        try {
            const invoicesDir = path.join(__dirname, 'invoices');
            if (!fs.existsSync(invoicesDir)) {
                fs.mkdirSync(invoicesDir, { recursive: true });
            }

            const invoicePath = path.join(invoicesDir, `${invoiceNumber}.pdf`);
            
            await new Promise((resolve, reject) => {
                const doc = new PDFDocument({ margin: 50, size: 'A4' });
                const writeStream = fs.createWriteStream(invoicePath);
                
                writeStream.on('finish', () => {
                    console.log(`[PlaceOrder] Invoice PDF generated: ${invoicePath}`);
                    resolve();
                });
                writeStream.on('error', reject);
                
                doc.pipe(writeStream);

                // Company Header
                doc.fontSize(28)
                   .fillColor('#c87d4a')
                   .text('Kreta-Bandhu', { align: 'center' });
                
                doc.fontSize(11)
                   .fillColor('#999')
                   .text('Your Trusted Shopping Partner', { align: 'center' });
                
                doc.moveDown(1.5);

                // INVOICE Title
                doc.fontSize(20)
                   .fillColor('#333')
                   .text('INVOICE', { align: 'center' });
                
                doc.moveDown(1);

                // Invoice Details (Right Aligned)
                const detailsX = 350;
                doc.fontSize(10).fillColor('#666');
                doc.text(`Invoice No: ${invoiceNumber}`, detailsX, doc.y, { align: 'right' });
                doc.text(`Order ID: ${orderId}`, detailsX, doc.y, { align: 'right' });
                doc.text(`Date: ${orderDate}`, detailsX, doc.y, { align: 'right' });
                
                doc.moveDown(2);

                // Bill To Section
                doc.fontSize(11).fillColor('#333').text('Bill To:', 50, doc.y);
                doc.moveDown(0.3);
                doc.fontSize(10).fillColor('#666');
                doc.text(`Name: ${customer_name || 'Guest'}`, 50, doc.y);
                if (address) {
                    doc.text(`Address: ${address}`, 50, doc.y);
                }
                
                doc.moveDown(2);

                // Table Header with underline
                const tableTop = doc.y;
                doc.fontSize(10).fillColor('#666');
                doc.text('Item', 50, tableTop, { width: 200 });
                doc.text('Qty', 280, tableTop, { width: 80, align: 'center' });
                doc.text('Price', 360, tableTop, { width: 100, align: 'right' });
                doc.text('Total', 460, tableTop, { width: 100, align: 'right' });
                
                // Horizontal line under header
                doc.moveDown(0.3);
                doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
                doc.moveDown(0.5);

                // Item
                const itemY = doc.y;
                doc.fontSize(10).fillColor('#444');
                doc.text(item_name, 50, itemY, { width: 220 });
                doc.text(quantity.toString(), 280, itemY, { width: 80, align: 'center' });
                doc.text(`Rs.${productPrice.toLocaleString('en-IN')}`, 360, itemY, { width: 100, align: 'right' });
                doc.text(`Rs.${totalAmount.toLocaleString('en-IN')}`, 460, itemY, { width: 100, align: 'right' });
                doc.moveDown(1.5);

                // Horizontal line before totals
                doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
                doc.moveDown(0.8);

                // Total
                const totalsX = 460;
                doc.fontSize(12).fillColor('#c87d4a');
                doc.text('Total:', 360, doc.y, { width: 100, align: 'right', bold: true });
                doc.text(`Rs.${totalAmount.toLocaleString('en-IN')}`, totalsX, doc.y - 14, { width: 100, align: 'right' });
                
                doc.moveDown(2);

                // Payment & Status Info
                doc.fontSize(10).fillColor('#666');
                doc.text('Payment Method: COD', 50, doc.y);
                doc.text(`Expected Delivery: ${deliveryDate}`, 50, doc.y);
                
                doc.moveDown(1.5);

                // Return Policy
                doc.fontSize(9).fillColor('#999');
                doc.text('Return Policy: 30-day easy return policy. Products can be returned within 30 days of delivery.', 50, doc.y, { width: 500 });
                
                doc.moveDown(2.5);

                // Footer
                doc.fontSize(9).fillColor('#bbb');
                doc.text('Thank you for shopping with Kreta-Bandhu!', { align: 'center' });
                doc.text('For support: 1800-123-4567 | support@kreta-bandhu.com', { align: 'center' });

                doc.end();
            });

            console.log(`[PlaceOrder] Order ${orderId} placed successfully with invoice`);
        } catch (invoiceErr) {
            console.error(`[PlaceOrder] Failed to generate invoice:`, invoiceErr);
            // Continue even if invoice fails
        }

        res.json({
            status: 'success',
            order_id: orderId,
            invoice_number: invoiceNumber,
            invoice_url: `/invoices/${invoiceNumber}.pdf`,
            message: `Order placed successfully! ID: ${orderId}`,
            details: { item: item_name, quantity, delivery_date: deliveryDate, price: productPrice, total: totalAmount }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Checkout Cart - Place order with multiple items
app.post('/api/orders/checkout', async (req, res) => {
    console.log(`[POST] /api/orders/checkout body:`, req.body);
    const { customer_name, customer_email, customer_phone, address, items, payment_method } = req.body;

    if (!items || items.length === 0) {
        return res.json({ status: 'error', message: 'Cart is empty. Add items to cart first.' });
    }

    if (!customer_name) {
        return res.json({ status: 'error', message: 'Customer name is required.' });
    }

    if (!address) {
        return res.json({ status: 'error', message: 'Delivery address is required.' });
    }

    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderDate = new Date().toISOString().split('T')[0];
    const orderTime = new Date().toISOString();

    // Calculate delivery date (3-5 days for standard delivery)
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + Math.floor(Math.random() * 3) + 3);
    const deliveryDate = delivery.toISOString().split('T')[0];

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
        subtotal += item.price * item.quantity;
    });

    // Apply discount if applicable (10% for orders above ₹10,000)
    let discountAmount = 0;
    if (subtotal >= 10000) {
        discountAmount = Math.floor(subtotal * 0.1);
    }

    const totalAmount = subtotal - discountAmount;

    // Return policy
    const returnPolicy = {
        eligible: true,
        days: 30,
        policy: "30-day easy return policy. Products must be unused and in original packaging.",
        refundMethod: "Original payment method (7-10 business days)",
        exceptions: "Electronics: 7-day replacement only. Personal items: Non-returnable."
    };

    // Prepare inserted items list
    const insertedItems = items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity
    }));

    // Combine product names and total quantity for main order record
    const combinedProductNames = items.map(item => item.name).join(', ');
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    try {
        // Insert Order into database (including product_name and quantity)
        await dbHelpers.run(`
            INSERT INTO orders (
                id, customer_name, customer_email, customer_phone, customer_address,
                product_name, quantity, status, order_date, delivery_date, subtotal, discount_amount, 
                total_amount, payment_method, invoice_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            orderId, customer_name, customer_email || '', customer_phone || '', address,
            combinedProductNames, totalQuantity, 'Processing', orderDate, deliveryDate, subtotal, discountAmount,
            totalAmount, payment_method || 'COD', invoiceNumber
        ]);

        console.log(`[Checkout] Order ${orderId} inserted into database`);

        // Insert order items
        for (const item of items) {
            const itemSubtotal = item.price * item.quantity;
            await dbHelpers.run(`
                INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [orderId, item.id || null, item.name, item.price, item.quantity, itemSubtotal]);

            // Update stock if product has ID
            if (item.id) {
                await dbHelpers.run("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?", 
                    [item.quantity, item.id, item.quantity]);
            }
        }

        console.log(`[Checkout] ${items.length} order items inserted`);

        // Generate PDF Invoice
        const invoicesDir = path.join(__dirname, 'invoices');
        if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir, { recursive: true });
        }

        const invoicePath = path.join(invoicesDir, `${invoiceNumber}.pdf`);
        
        // Create PDF with promise
        await new Promise((resolve, reject) => {
            const doc = new PDFDocument({ 
                margin: 50,
                size: 'A4'
            });
            const writeStream = fs.createWriteStream(invoicePath);
            
            writeStream.on('finish', () => {
                console.log(`[Checkout] Invoice PDF generated: ${invoicePath}`);
                resolve();
            });
            writeStream.on('error', reject);
            
            doc.pipe(writeStream);

            // Company Header
            doc.fontSize(28)
               .fillColor('#c87d4a')
               .text('Kreta-Bandhu', { align: 'center' });
            
            doc.fontSize(11)
               .fillColor('#999')
               .text('Your Trusted Shopping Partner', { align: 'center' });
            
            doc.moveDown(1.5);

            // INVOICE Title
            doc.fontSize(20)
               .fillColor('#333')
               .text('INVOICE', { align: 'center' });
            
            doc.moveDown(1);

            // Invoice Details (Right Aligned)
            const detailsX = 350;
            doc.fontSize(10).fillColor('#666');
            doc.text(`Invoice No: ${invoiceNumber}`, detailsX, doc.y, { align: 'right' });
            doc.text(`Order ID: ${orderId}`, detailsX, doc.y, { align: 'right' });
            const formattedDate = new Date().toLocaleDateString('en-GB').split('/').join('/');
            doc.text(`Date: ${formattedDate.split('/').reverse().join('-')}`, detailsX, doc.y, { align: 'right' });
            
            doc.moveDown(2);

            // Bill To Section
            doc.fontSize(11).fillColor('#333').text('Bill To:', 50, doc.y);
            doc.moveDown(0.3);
            doc.fontSize(10).fillColor('#666');
            doc.text(`Name: ${customer_name}`, 50, doc.y);
            doc.text(`Address: ${address}`, 50, doc.y);
            
            doc.moveDown(2);

            // Table Header with underline
            const tableTop = doc.y;
            doc.fontSize(10).fillColor('#666');
            doc.text('Item', 50, tableTop, { width: 200 });
            doc.text('Qty', 280, tableTop, { width: 80, align: 'center' });
            doc.text('Price', 360, tableTop, { width: 100, align: 'right' });
            doc.text('Total', 460, tableTop, { width: 100, align: 'right' });
            
            // Horizontal line under header
            doc.moveDown(0.3);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
            doc.moveDown(0.5);

            // Items
            insertedItems.forEach((item, index) => {
                const itemY = doc.y;
                doc.fontSize(10).fillColor('#444');
                doc.text(item.name, 50, itemY, { width: 220 });
                doc.text(item.quantity.toString(), 280, itemY, { width: 80, align: 'center' });
                doc.text(`Rs.${item.price.toLocaleString('en-IN')}`, 360, itemY, { width: 100, align: 'right' });
                doc.text(`Rs.${item.subtotal.toLocaleString('en-IN')}`, 460, itemY, { width: 100, align: 'right' });
                doc.moveDown(0.8);
            });

            doc.moveDown(0.5);
            
            // Horizontal line before totals
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
            doc.moveDown(0.8);

            // Subtotal
            const totalsX = 460;
            doc.fontSize(10).fillColor('#666');
            doc.text('Subtotal:', 360, doc.y, { width: 100, align: 'right' });
            doc.text(`Rs.${subtotal.toLocaleString('en-IN')}`, totalsX, doc.y - 12, { width: 100, align: 'right' });
            doc.moveDown(0.5);
            
            // Discount (if applicable)
            if (discountAmount > 0) {
                doc.fillColor('#22c55e');
                doc.text('Discount (10%):', 360, doc.y, { width: 100, align: 'right' });
                doc.text(`-Rs.${discountAmount.toLocaleString('en-IN')}`, totalsX, doc.y - 12, { width: 100, align: 'right' });
                doc.moveDown(0.5);
            }

            // Total
            doc.fontSize(12).fillColor('#c87d4a');
            doc.text('Total:', 360, doc.y, { width: 100, align: 'right', bold: true });
            doc.text(`Rs.${totalAmount.toLocaleString('en-IN')}`, totalsX, doc.y - 14, { width: 100, align: 'right' });
            
            doc.moveDown(2);

            // Payment & Delivery Info
            doc.fontSize(10).fillColor('#666');
            doc.text(`Payment Method: ${payment_method || 'COD'}`, 50, doc.y);
            doc.text(`Expected Delivery: ${deliveryDate}`, 50, doc.y);
            
            doc.moveDown(1.5);

            // Return Policy
            doc.fontSize(9).fillColor('#999');
            doc.text(`Return Policy: ${returnPolicy.policy}`, 50, doc.y, { width: 500 });
            
            doc.moveDown(2.5);

            // Footer
            doc.fontSize(9).fillColor('#bbb');
            doc.text('Thank you for shopping with Kreta-Bandhu!', { align: 'center' });
            doc.text('For support: 1800-123-4567 | support@kreta-bandhu.com', { align: 'center' });

            doc.end();
        });

        // Send success response
        console.log(`[Checkout] Order ${orderId} completed successfully`);
        res.json({
            status: 'success',
            message: `Order placed successfully!`,
            order: {
                order_id: orderId,
                invoice_number: invoiceNumber,
                invoice_url: `/invoices/${invoiceNumber}.pdf`,
                customer_name: customer_name,
                delivery_address: address,
                order_date: orderDate,
                order_time: orderTime,
                expected_delivery: deliveryDate,
                delivery_slot: 'Standard Delivery (9 AM - 9 PM)',
                status: 'Processing',
                items: insertedItems,
                item_count: items.length,
                subtotal: subtotal,
                discount: discountAmount,
                total: totalAmount,
                payment_method: payment_method || 'Cash on Delivery',
                return_policy: returnPolicy,
                support: {
                    phone: '1800-123-4567',
                    email: 'support@kreta-bandhu.com',
                    hours: '9 AM - 9 PM IST'
                },
                tracking: {
                    status: 'Order Confirmed',
                    message: 'Your order has been confirmed and will be processed shortly.',
                    next_update: 'You will receive shipping updates via SMS/Email'
                }
            }
        });

    } catch (error) {
        console.error('[Checkout] Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to process checkout: ' + error.message });
    }
});

// Get Order with Items (Full Details)
app.get('/api/orders/:id/full', async (req, res) => {
    const { id } = req.params;
    console.log(`[GET] /api/orders/${id}/full`);
    
    try {
        const order = await dbHelpers.get("SELECT * FROM orders WHERE id = ?", [id]);
        if (!order) {
            return res.json({ status: 'not_found', message: 'Order not found' });
        }

        // Get order items
        const items = await dbHelpers.all("SELECT * FROM order_items WHERE order_id = ?", [id]);

        // Calculate return eligibility (30 days from order date)
        const orderDate = new Date(order.order_date);
        const now = new Date();
        const daysSinceOrder = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
        const returnEligible = daysSinceOrder <= 30;

        res.json({
            status: 'found',
            order: {
                ...order,
                items: items || [],
                return_policy: {
                    eligible: returnEligible,
                    days_remaining: returnEligible ? 30 - daysSinceOrder : 0,
                    policy: "30-day easy return. Products must be unused and in original packaging."
                }
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cancel Order
app.post('/api/orders/:id/cancel', async (req, res) => {
    const { id } = req.params;
    console.log(`[POST] /api/orders/${id}/cancel`);

    try {
        const order = await dbHelpers.get("SELECT * FROM orders WHERE id = ?", [id]);
        if (!order) {
            return res.json({ status: 'not_found', message: 'Order not found' });
        }
        if (order.status === 'Cancelled') {
            return res.json({ status: 'error', message: 'Order is already cancelled' });
        }
        if (order.status === 'Delivered') {
            return res.json({ status: 'error', message: 'Cannot cancel delivered order' });
        }

        await dbHelpers.run("UPDATE orders SET status = 'Cancelled' WHERE id = ?", [id]);
        res.json({ status: 'success', message: 'Order cancelled successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- NEW ENDPOINTS ---

// 1. Check Refund Status
app.get('/api/refunds/:order_id', async (req, res) => {
    const { order_id } = req.params;
    try {
        const row = await dbHelpers.get("SELECT * FROM refunds WHERE order_id = ?", [order_id]);
        if (row) {
            res.json({ status: 'found', refund: row });
        } else {
            // Check if order exists first
            const order = await dbHelpers.get("SELECT status FROM orders WHERE id = ?", [order_id]);
            if (order && order.status === 'Cancelled') {
                res.json({ status: 'processing', message: 'Refund is being processed for cancelled order.' });
            } else {
                res.json({ status: 'not_found', message: 'No refund record found.' });
            }
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Refund Request
app.post('/api/refunds', async (req, res) => {
    const { order_id, reason } = req.body;
    console.log(`[POST] /api/refunds`, req.body);

    try {
        // Verify order exists
        const order = await dbHelpers.get("SELECT * FROM orders WHERE id = ?", [order_id]);
        if (!order) return res.json({ status: 'not_found', message: 'Order not found' });

        // Create refund
        await dbHelpers.run("INSERT INTO refunds (order_id, status, amount, reason) VALUES (?, ?, ?, ?)",
            [order_id, 'Processing', 0, reason]); // Amount 0 for now, would fetch from product price
        
        res.json({ status: 'success', message: `Refund request submitted for ${order_id}. Reason: ${reason}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Apply Discount
app.post('/api/orders/:id/discount', async (req, res) => {
    const { id } = req.params;
    const { code } = req.body;
    // Mock validation
    const validCodes = ['DIWALI2024', 'FIRSTDIWALI', 'WELCOME10'];
    if (validCodes.includes(code)) {
        try {
            await dbHelpers.run("UPDATE orders SET discount_code = ? WHERE id = ?", [code, id]);
            res.json({ status: 'success', message: `Discount ${code} applied!` });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else {
        res.json({ status: 'invalid', message: 'Invalid or expired coupon code.' });
    }
});

// 3. Generate Invoice (PDF)
app.get('/api/orders/:id/invoice', async (req, res) => {
    const { id } = req.params;
    try {
        const order = await dbHelpers.get("SELECT * FROM orders WHERE id = ?", [id]);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);

        doc.pipe(res);

        // Company Header
        doc.fontSize(28)
           .fillColor('#c87d4a')
           .text('Kreta-Bandhu', { align: 'center' });
        
        doc.fontSize(11)
           .fillColor('#999')
           .text('Your Trusted Shopping Partner', { align: 'center' });
        
        doc.moveDown(1.5);

        // INVOICE Title
        doc.fontSize(20)
           .fillColor('#333')
           .text('INVOICE', { align: 'center' });
        
        doc.moveDown(1);

        // Invoice Details (Right Aligned)
        const detailsX = 350;
        doc.fontSize(10).fillColor('#666');
        doc.text(`Invoice No: INV-${id}`, detailsX, doc.y, { align: 'right' });
        doc.text(`Order ID: ${id}`, detailsX, doc.y, { align: 'right' });
        const formattedDate = new Date(order.order_date).toLocaleDateString('en-GB').split('/').reverse().join('-');
        doc.text(`Date: ${formattedDate}`, detailsX, doc.y, { align: 'right' });
        
        doc.moveDown(2);

        // Bill To Section
        doc.fontSize(11).fillColor('#333').text('Bill To:', 50, doc.y);
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#666');
        doc.text(`Name: ${order.customer_name}`, 50, doc.y);
        if (order.customer_address) {
            doc.text(`Address: ${order.customer_address}`, 50, doc.y);
        }
        
        doc.moveDown(2);

        // Table Header with underline
        const tableTop = doc.y;
        doc.fontSize(10).fillColor('#666');
        doc.text('Item', 50, tableTop, { width: 200 });
        doc.text('Qty', 280, tableTop, { width: 80, align: 'center' });
        doc.text('Price', 360, tableTop, { width: 100, align: 'right' });
        doc.text('Total', 460, tableTop, { width: 100, align: 'right' });
        
        // Horizontal line under header
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
        doc.moveDown(0.5);

        // Item
        const itemY = doc.y;
        doc.fontSize(10).fillColor('#444');
        doc.text(order.product_name, 50, itemY, { width: 220 });
        doc.text(order.quantity.toString(), 280, itemY, { width: 80, align: 'center' });
        const price = order.total_amount ? (order.total_amount / order.quantity) : 0;
        const total = order.total_amount || 0;
        doc.text(`Rs.${price.toLocaleString('en-IN')}`, 360, itemY, { width: 100, align: 'right' });
        doc.text(`Rs.${total.toLocaleString('en-IN')}`, 460, itemY, { width: 100, align: 'right' });
        doc.moveDown(1.5);

        // Horizontal line before totals
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
        doc.moveDown(0.8);

        // Total
        const totalsX = 460;
        doc.fontSize(12).fillColor('#c87d4a');
        doc.text('Total:', 360, doc.y, { width: 100, align: 'right', bold: true });
        doc.text(`Rs.${total.toLocaleString('en-IN')}`, totalsX, doc.y - 14, { width: 100, align: 'right' });
        
        doc.moveDown(2);

        // Payment & Status Info
        doc.fontSize(10).fillColor('#666');
        doc.text(`Payment Method: ${order.payment_method || 'COD'}`, 50, doc.y);
        doc.text(`Status: ${order.status}`, 50, doc.y);
        if (order.delivery_date) {
            doc.text(`Expected Delivery: ${order.delivery_date}`, 50, doc.y);
        }
        
        doc.moveDown(1.5);

        // Return Policy
        doc.fontSize(9).fillColor('#999');
        doc.text('Return Policy: 30-day easy return policy. Products can be returned within 30 days of delivery.', 50, doc.y, { width: 500 });
        
        doc.moveDown(2.5);

        // Footer
        doc.fontSize(9).fillColor('#bbb');
        doc.text('Thank you for shopping with Kreta-Bandhu!', { align: 'center' });
        doc.text('For support: 1800-123-4567 | support@kreta-bandhu.com', { align: 'center' });

        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Update Shipping Address
app.patch('/api/orders/:id/address', async (req, res) => {
    const { id } = req.params;
    const { address } = req.body;
    try {
        await dbHelpers.run("UPDATE orders SET address = ? WHERE id = ?", [address, id]);
        res.json({ status: 'success', message: 'Shipping address updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Schedule Delivery
app.patch('/api/orders/:id/schedule', async (req, res) => {
    const { id } = req.params;
    const { slot } = req.body;
    try {
        await dbHelpers.run("UPDATE orders SET delivery_slot = ? WHERE id = ?", [slot, id]);
        res.json({ status: 'success', message: `Delivery scheduled for ${slot}.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Create Customer Profile
app.post('/api/customers', async (req, res) => {
    const { name, email, phone, address } = req.body;
    const points = 100; // Sign up bonus
    try {
        await dbHelpers.run("INSERT INTO customers (name, email, phone, address, loyalty_points) VALUES (?, ?, ?, ?, ?)",
            [name, email, phone, address, points]);
        res.json({ status: 'success', message: 'Profile created! You earned 100 loyalty points.' });
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
            return res.json({ status: 'exists', message: 'Customer profile already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// 7. Get Customer Details (Loyalty & Address)
app.get('/api/customers', async (req, res) => {
    const { email, name } = req.query;
    let query = "SELECT * FROM customers WHERE";
    let params = [];

    if (email) {
        query += " email = ?";
        params.push(email);
    } else if (name) {
        query += " name LIKE ?";
        params.push(`%${name}%`);
    } else {
        return res.status(400).json({ error: 'Provide email or name' });
    }

    try {
        const row = await dbHelpers.get(query, params);
        if (row) {
            res.json({ status: 'found', customer: row });
        } else {
            res.json({ status: 'not_found', message: 'Customer profile not found.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Submit Feedback
app.post('/api/feedback', async (req, res) => {
    const { customer_id, rating, comment, email } = req.body;
    try {
        await dbHelpers.run("INSERT INTO feedback (customer_id, rating, comment, email) VALUES (?, ?, ?, ?)",
            [customer_id || 0, rating, comment, email]);
        res.json({ status: 'success', message: 'Thank you for your feedback!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        message: 'Kreta-Bandhu Backend API is running',
        endpoints: {
            categories: '/api/categories',
            subcategories: '/api/subcategories',
            products: '/api/products',
            orders: '/api/orders'
        }
    });
});

app.listen(PORT, () => {
    console.log(`Database Server running on http://localhost:${PORT}`);
});
