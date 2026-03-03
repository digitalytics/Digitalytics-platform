module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[project]/lib/prisma.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
;
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
    log: ("TURBOPACK compile-time truthy", 1) ? [
        'error',
        'warn'
    ] : "TURBOPACK unreachable"
});
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = prisma;
const __TURBOPACK__default__export__ = prisma;
}),
"[project]/lib/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "auth",
    ()=>auth,
    "handlers",
    ()=>handlers,
    "signIn",
    ()=>signIn,
    "signOut",
    ()=>signOut
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$credentials$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/credentials.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-auth/node_modules/@auth/core/providers/credentials.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$google$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/google.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$node_modules$2f40$auth$2f$core$2f$providers$2f$google$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-auth/node_modules/@auth/core/providers/google.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$prisma$2d$adapter$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/prisma-adapter/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$bcryptjs__$5b$external$5d$__$28$bcryptjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$bcryptjs$29$__ = __turbopack_context__.i("[externals]/bcryptjs [external] (bcryptjs, esm_import, [project]/node_modules/bcryptjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-route] (ecmascript) <export * as z>");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$bcryptjs__$5b$external$5d$__$28$bcryptjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$bcryptjs$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$bcryptjs__$5b$external$5d$__$28$bcryptjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$bcryptjs$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
;
;
;
const loginSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email(),
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(6)
});
const authConfig = {
    adapter: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$prisma$2d$adapter$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PrismaAdapter"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"]),
    session: {
        strategy: 'jwt'
    },
    pages: {
        signIn: '/login',
        error: '/login'
    },
    providers: [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])({
            async authorize (credentials) {
                const parsed = loginSchema.safeParse(credentials);
                if (!parsed.success) return null;
                const user = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
                    where: {
                        email: parsed.data.email
                    }
                });
                if (!user || !user.passwordHash) return null;
                const passwordMatch = await __TURBOPACK__imported__module__$5b$externals$5d2f$bcryptjs__$5b$external$5d$__$28$bcryptjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$bcryptjs$29$__["default"].compare(parsed.data.password, user.passwordHash);
                if (!passwordMatch) return null;
                if (user.status === __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["UserStatus"].PENDING) {
                    throw new Error('PENDING');
                }
                if (user.status === __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["UserStatus"].INACTIVE) {
                    throw new Error('INACTIVE');
                }
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role,
                    status: user.status
                };
            }
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$node_modules$2f40$auth$2f$core$2f$providers$2f$google$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true
        })
    ],
    callbacks: {
        async signIn ({ user, account }) {
            if (account?.provider === 'google') {
                const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
                    where: {
                        email: user.email
                    }
                });
                if (existing?.status === __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["UserStatus"].INACTIVE) {
                    return '/login?error=INACTIVE';
                }
                if (existing?.status === __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["UserStatus"].PENDING) {
                    return '/login?error=PENDING';
                }
            }
            return true;
        },
        async jwt ({ token, user }) {
            if (user) {
                token.role = user.role;
                token.status = user.status;
                token.id = user.id;
            }
            if (token.id) {
                const dbUser = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
                    where: {
                        id: token.id
                    },
                    select: {
                        role: true,
                        status: true
                    }
                });
                if (dbUser) {
                    token.role = dbUser.role;
                    token.status = dbUser.status;
                }
            }
            return token;
        },
        async session ({ session, token }) {
            if (token) {
                const u = session.user;
                u.id = token.id;
                u.role = token.role;
                u.status = token.status;
            }
            return session;
        }
    }
};
const nextAuth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(authConfig);
const handlers = nextAuth.handlers;
const auth = nextAuth.auth;
const signIn = nextAuth.signIn;
const signOut = nextAuth.signOut;
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/billing-engine.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Pure billing computation logic — no Prisma, no Next.js.
 * Fully unit-testable.
 */ __turbopack_context__.s([
    "buildLineItems",
    ()=>buildLineItems,
    "computeAgentBillingPeriod",
    ()=>computeAgentBillingPeriod,
    "computeSubtotal",
    ()=>computeSubtotal,
    "generateInvoiceNumber",
    ()=>generateInvoiceNumber,
    "isInvoiceOverdue",
    ()=>isInvoiceOverdue
]);
function buildLineItems(agents) {
    const items = [];
    for (const ag of agents){
        // SETUP_FEE — one-time, only if not already on a prior (non-cancelled) invoice
        if (ag.setupFee && !ag.setupFeeAlreadyBilled) {
            items.push({
                type: 'SETUP_FEE',
                agentId: ag.retellAgentId,
                agentName: ag.agentName,
                description: `Setup fee — ${ag.agentName}`,
                quantity: 1,
                unitPrice: ag.setupFee,
                total: ag.setupFee
            });
        }
        // MONTHLY_FEE — only if not already charged on another invoice for this period
        if (ag.monthlyFee && !ag.monthlyFeeAlreadyBilled) {
            items.push({
                type: 'MONTHLY_FEE',
                agentId: ag.retellAgentId,
                agentName: ag.agentName,
                description: `Monthly service fee — ${ag.agentName}`,
                quantity: 1,
                unitPrice: ag.monthlyFee,
                total: ag.monthlyFee
            });
        }
        // USAGE_FEE — usageCost is pre-filtered from DB (assignedAt lower bound already applied)
        if (ag.costMultiplier && ag.usageCost > 0) {
            const total = Math.round(ag.usageCost * ag.costMultiplier * 100) / 100;
            items.push({
                type: 'USAGE_FEE',
                agentId: ag.retellAgentId,
                agentName: ag.agentName,
                description: `Usage — ${ag.agentName}`,
                quantity: ag.usageCost,
                unitPrice: ag.costMultiplier,
                total
            });
        }
    }
    return items;
}
function isInvoiceOverdue(status, periodStart, now) {
    if (![
        'DRAFT',
        'PENDING'
    ].includes(status)) return false;
    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + 8); // due on day 8 (e.g. Jan 9 for Jan 1 start)
    return now >= dueDate;
}
function computeSubtotal(items) {
    return Math.round(items.reduce((s, l)=>s + l.total, 0) * 100) / 100;
}
function computeAgentBillingPeriod(assignedAt, now) {
    const anchorDay = assignedAt.getUTCDate();
    function clamp(year, month, day) {
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        return Math.min(day, lastDay);
    }
    let startYear = now.getUTCFullYear();
    let startMonth = now.getUTCMonth();
    // If we haven't yet passed the anchor day this month, step back one month
    if (now.getUTCDate() < anchorDay) {
        startMonth -= 1;
        if (startMonth < 0) {
            startMonth = 11;
            startYear -= 1;
        }
    }
    // Never go before the actual assignedAt
    const candidateStart = Date.UTC(startYear, startMonth, clamp(startYear, startMonth, anchorDay));
    if (candidateStart < assignedAt.getTime()) {
        const endMonth = assignedAt.getUTCMonth() + 1;
        const endYear = assignedAt.getUTCFullYear() + Math.floor(endMonth / 12);
        return {
            periodStart: new Date(assignedAt.getTime()),
            periodEnd: new Date(Date.UTC(endYear, endMonth % 12, clamp(endYear, endMonth % 12, anchorDay)) - 1)
        };
    }
    const periodStart = new Date(candidateStart);
    const endMonth = startMonth + 1;
    const endYear = startYear + Math.floor(endMonth / 12);
    const periodEnd = new Date(Date.UTC(endYear, endMonth % 12, clamp(endYear, endMonth % 12, anchorDay)) - 1);
    return {
        periodStart,
        periodEnd
    };
}
function generateInvoiceNumber(base, existingNumbers) {
    if (!existingNumbers.has(base)) return base;
    let suffix = 2;
    while(existingNumbers.has(`${base}-${suffix}`))suffix++;
    return `${base}-${suffix}`;
}
}),
"[project]/lib/billing-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "autoMarkOverdueForUser",
    ()=>autoMarkOverdueForUser,
    "buildAgentInvoiceNumber",
    ()=>buildAgentInvoiceNumber,
    "buildInvoiceNumber",
    ()=>buildInvoiceNumber,
    "createSetupFeeInvoiceForAgent",
    ()=>createSetupFeeInvoiceForAgent,
    "ensureBillingUpToDate",
    ()=>ensureBillingUpToDate,
    "ensureBillingUpToDateForUser",
    ()=>ensureBillingUpToDateForUser,
    "ensureCurrentInvoice",
    ()=>ensureCurrentInvoice,
    "ensureMonthlyInvoiceForAgent",
    ()=>ensureMonthlyInvoiceForAgent,
    "getOldestOverdueInvoice",
    ()=>getOldestOverdueInvoice,
    "resolveGetBillButton",
    ()=>resolveGetBillButton,
    "resolveInvoiceAction",
    ()=>resolveInvoiceAction,
    "resolveInvoicePayability",
    ()=>resolveInvoicePayability
]);
/**
 * Billing service — orchestrates billing-engine (pure) + Prisma.
 *
 * Key design decisions for Stripe readiness:
 *   - Invoice status flow: DRAFT → PENDING (Pay Now clicked, Stripe session created)
 *                          → PAID (Stripe webhook confirms payment)
 *                          → OVERDUE (scheduled job after due date)
 *   - stripeCheckoutSessionId set when Pay Now is clicked
 *   - stripePaymentIntentId set when Stripe webhook fires
 *   - ensureCurrentInvoice is idempotent — safe to call on every page load
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/billing-engine.ts [app-route] (ecmascript)");
;
;
function getOldestOverdueInvoice(invoices) {
    const overdue = invoices.filter((inv)=>inv.status === 'OVERDUE');
    if (overdue.length === 0) return null;
    return overdue.sort((a, b)=>a.periodStart.localeCompare(b.periodStart))[0];
}
function resolveInvoicePayability(invoice, overdueBlocker) {
    // Already settled — cannot pay
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
        return {
            canPay: false,
            blockMessage: null
        };
    }
    // Payment already in-flight
    if (invoice.status === 'PENDING') {
        return {
            canPay: false,
            blockMessage: null
        };
    }
    // DRAFT or OVERDUE — check blocker
    if (overdueBlocker && overdueBlocker.id !== invoice.id) {
        return {
            canPay: false,
            blockMessage: 'Please pay overdue invoice first.'
        };
    }
    return {
        canPay: true,
        blockMessage: null
    };
}
function resolveGetBillButton(status) {
    if (status === 'DRAFT') return {
        label: 'Update Bill',
        disabled: false
    };
    if (!status || status === 'CANCELLED') return {
        label: 'Get Bill',
        disabled: false
    };
    // PAID — invoice is paid but new calls may have accrued; allow supplement invoice
    if (status === 'PAID') return {
        label: 'Get Bill',
        disabled: false
    };
    // PENDING / OVERDUE — payment in-flight or past-due; don't regenerate
    return {
        label: 'Get Bill',
        disabled: true
    };
}
function resolveInvoiceAction(existing) {
    if (!existing || existing.status === 'CANCELLED') return {
        type: 'create'
    };
    if (existing.status === 'DRAFT') return {
        type: 'recalculate',
        invoiceId: existing.id
    };
    return {
        type: 'noop',
        invoiceId: existing.id
    };
}
function buildInvoiceNumber(userId, year, month, existingNumbers) {
    const yyyymm = `${year}${String(month).padStart(2, '0')}`;
    const base = `INV-${yyyymm}-${userId.slice(0, 6).toUpperCase()}`;
    if (!existingNumbers.has(base)) return base;
    let suffix = 2;
    while(existingNumbers.has(`${base}-${suffix}`))suffix++;
    return `${base}-${suffix}`;
}
async function autoMarkOverdueForUser(userId) {
    const now = new Date();
    // Fetch only statuses that could become overdue
    const candidates = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.findMany({
        where: {
            userId,
            status: {
                in: [
                    'DRAFT',
                    'PENDING'
                ]
            }
        },
        select: {
            id: true,
            status: true,
            periodStart: true
        }
    });
    const overdueIds = candidates.filter((inv)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isInvoiceOverdue"])(inv.status, inv.periodStart, now)).map((inv)=>inv.id);
    if (overdueIds.length === 0) return;
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.updateMany({
        where: {
            id: {
                in: overdueIds
            }
        },
        data: {
            status: 'OVERDUE'
        }
    });
}
async function ensureCurrentInvoice(userId) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    // Find ALL non-cancelled invoices for the current period (paidAt needed for supplement start)
    const periodInvoices = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.findMany({
        where: {
            userId,
            periodStart,
            status: {
                not: 'CANCELLED'
            }
        },
        select: {
            id: true,
            status: true,
            paidAt: true
        }
    });
    // If a PAID invoice exists for this period, supplement invoices must only count calls
    // that occurred AFTER that payment — otherwise the same calls get billed twice.
    const mostRecentPaidAt = periodInvoices.filter((inv)=>inv.status === 'PAID' && inv.paidAt != null).reduce((latest, inv)=>latest == null || inv.paidAt > latest ? inv.paidAt : latest, null);
    // 1. Prefer DRAFT — recalculate it to pick up new usage
    const draftInvoice = periodInvoices.find((inv)=>inv.status === 'DRAFT');
    if (draftInvoice) {
        // Use the recalculate path by synthesising the action
        const action = {
            type: 'recalculate',
            invoiceId: draftInvoice.id
        };
        // Fetch user's agent assignments (needed below)
        const userAgentsForRecalc = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].userAgent.findMany({
            where: {
                userId
            },
            include: {
                agent: true
            }
        });
        if (userAgentsForRecalc.length === 0) return null;
        const agentInputsForRecalc = await Promise.all(userAgentsForRecalc.map(async (ua)=>{
            const agentRetellId = ua.agent.retellAgentId;
            const setupFeeAlreadyBilled = ua.setupFee ? !!await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoiceLineItem.findFirst({
                where: {
                    type: 'SETUP_FEE',
                    agentId: agentRetellId,
                    invoice: {
                        userId,
                        status: {
                            not: 'CANCELLED'
                        },
                        id: {
                            not: action.invoiceId
                        }
                    }
                }
            }) : false;
            // Monthly fee: already on a different non-cancelled invoice for this same period?
            const monthlyFeeAlreadyBilled = ua.monthlyFee ? !!await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoiceLineItem.findFirst({
                where: {
                    type: 'MONTHLY_FEE',
                    agentId: agentRetellId,
                    invoice: {
                        userId,
                        periodStart,
                        status: {
                            not: 'CANCELLED'
                        },
                        id: {
                            not: action.invoiceId
                        }
                    }
                }
            }) : false;
            // For supplement invoices (DRAFT alongside a PAID invoice for this period),
            // only count calls AFTER the most recent payment to avoid double-billing.
            const baseStart = ua.assignedAt > periodStart ? ua.assignedAt : periodStart;
            const effectiveStart = mostRecentPaidAt && mostRecentPaidAt > baseStart ? mostRecentPaidAt : baseStart;
            const usageAgg = ua.costMultiplier ? await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].call.aggregate({
                where: {
                    agentId: agentRetellId,
                    startTimestamp: {
                        gte: effectiveStart,
                        lte: periodEnd
                    },
                    totalCost: {
                        not: null
                    }
                },
                _sum: {
                    totalCost: true
                }
            }) : null;
            return {
                retellAgentId: agentRetellId,
                agentName: ua.agent.name,
                setupFee: ua.setupFee ? Number(ua.setupFee) : null,
                setupFeeAlreadyBilled,
                monthlyFee: ua.monthlyFee ? Number(ua.monthlyFee) : null,
                monthlyFeeAlreadyBilled,
                costMultiplier: ua.costMultiplier ? Number(ua.costMultiplier) : null,
                assignedAt: ua.assignedAt,
                periodStart,
                periodEnd,
                usageCost: Number(usageAgg?._sum.totalCost ?? 0)
            };
        }));
        const lineItemsForRecalc = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildLineItems"])(agentInputsForRecalc);
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].$transaction(async (tx)=>{
            await tx.invoiceLineItem.deleteMany({
                where: {
                    invoiceId: action.invoiceId
                }
            });
            if (lineItemsForRecalc.length > 0) {
                await tx.invoiceLineItem.createMany({
                    data: lineItemsForRecalc.map((item)=>({
                            invoiceId: action.invoiceId,
                            type: item.type,
                            agentId: item.agentId,
                            agentName: item.agentName,
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            total: item.total
                        }))
                });
            }
            const newSubtotal = Math.round(lineItemsForRecalc.reduce((s, l)=>s + l.total, 0) * 100) / 100;
            await tx.invoice.update({
                where: {
                    id: action.invoiceId
                },
                data: {
                    subtotal: newSubtotal,
                    total: newSubtotal
                }
            });
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.findUnique({
            where: {
                id: action.invoiceId
            },
            include: {
                lineItems: {
                    orderBy: {
                        type: 'asc'
                    }
                }
            }
        });
    }
    // 2. PENDING or OVERDUE → noop (payment in-flight or past-due)
    const lockedInvoice = periodInvoices.find((inv)=>inv.status === 'PENDING' || inv.status === 'OVERDUE');
    if (lockedInvoice) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.findUnique({
            where: {
                id: lockedInvoice.id
            },
            include: {
                lineItems: {
                    orderBy: {
                        type: 'asc'
                    }
                }
            }
        });
    }
    // 3. All PAID (supplement) or no invoices → CREATE fresh DRAFT
    // Fetch user's agent assignments
    const userAgents = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].userAgent.findMany({
        where: {
            userId
        },
        include: {
            agent: true
        }
    });
    if (userAgents.length === 0) return null;
    // Build agent inputs (resolve setup-fee billing status + usage)
    const agentInputs = await Promise.all(userAgents.map(async (ua)=>{
        const agentRetellId = ua.agent.retellAgentId;
        // Setup fee already billed on any non-cancelled invoice?
        const setupFeeAlreadyBilled = ua.setupFee ? !!await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoiceLineItem.findFirst({
            where: {
                type: 'SETUP_FEE',
                agentId: agentRetellId,
                invoice: {
                    userId,
                    status: {
                        not: 'CANCELLED'
                    }
                }
            }
        }) : false;
        // Monthly fee: already on any non-cancelled invoice for this same period?
        const monthlyFeeAlreadyBilled = ua.monthlyFee ? !!await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoiceLineItem.findFirst({
            where: {
                type: 'MONTHLY_FEE',
                agentId: agentRetellId,
                invoice: {
                    userId,
                    periodStart,
                    status: {
                        not: 'CANCELLED'
                    }
                }
            }
        }) : false;
        // Supplement invoice: only count calls AFTER the most recent payment to avoid double-billing.
        const baseStart = ua.assignedAt > periodStart ? ua.assignedAt : periodStart;
        const effectiveStart = mostRecentPaidAt && mostRecentPaidAt > baseStart ? mostRecentPaidAt : baseStart;
        const usageAgg = ua.costMultiplier ? await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].call.aggregate({
            where: {
                agentId: agentRetellId,
                startTimestamp: {
                    gte: effectiveStart,
                    lte: periodEnd
                },
                totalCost: {
                    not: null
                }
            },
            _sum: {
                totalCost: true
            }
        }) : null;
        return {
            retellAgentId: agentRetellId,
            agentName: ua.agent.name,
            setupFee: ua.setupFee ? Number(ua.setupFee) : null,
            setupFeeAlreadyBilled,
            monthlyFee: ua.monthlyFee ? Number(ua.monthlyFee) : null,
            monthlyFeeAlreadyBilled,
            costMultiplier: ua.costMultiplier ? Number(ua.costMultiplier) : null,
            assignedAt: ua.assignedAt,
            periodStart,
            periodEnd,
            usageCost: Number(usageAgg?._sum.totalCost ?? 0)
        };
    }));
    const lineItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildLineItems"])(agentInputs);
    if (lineItems.length === 0) return null;
    const subtotal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["computeSubtotal"])(lineItems);
    // ── CREATE fresh invoice ────────────────────────────────────────────────────
    const takenNumbers = new Set((await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.findMany({
        where: {
            invoiceNumber: {
                startsWith: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${userId.slice(0, 6).toUpperCase()}`
            }
        },
        select: {
            invoiceNumber: true
        }
    })).map((r)=>r.invoiceNumber));
    const invoiceNumber = buildInvoiceNumber(userId, now.getFullYear(), now.getMonth() + 1, takenNumbers);
    const invoice = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].$transaction(async (tx)=>{
        const created = await tx.invoice.create({
            data: {
                invoiceNumber,
                userId,
                periodStart,
                periodEnd,
                status: 'DRAFT',
                subtotal,
                total: subtotal,
                isAutoGenerated: true
            }
        });
        await tx.invoiceLineItem.createMany({
            data: lineItems.map((item)=>({
                    invoiceId: created.id,
                    type: item.type,
                    agentId: item.agentId,
                    agentName: item.agentName,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.total
                }))
        });
        return created;
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.findUnique({
        where: {
            id: invoice.id
        },
        include: {
            lineItems: {
                orderBy: {
                    type: 'asc'
                }
            }
        }
    });
}
async function ensureBillingUpToDate(userId) {
    await ensureCurrentInvoice(userId);
    await autoMarkOverdueForUser(userId);
}
function buildAgentInvoiceNumber(userId, userAgentId, year, month, invoiceType, existingNumbers) {
    const yyyymm = `${year}${String(month).padStart(2, '0')}`;
    const uPart = userId.slice(0, 6).toUpperCase();
    const aPart = userAgentId.slice(0, 6).toUpperCase();
    const prefix = invoiceType === 'SETUP' ? 'INV-SETUP' : 'INV';
    const base = `${prefix}-${yyyymm}-${uPart}-${aPart}`;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateInvoiceNumber"])(base, existingNumbers);
}
async function createSetupFeeInvoiceForAgent(userAgentId) {
    const ua = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].userAgent.findUnique({
        where: {
            id: userAgentId
        },
        include: {
            agent: true
        }
    });
    if (!ua || !ua.setupFee) return;
    // Idempotent: skip if a non-cancelled SETUP invoice already exists
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.findFirst({
        where: {
            userAgentId,
            invoiceType: 'SETUP',
            status: {
                not: 'CANCELLED'
            }
        }
    });
    if (existing) return;
    const now = new Date();
    const takenNumbers = new Set((await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.findMany({
        where: {
            invoiceNumber: {
                startsWith: 'INV-SETUP-'
            }
        },
        select: {
            invoiceNumber: true
        }
    })).map((r)=>r.invoiceNumber));
    const invoiceNumber = buildAgentInvoiceNumber(ua.userId, userAgentId, now.getFullYear(), now.getMonth() + 1, 'SETUP', takenNumbers);
    const fee = Number(ua.setupFee);
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].$transaction(async (tx)=>{
        const inv = await tx.invoice.create({
            data: {
                invoiceNumber,
                userId: ua.userId,
                userAgentId,
                invoiceType: 'SETUP',
                periodStart: ua.assignedAt,
                periodEnd: ua.assignedAt,
                status: 'DRAFT',
                subtotal: fee,
                total: fee,
                isAutoGenerated: true
            }
        });
        await tx.invoiceLineItem.create({
            data: {
                invoiceId: inv.id,
                type: 'SETUP_FEE',
                agentId: ua.agent.retellAgentId,
                agentName: ua.agent.name,
                description: `Setup fee — ${ua.agent.name}`,
                quantity: 1,
                unitPrice: fee,
                total: fee
            }
        });
    });
}
async function ensureMonthlyInvoiceForAgent(userAgentId) {
    const ua = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].userAgent.findUnique({
        where: {
            id: userAgentId
        },
        include: {
            agent: true
        }
    });
    if (!ua) return;
    const { periodStart, periodEnd } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["computeAgentBillingPeriod"])(ua.assignedAt, new Date());
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.findFirst({
        where: {
            userAgentId,
            invoiceType: 'MONTHLY',
            periodStart,
            status: {
                not: 'CANCELLED'
            }
        },
        select: {
            id: true,
            status: true
        }
    });
    const action = resolveInvoiceAction(existing ? {
        id: existing.id,
        status: existing.status
    } : null);
    if (action.type === 'noop') return;
    // Build line items — setup fee always excluded (lives on its own SETUP invoice)
    const usageAgg = ua.costMultiplier ? await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].call.aggregate({
        where: {
            agentId: ua.agent.retellAgentId,
            startTimestamp: {
                gte: periodStart,
                lte: periodEnd
            },
            totalCost: {
                not: null
            }
        },
        _sum: {
            totalCost: true
        }
    }) : null;
    const agentInput = {
        retellAgentId: ua.agent.retellAgentId,
        agentName: ua.agent.name,
        setupFee: null,
        setupFeeAlreadyBilled: true,
        monthlyFee: ua.monthlyFee ? Number(ua.monthlyFee) : null,
        monthlyFeeAlreadyBilled: false,
        costMultiplier: ua.costMultiplier ? Number(ua.costMultiplier) : null,
        assignedAt: ua.assignedAt,
        periodStart,
        periodEnd,
        usageCost: Number(usageAgg?._sum.totalCost ?? 0)
    };
    const lineItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildLineItems"])([
        agentInput
    ]);
    const subtotal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["computeSubtotal"])(lineItems);
    if (action.type === 'create') {
        if (lineItems.length === 0) return; // nothing to bill yet
        const now = new Date();
        const takenNumbers = new Set((await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.findMany({
            where: {
                invoiceNumber: {
                    startsWith: `INV-${now.getFullYear()}`
                }
            },
            select: {
                invoiceNumber: true
            }
        })).map((r)=>r.invoiceNumber));
        const invoiceNumber = buildAgentInvoiceNumber(ua.userId, userAgentId, now.getFullYear(), now.getMonth() + 1, 'MONTHLY', takenNumbers);
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].$transaction(async (tx)=>{
            const inv = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    userId: ua.userId,
                    userAgentId,
                    invoiceType: 'MONTHLY',
                    periodStart,
                    periodEnd,
                    status: 'DRAFT',
                    subtotal,
                    total: subtotal,
                    isAutoGenerated: true
                }
            });
            if (lineItems.length > 0) {
                await tx.invoiceLineItem.createMany({
                    data: lineItems.map((li)=>({
                            invoiceId: inv.id,
                            ...li
                        }))
                });
            }
        });
    } else if (action.type === 'recalculate') {
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].$transaction(async (tx)=>{
            await tx.invoiceLineItem.deleteMany({
                where: {
                    invoiceId: action.invoiceId
                }
            });
            if (lineItems.length > 0) {
                await tx.invoiceLineItem.createMany({
                    data: lineItems.map((li)=>({
                            invoiceId: action.invoiceId,
                            ...li
                        }))
                });
            }
            await tx.invoice.update({
                where: {
                    id: action.invoiceId
                },
                data: {
                    subtotal,
                    total: subtotal
                }
            });
        });
    }
}
async function ensureBillingUpToDateForUser(userId) {
    const userAgents = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].userAgent.findMany({
        where: {
            userId
        },
        select: {
            id: true
        }
    });
    await Promise.all(userAgents.map((ua)=>ensureMonthlyInvoiceForAgent(ua.id)));
    await autoMarkOverdueForUser(userId);
}
}),
"[project]/app/api/admin/users/[id]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "PATCH",
    ()=>PATCH
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/billing-service.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
const updateUserSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'PENDING',
        'ACTIVE',
        'INACTIVE'
    ]).optional(),
    role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'ADMIN',
        'USER'
    ]).optional(),
    agents: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        agentId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        costMultiplier: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional(),
        setupFee: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional(),
        monthlyFee: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional()
    })).optional()
});
async function PATCH(request, { params }) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["auth"])();
    if (!session || session.user.role !== 'ADMIN') {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Forbidden'
        }, {
            status: 403
        });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: parsed.error.errors[0].message
        }, {
            status: 400
        });
    }
    const { status, role, agents } = parsed.data;
    // Update user status/role
    if (status || role) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.update({
            where: {
                id
            },
            data: {
                ...status ? {
                    status
                } : {},
                ...role ? {
                    role
                } : {}
            }
        });
    }
    // Update agent assignments
    if (agents !== undefined) {
        // Look up agent DB records from retellAgentIds
        const agentRecords = agents.length > 0 ? await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].agent.findMany({
            where: {
                retellAgentId: {
                    in: agents.map((a)=>a.agentId)
                }
            }
        }) : [];
        const incomingAgentDbIds = new Set(agentRecords.map((a)=>a.id));
        // Remove agents that are no longer in the incoming list
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].userAgent.deleteMany({
            where: {
                userId: id,
                agentId: {
                    notIn: [
                        ...incomingAgentDbIds
                    ]
                }
            }
        });
        // Upsert each incoming agent — preserves assignedAt for existing assignments
        // so historical call logs remain visible (calls are filtered by assignedAt).
        for (const agentRecord of agentRecords){
            const input = agents.find((a)=>a.agentId === agentRecord.retellAgentId);
            // Pre-check: is this a brand-new assignment?
            const existingUA = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].userAgent.findUnique({
                where: {
                    userId_agentId: {
                        userId: id,
                        agentId: agentRecord.id
                    }
                },
                select: {
                    id: true
                }
            });
            const isNew = !existingUA;
            const upserted = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].userAgent.upsert({
                where: {
                    userId_agentId: {
                        userId: id,
                        agentId: agentRecord.id
                    }
                },
                update: {
                    costMultiplier: input?.costMultiplier ?? null,
                    setupFee: input?.setupFee ?? null,
                    monthlyFee: input?.monthlyFee ?? null,
                    assignedBy: session.user.id
                },
                create: {
                    userId: id,
                    agentId: agentRecord.id,
                    costMultiplier: input?.costMultiplier ?? null,
                    setupFee: input?.setupFee ?? null,
                    monthlyFee: input?.monthlyFee ?? null,
                    assignedBy: session.user.id
                }
            });
            // Immediately create a standalone SETUP invoice for new assignments with a fee
            if (isNew && input?.setupFee && Number(input.setupFee) > 0) {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createSetupFeeInvoiceForAgent"])(upserted.id);
            }
        }
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        success: true
    });
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__f991fc57._.js.map