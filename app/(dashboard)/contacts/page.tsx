import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ContactsTable } from '@/components/contacts/contacts-table';
import { ContactListsTab } from '@/components/contacts/contact-lists-tab';
import Link from 'next/link';

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await auth();
  if (!session) return null;

  const params = await searchParams;
  const tab = params.tab === 'lists' ? 'lists' : 'contacts';

  const where = { userId: session.user.id };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contact.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <p className="text-gray-500 mt-1">Manage your contacts and lists for campaigns.</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-gray-200">
        <Link
          href="/contacts"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'contacts'
              ? 'border-[#004D3E] text-[#004D3E]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Contacts
          <span className="ml-2 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">
            {total}
          </span>
        </Link>
        <Link
          href="/contacts?tab=lists"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'lists'
              ? 'border-[#004D3E] text-[#004D3E]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Lists
        </Link>
      </div>

      {tab === 'contacts' ? (
        <ContactsTable
          initialContacts={contacts.map(c => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
          }))}
          initialTotal={total}
          initialPage={1}
        />
      ) : (
        <ContactListsTab />
      )}
    </div>
  );
}
