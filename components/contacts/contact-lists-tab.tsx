'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Trash2, Settings, Search, UserPlus, UserMinus, Loader2, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface ContactList {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  company: string | null;
}

// ── Create List Modal ──────────────────────────────────────────────────────────

function CreateListModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (list: ContactList) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('List name is required'); return; }
    setIsLoading(true);
    setError('');
    const res = await fetch('/api/contact-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
    });
    if (res.ok) {
      const created = await res.json();
      onCreated({ ...created, memberCount: 0 });
      setName('');
      setDescription('');
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to create list');
    }
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Contact List" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">List Name *</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Q1 Leads, VIP Customers"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What is this list for?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Create List</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Manage List Modal ──────────────────────────────────────────────────────────

function ManageListModal({
  list,
  onClose,
  onMemberCountChange,
}: {
  list: ContactList;
  onClose: () => void;
  onMemberCountChange: (id: string, count: number) => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null); // contactId being toggled

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [contactsRes, listRes] = await Promise.all([
        fetch('/api/contacts?limit=500'),
        fetch(`/api/contact-lists/${list.id}`),
      ]);
      const contactsData = await contactsRes.json();
      const listData = await listRes.json();
      setContacts(contactsData.contacts || []);
      setMemberIds(new Set(listData.memberContactIds || []));
      setIsLoading(false);
    };
    load();
  }, [list.id]);

  const toggleMember = async (contact: Contact) => {
    setBusy(contact.id);
    const isMember = memberIds.has(contact.id);

    if (isMember) {
      await fetch(`/api/contact-lists/${list.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: [contact.id] }),
      });
      setMemberIds(prev => { const s = new Set(prev); s.delete(contact.id); return s; });
      onMemberCountChange(list.id, memberIds.size - 1);
    } else {
      await fetch(`/api/contact-lists/${list.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: [contact.id] }),
      });
      setMemberIds(prev => new Set([...prev, contact.id]));
      onMemberCountChange(list.id, memberIds.size + 1);
    }
    setBusy(null);
  };

  const fullName = (c: Contact) => [c.firstName, c.lastName].filter(Boolean).join(' ');

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (
      fullName(c).toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    );
  });

  // Sort: members first
  const sorted = [...filtered].sort((a, b) => {
    const aIn = memberIds.has(a.id) ? 0 : 1;
    const bIn = memberIds.has(b.id) ? 0 : 1;
    return aIn - bIn;
  });

  return (
    <Modal isOpen={true} onClose={onClose} title={`Manage: ${list.name}`} size="lg">
      <div className="space-y-4">
        {/* Member count summary */}
        <div className="flex items-center justify-between bg-[#004D3E]/5 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-[#004D3E] font-medium">
            <Users size={15} />
            {memberIds.size} {memberIds.size === 1 ? 'contact' : 'contacts'} in this list
          </div>
          {list.description && (
            <span className="text-xs text-gray-500">{list.description}</span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
          />
        </div>

        {/* Contacts list */}
        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading contacts…</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No contacts yet. Add contacts first.
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No contacts match your search.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Phone</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map(contact => {
                  const isMember = memberIds.has(contact.id);
                  const isBusy = busy === contact.id;
                  return (
                    <tr key={contact.id} className={`hover:bg-gray-50 ${isMember ? 'bg-green-50/40' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-900">{fullName(contact)}</div>
                        {contact.company && <div className="text-xs text-gray-400">{contact.company}</div>}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-500 text-xs hidden sm:table-cell">{contact.phone}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => toggleMember(contact)}
                          disabled={isBusy}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                            isMember
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-[#004D3E]/10 text-[#004D3E] hover:bg-[#004D3E]/20'
                          }`}
                        >
                          {isBusy ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : isMember ? (
                            <UserMinus size={11} />
                          ) : (
                            <UserPlus size={11} />
                          )}
                          {isMember ? 'Remove' : 'Add'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Tab Component ─────────────────────────────────────────────────────────

export function ContactListsTab() {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [managingList, setManagingList] = useState<ContactList | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ContactList | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLists = useCallback(async () => {
    const res = await fetch('/api/contact-lists');
    const data = await res.json();
    setLists(data.map((l: any) => ({ ...l, memberCount: l._count?.members ?? 0 })));
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const handleCreated = (list: ContactList) => {
    setLists(prev => [list, ...prev]);
  };

  const handleMemberCountChange = (id: string, count: number) => {
    setLists(prev => prev.map(l => l.id === id ? { ...l, memberCount: count } : l));
  };

  const handleDelete = async (list: ContactList) => {
    setIsDeleting(true);
    await fetch(`/api/contact-lists/${list.id}`, { method: 'DELETE' });
    setLists(prev => prev.filter(l => l.id !== list.id));
    setDeleteConfirm(null);
    setIsDeleting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading lists…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{lists.length} {lists.length === 1 ? 'list' : 'lists'}</p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New List
        </Button>
      </div>

      {/* Lists grid */}
      {lists.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <List size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 mb-1 font-medium">No contact lists yet</p>
          <p className="text-gray-400 text-sm mb-4">Create a list to group contacts for campaigns.</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Create your first list
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map(list => (
            <div
              key={list.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:border-[#004D3E]/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#004D3E]/10 flex items-center justify-center flex-shrink-0">
                  <Users size={17} className="text-[#004D3E]" />
                </div>
                <button
                  onClick={() => setDeleteConfirm(list)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                  title="Delete list"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 leading-tight">{list.name}</h3>
                {list.description && (
                  <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{list.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Users size={13} />
                  {list.memberCount} {list.memberCount === 1 ? 'contact' : 'contacts'}
                </span>
                <button
                  onClick={() => setManagingList(list)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#004D3E] hover:underline"
                >
                  <Settings size={12} />
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateListModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />

      {managingList && (
        <ManageListModal
          list={managingList}
          onClose={() => setManagingList(null)}
          onMemberCountChange={handleMemberCountChange}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete List</h2>
            <p className="text-gray-600 text-sm mb-1">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm.name}</span>?
            </p>
            <p className="text-gray-400 text-xs mb-4">This removes the list but does NOT delete your contacts.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="danger" isLoading={isDeleting} onClick={() => handleDelete(deleteConfirm)}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
