import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { contacts } = body as {
    contacts: Array<{
      firstName: string;
      lastName?: string;
      phone: string;
      email?: string;
      company?: string;
      notes?: string;
    }>;
  };

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: 'No contacts provided' }, { status: 400 });
  }

  if (contacts.length > 1000) {
    return NextResponse.json({ error: 'Maximum 1000 contacts per import' }, { status: 400 });
  }

  const invalid = contacts.filter(c => !c.firstName || !c.phone);
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `${invalid.length} contacts missing required fields (firstName, phone)` },
      { status: 400 }
    );
  }

  const created = await prisma.contact.createMany({
    data: contacts.map(c => ({
      userId: session.user.id,
      firstName: c.firstName,
      lastName: c.lastName || null,
      phone: c.phone,
      email: c.email || null,
      company: c.company || null,
      notes: c.notes || null,
      tags: [],
    })),
    skipDuplicates: false,
  });

  return NextResponse.json({ imported: created.count }, { status: 201 });
}
