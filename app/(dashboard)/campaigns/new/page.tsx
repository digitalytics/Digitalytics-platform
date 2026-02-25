import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CampaignWizard } from '@/components/campaigns/campaign-wizard';

export default async function NewCampaignPage() {
  const session = await auth();
  if (!session) return null;

  // Fetch agents available to this user
  let agents;
  if (session.user.role === 'ADMIN') {
    agents = await prisma.agent.findMany({
      where: { isActive: true },
      select: { id: true, name: true, phoneNumber: true, retellAgentId: true },
      orderBy: { name: 'asc' },
    });
  } else {
    const userAgents = await prisma.userAgent.findMany({
      where: { userId: session.user.id },
      include: {
        agent: {
          select: { id: true, name: true, phoneNumber: true, retellAgentId: true, isActive: true },
        },
      },
    });
    agents = userAgents.filter(ua => ua.agent.isActive).map(ua => ua.agent);
  }

  const contactLists = await prisma.contactList.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="text-gray-400 hover:text-gray-600 transition">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Campaign</h1>
          <p className="text-gray-500 mt-1">Set up a new bulk outbound calling campaign.</p>
        </div>
      </div>

      <CampaignWizard agents={agents} contactLists={contactLists} />
    </div>
  );
}
