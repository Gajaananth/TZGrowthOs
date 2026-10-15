import { describe, it, expect } from 'vitest';
import { transitionCampaign } from '../lib/campaignState.js';

describe('Campaign Approval State Machine (campaignState.ts)', () => {
  it('allows moving from DRAFT to IN_REVIEW on generation', () => {
    const res = transitionCampaign('DRAFT', 'GENERATE');
    expect(res.allowed).toBe(true);
    expect(res.nextStatus).toBe('IN_REVIEW');
  });

  it('allows re-generating / submitting from REJECTED to IN_REVIEW', () => {
    const res = transitionCampaign('REJECTED', 'GENERATE');
    expect(res.allowed).toBe(true);
    expect(res.nextStatus).toBe('IN_REVIEW');
  });

  it('allows approving an IN_REVIEW campaign', () => {
    const res = transitionCampaign('IN_REVIEW', 'APPROVE');
    expect(res.allowed).toBe(true);
    expect(res.nextStatus).toBe('APPROVED');
  });

  it('allows rejecting an IN_REVIEW campaign', () => {
    const res = transitionCampaign('IN_REVIEW', 'REJECT');
    expect(res.allowed).toBe(true);
    expect(res.nextStatus).toBe('REJECTED');
  });

  it('reverts to DRAFT when changes are requested on an IN_REVIEW campaign', () => {
    const res = transitionCampaign('IN_REVIEW', 'REQUEST_CHANGES');
    expect(res.allowed).toBe(true);
    expect(res.nextStatus).toBe('DRAFT');
  });

  it('prevents direct approval of a DRAFT campaign without review', () => {
    const res = transitionCampaign('DRAFT', 'APPROVE');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Allowed only from IN_REVIEW');
  });

  it('prevents invalid transitions on already APPROVED campaigns', () => {
    const res1 = transitionCampaign('APPROVED', 'REQUEST_CHANGES');
    expect(res1.allowed).toBe(false);

    const res2 = transitionCampaign('APPROVED', 'REJECT');
    expect(res2.allowed).toBe(false);

    const res3 = transitionCampaign('APPROVED', 'GENERATE');
    expect(res3.allowed).toBe(false);
  });
});
