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
"[project]/app/api/webhooks/retell/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.ts [app-route] (ecmascript)");
;
;
async function POST(request) {
    const body = await request.json();
    const { event, call } = body;
    if (!event || !call?.call_id) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Invalid payload'
        }, {
            status: 400
        });
    }
    try {
        if (event === 'call_ended' || event === 'call_analyzed') {
            // Resolve callSuccessful and userSentiment from top-level or nested call_analysis
            const callSuccessful = call.call_successful ?? call.call_analysis?.call_successful ?? null;
            const userSentiment = call.user_sentiment ?? call.call_analysis?.user_sentiment ?? null;
            // Resolve agentName: use payload value or look up from local DB
            let agentName = call.agent_name ?? null;
            if (!agentName && call.agent_id) {
                const localAgent = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].agent.findFirst({
                    where: {
                        retellAgentId: call.agent_id
                    },
                    select: {
                        name: true
                    }
                });
                agentName = localAgent?.name ?? null;
            }
            // Upsert the call record
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].call.upsert({
                where: {
                    callId: call.call_id
                },
                create: {
                    callId: call.call_id,
                    agentId: call.agent_id,
                    agentName,
                    callStatus: call.call_status || 'ended',
                    startTimestamp: call.start_timestamp ? new Date(call.start_timestamp) : new Date(),
                    endTimestamp: call.end_timestamp ? new Date(call.end_timestamp) : null,
                    durationMs: call.duration_ms ?? null,
                    callSuccessful,
                    userSentiment,
                    totalCost: call.total_cost ?? (call.call_cost?.combined_cost ? call.call_cost.combined_cost / 100 : null),
                    costDetails: call.call_cost ? call.call_cost : undefined,
                    metadata: call.metadata ? call.metadata : undefined,
                    dynamicVariables: call.retell_llm_dynamic_variables ? call.retell_llm_dynamic_variables : undefined,
                    syncedAt: new Date()
                },
                update: {
                    agentName: agentName ?? undefined,
                    callStatus: call.call_status || 'ended',
                    endTimestamp: call.end_timestamp ? new Date(call.end_timestamp) : undefined,
                    durationMs: call.duration_ms ?? undefined,
                    ...callSuccessful !== null ? {
                        callSuccessful
                    } : {},
                    ...userSentiment ? {
                        userSentiment
                    } : {},
                    totalCost: call.total_cost ?? (call.call_cost?.combined_cost ? call.call_cost.combined_cost / 100 : undefined),
                    costDetails: call.call_cost ? call.call_cost : undefined,
                    syncedAt: new Date()
                }
            });
            // Upsert transcript if present
            if (call.transcript || call.transcript_object) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].transcript.upsert({
                    where: {
                        callId: call.call_id
                    },
                    create: {
                        callId: call.call_id,
                        transcript: call.transcript ?? null,
                        transcriptObject: call.transcript_object ? call.transcript_object : undefined
                    },
                    update: {
                        transcript: call.transcript ?? undefined,
                        transcriptObject: call.transcript_object ? call.transcript_object : undefined
                    }
                });
            }
            // Upsert call analysis if present
            const callAnalysisData = call.call_analysis;
            const callSummary = call.call_summary ?? call.call_analysis?.call_summary ?? null;
            if (callAnalysisData || callSummary) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].callAnalysis.upsert({
                    where: {
                        callId: call.call_id
                    },
                    create: {
                        callId: call.call_id,
                        callAnalysis: callAnalysisData ? callAnalysisData : undefined,
                        callSummary: callSummary ?? undefined
                    },
                    update: {
                        callAnalysis: callAnalysisData ? callAnalysisData : undefined,
                        callSummary: callSummary ?? undefined
                    }
                });
            }
            // Upsert recording if present
            if (call.recording_url || call.stereo_recording_url || call.public_log_url) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].recording.deleteMany({
                    where: {
                        callId: call.call_id
                    }
                });
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].recording.create({
                    data: {
                        callId: call.call_id,
                        recordingUrl: call.recording_url ?? null,
                        stereoRecordingUrl: call.stereo_recording_url ?? null,
                        publicLogUrl: call.public_log_url ?? null
                    }
                });
            }
            // Update OutboundCall status if this was an outbound call
            const outboundCall = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].outboundCall.findUnique({
                where: {
                    retellCallId: call.call_id
                }
            });
            if (outboundCall) {
                // COMPLETED = call was answered and ended (regardless of whether the
                // objective was achieved — call_successful tracks that separately).
                // FAILED = call never connected (not_connected / error).
                const newStatus = call.call_status === 'ended' ? 'COMPLETED' : call.call_status === 'error' || call.call_status === 'not_connected' ? 'FAILED' : undefined;
                if (newStatus) {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].outboundCall.update({
                        where: {
                            id: outboundCall.id
                        },
                        data: {
                            status: newStatus
                        }
                    });
                    // Update campaign counters if this belongs to a campaign
                    if (outboundCall.campaignId) {
                        const updateData = {
                            calledCount: {
                                increment: 1
                            }
                        };
                        if (newStatus === 'COMPLETED') {
                            updateData.connectedCount = {
                                increment: 1
                            };
                        } else if (newStatus === 'FAILED') {
                            updateData.failedCount = {
                                increment: 1
                            };
                        }
                        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].campaign.update({
                            where: {
                                id: outboundCall.campaignId
                            },
                            data: updateData
                        });
                        // Check if campaign is complete
                        const campaign = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].campaign.findUnique({
                            where: {
                                id: outboundCall.campaignId
                            },
                            include: {
                                _count: {
                                    select: {
                                        outboundCalls: true
                                    }
                                }
                            }
                        });
                        if (campaign && campaign.status === 'RUNNING') {
                            const allDone = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].outboundCall.count({
                                where: {
                                    campaignId: outboundCall.campaignId,
                                    status: {
                                        in: [
                                            'PENDING',
                                            'CALLING'
                                        ]
                                    }
                                }
                            });
                            if (allDone === 0) {
                                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].campaign.update({
                                    where: {
                                        id: outboundCall.campaignId
                                    },
                                    data: {
                                        status: 'COMPLETED',
                                        completedAt: new Date()
                                    }
                                });
                                // Create notification for campaign owner
                                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].notification.create({
                                    data: {
                                        userId: campaign.userId,
                                        type: 'CAMPAIGN_COMPLETED',
                                        title: 'Campaign Completed',
                                        message: `Campaign "${campaign.name}" has finished. ${campaign.connectedCount + (newStatus === 'COMPLETED' ? 1 : 0)} contacts reached.`,
                                        link: `/campaigns/${campaign.id}`
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            received: true
        });
    } catch (err) {
        console.error('Webhook processing error:', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Internal error'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__7a3fa3b3._.js.map