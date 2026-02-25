import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ContactsTable } from '@/components/contacts/contacts-table';

export default async function ContactsPage() {
  const session = await auth();
  if (!session) return null;

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
        <p className="text-gray-500 mt-1">Manage your contacts and initiate outbound calls.</p>
      </div>

      <ContactsTable
        initialContacts={contacts.map(c => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        }))}
        initialTotal={total}
        initialPage={1}
      />
    </div>
  );
}
