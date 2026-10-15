export type CampaignStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export type CampaignAction = 'SUBMIT_FOR_REVIEW' | 'GENERATE' | 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

export interface StateTransitionResult {
  allowed: boolean;
  nextStatus?: CampaignStatus;
  reason?: string;
}

/**
 * Validates campaign state transitions.
 * Allowed:
 *  - DRAFT / REJECTED -> IN_REVIEW (via GENERATE / SUBMIT_FOR_REVIEW)
 *  - IN_REVIEW -> APPROVED (via APPROVE)
 *  - IN_REVIEW -> REJECTED (via REJECT)
 *  - IN_REVIEW -> DRAFT (via REQUEST_CHANGES)
 */
export function transitionCampaign(current: CampaignStatus, action: CampaignAction): StateTransitionResult {
  switch (action) {
    case 'GENERATE':
    case 'SUBMIT_FOR_REVIEW':
      if (current === 'DRAFT' || current === 'REJECTED') {
        return { allowed: true, nextStatus: 'IN_REVIEW' };
      }
      return { allowed: false, reason: `Cannot submit campaign in status ${current} for review. Allowed from DRAFT or REJECTED.` };

    case 'APPROVE':
      if (current === 'IN_REVIEW') {
        return { allowed: true, nextStatus: 'APPROVED' };
      }
      return { allowed: false, reason: `Cannot approve campaign in status ${current}. Allowed only from IN_REVIEW.` };

    case 'REJECT':
      if (current === 'IN_REVIEW') {
        return { allowed: true, nextStatus: 'REJECTED' };
      }
      return { allowed: false, reason: `Cannot reject campaign in status ${current}. Allowed only from IN_REVIEW.` };

    case 'REQUEST_CHANGES':
      if (current === 'IN_REVIEW') {
        return { allowed: true, nextStatus: 'DRAFT' };
      }
      return { allowed: false, reason: `Cannot request changes when status is ${current}. Allowed only from IN_REVIEW.` };

    default:
      return { allowed: false, reason: `Unknown campaign action: ${action}` };
  }
}
