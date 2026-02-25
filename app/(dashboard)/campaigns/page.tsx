import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CampaignCard } from '@/components/campaigns/campaign-card';

export default async function CampaignsPage() {
  const session = await auth();
  if (!session) return null;

  const where = session.user.role === 'ADMIN' ? {} : { userId: session.user.id };

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      contactList: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 mt-1">Manage bulk outbound calling campaigns.</p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus size={14} /> New Campaign
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-3">No campaigns yet.</p>
          <Link href="/campaigns/new">
            <Button variant="secondary">
              <Plus size={14} /> Create your first campaign
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={{
                ...campaign,
                createdAt: campaign.createdAt.toISOString(),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
