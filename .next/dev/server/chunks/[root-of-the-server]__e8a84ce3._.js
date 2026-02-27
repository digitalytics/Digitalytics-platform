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
    "computeSubtotal",
    ()=>computeSubtotal,
    "generateInvoiceNumber",
    ()=>generateInvoiceNumber
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
        // MONTHLY_FEE
        if (ag.monthlyFee) {
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
        // USAGE_FEE — usageMs is pre-filtered from DB (assignedAt lower bound already applied)
        if (ag.customPrice && ag.usageMs > 0) {
            const minutes = ag.usageMs / 60000;
            const total = Math.round(minutes * ag.customPrice * 100) / 100;
            items.push({
                type: 'USAGE_FEE',
                agentId: ag.retellAgentId,
                agentName: ag.agentName,
                description: `Usage — ${ag.agentName} (${minutes.toFixed(4)} min)`,
                quantity: Math.round(minutes * 10000) / 10000,
                unitPrice: ag.customPrice,
                total
            });
        }
    }
    return items;
}
function computeSubtotal(items) {
    return Math.round(items.reduce((s, l)=>s + l.total, 0) * 100) / 100;
}
function generateInvoiceNumber(base, existingNumbers) {
    if (!existingNumbers.has(base)) return base;
    let suffix = 2;
    while(existingNumbers.has(`${base}-${suffix}`))suffix++;
    return `${base}-${suffix}`;
}
}),
"[project]/app/api/admin/billing/generate/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/billing-engine.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
async function POST() {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["auth"])();
    if (!session || session.user.role !== 'ADMIN') {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Forbidden'
        }, {
            status: 403
        });
    }
    // Current billing period: first → last day of current month
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    // All active non-admin users with their agent assignments
    const users = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findMany({
        where: {
            role: 'USER',
            status: 'ACTIVE'
        },
        include: {
            assignedAgents: {
                include: {
                    agent: true
                }
            }
        }
    });
    let generated = 0;
    let skipped = 0;
    const errors = [];
    for (const user of users){
        try {
            // Find an active (non-cancelled) invoice for this period.
            // CANCELLED invoices are ignored — treat them as if no invoice exists.
            const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.findFirst({
                where: {
                    userId: user.id,
                    periodStart,
                    status: {
                        not: 'CANCELLED'
                    }
                }
            });
            // Only skip statuses that are already finalised (sent/paid).
            // DRAFT → fall through and recalculate.
            if (existing && existing.status !== 'DRAFT') {
                skipped++;
                continue;
            }
            // ── Build line items ────────────────────────────────────────────────
            const agentInputs = await Promise.all(user.assignedAgents.map(async (ua)=>{
                const agentRetellId = ua.agent.retellAgentId;
                // SETUP_FEE: already billed on a *different* non-cancelled invoice?
                // When updating a DRAFT, exclude the current invoice so its own
                // SETUP_FEE line item doesn't falsely mark it as "already billed".
                const setupFeeAlreadyBilled = ua.setupFee ? !!await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoiceLineItem.findFirst({
                    where: {
                        type: 'SETUP_FEE',
                        agentId: agentRetellId,
                        invoice: {
                            userId: user.id,
                            status: {
                                not: 'CANCELLED'
                            },
                            ...existing ? {
                                id: {
                                    not: existing.id
                                }
                            } : {}
                        }
                    }
                }) : false;
                // Usage: only calls from max(assignedAt, periodStart) → periodEnd
                const effectiveStart = ua.assignedAt > periodStart ? ua.assignedAt : periodStart;
                const usage = ua.customPrice ? await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].call.aggregate({
                    where: {
                        agentId: agentRetellId,
                        startTimestamp: {
                            gte: effectiveStart,
                            lte: periodEnd
                        },
                        durationMs: {
                            not: null
                        }
                    },
                    _sum: {
                        durationMs: true
                    }
                }) : null;
                return {
                    retellAgentId: agentRetellId,
                    agentName: ua.agent.name,
                    setupFee: ua.setupFee ? Number(ua.setupFee) : null,
                    setupFeeAlreadyBilled,
                    monthlyFee: ua.monthlyFee ? Number(ua.monthlyFee) : null,
                    customPrice: ua.customPrice ? Number(ua.customPrice) : null,
                    assignedAt: ua.assignedAt,
                    periodStart,
                    periodEnd,
                    usageMs: usage?._sum.durationMs ?? 0
                };
            }));
            const lineItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildLineItems"])(agentInputs);
            // Skip users with no billable items
            if (lineItems.length === 0) {
                skipped++;
                continue;
            }
            const subtotal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["computeSubtotal"])(lineItems);
            if (existing) {
                // ── DRAFT exists → replace USAGE_FEE items and refresh totals ──
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].$transaction(async (tx)=>{
                    // Remove stale usage line items
                    await tx.invoiceLineItem.deleteMany({
                        where: {
                            invoiceId: existing.id,
                            type: 'USAGE_FEE'
                        }
                    });
                    // Insert fresh usage line items
                    const usageItems = lineItems.filter((l)=>l.type === 'USAGE_FEE');
                    if (usageItems.length > 0) {
                        await tx.invoiceLineItem.createMany({
                            data: usageItems.map((item)=>({
                                    invoiceId: existing.id,
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
                    // Recompute total from ALL line items actually on the invoice (source of truth)
                    const allItems = await tx.invoiceLineItem.findMany({
                        where: {
                            invoiceId: existing.id
                        },
                        select: {
                            total: true
                        }
                    });
                    const newSubtotal = Math.round(allItems.reduce((s, l)=>s + Number(l.total), 0) * 100) / 100;
                    await tx.invoice.update({
                        where: {
                            id: existing.id
                        },
                        data: {
                            subtotal: newSubtotal,
                            total: newSubtotal
                        }
                    });
                });
            } else {
                // ── No active invoice → create fresh ──
                const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
                const baseNumber = `INV-${yyyymm}-${user.id.slice(0, 6).toUpperCase()}`;
                // Guard against collision with cancelled invoices that hold the base number
                const takenNumbers = new Set((await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].invoice.findMany({
                    where: {
                        invoiceNumber: {
                            startsWith: baseNumber
                        }
                    },
                    select: {
                        invoiceNumber: true
                    }
                })).map((r)=>r.invoiceNumber));
                const invoiceNumber = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$billing$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateInvoiceNumber"])(baseNumber, takenNumbers);
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].$transaction(async (tx)=>{
                    const invoice = await tx.invoice.create({
                        data: {
                            invoiceNumber,
                            userId: user.id,
                            periodStart,
                            periodEnd,
                            status: 'DRAFT',
                            subtotal,
                            total: subtotal,
                            isAutoGenerated: false
                        }
                    });
                    await tx.invoiceLineItem.createMany({
                        data: lineItems.map((item)=>({
                                invoiceId: invoice.id,
                                type: item.type,
                                agentId: item.agentId,
                                agentName: item.agentName,
                                description: item.description,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                total: item.total
                            }))
                    });
                // NOTE: setupFeePaid is NOT set here — only set when invoice is marked PAID
                });
            }
            generated++;
        } catch (err) {
            errors.push(`User ${user.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        generated,
        skipped,
        errors
    });
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e8a84ce3._.js.map