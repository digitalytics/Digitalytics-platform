import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { callId } = await params;

  const call = await prisma.call.findUnique({
    where: { callId },
    include: {
      transcript: true,
      callAnalysis: true,
      recordings: true,
    },
  });

  if (!call) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Verify access: admin can see all, users only their agent's calls
  if (session.user.role !== 'ADMIN') {
    const hasAccess = await prisma.userAgent.findFirst({
      where: {
        userId: session.user.id,
        agent: { retellAgentId: call.agentId },
      },
    });
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Strip cost data for non-admin users
  const response = {
    ...call,
    totalCost: session.user.role === 'ADMIN' ? call.totalCost : undefined,
    costDetails: session.user.role === 'ADMIN' ? call.costDetails : undefined,
    latencyDetails: call.latencyDetails, // latency is ok to show
  };

  return NextResponse.json(response);
}
