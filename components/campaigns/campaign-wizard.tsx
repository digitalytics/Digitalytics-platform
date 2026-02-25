'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  phoneNumber: string | null;
}

interface ContactList {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number };
}

interface CampaignWizardProps {
  agents: Agent[];
  contactLists: ContactList[];
}

const step1Schema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  agentId: z.string().min(1, 'Please select an agent'),
});

const step2Schema = z.object({
  contactListId: z.string().min(1, 'Please select a contact list'),
});

const step3Schema = z.object({
  delaySeconds: z.number().int().min(0).max(300),
  concurrency: z.number().int().min(1).max(5),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;
type Step3Form = z.infer<typeof step3Schema>;

const STEPS = ['Name & Agent', 'Contact List', 'Settings', 'Review'];

export function CampaignWizard({ agents, contactLists }: CampaignWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Step1Form | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Form | null>(null);
  const [step3Data, setStep3Data] = useState<Step3Form>({ delaySeconds: 5, concurrency: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form1 = useForm<Step1Form>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2Form>({ resolver: zodResolver(step2Schema) });
  const form3 = useForm<Step3Form>({
    resolver: zodResolver(step3Schema),
    defaultValues: { delaySeconds: 5, concurrency: 1 },
  });

  const agentsWithPhone = agents.filter(a => a.phoneNumber);
  const selectedAgent = agentsWithPhone.find(a => a.id === step1Data?.agentId);
  const selectedList = contactLists.find(l => l.id === step2Data?.contactListId);

  const handleStep1 = form1.handleSubmit(data => {
    setStep1Data(data);
    setStep(1);
  });

  const handleStep2 = form2.handleSubmit(data => {
    setStep2Data(data);
    setStep(2);
  });

  const handleStep3 = form3.handleSubmit(data => {
    setStep3Data(data);
    setStep(3);
  });

  const handleCreate = async () => {
    if (!step1Data || !step2Data) return;
    setIsSubmitting(true);
    setError(null);

    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: step1Data.name,
        description: step1Data.description,
        agentId: step1Data.agentId,
        contactListId: step2Data.contactListId,
        delaySeconds: step3Data.delaySeconds,
        concurrency: step3Data.concurrency,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to create campaign');
      setIsSubmitting(false);
    } else {
      router.push(`/campaigns/${data.id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
              i < step ? 'bg-[#004D3E] text-white' :
              i === step ? 'bg-[#004D3E]/20 text-[#004D3E] border-2 border-[#004D3E]' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i < step ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={`text-xs ${i === step ? 'text-[#004D3E] font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Step 1: Name & Agent */}
        {step === 0 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Name & Agent</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
              <input
                {...form1.register('name')}
                placeholder="e.g. Q1 Follow-up Campaign"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
              />
              {form1.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">{form1.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                {...form1.register('description')}
                rows={2}
                placeholder="What is this campaign about?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent *</label>
              {agentsWithPhone.length === 0 ? (
                <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                  No agents with a phone number found. Ask your admin to configure agent phone numbers.
                </p>
              ) : (
                <select
                  {...form1.register('agentId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
                >
                  <option value="">Select an agent...</option>
                  {agentsWithPhone.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.phoneNumber})
                    </option>
                  ))}
                </select>
              )}
              {form1.formState.errors.agentId && (
                <p className="mt-1 text-xs text-red-600">{form1.formState.errors.agentId.message}</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={agentsWithPhone.length === 0}>
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Contact List */}
        {step === 1 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Contact List</h2>
            {contactLists.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                No contact lists found. Create one in Contacts first.
              </p>
            ) : (
              <div className="space-y-2">
                {contactLists.map(list => (
                  <label
                    key={list.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      form2.watch('contactListId') === list.id
                        ? 'border-[#004D3E] bg-[#004D3E]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={list.id}
                      {...form2.register('contactListId')}
                      className="accent-[#004D3E]"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{list.name}</p>
                      {list.description && <p className="text-xs text-gray-500">{list.description}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{list._count.members} contacts</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {form2.formState.errors.contactListId && (
              <p className="text-xs text-red-600">{form2.formState.errors.contactListId.message}</p>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" type="button" onClick={() => setStep(0)}>
                <ChevronLeft size={14} /> Back
              </Button>
              <Button type="submit" disabled={contactLists.length === 0}>
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Settings */}
        {step === 2 && (
          <form onSubmit={handleStep3} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delay between calls (seconds)</label>
              <input
                {...form3.register('delaySeconds', { valueAsNumber: true })}
                type="number"
                min={0}
                max={300}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
              />
              <p className="text-xs text-gray-400 mt-1">Pause between consecutive calls (0-300 seconds)</p>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" type="button" onClick={() => setStep(1)}>
                <ChevronLeft size={14} /> Back
              </Button>
              <Button type="submit">
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </form>
        )}

        {/* Step 4: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Review Campaign</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Name</span>
                <span className="font-medium text-gray-900">{step1Data?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Agent</span>
                <span className="font-medium text-gray-900">{selectedAgent?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Contact List</span>
                <span className="font-medium text-gray-900">
                  {selectedList?.name} ({selectedList?._count.members} contacts)
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Delay</span>
                <span className="font-medium text-gray-900">{step3Data.delaySeconds}s between calls</span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft size={14} /> Back
              </Button>
              <Button onClick={handleCreate} isLoading={isSubmitting}>
                Create Campaign
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
