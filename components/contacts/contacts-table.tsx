'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Upload,
  Pencil,
  Trash2,
  Phone,
  Search,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContactFormModal } from './contact-form-modal';
import { ImportModal } from './import-modal';
import { OutboundCallModal } from './outbound-call-modal';
import Link from 'next/link';

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
}

interface ContactsTableProps {
  initialContacts: Contact[];
  initialTotal: number;
  initialPage: number;
}

export function ContactsTable({ initialContacts, initialTotal, initialPage }: ContactsTableProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [callContact, setCallContact] = useState<Contact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Contact | null>(null);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const fetchContacts = useCallback(async (p: number, q: string) => {
    setIsLoading(true);
    const res = await fetch(`/api/contacts?page=${p}&limit=${limit}&search=${encodeURIComponent(q)}`);
    const data = await res.json();
    setContacts(data.contacts);
    setTotal(data.total);
    setPage(p);
    setIsLoading(false);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    fetchContacts(1, e.target.value);
  };

  const handleDelete = async (contact: Contact) => {
    await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    fetchContacts(page, search);
  };

  const fullName = (c: Contact) => [c.firstName, c.lastName].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload size={14} /> Import CSV
          </Button>
          <Button onClick={() => { setEditingContact(null); setShowAddModal(true); }}>
            <Plus size={14} /> Add Contact
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {contacts.length === 0 ? (
          <div className="p-12 text-center">
            <Phone size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 mb-3">{search ? 'No contacts match your search.' : 'No contacts yet.'}</p>
            {!search && (
              <Button onClick={() => setShowAddModal(true)} variant="secondary">
                <Plus size={14} /> Add your first contact
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Company</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map(contact => (
                <tr key={contact.id} className={`hover:bg-gray-50 ${isLoading ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${contact.id}`} className="font-medium text-gray-900 hover:text-[#004D3E]">
                      {fullName(contact)}
                    </Link>
                    {contact.tags.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {contact.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="neutral" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">{contact.phone}</td>
                  <td className="px-4 py-3 text-gray-500">{contact.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{contact.company || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setCallContact(contact)}
                        className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition"
                        title="Call"
                      >
                        <PhoneCall size={15} />
                      </button>
                      <button
                        onClick={() => { setEditingContact(contact); setShowAddModal(true); }}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(contact)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} contacts total</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchContacts(page - 1, search)}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => fetchContacts(page + 1, search)}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ContactFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={() => fetchContacts(page, search)}
        editingContact={editingContact}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={() => fetchContacts(1, search)}
      />

      {callContact && (
        <OutboundCallModal
          isOpen={true}
          onClose={() => setCallContact(null)}
          contact={callContact}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Contact</h2>
            <p className="text-gray-600 text-sm mb-4">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{fullName(deleteConfirm)}</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
