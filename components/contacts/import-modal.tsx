'use client';

import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ParsedContact {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  company?: string;
}

export function ImportModal({ isOpen, onClose, onImported }: ImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const parseCSV = (text: string): ParsedContact[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));
    const firstNameIdx = header.findIndex(h => h.includes('first') || h === 'name' || h === 'firstname');
    const lastNameIdx = header.findIndex(h => h.includes('last') || h === 'lastname');
    const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('tel'));
    const emailIdx = header.findIndex(h => h.includes('email'));
    const companyIdx = header.findIndex(h => h.includes('company') || h.includes('org'));

    if (firstNameIdx === -1) throw new Error('CSV must have a "firstName" or "name" column');
    if (phoneIdx === -1) throw new Error('CSV must have a "phone" column');

    return lines.slice(1).filter(l => l.trim()).map((line, i) => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const firstName = cols[firstNameIdx];
      const phone = cols[phoneIdx];
      if (!firstName || !phone) throw new Error(`Row ${i + 2}: missing firstName or phone`);
      return {
        firstName,
        lastName: lastNameIdx >= 0 ? cols[lastNameIdx] || undefined : undefined,
        phone,
        email: emailIdx >= 0 ? cols[emailIdx] || undefined : undefined,
        company: companyIdx >= 0 ? cols[companyIdx] || undefined : undefined,
      };
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setParsed(null);
    setImportedCount(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const contacts = parseCSV(ev.target?.result as string);
        setParsed(contacts);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setIsImporting(true);
    setError(null);
    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Import failed');
      } else {
        setImportedCount(data.imported);
        onImported();
      }
    } catch {
      setError('Failed to import contacts');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setParsed(null);
    setError(null);
    setImportedCount(null);
    if (fileRef.current) fileRef.current.value = '';
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Contacts from CSV" size="md">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
          <p className="font-medium text-gray-700 mb-1">Required CSV columns:</p>
          <code>firstName, phone</code>
          <p className="mt-1">Optional: lastName, email, company</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV file</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-[#004D3E]/10 file:text-[#004D3E] hover:file:bg-[#004D3E]/20"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {parsed && !importedCount && (
          <div className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 rounded-lg p-3">
            <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
            <span>{parsed.length} contacts ready to import</span>
          </div>
        )}

        {importedCount !== null && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
            <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
            <span>Successfully imported {importedCount} contacts!</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" onClick={handleClose}>
            {importedCount !== null ? 'Close' : 'Cancel'}
          </Button>
          {parsed && !importedCount && (
            <Button onClick={handleImport} isLoading={isImporting}>
              <Upload size={14} />
              Import {parsed.length} Contacts
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
