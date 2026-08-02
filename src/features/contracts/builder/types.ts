/**
 * Hybrid Contract Builder — canvas-style editor over the same lease data the
 * backend's Puppeteer template renders. Mandatory clauses are fixed and
 * read-only (see mandatoryClauses.ts, sourced from the standard Egyptian
 * apartment lease); only the custom clauses below are user-editable, and
 * only by the landlord — see the handshake model below.
 */

/** Lifecycle of one custom clause block. `removed` clauses stay in the array
 * (never spliced) so delete can't shift sibling indices mid-render; they're
 * filtered out everywhere they'd be shown or sent. */
export type ClauseState = "draft" | "saved" | "removed";

export interface CustomClause {
  id: string;
  content: string;
  state: ClauseState;
}

/**
 * Handshake model: only the landlord may edit while `drafting`; once sent
 * for review the canvas locks (`reviewing`) and only the tenant can
 * approve (which is what actually produces the PDF) or reject back to
 * `drafting` with a note. Mirrors LeaseContractStatus on the backend.
 */
export type DraftStatus = "drafting" | "reviewing" | "generated";

/** Auto-populated header fields — server-derived, never user-editable here. */
export interface ContractHeaderData {
  ownerName: string;
  ownerNationalId: string;
  tenantName: string;
  tenantNationalId: string;
  propertyAddress: string;
  rentAmount: number;
  startDate: string;
  endDate: string;
}

export interface MandatoryClause {
  id: string;
  title: string;
  /** May reference {{rentAmount}}/{{startDate}}/{{endDate}}/{{propertyAddress}} — see mandatoryClauses.ts. */
  body: string;
}

export interface WitnessInput {
  name: string;
  nationalId: string;
}

/** What the landlord actually negotiates. Empty custom clauses are never
 * included — filtered at the point of construction, not left to the
 * backend to catch. Sent to POST .../draft, then locked via
 * POST .../send-for-review (see ContractGenerator). */
export interface DraftPayload {
  rentAmount?: number;
  startDate: string;
  endDate: string;
  customClauses: string[];
  witness1?: WitnessInput;
  witness2?: WitnessInput;
}
