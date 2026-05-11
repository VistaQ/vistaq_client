import { apiCall } from './apiClient';
import type { AgentCode } from '../types';

export async function createAgentCodes(codes: string[]): Promise<AgentCode[]> {
  const distinct = Array.from(new Set(codes.map(c => c.trim().toUpperCase()).filter(Boolean)));
  if (distinct.length === 0) throw new Error('No agent codes to submit.');

  const chunks: string[][] = [];
  for (let i = 0; i < distinct.length; i += 500) {
    chunks.push(distinct.slice(i, i + 500));
  }

  const all: AgentCode[] = [];
  for (const chunk of chunks) {
    const res = await apiCall<{ success: boolean; data: AgentCode[] }>('/agent-codes', {
      method: 'POST',
      data: { agentCodes: chunk },
    });
    all.push(...(res.data ?? []));
  }
  return all;
}
