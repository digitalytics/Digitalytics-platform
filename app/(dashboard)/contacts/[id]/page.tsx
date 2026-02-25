import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, Building2, StickyNote, PhoneCall } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) return null;

  const { id } = await params;
  const contact = await prisma.contact.findFirst({
    where: { id, userId: session.user.id },
    include: {
      outboundCalls: {
        orderBy: { initiatedAt: 'desc' },
        take: 50,
        include: {
          agent: { select: { name: true } },
        },
      },
    },
  });

  if (!contact) notFound();

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');

  const statusColor: Record<string, string> = {
    COMPLETED: 'success',
    FAILED: 'danger',
    CALLING: 'warning',
    PENDING: 'neutral',
    CANCELLED: 'neutral',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/contacts" className="text-gray-400 hover:text-gray-600 transition">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Contact details and call history</p>
        </div>
      </div>

      {/* Contact Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-[#004D3E]/10 flex items-center justify-center">
              <Phone size={14} className="text-[#004D3E]" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <p className="font-mono font-medium text-gray-900">{contact.phone}</p>
            </div>
          </div>

          {contact.email && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-[#004D3E]/10 flex items-center justify-center">
                <Mail size={14} className="text-[#004D3E]" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-gray-900">{contact.email}</p>
              </div>
            </div>
          )}

          {contact.company && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-[#004D3E]/10 flex items-center justify-center">
                <Building2 size={14} className="text-[#004D3E]" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Company</p>
                <p className="text-gray-900">{contact.company}</p>
              </div>
            </div>
          )}

          {contact.notes && (
            <div className="flex items-start gap-3 text-sm col-span-2">
              <div className="w-8 h-8 rounded-lg bg-[#004D3E]/10 flex items-center justify-center flex-shrink-0">
                <StickyNote size={14} className="text-[#004D3E]" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Notes</p>
                <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            </div>
          )}
        </div>

        {contact.tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map(tag => (
                <Badge key={tag} variant="neutral">{tag}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Call History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <PhoneCall size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Call History</h2>
          <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
            {contact.outboundCalls.length}
          </span>
        </div>

        {contact.outboundCalls.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No calls yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Agent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">From</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contact.outboundCalls.map(call => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(call.initiatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{call.agent?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={(statusColor[call.status] as 'success' | 'danger' | 'warning' | 'neutral') || 'neutral'}>
                      {call.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500">{call.fromNumber || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
