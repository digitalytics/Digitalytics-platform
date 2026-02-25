import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CampaignDetail } from '@/components/campaigns/campaign-detail';

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) return null;

  const { id } = await params;
  const where = session.user.role === 'ADMIN' ? { id } : { id, userId: session.user.id };

  const campaign = await prisma.campaign.findFirst({
    where,
    include: {
      contactList: { select: { name: true, id: true } },
      outboundCalls: {
        orderBy: { initiatedAt: 'desc' },
        include: {
          contact: { select: { firstName: true, lastName: true, phone: true } },
        },
      },
    },
  });

  if (!campaign) notFound();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="text-gray-400 hover:text-gray-600 transition">
          <ArrowLeft size={20} />
        </Link>
      </div>

      <CampaignDetail
        campaign={{
          ...campaign,
          createdAt: campaign.createdAt.toISOString(),
          startedAt: campaign.startedAt?.toISOString() || null,
          completedAt: campaign.completedAt?.toISOString() || null,
          outboundCalls: campaign.outboundCalls.map(c => ({
            ...c,
            initiatedAt: c.initiatedAt.toISOString(),
          })),
        }}
      />
    </div>
  );
}
