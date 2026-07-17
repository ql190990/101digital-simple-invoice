"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const calculate_invoice_totals_1 = require("../src/invoices/domain/calculate-invoice-totals");
const prisma = new client_1.PrismaClient();
const ANCHOR_USER_ID = 'ad1e0902-1928-4345-b513-60c86c94fc91';
const ANCHOR_INVOICE_ID = '099ca7da-a290-40fa-93b9-1c43ae7bb887';
const BCRYPT_COST = 12;
const GENERATED_COUNT = 40;
function mulberry32(seed) {
    let a = seed;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const rand = mulberry32(20260717);
function pick(items) {
    return items[Math.floor(rand() * items.length)];
}
function randomInt(min, max) {
    return Math.floor(rand() * (max - min + 1)) + min;
}
function dateFromToday(days) {
    const now = new Date();
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    base.setUTCDate(base.getUTCDate() + days);
    return base;
}
function dateKey(d) {
    return d.toISOString().slice(0, 10);
}
const CURRENCIES = [
    { code: 'AUD', symbol: 'AU$' },
    { code: 'USD', symbol: 'US$' },
    { code: 'GBP', symbol: '£' },
    { code: 'SGD', symbol: 'S$' },
    { code: 'EUR', symbol: '€' },
];
const CUSTOMERS = [
    { fullname: 'Paul Anderson', email: 'paul@example.com', mobile: '947717364111', address: 'Singapore' },
    { fullname: 'Aisha Rahman', email: 'aisha@example.com', mobile: '60123456789', address: 'Kuala Lumpur, Malaysia' },
    { fullname: 'Liam Nguyen', email: 'liam@example.com', mobile: '84987654321', address: 'Ho Chi Minh City, Vietnam' },
    { fullname: 'Emma Watson', email: 'emma@example.com', mobile: '447700900123', address: 'London, UK' },
    { fullname: 'Noah Smith', email: 'noah@example.com', mobile: '14155550100', address: 'San Francisco, USA' },
    { fullname: 'Olivia Brown', email: 'olivia@example.com', mobile: '61412345678', address: 'Sydney, Australia' },
    { fullname: 'Kanglee Tan', email: 'kanglee@example.com', mobile: '6591234567', address: 'Singapore' },
    { fullname: 'Sofia Garcia', email: 'sofia@example.com', mobile: '34600123456', address: 'Madrid, Spain' },
    { fullname: 'Arjun Patel', email: 'arjun@example.com', mobile: '919812345678', address: 'Mumbai, India' },
    { fullname: 'Mia Chen', email: 'mia@example.com', mobile: '85291234567', address: 'Hong Kong' },
];
const ITEM_NAMES = [
    'Honda RC150',
    'Consulting Services',
    'Web Design Package',
    'Cloud Hosting (annual)',
    'Marketing Retainer',
    'Hardware Bundle',
    'Software License',
    'Training Workshop',
    'Maintenance Plan',
    'Office Supplies',
];
const PERSISTED_STATUSES = [
    client_1.InvoiceStatus.Draft,
    client_1.InvoiceStatus.Pending,
    client_1.InvoiceStatus.Paid,
];
async function truncate() {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "invoice_items", "invoices", "users" RESTART IDENTITY CASCADE;');
}
async function seedUser() {
    const email = process.env.SEED_USER_EMAIL ?? 'reviewer@101digital.io';
    const password = process.env.SEED_USER_PASSWORD ?? 'Password123!';
    const fullname = process.env.SEED_USER_FULLNAME ?? 'Reviewer';
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await prisma.user.create({
        data: { id: ANCHOR_USER_ID, email, passwordHash, fullname },
    });
    console.log(`Seeded user: ${email} (password documented in README)`);
}
async function seedAnchorInvoice() {
    const items = [{ name: 'Honda RC150', quantity: 2, rate: new client_1.Prisma.Decimal(1000) }];
    const totals = (0, calculate_invoice_totals_1.calculateInvoiceTotals)({
        items: items.map((i) => ({ quantity: i.quantity, rate: i.rate.toString() })),
        taxPercent: 10,
        discount: 20,
        totalPaid: 1451.34,
    });
    await prisma.invoice.create({
        data: {
            invoiceId: ANCHOR_INVOICE_ID,
            invoiceNumber: 'IV1780488206995',
            invoiceReference: '#5721662',
            invoiceDate: new Date('2026-06-03T00:00:00.000Z'),
            dueDate: new Date('2026-07-03T00:00:00.000Z'),
            currency: 'AUD',
            currencySymbol: 'AU$',
            description: 'Invoice is issued to Kanglee',
            customerFullname: 'Paul',
            customerEmail: 'paul@101digital.io',
            customerMobile: '947717364111',
            customerAddress: 'Singapore',
            status: client_1.InvoiceStatus.Pending,
            taxPercent: new client_1.Prisma.Decimal(10),
            invoiceSubTotal: new client_1.Prisma.Decimal(totals.subTotal.toString()),
            totalTax: new client_1.Prisma.Decimal(totals.taxAmount.toString()),
            totalDiscount: new client_1.Prisma.Decimal(20),
            totalAmount: new client_1.Prisma.Decimal(totals.totalAmount.toString()),
            totalPaid: new client_1.Prisma.Decimal(1451.34),
            balanceAmount: new client_1.Prisma.Decimal(totals.balanceAmount.toString()),
            createdBy: ANCHOR_USER_ID,
            items: {
                create: items.map((i) => ({ name: i.name, quantity: i.quantity, rate: i.rate })),
            },
        },
    });
    console.log('Seeded anchor invoice IV1780488206995 (Pending → derives Overdue)');
}
async function seedGeneratedInvoices() {
    for (let i = 0; i < GENERATED_COUNT; i++) {
        const customer = pick(CUSTOMERS);
        const currency = pick(CURRENCIES);
        const status = pick(PERSISTED_STATUSES);
        const invoiceOffset = -randomInt(1, 180);
        const invoiceDate = dateFromToday(invoiceOffset);
        const term = randomInt(7, 45);
        let dueDate = new Date(invoiceDate);
        dueDate.setUTCDate(dueDate.getUTCDate() + term);
        if (i % 3 === 0 && status !== client_1.InvoiceStatus.Paid) {
            dueDate = dateFromToday(-randomInt(1, 30));
            if (dueDate < invoiceDate) {
                dueDate = new Date(invoiceDate);
                dueDate.setUTCDate(dueDate.getUTCDate() + 1);
            }
        }
        const quantity = randomInt(1, 10);
        const rate = randomInt(50, 5000);
        const taxPercent = pick([0, 5, 7, 10, 15]);
        const discount = pick([0, 0, 0, 10, 25, 50, 100]);
        const totals = (0, calculate_invoice_totals_1.calculateInvoiceTotals)({
            items: [{ quantity, rate }],
            taxPercent,
            discount,
            totalPaid: 0,
        });
        const isPaid = status === client_1.InvoiceStatus.Paid;
        const totalPaid = isPaid ? totals.totalAmount.toString() : '0';
        const balance = isPaid ? '0' : totals.balanceAmount.toString();
        const invoiceNumber = `INV-${dateKey(invoiceDate).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`;
        await prisma.invoice.create({
            data: {
                invoiceNumber,
                invoiceReference: rand() > 0.5 ? `REF-${randomInt(100000, 999999)}` : null,
                invoiceDate,
                dueDate,
                currency: currency.code,
                currencySymbol: currency.symbol,
                description: `Invoice for ${customer.fullname}`,
                customerFullname: customer.fullname,
                customerEmail: customer.email,
                customerMobile: customer.mobile,
                customerAddress: customer.address,
                status,
                taxPercent: new client_1.Prisma.Decimal(taxPercent),
                invoiceSubTotal: new client_1.Prisma.Decimal(totals.subTotal.toString()),
                totalTax: new client_1.Prisma.Decimal(totals.taxAmount.toString()),
                totalDiscount: new client_1.Prisma.Decimal(discount),
                totalAmount: new client_1.Prisma.Decimal(totals.totalAmount.toString()),
                totalPaid: new client_1.Prisma.Decimal(totalPaid),
                balanceAmount: new client_1.Prisma.Decimal(balance),
                createdBy: ANCHOR_USER_ID,
                items: {
                    create: [{ name: pick(ITEM_NAMES), quantity, rate: new client_1.Prisma.Decimal(rate) }],
                },
            },
        });
    }
    console.log(`Seeded ${GENERATED_COUNT} additional invoices (mixed statuses/dates/amounts)`);
}
async function main() {
    console.log('Seeding database...');
    await truncate();
    await seedUser();
    await seedAnchorInvoice();
    await seedGeneratedInvoices();
    console.log('Seed complete.');
}
main()
    .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map