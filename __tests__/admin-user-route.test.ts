/**
 * Tests for PATCH /api/admin/users/[id]
 *
 * Focuses on: createSetupFeeInvoiceForAgent is called only for new assignments
 * with a positive setup fee.
 *
 * Mocks: @/lib/auth, @/lib/prisma, @/lib/billing-service
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({ auth: () => mockAuth() }));

const mockPrismaUserUpdate         = jest.fn();
const mockPrismaAgentFindMany      = jest.fn();
const mockPrismaUserAgentDeleteMany = jest.fn();
const mockPrismaUserAgentFindUnique = jest.fn();
const mockPrismaUserAgentUpsert    = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: (...args: unknown[]) => mockPrismaUserUpdate(...args),
    },
    agent: {
      findMany: (...args: unknown[]) => mockPrismaAgentFindMany(...args),
    },
    userAgent: {
      deleteMany: (...args: unknown[]) => mockPrismaUserAgentDeleteMany(...args),
      findUnique: (...args: unknown[]) => mockPrismaUserAgentFindUnique(...args),
      upsert:     (...args: unknown[]) => mockPrismaUserAgentUpsert(...args),
    },
  },
}));

const mockCreateSetupFeeInvoiceForAgent = jest.fn();
jest.mock('@/lib/billing-service', () => ({
  createSetupFeeInvoiceForAgent: (...args: unknown[]) => mockCreateSetupFeeInvoiceForAgent(...args),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { PATCH } from '../app/api/admin/users/[id]/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new Request('http://localhost/api/admin/users/user_1', {
    method:  'PATCH',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

function makeParams(id = 'user_1') {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: 'admin_1', role: 'ADMIN' } });
  mockPrismaAgentFindMany.mockResolvedValue([{ id: 'agent_db_1', retellAgentId: 'retell_agent_1' }]);
  mockPrismaUserAgentDeleteMany.mockResolvedValue({ count: 0 });
  mockCreateSetupFeeInvoiceForAgent.mockResolvedValue(undefined);
});

describe('PATCH /api/admin/users/[id] — createSetupFeeInvoiceForAgent', () => {

  it('calls createSetupFeeInvoiceForAgent on NEW assignment with setupFee > 0', async () => {
    // Agent is not yet assigned (findUnique returns null → isNew = true)
    mockPrismaUserAgentFindUnique.mockResolvedValue(null);
    mockPrismaUserAgentUpsert.mockResolvedValue({ id: 'ua_new_1' });

    const res = await PATCH(
      makeRequest({ agents: [{ agentId: 'retell_agent_1', setupFee: 100 }] }),
      makeParams()
    );
    expect(res.status).toBe(200);
    expect(mockCreateSetupFeeInvoiceForAgent).toHaveBeenCalledTimes(1);
    expect(mockCreateSetupFeeInvoiceForAgent).toHaveBeenCalledWith('ua_new_1');
  });

  it('does NOT call createSetupFeeInvoiceForAgent when agent was already assigned', async () => {
    // Agent already assigned (findUnique returns existing record → isNew = false)
    mockPrismaUserAgentFindUnique.mockResolvedValue({ id: 'ua_existing_1' });
    mockPrismaUserAgentUpsert.mockResolvedValue({ id: 'ua_existing_1' });

    const res = await PATCH(
      makeRequest({ agents: [{ agentId: 'retell_agent_1', setupFee: 100 }] }),
      makeParams()
    );
    expect(res.status).toBe(200);
    expect(mockCreateSetupFeeInvoiceForAgent).not.toHaveBeenCalled();
  });

  it('does NOT call createSetupFeeInvoiceForAgent when setupFee is null', async () => {
    mockPrismaUserAgentFindUnique.mockResolvedValue(null); // new assignment
    mockPrismaUserAgentUpsert.mockResolvedValue({ id: 'ua_new_2' });

    const res = await PATCH(
      makeRequest({ agents: [{ agentId: 'retell_agent_1' }] }), // no setupFee
      makeParams()
    );
    expect(res.status).toBe(200);
    expect(mockCreateSetupFeeInvoiceForAgent).not.toHaveBeenCalled();
  });

  it('does NOT call createSetupFeeInvoiceForAgent when setupFee is 0', async () => {
    mockPrismaUserAgentFindUnique.mockResolvedValue(null); // new assignment
    mockPrismaUserAgentUpsert.mockResolvedValue({ id: 'ua_new_3' });

    const res = await PATCH(
      makeRequest({ agents: [{ agentId: 'retell_agent_1', setupFee: 0 }] }),
      makeParams()
    );
    expect(res.status).toBe(200);
    expect(mockCreateSetupFeeInvoiceForAgent).not.toHaveBeenCalled();
  });

});
