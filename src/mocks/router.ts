import type {
  AdminRole,
  CreateAdminRequest,
  QueueItem,
  ReviewDecision,
  UpdateAdminRequest,
} from "@/src/lib/api/contracts/admin";
import { adminRoleLabels, ROLE_CAPABILITIES } from "@/src/lib/api/contracts/admin";
import type { LoginRequest, RegisterRequest } from "@/src/lib/api/contracts/auth";
import type { Capability } from "@/src/lib/api/contracts/common";
import type { CreateOfferRequest } from "@/src/lib/api/contracts/offer";
import type { CreatePartnerLeadRequest } from "@/src/lib/api/contracts/partnerLead";
import type { PaymentType } from "@/src/lib/api/contracts/payment";
import type { CreatePropertyRequest, PropertyType } from "@/src/lib/api/contracts/property";
import type { CreateReviewRequest } from "@/src/lib/api/contracts/review";
import type { AdminReplyRequest, ChatRequest, TicketStatus } from "@/src/lib/api/contracts/support";
import type { CreateTenantRequest } from "@/src/lib/api/contracts/tenantRequest";
import type { KycDocument } from "@/src/lib/api/contracts/verification";
import { legalAnswer, optimizedDescription } from "./ai";
import {
  audit,
  capabilitiesFor,
  db,
  findUserByToken,
  hasCapability,
  isVerified,
  nextId,
  notify,
  quotaFor,
  tokensFor,
  toPublicUser,
  verificationStatusFor,
  type MockLeaseContract,
  type MockOffer,
  type MockProperty,
  type MockReview,
  type MockTenantRequest,
  type MockTicket,
  type MockUser,
  type MockVerification,
} from "./db";
import { emitMockEvent } from "./events";

/**
 * Framework-agnostic mock backend mirroring the Final ERD + SRS. Given a
 * method/path/body/auth it returns a status + JSON body. Shared by the
 * standalone dev server (src/mocks/standalone) and Jest's MSW passthrough
 * (src/mocks/handlers) — one source of truth, no fetch-interception fragility.
 *
 * Mirrors the backend's real duties: role guards, progressive-verification
 * gates, quota enforcement, and — critically — **PII omission** (owner phone +
 * manual address are never serialised until the viewer's connection unlocks
 * them). See docs/analysis/rbac.md.
 */

export interface MockResponse {
  status: number;
  body: unknown;
}

const ok = (body: unknown = { ok: true }): MockResponse => ({ status: 200, body });
const err = (status: number, message: string): MockResponse => ({
  status,
  body: { statusCode: status, message },
});
const codedErr = (
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): MockResponse => ({
  status,
  body: { statusCode: status, code, message, ...extra },
});
const unauth = (): MockResponse => err(401, "غير مصرح");
const forbidden = (message = "غير مسموح") => err(403, message);

/** Progressive verification (SRS 3.1/3.4) — one gate, one message. */
const needsVerification = () =>
  codedErr(403, "VERIFICATION_REQUIRED", "وثّق هويتك أولًا لإتمام هذا الإجراء");

/** National IDs never leave the mock backend in full outside the PDF itself. */
function maskNationalId(id: string): string {
  return id.length <= 4 ? id : `${"*".repeat(id.length - 4)}${id.slice(-4)}`;
}
function maskLeaseContract(contract: MockLeaseContract) {
  return {
    ...contract,
    ownerNationalId: contract.ownerNationalId ? maskNationalId(contract.ownerNationalId) : null,
    tenantNationalId: contract.tenantNationalId ? maskNationalId(contract.tenantNationalId) : null,
    witness1NationalId: contract.witness1NationalId
      ? maskNationalId(contract.witness1NationalId)
      : null,
    witness2NationalId: contract.witness2NationalId
      ? maskNationalId(contract.witness2NationalId)
      : null,
  };
}

/** Quota exhausted → paywall (PRO-18). */
const quotaExhausted = (paymentType: PaymentType, priceEgp: number) =>
  codedErr(403, "QUOTA_EXHAUSTED", "انتهت محاولاتك المجانية", {
    trigger: "payment",
    paymentType,
    priceEgp,
  });

const PRICES: Record<PaymentType, number> = {
  PREMIUM_OWNER: 999,
  OWNER_PLUS: 499,
  BOOST_LISTING: 349,
  AI_ADDON: 199,
  DOCS_PACK: 299,
};

/* ------------------------------ projections ------------------------------ */

function coverImage(propertyId: string): string | null {
  const imgs = db.propertyImages.filter((i) => i.propertyId === propertyId);
  return (imgs.find((i) => i.isCover) ?? imgs[0])?.imageUrl ?? null;
}

function toSummary(p: MockProperty) {
  return {
    id: p.id,
    title: p.title,
    governorate: p.governorate,
    city: p.city,
    district: p.district,
    propertyType: p.propertyType,
    rentAmount: p.rentAmount,
    areaM2: p.areaM2,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    isFurnished: p.isFurnished,
    isBoosted: p.isBoosted,
    status: p.status,
    coverImage: coverImage(p.id),
    ownerVerified: isVerified(p.ownerId),
  };
}

/**
 * THE PII GATE. Contact unlocks only for a viewer who has an ACCEPTED offer or
 * a CONNECTED match on this property — or for the owner/an admin. Anyone else
 * simply never receives the fields (omission, not client-side hiding).
 */
function contactUnlocked(property: MockProperty, viewer: MockUser | null): boolean {
  if (!viewer) return false;
  if (viewer.id === property.ownerId || viewer.role === "admin") return true;
  const connected = db.matchConnections.some(
    (m) => m.propertyId === property.id && m.tenantId === viewer.id && m.status === "CONNECTED",
  );
  if (connected) return true;
  return db.offers.some(
    (o) =>
      o.propertyId === property.id &&
      o.status === "ACCEPTED" &&
      db.tenantRequests.find((r) => r.id === o.tenantRequestId)?.tenantId === viewer.id,
  );
}

function toDetail(p: MockProperty, viewer: MockUser | null) {
  const unlocked = contactUnlocked(p, viewer);
  const owner = db.users.find((u) => u.id === p.ownerId);
  return {
    ...toSummary(p),
    description: p.description,
    propertyAroundServices: p.propertyAroundServices,
    hasElevator: p.hasElevator,
    hasParking: p.hasParking,
    ownerId: p.ownerId,
    images: db.propertyImages
      .filter((i) => i.propertyId === p.id)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((i) => ({
        id: i.id,
        imageUrl: i.imageUrl,
        displayOrder: i.displayOrder,
        isCover: i.isCover,
      })),
    contactRevealed: unlocked,
    // Omitted entirely until the gate passes.
    manualAddress: unlocked ? p.manualAddress : null,
    ownerPhoneNumber: unlocked ? (owner?.phoneNumber ?? null) : null,
    ownerName: unlocked ? (owner?.fullName ?? null) : null,
    rejectionReason: p.rejectionReason,
    approvedAt: p.approvedAt,
    createdAt: p.createdAt,
  };
}

/**
 * Mock stand-in for the backend's hybrid matcher (PRO-11): hard filters +
 * semantic similarity → 0–100. Real scoring is server-side/AI; the frontend
 * treats it as authoritative and volatile (ASSUMPTIONS.md #7).
 */
function scoreRequestAgainstProperty(r: MockTenantRequest, p: MockProperty): number {
  let score = 50;
  if (p.rentAmount >= r.minBudget && p.rentAmount <= r.maxBudget) score += 18;
  else score -= 22;
  if (r.preferredLocations.includes(p.district)) score += 12;
  if (p.propertyType === r.propertyType) score += 8;
  if (p.bedrooms >= r.requiredBedrooms) score += 5;
  if (!r.needsFurnished || p.isFurnished) score += 5;
  // Free-text lifestyle overlap with the property's surroundings — the bit the
  // real system does with embeddings.
  const words = r.lifestyleRequirements.split(/\s+/).filter((w) => w.length > 3);
  const haystack = `${p.description} ${p.propertyAroundServices ?? ""}`;
  score += Math.min(10, words.filter((w) => haystack.includes(w)).length * 2);
  // Flexibility softens a mismatch.
  score += Math.round((r.flexibilityScore - 5) * 0.6);
  if (p.isBoosted) score += 2;
  return Math.max(5, Math.min(98, Math.round(score)));
}

function offerToReceived(o: MockOffer, viewerId: string) {
  const p = db.properties.find((x) => x.id === o.propertyId)!;
  const req = db.tenantRequests.find((x) => x.id === o.tenantRequestId);
  const owner = db.users.find((u) => u.id === o.ownerId);
  const accepted = o.status === "ACCEPTED" && req?.tenantId === viewerId;
  return {
    id: o.id,
    tenantRequestId: o.tenantRequestId,
    property: toSummary(p),
    pitchMessage: o.pitchMessage,
    proposedPrice: o.proposedPrice,
    status: o.status,
    matchScore: req ? scoreRequestAgainstProperty(req, p) : null,
    createdAt: o.createdAt,
    // Landlord identity stays hidden until the tenant accepts.
    ownerName: accepted ? (owner?.fullName ?? null) : null,
    ownerPhoneNumber: accepted ? (owner?.phoneNumber ?? null) : null,
  };
}

/* --- projections for the restored, non-ERD admin surfaces (B2-R) --- */

/* ------------------------- admin queue projections ------------------------ */
/* One builder per queue, shared by GET /admin/queues and the PRO-06 socket
 * push — otherwise the pushed item and the fetched item drift apart and the
 * dashboard shows two different shapes for the same thing. */

const kycQueueItem = (v: MockVerification): QueueItem => ({
  id: `q_${v.id}`,
  type: "kyc",
  subjectId: v.userId,
  title: db.users.find((u) => u.id === v.userId)?.fullName ?? "مستخدم",
  subtitle: "مستخدم جديد بحاجة لمراجعة",
  submittedAt: v.submittedAt,
});

const propertyQueueItem = (p: MockProperty): QueueItem => ({
  id: `q_${p.id}`,
  type: "property",
  subjectId: p.id,
  title: p.title,
  subtitle: `${p.district} · ${p.rentAmount} ج.م/شهريًا`,
  submittedAt: p.createdAt,
});

const editedPropertyQueueItem = (p: MockProperty): QueueItem => ({
  id: `q_prop_edit_${p.id}`,
  type: "propertyEdit",
  subjectId: p.id,
  title: p.title,
  subtitle: `${p.district} · ${p.rentAmount} ج.م/شهريًا · تعديل`,
  submittedAt: p.updatedAt,
});

const requestQueueItem = (r: MockTenantRequest): QueueItem => ({
  id: `q_${r.id}`,
  type: "request",
  subjectId: r.id,
  title: `طلب سكن في ${r.preferredLocations}`,
  subtitle: `${r.minBudget}–${r.maxBudget} ج.م`,
  submittedAt: r.createdAt,
});

const reviewQueueItem = (r: MockReview): QueueItem => ({
  id: `q_${r.id}`,
  type: "review",
  subjectId: r.id,
  title: `تقييم ${r.rating}★`,
  subtitle: r.comment.slice(0, 60),
  submittedAt: r.createdAt,
});

/** PRO-06: announce a new moderation item to connected admins. */
function announceQueueItem(item: QueueItem) {
  emitMockEvent({ kind: "adminQueueItem", payload: item });
}

/**
 * The mock has no request context, so the IP is synthetic. The real backend
 * must record the actual client IP.
 */
function recordAdminLogin(u: MockUser, success: boolean) {
  db.loginHistory.unshift({
    id: nextId("lgn"),
    adminId: u.id,
    adminName: u.fullName,
    ip: "127.0.0.1",
    at: new Date().toISOString(),
    success,
  });
}

function toTeamMember(u: MockUser) {
  const role: AdminRole = u.adminRole ?? "super-admin";
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role,
    capabilities: ROLE_CAPABILITIES[role],
    disabled: !u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}

function toTicketSummary(t: MockTicket) {
  const assignee = t.assignedAdminId ? db.users.find((u) => u.id === t.assignedAdminId) : null;
  return {
    id: t.id,
    subject: t.subject,
    userName: db.users.find((u) => u.id === t.userId)?.fullName ?? "مستخدم",
    status: t.status,
    assignedAdminName: assignee?.fullName ?? null,
    lastMessageAt: t.lastMessageAt,
    createdAt: t.createdAt,
  };
}

function toTicketDetail(t: MockTicket) {
  return {
    ...toTicketSummary(t),
    userId: t.userId,
    assignedAdminId: t.assignedAdminId,
    messages: t.messages,
  };
}

/* -------------------------------- dispatch -------------------------------- */

export function dispatch(
  method: string,
  path: string,
  query: URLSearchParams,
  authorization: string | null,
  body: unknown,
): MockResponse {
  const user = findUserByToken(authorization);
  const seg = path.replace(/^\//, "").split("/");
  const admin = user?.role === "admin" ? user : null;
  const requireAdmin = () => (admin ? null : forbidden());
  /**
   * Capability guard. Admin sub-roles are restored per conflicts.md B2-R, so
   * "is an admin" is no longer sufficient — a read-only or kyc-reviewer admin
   * must not clear the property queue. The real NestJS `@Roles()`/guards stay
   * authoritative; this mirrors them.
   */
  const requireCap = (capability: Capability) =>
    !admin
      ? forbidden()
      : hasCapability(admin, capability)
        ? null
        : codedErr(403, "CAPABILITY_REQUIRED", "لا تملك صلاحية تنفيذ هذا الإجراء", { capability });

  /* ---------------------------- auth (PRO-02) ---------------------------- */
  if (method === "POST" && path === "/auth/login") {
    const b = body as LoginRequest;
    const u = db.users.find((x) => x.email === b.email);
    // Failed admin attempts are recorded too — that's the point of the log.
    if (!u || b.password.length < 8) {
      if (u?.role === "admin") recordAdminLogin(u, false);
      return err(401, "البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }
    if (!u.isActive) {
      if (u.role === "admin") recordAdminLogin(u, false);
      return forbidden("هذا الحساب موقوف");
    }
    u.lastLoginAt = new Date().toISOString();
    if (u.role === "admin") recordAdminLogin(u, true);
    return ok(tokensFor(u));
  }
  if (method === "POST" && path === "/auth/register") {
    const b = body as RegisterRequest;
    if (db.users.some((x) => x.email === b.email))
      return err(409, "هذا البريد الإلكتروني مسجّل بالفعل");
    const u: MockUser = {
      id: nextId("usr"),
      fullName: b.fullName,
      email: b.email,
      passwordHash: "mock",
      phoneNumber: b.phoneNumber,
      role: b.role,
      isActive: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(u);
    // ERD: USER_QUOTA is landlords-only.
    if (b.role === "landlord") {
      db.quotas.push({
        id: nextId("quota"),
        userId: u.id,
        planType: "FREE",
        planExpiresAt: null,
        maxActiveListings: 1,
        freeListingsLeft: 0,
        optimizerUsesLeft: 0,
        freeOffersLeft: 3,
        documentationPackCredits: 0,
        lastResetDate: null,
      });
    }
    return ok(tokensFor(u));
  }
  if (method === "POST" && path === "/auth/refresh") {
    const b = body as { refreshToken?: string };
    const u = findUserByToken(`Bearer ${b.refreshToken ?? ""}`);
    return u ? ok(tokensFor(u)) : unauth();
  }
  if (method === "GET" && path === "/auth/me") {
    return user ? ok(toPublicUser(user)) : unauth();
  }
  if (method === "POST" && path === "/auth/forgot-password") {
    // Always ok — never reveals whether the account exists.
    return ok({ sent: true });
  }

  /* ------------------------- verification (PRO-03) ------------------------ */
  if (method === "GET" && path === "/verification/me") {
    if (!user) return unauth();
    const v = db.verifications.find((x) => x.userId === user.id);
    const status = verificationStatusFor(user.id);
    return ok({
      status,
      rejectionReason:
        status === "REJECTED" || status === "RESUBMISSION_REQUIRED"
          ? (v?.rejectionReason ?? null)
          : null,
      submittedAt: v?.submittedAt ?? null,
      reviewedAt: v?.reviewedAt ?? null,
      canSubmit: status === "NOT_SUBMITTED" || status === "RESUBMISSION_REQUIRED",
    });
  }
  if (method === "POST" && path === "/verification/upload") {
    if (!user) return unauth();
    const b = body as { document: KycDocument; simulateUnreadable?: boolean };
    if (b.simulateUnreadable) {
      return ok({
        document: b.document,
        accepted: false,
        reason: "تعذّرت قراءة المستند، ارفع صورة أوضح",
      });
    }
    return ok({ document: b.document, accepted: true, reason: null });
  }
  if (method === "POST" && path === "/verification/submit") {
    if (!user) return unauth();
    const status = verificationStatusFor(user.id);
    if (status === "APPROVED") return codedErr(409, "ALREADY_VERIFIED", "تم توثيق الهوية بالفعل.");
    if (status === "PENDING")
      return codedErr(409, "VERIFICATION_PENDING", "طلب التحقق قيد المراجعة بالفعل.");
    if (status === "REJECTED")
      return codedErr(
        409,
        "VERIFICATION_FORBIDDEN",
        "لا يمكن إعادة إرسال طلب التحقق في حالته الحالية.",
      );
    if (!(body instanceof FormData)) {
      return codedErr(
        400,
        "INVALID_VERIFICATION_SUBMISSION",
        "Required verification documents are missing.",
      );
    }
    const nationalId = body.get("nationalId");
    const nationalIdFront = body.get("nationalIdFront");
    const nationalIdBack = body.get("nationalIdBack");
    const selfie = body.get("selfie");
    const isFileEntry = (value: FormDataEntryValue | null): value is File =>
      value !== null && typeof value !== "string";
    if (!isFileEntry(nationalIdFront) || !isFileEntry(nationalIdBack) || !isFileEntry(selfie)) {
      return codedErr(
        400,
        "INVALID_VERIFICATION_SUBMISSION",
        "Required verification documents are missing.",
      );
    }
    const providedNationalId = typeof nationalId === "string" ? nationalId : undefined;
    const existing = db.verifications.find((x) => x.userId === user.id);
    if (existing) {
      // Resubmission after rejection: reuse the row, back to PENDING.
      existing.nationalId = providedNationalId ?? existing.nationalId;
      existing.status = "PENDING";
      existing.rejectionReason = null;
      existing.reviewedBy = null;
      existing.reviewedAt = null;
      existing.submittedAt = new Date().toISOString();
      announceQueueItem(kycQueueItem(existing));
    } else {
      const created: MockVerification = {
        id: nextId("ekyc"),
        userId: user.id,
        nationalId: providedNationalId ?? "",
        nationalIdFrontUrl: "https://cdn.example.com/id-front.jpg",
        nationalIdBackUrl: "https://cdn.example.com/id-back.jpg",
        selfieUrl: "https://cdn.example.com/selfie.jpg",
        status: "PENDING",
        reviewedBy: null,
        rejectionReason: null,
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
      };
      db.verifications.push(created);
      announceQueueItem(kycQueueItem(created));
    }
    const updated = db.verifications.find((x) => x.userId === user.id)!;
    return ok({
      status: "PENDING",
      rejectionReason: null,
      submittedAt: updated.submittedAt,
      reviewedAt: null,
      canSubmit: false,
    });
  }

  /* -------------------- properties: browse (PRO-11) ---------------------- */
  if (method === "GET" && path === "/properties") {
    // Hard SQL-style filters first, then a naive text match standing in for
    // the semantic layer.
    const q = query.get("q")?.trim();
    const city = query.get("city")?.trim();
    const propertyType = query.get("propertyType")?.trim();
    const minRent = Number(query.get("minRent") ?? "") || undefined;
    const maxRent = Number(query.get("maxRent") ?? "") || undefined;
    const bedrooms = Number(query.get("bedrooms") ?? "") || undefined;
    const furnished = query.get("isFurnished");

    let items = db.properties.filter((p) => p.status === "APPROVED");
    if (city) items = items.filter((p) => p.city === city);
    if (propertyType) items = items.filter((p) => p.propertyType === propertyType);
    if (minRent !== undefined) items = items.filter((p) => p.rentAmount >= minRent);
    if (maxRent !== undefined) items = items.filter((p) => p.rentAmount <= maxRent);
    if (bedrooms !== undefined) items = items.filter((p) => p.bedrooms >= bedrooms);
    if (furnished === "true") items = items.filter((p) => p.isFurnished);
    if (q) {
      items = items.filter((p) =>
        `${p.title} ${p.description} ${p.district} ${p.propertyAroundServices ?? ""}`.includes(q),
      );
    }
    items = [...items].sort((a, b) => Number(b.isBoosted) - Number(a.isBoosted));
    return ok({ items: items.map(toSummary), total: items.length, page: 1, pageSize: 50 });
  }
  if (method === "GET" && path === "/properties/search/semantic") {
    const semanticQuery = query.get("query")?.trim() ?? "";
    const limit = Number(query.get("limit") ?? "10");
    if (
      semanticQuery.length < 2 ||
      semanticQuery.length > 300 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 20
    ) {
      return err(400, "وصف البحث يجب أن يكون بين حرفين و300 حرف.");
    }
    const normalized = semanticQuery.toLowerCase();
    const items = db.properties
      .filter((property) => property.status === "APPROVED")
      .filter((property) => {
        const searchable = [property.title, property.city, property.district, property.description]
          .join(" ")
          .toLowerCase();
        return normalized.split(/\s+/).some((term) => searchable.includes(term));
      })
      .slice(0, limit)
      .map((property) => ({
        ...toSummary(property),
        semanticSimilarity: 0.72,
        matchReasons: [
          {
            code: "MATCHES_SEARCH_INTENT",
            text: "يتوافق مع تفاصيل البحث والتفضيلات المكتوبة",
          },
        ],
      }));
    return ok({
      items,
      total: items.length,
      resultCount: items.length,
      page: 1,
      pageSize: limit,
      ...(items.length === 0 ? { reason: "NO_RELEVANT_SEMANTIC_MATCH" } : {}),
    });
  }
  if (method === "GET" && seg[0] === "properties" && seg.length === 2) {
    const p = db.properties.find((x) => x.id === seg[1]);
    if (!p) return err(404, "غير موجود");
    if (p.status === "ARCHIVED" && user?.role !== "admin") return err(404, "غير موجود");
    if (p.status !== "APPROVED" && user?.id !== p.ownerId && user?.role !== "admin")
      return err(404, "غير موجود");
    return ok(toDetail(p, user));
  }
  if (method === "GET" && seg[0] === "properties" && seg[2] === "connection") {
    if (!user) return unauth();
    const p = db.properties.find((x) => x.id === seg[1]);
    if (!p) return err(404, "غير موجود");
    const conn = db.matchConnections.find((m) => m.propertyId === p.id && m.tenantId === user.id);
    const unlocked = contactUnlocked(p, user);
    const owner = db.users.find((u) => u.id === p.ownerId);
    return ok({
      status: conn?.status ?? null,
      contact:
        unlocked && owner
          ? {
              ownerName: owner.fullName,
              ownerPhoneNumber: owner.phoneNumber,
              manualAddress: p.manualAddress,
            }
          : null,
    });
  }
  if (method === "POST" && seg[0] === "properties" && seg[2] === "interest") {
    if (!user) return unauth();
    if (user.role !== "tenant") return forbidden();
    const p = db.properties.find((x) => x.id === seg[1] && x.status === "APPROVED");
    if (!p) return err(404, "غير موجود");
    let conn = db.matchConnections.find((m) => m.propertyId === p.id && m.tenantId === user.id);
    if (!conn) {
      conn = {
        id: nextId("mc"),
        tenantId: user.id,
        propertyId: p.id,
        ownerId: p.ownerId,
        matchScore: 70,
        status: "INTERESTED",
        createdAt: new Date().toISOString(),
      };
      db.matchConnections.push(conn);
    }
    return ok({ status: conn.status, contact: null });
  }

  /* ------------------ properties: reviews (SRS 3.7) ---------------------- */
  if (method === "GET" && seg[0] === "properties" && seg[2] === "reviews") {
    const approved = db.reviews.filter((r) => r.propertyId === seg[1] && r.status === "APPROVED");
    const total = approved.length;
    const averageRating = total
      ? Number((approved.reduce((s, r) => s + r.rating, 0) / total).toFixed(1))
      : null;
    return ok({
      items: approved.map((r) => ({
        id: r.id,
        propertyId: r.propertyId,
        reviewerName: db.users.find((u) => u.id === r.reviewerId)?.fullName ?? "مستأجر",
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt,
      })),
      averageRating,
      total,
      distribution: [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: approved.filter((r) => r.rating === rating).length,
      })),
    });
  }
  if (method === "POST" && path === "/reviews") {
    if (!user) return unauth();
    if (user.role !== "tenant") return forbidden();
    if (!isVerified(user.id)) return needsVerification();
    const b = body as CreateReviewRequest;
    const p = db.properties.find((x) => x.id === b.propertyId && x.status === "APPROVED");
    if (!p) return err(404, "غير موجود");
    const review = {
      id: nextId("rev"),
      reviewerId: user.id,
      propertyId: b.propertyId,
      rating: b.rating,
      comment: b.comment,
      status: "PENDING" as const,
      reviewedBy: null,
      createdAt: new Date().toISOString(),
    };
    db.reviews.push(review);
    announceQueueItem(reviewQueueItem(review));
    notify(p.ownerId, "NEW_REVIEW_SUBMITTED", "تقييم جديد", "تم إرسال تقييم جديد لعقارك للمراجعة.");
    return ok({ id: review.id, status: review.status });
  }

  /* -------------------- landlord: listings (PRO-04) ---------------------- */
  if (path === "/landlord/properties" && method === "GET") {
    if (!user) return unauth();
    if (user.role !== "landlord") return forbidden();
    const items = db.properties.filter(
      (p) => p.ownerId === user.id && p.status !== "ARCHIVED",
    );
    return ok({ items: items.map(toSummary), total: items.length, page: 1, pageSize: 50 });
  }
  if (path === "/landlord/properties" && method === "POST") {
    if (!user) return unauth();
    if (user.role !== "landlord") return forbidden();
    if (!isVerified(user.id)) return needsVerification();
    const quota = quotaFor(user.id);
    const premiumActive =
      quota?.planType === "PREMIUM" &&
      Boolean(quota.planExpiresAt && new Date(quota.planExpiresAt) > new Date());
    const activeLimit = premiumActive ? 5 : 1;
    const activeCount = db.properties.filter(
      (property) =>
        property.ownerId === user.id &&
        (property.status === "PENDING" || property.status === "APPROVED"),
    ).length;
    if (!quota || activeCount >= activeLimit) {
      return codedErr(403, "PLAN_LIMIT_REACHED", "وصلت إلى الحد الأقصى للوحدات النشطة في خطتك", {
        trigger: "payment",
        paymentType: "PREMIUM_OWNER",
        priceEgp: PRICES.PREMIUM_OWNER,
      });
    }

    const b =
      body instanceof FormData
        ? ({
            title: String(body.get("title") ?? ""),
            description: String(body.get("description") ?? ""),
            governorate: String(body.get("governorate") ?? ""),
            city: String(body.get("city") ?? ""),
            district: String(body.get("district") ?? ""),
            manualAddress: String(body.get("manualAddress") ?? ""),
            propertyType: String(body.get("propertyType") ?? "APARTMENT"),
            propertyAroundServices: String(body.get("propertyAroundServices") ?? ""),
            rentAmount: Number(body.get("rentAmount")),
            areaM2: Number(body.get("areaM2")),
            bedrooms: Number(body.get("bedrooms")),
            bathrooms: Number(body.get("bathrooms")),
            isFurnished: body.get("isFurnished") === "true",
            hasElevator: body.get("hasElevator") === "true",
            hasParking: body.get("hasParking") === "true",
            images: body
              .getAll("images")
              .map((_, index) => `/public/properties/mock-${index + 1}.jpg`),
          } as CreatePropertyRequest)
        : (body as CreatePropertyRequest);
    const property: MockProperty = {
      id: nextId("prop"),
      ownerId: user.id,
      title: b.title,
      description: b.description,
      governorate: b.governorate,
      city: b.city,
      district: b.district,
      manualAddress: b.manualAddress,
      propertyType: b.propertyType,
      propertyAroundServices: b.propertyAroundServices ?? null,
      rentAmount: b.rentAmount,
      areaM2: b.areaM2,
      bedrooms: b.bedrooms,
      bathrooms: b.bathrooms,
      isFurnished: b.isFurnished,
      hasElevator: b.hasElevator,
      hasParking: b.hasParking,
      contactRevealed: false,
      status: "PENDING", // ERD default — admin must approve (PRO-04)
      isBoosted: false,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.properties.push(property);
    b.images.forEach((imageUrl, i) =>
      db.propertyImages.push({
        id: nextId("img"),
        propertyId: property.id,
        imageUrl,
        displayOrder: i,
        isCover: i === 0,
      }),
    );
    announceQueueItem(propertyQueueItem(property));
    return ok({ property: toDetail(property, user) });
  }
  if (
    seg[0] === "landlord" &&
    seg[1] === "properties" &&
    seg.length === 3 &&
    method === "DELETE"
  ) {
    if (!user) return unauth();
    if (user.role !== "landlord") return forbidden();
    const property = db.properties.find(
      (item) => item.id === seg[2] && item.ownerId === user.id,
    );
    if (!property) return err(404, "العقار غير موجود");
    property.status = "ARCHIVED";
    property.isBoosted = false;
    property.approvedBy = null;
    property.updatedAt = new Date().toISOString();
    return ok({ ok: true, status: "ARCHIVED" });
  }
  if (
    seg[0] === "landlord" &&
    seg[1] === "properties" &&
    seg.length === 3 &&
    method === "PATCH"
  ) {
    if (!user) return unauth();
    if (user.role !== "landlord") return forbidden();
    if (!isVerified(user.id)) return needsVerification();
    const property = db.properties.find((item) => item.id === seg[2] && item.ownerId === user.id);
    if (!property) return err(404, "العقار غير موجود");
    if (property.status === "ARCHIVED") return err(403, "لا يمكن تعديل عقار مؤرشف");
    if (!(body instanceof FormData)) return err(400, "بيانات التعديل غير صالحة");

    let retainedIds: string[];
    try {
      retainedIds = JSON.parse(String(body.get("existingImageIds") ?? "[]")) as string[];
    } catch {
      return err(400, "قائمة الصور الحالية غير صالحة");
    }
    const currentImages = db.propertyImages.filter((image) => image.propertyId === property.id);
    if (
      !Array.isArray(retainedIds) ||
      retainedIds.some((id) => !currentImages.some((image) => image.id === id))
    ) {
      return err(400, "إحدى الصور لا تنتمي إلى هذا العقار");
    }
    const newImageParts = body.getAll("images");
    if (retainedIds.length + newImageParts.length < 1) return err(400, "أضف صورة واحدة على الأقل");
    if (retainedIds.length + newImageParts.length > 10) return err(400, "يمكنك إضافة 10 صور كحد أقصى");

    property.title = String(body.get("title") ?? "");
    property.description = String(body.get("description") ?? "");
    property.governorate = String(body.get("governorate") ?? "");
    property.city = String(body.get("city") ?? "");
    property.district = String(body.get("district") ?? "");
    property.manualAddress = String(body.get("manualAddress") ?? "");
    property.propertyType = String(body.get("propertyType") ?? "APARTMENT") as PropertyType;
    property.propertyAroundServices = String(body.get("propertyAroundServices") ?? "") || null;
    property.rentAmount = Number(body.get("rentAmount"));
    property.areaM2 = Number(body.get("areaM2"));
    property.bedrooms = Number(body.get("bedrooms"));
    property.bathrooms = Number(body.get("bathrooms"));
    property.isFurnished = body.get("isFurnished") === "true";
    property.hasElevator = body.get("hasElevator") === "true";
    property.hasParking = body.get("hasParking") === "true";
    property.status = "PENDING";
    property.approvedBy = null;
    property.updatedAt = new Date().toISOString();

    const retained = retainedIds.map((id) => currentImages.find((image) => image.id === id)!);
    db.propertyImages = db.propertyImages.filter(
      (image) => image.propertyId !== property.id || retainedIds.includes(image.id),
    );
    retained.forEach((image, index) => {
      image.displayOrder = index;
      image.isCover = index === 0;
    });
    newImageParts.forEach((_, index) => {
      db.propertyImages.push({
        id: nextId("img"),
        propertyId: property.id,
        imageUrl: `/public/properties/mock-edit-${index + 1}.jpg`,
        displayOrder: retained.length + index,
        isCover: retained.length === 0 && index === 0,
      });
    });
    announceQueueItem(
      property.approvedAt ? editedPropertyQueueItem(property) : propertyQueueItem(property),
    );
    return ok({ property: toDetail(property, user) });
  }
  if (
    seg[0] === "landlord" &&
    seg[1] === "properties" &&
    seg[3] === "optimize-description" &&
    method === "POST"
  ) {
    if (!user) return unauth();
    if (user.role !== "landlord") return forbidden();
    const quota = quotaFor(user.id);
    if (!quota || quota.optimizerUsesLeft <= 0) return quotaExhausted("AI_ADDON", PRICES.AI_ADDON);
    const b = body as { description: string };
    if (b.description.length > 2000) return err(400, "الوصف أطول من المسموح");
    quota.optimizerUsesLeft -= 1;
    return ok({
      optimized: optimizedDescription(b.description),
      optimizerUsesLeft: quota.optimizerUsesLeft,
    });
  }
  if (seg[0] === "landlord" && seg[1] === "properties" && seg[3] === "boost" && method === "POST") {
    if (!user) return unauth();
    const p = db.properties.find((x) => x.id === seg[2] && x.ownerId === user.id);
    if (!p) return err(404, "غير موجود");
    return quotaExhausted("BOOST_LISTING", PRICES.BOOST_LISTING);
  }
  if (
    seg[0] === "landlord" &&
    seg[1] === "properties" &&
    seg[3] === "archive" &&
    method === "POST"
  ) {
    if (!user) return unauth();
    const p = db.properties.find((x) => x.id === seg[2] && x.ownerId === user.id);
    if (!p) return err(404, "غير موجود");
    p.status = "ARCHIVED"; // ERD: soft-archive, never delete (ASSUMPTIONS #16)
    return ok();
  }

  /* ------------- reverse marketplace: tenant requests (PRO-05) ----------- */
  if (path === "/tenant/requests" && method === "GET") {
    if (!user) return unauth();
    const items = db.tenantRequests
      .filter((r) => r.tenantId === user.id)
      .map((r) => ({
        ...r,
        offersCount: db.offers.filter((o) => o.tenantRequestId === r.id).length,
      }));
    return ok({ items });
  }
  if (path === "/tenant/requests" && method === "POST") {
    if (!user) return unauth();
    if (user.role !== "tenant") return forbidden();
    if (!isVerified(user.id)) return needsVerification();
    const b = body as CreateTenantRequest;
    const request: MockTenantRequest = {
      id: nextId("req"),
      tenantId: user.id,
      ...b,
      status: "PENDING", // admin approval required (anti-spam, SRS 3.2.2)
      approvedBy: null,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.tenantRequests.push(request);
    announceQueueItem(requestQueueItem(request));
    return ok({ ...request, offersCount: 0 });
  }
  if (seg[0] === "tenant" && seg[1] === "requests" && seg[3] === "close" && method === "POST") {
    if (!user) return unauth();
    const r = db.tenantRequests.find((x) => x.id === seg[2] && x.tenantId === user.id);
    if (!r) return err(404, "غير موجود");
    r.status = "CLOSED";
    return ok();
  }

  /* ---------- reverse marketplace: landlord browses requests (PRO-13) ---- */
  if (path === "/landlord/requests" && method === "GET") {
    if (!user) return unauth();
    if (user.role !== "landlord") return forbidden();
    if (!isVerified(user.id)) return needsVerification();
    const myProps = db.properties.filter((p) => p.ownerId === user.id && p.status === "APPROVED");
    const items = db.tenantRequests
      .filter((r) => r.status === "APPROVED")
      .map((r) => {
        const scoredProps = myProps.map((p) => ({
          property: p,
          score: scoreRequestAgainstProperty(r, p),
        }));
        const best = scoredProps.length
          ? scoredProps.reduce(
              (best, curr) => (curr.score > best.score ? curr : best),
              scoredProps[0],
            )
          : null;

        return {
          id: r.id,
          minBudget: r.minBudget,
          maxBudget: r.maxBudget,
          preferredLocations: r.preferredLocations,
          propertyType: r.propertyType,
          requiredBedrooms: r.requiredBedrooms,
          needsFurnished: r.needsFurnished,
          flexibilityScore: r.flexibilityScore,
          lifestyleRequirements: r.lifestyleRequirements,
          createdAt: r.createdAt,
          matchScore: best ? best.score : null,
          alreadyOffered: db.offers.some(
            (o) => o.tenantRequestId === r.id && o.ownerId === user.id,
          ),
          bestMatchingProperty: best ? { id: best.property.id, title: best.property.title } : null,
        };
      })
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    return ok({ items });
  }

  /* ------------------ reverse marketplace: offers (PRO-12) --------------- */
  if (path === "/landlord/offers" && method === "GET") {
    if (!user) return unauth();
    const items = db.offers
      .filter((o) => o.ownerId === user.id)
      .map((o) => ({
        id: o.id,
        tenantRequestId: o.tenantRequestId,
        property: toSummary(db.properties.find((p) => p.id === o.propertyId)!),
        pitchMessage: o.pitchMessage,
        proposedPrice: o.proposedPrice,
        status: o.status,
        createdAt: o.createdAt,
      }));
    return ok({ items });
  }
  if (path === "/landlord/offers" && method === "POST") {
    if (!user) return unauth();
    if (user.role !== "landlord") return forbidden();
    if (!isVerified(user.id)) return needsVerification();
    const quota = quotaFor(user.id);
    const premiumActive =
      quota?.planType === "PREMIUM" &&
      Boolean(quota.planExpiresAt && new Date(quota.planExpiresAt) > new Date());
    if (!premiumActive && (!quota || quota.freeOffersLeft <= 0)) {
      return quotaExhausted("PREMIUM_OWNER", PRICES.PREMIUM_OWNER);
    }

    const b = body as CreateOfferRequest;
    const request = db.tenantRequests.find(
      (r) => r.id === b.tenantRequestId && r.status === "APPROVED",
    );
    if (!request) return err(404, "الطلب غير متاح");
    const property = db.properties.find((p) => p.id === b.propertyId && p.ownerId === user.id);
    if (!property) return err(404, "العقار غير موجود");
    if (property.status !== "APPROVED") return forbidden("لا يمكن تقديم عرض بعقار غير معتمد");
    if (db.offers.some((o) => o.tenantRequestId === b.tenantRequestId && o.ownerId === user.id))
      return err(409, "قدّمت عرضًا على هذا الطلب بالفعل");

    const offer: MockOffer = {
      id: nextId("off"),
      ownerId: user.id,
      tenantRequestId: b.tenantRequestId,
      propertyId: b.propertyId,
      pitchMessage: b.pitchMessage,
      proposedPrice: b.proposedPrice,
      status: "SENT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.offers.push(offer);
    if (!premiumActive) quota.freeOffersLeft -= 1;
    notify(
      request.tenantId,
      "NEW_OFFER_RECEIVED",
      "عرض جديد على طلبك",
      "وصلك عرض جديد من أحد الملّاك — اطّلع عليه الآن.",
      "/tenant/offers",
    );
    return ok({ id: offer.id, status: offer.status, freeOffersLeft: quota.freeOffersLeft });
  }

  /* ----------------- reverse marketplace: tenant inbox ------------------- */
  if (path === "/tenant/offers" && method === "GET") {
    if (!user) return unauth();
    const myRequestIds = db.tenantRequests.filter((r) => r.tenantId === user.id).map((r) => r.id);
    const items = db.offers
      .filter((o) => myRequestIds.includes(o.tenantRequestId))
      .map((o) => offerToReceived(o, user.id))
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    return ok({ items });
  }
  if (seg[0] === "tenant" && seg[1] === "offers" && seg[3] === "view" && method === "POST") {
    if (!user) return unauth();
    const o = db.offers.find((x) => x.id === seg[2]);
    if (!o) return err(404, "غير موجود");
    // VIEWED means the tenant actually opened it (ASSUMPTIONS #13).
    if (o.status === "SENT") o.status = "VIEWED";
    return ok(offerToReceived(o, user.id));
  }
  if (seg[0] === "tenant" && seg[1] === "offers" && seg[3] === "accept" && method === "POST") {
    if (!user) return unauth();
    if (!isVerified(user.id)) return needsVerification();
    const o = db.offers.find((x) => x.id === seg[2]);
    if (!o) return err(404, "غير موجود");
    const request = db.tenantRequests.find((r) => r.id === o.tenantRequestId);
    if (!request || request.tenantId !== user.id) return forbidden();
    if (o.status === "REJECTED") return err(409, "هذا العرض مرفوض");
    const property = db.properties.find((p) => p.id === o.propertyId);
    if (!property || property.status !== "APPROVED") return forbidden("العقار لم يعد متاحًا");

    o.status = "ACCEPTED";
    // Accepting fulfils the request; siblings stay SENT but non-acceptable.
    request.status = "FULFILLED";
    property.contactRevealed = true;

    const connection = {
      id: nextId("mc"),
      tenantId: user.id,
      propertyId: property.id,
      ownerId: o.ownerId,
      matchScore: scoreRequestAgainstProperty(request, property),
      status: "CONNECTED" as const,
      createdAt: new Date().toISOString(),
    };
    db.matchConnections.push(connection);

    const owner = db.users.find((u) => u.id === o.ownerId)!;
    notify(
      owner.id,
      "NEW_MATCH",
      "تم قبول عرضك",
      "قبل المستأجر عرضك — بيانات التواصل متاحة الآن.",
      "/landlord/offers",
    );
    return ok({
      offerId: o.id,
      status: o.status,
      ownerName: owner.fullName,
      ownerPhoneNumber: owner.phoneNumber,
      manualAddress: property.manualAddress,
      matchConnectionId: connection.id,
    });
  }
  if (seg[0] === "tenant" && seg[1] === "offers" && seg[3] === "reject" && method === "POST") {
    if (!user) return unauth();
    const o = db.offers.find((x) => x.id === seg[2]);
    if (!o) return err(404, "غير موجود");
    o.status = "REJECTED";
    return ok();
  }

  /* ---------------------------- favorites -------------------------------- */
  if (path === "/tenant/favorites" && method === "GET") {
    if (!user) return unauth();
    const items = db.favorites
      .filter((f) => f.tenantId === user.id)
      .map((f) => db.properties.find((p) => p.id === f.propertyId))
      .filter((p): p is MockProperty => Boolean(p))
      .map(toSummary);
    return ok({ items });
  }
  if (path === "/tenant/favorites" && method === "POST") {
    if (!user) return unauth();
    const b = body as { propertyId: string };
    const existing = db.favorites.find(
      (f) => f.tenantId === user.id && f.propertyId === b.propertyId,
    );
    if (existing) return ok({ favorited: true });
    db.favorites.push({
      id: nextId("fav"),
      tenantId: user.id,
      propertyId: b.propertyId,
      createdAt: new Date().toISOString(),
    });
    return ok({ favorited: true });
  }
  if (seg[0] === "tenant" && seg[1] === "favorites" && seg.length === 3 && method === "DELETE") {
    if (!user) return unauth();
    db.favorites = db.favorites.filter((f) => !(f.tenantId === user.id && f.propertyId === seg[2]));
    return ok({ favorited: false });
  }

  /* ------------------------ payments & quota (PRO-14/18) ----------------- */
  if (path === "/quota" && method === "GET") {
    if (!user) return unauth();
    const q = quotaFor(user.id);
    // Tenants have no quota row — the UI must tolerate null.
    return ok(
      q
        ? {
            freeListingsLeft: q.freeListingsLeft,
            optimizerUsesLeft: q.optimizerUsesLeft,
            freeOffersLeft: q.freeOffersLeft,
            planType:
              q.planType === "PREMIUM" && q.planExpiresAt && new Date(q.planExpiresAt) > new Date()
                ? "PREMIUM"
                : "FREE",
            planExpiresAt: q.planExpiresAt,
            maxActiveListings: q.planType === "PREMIUM" ? 5 : 1,
            activeUnitCount: db.properties.filter(
              (property) =>
                property.ownerId === user.id &&
                (property.status === "PENDING" || property.status === "APPROVED"),
            ).length,
            offersUnlimited:
              q.planType === "PREMIUM" &&
              Boolean(q.planExpiresAt && new Date(q.planExpiresAt) > new Date()),
            documentationPackCredits: q.documentationPackCredits,
            lastResetDate: q.lastResetDate,
          }
        : null,
    );
  }

  /* --------------------------- contracts (PRO-15) ------------------------ */
  /* Generation is tied to a CONNECTED match — only its two real parties may
   * generate/view it. Names, national IDs, and the address are derived from
   * the match/property/verification records, never accepted from the client
   * (mirrors the real backend's lease-contracts module). */
  if (seg[0] === "matches" && seg[2] === "contract" && seg[3] === "prefill" && method === "GET") {
    if (!user) return unauth();
    const match = db.matchConnections.find(
      (m) =>
        m.id === seg[1] &&
        m.status === "CONNECTED" &&
        (m.tenantId === user.id || m.ownerId === user.id),
    );
    if (!match) return err(404, "غير موجود");
    const owner = db.users.find((u) => u.id === match.ownerId)!;
    const tenant = db.users.find((u) => u.id === match.tenantId)!;
    const property = db.properties.find((p) => p.id === match.propertyId)!;
    const ownerV = db.verifications.find((v) => v.userId === owner.id);
    const tenantV = db.verifications.find((v) => v.userId === tenant.id);
    return ok({
      ownerName: owner.fullName,
      ownerNationalId: ownerV?.nationalId ? maskNationalId(ownerV.nationalId) : null,
      tenantName: tenant.fullName,
      tenantNationalId: tenantV?.nationalId ? maskNationalId(tenantV.nationalId) : null,
      propertyAddress: `${property.district}، ${property.manualAddress}`,
      suggestedRentAmount: property.rentAmount,
    });
  }
  if (seg[0] === "matches" && seg[2] === "contract" && seg.length === 3 && method === "GET") {
    if (!user) return unauth();
    const match = db.matchConnections.find(
      (m) =>
        m.id === seg[1] &&
        m.status === "CONNECTED" &&
        (m.tenantId === user.id || m.ownerId === user.id),
    );
    if (!match) return err(404, "غير موجود");
    const existing = db.leaseContracts.find((c) => c.matchConnectionId === match.id);
    if (!existing) return err(404, "غير موجود");
    return ok(maskLeaseContract(existing));
  }
  /* Handshake model — landlord drafts (repeatable while "drafting") ->
   * sends for review (locks it) -> tenant approves (only path that
   * produces a pdfUrl, generatedByUserId becomes the tenant) or rejects
   * back to "drafting" with a note (mirrors the real backend). */
  if (seg[0] === "matches" && seg[2] === "contract" && seg[3] === "draft" && method === "POST") {
    if (!user) return unauth();
    const match = db.matchConnections.find(
      (m) => m.id === seg[1] && m.status === "CONNECTED" && m.ownerId === user.id,
    );
    if (!match) return err(404, "غير موجود");
    const existing = db.leaseContracts.find((c) => c.matchConnectionId === match.id);
    if (existing && existing.status !== "drafting") {
      return codedErr(409, "DRAFT_LOCKED", "العقد بانتظار مراجعة المستأجر، لا يمكن تعديله الآن");
    }
    const owner = db.users.find((u) => u.id === match.ownerId)!;
    const tenant = db.users.find((u) => u.id === match.tenantId)!;
    const property = db.properties.find((p) => p.id === match.propertyId)!;
    const b = body as {
      rentAmount?: number;
      startDate: string;
      endDate: string;
      customClauses?: string[];
      witness1Name?: string;
      witness1NationalId?: string;
      witness2Name?: string;
      witness2NationalId?: string;
    };
    // Belt-and-suspenders: never trust the client alone to have filtered
    // empty clauses before sending.
    const customClauses = (b.customClauses ?? []).map((c) => c.trim()).filter((c) => c.length > 0);
    const contract: MockLeaseContract = {
      id: existing?.id ?? nextId("lease"),
      matchConnectionId: match.id,
      status: "drafting",
      changeRequestNote: existing?.changeRequestNote ?? null,
      generatedByUserId: user.id,
      ownerName: owner.fullName,
      ownerNationalId: existing?.ownerNationalId ?? null,
      tenantName: tenant.fullName,
      tenantNationalId: existing?.tenantNationalId ?? null,
      propertyAddress: `${property.district}، ${property.manualAddress}`,
      rentAmount: b.rentAmount ?? property.rentAmount,
      startDate: b.startDate,
      endDate: b.endDate,
      customClauses,
      witness1Name: b.witness1Name ?? null,
      witness1NationalId: b.witness1NationalId ?? null,
      witness2Name: b.witness2Name ?? null,
      witness2NationalId: b.witness2NationalId ?? null,
      pdfUrl: null,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    const existingIndex = db.leaseContracts.findIndex((c) => c.matchConnectionId === match.id);
    if (existingIndex >= 0) db.leaseContracts[existingIndex] = contract;
    else db.leaseContracts.push(contract);
    return ok(maskLeaseContract(contract));
  }
  if (
    seg[0] === "matches" &&
    seg[2] === "contract" &&
    seg[3] === "send-for-review" &&
    method === "POST"
  ) {
    if (!user) return unauth();
    const match = db.matchConnections.find(
      (m) => m.id === seg[1] && m.status === "CONNECTED" && m.ownerId === user.id,
    );
    if (!match) return err(404, "غير موجود");
    const contract = db.leaseContracts.find((c) => c.matchConnectionId === match.id);
    if (!contract) return err(404, "غير موجود");
    if (contract.status !== "drafting") {
      return codedErr(409, "NOT_IN_DRAFTING_STATE", "العقد ليس في مرحلة المسودة");
    }
    contract.status = "reviewing";
    contract.changeRequestNote = null;
    return ok(maskLeaseContract(contract));
  }
  if (seg[0] === "matches" && seg[2] === "contract" && seg[3] === "approve" && method === "POST") {
    if (!user) return unauth();
    const match = db.matchConnections.find(
      (m) => m.id === seg[1] && m.status === "CONNECTED" && m.tenantId === user.id,
    );
    if (!match) return err(404, "غير موجود");
    const contract = db.leaseContracts.find((c) => c.matchConnectionId === match.id);
    if (!contract) return err(404, "غير موجود");
    if (contract.status !== "reviewing") {
      return codedErr(409, "NOT_PENDING_TENANT_APPROVAL", "العقد ليس بانتظار موافقة المستأجر");
    }
    const owner = db.users.find((u) => u.id === match.ownerId)!;
    const tenant = db.users.find((u) => u.id === match.tenantId)!;
    const ownerV = db.verifications.find((v) => v.userId === owner.id);
    const tenantV = db.verifications.find((v) => v.userId === tenant.id);
    if (!ownerV?.nationalId || !tenantV?.nationalId) {
      return codedErr(
        409,
        "IDENTITY_NOT_VERIFIED",
        "لا يمكن الموافقة قبل اكتمال توثيق الهوية لطرفي الصفقة",
      );
    }
    contract.ownerNationalId = ownerV.nationalId;
    contract.tenantNationalId = tenantV.nationalId;
    contract.generatedByUserId = user.id;
    contract.pdfUrl = `https://cdn.example.com/contracts/${nextId("pdf")}.pdf`;
    contract.status = "generated";
    return ok(maskLeaseContract(contract));
  }
  if (seg[0] === "matches" && seg[2] === "contract" && seg[3] === "reject" && method === "POST") {
    if (!user) return unauth();
    const match = db.matchConnections.find(
      (m) => m.id === seg[1] && m.status === "CONNECTED" && m.tenantId === user.id,
    );
    if (!match) return err(404, "غير موجود");
    const contract = db.leaseContracts.find((c) => c.matchConnectionId === match.id);
    if (!contract) return err(404, "غير موجود");
    if (contract.status !== "reviewing") {
      return codedErr(409, "NOT_PENDING_TENANT_APPROVAL", "العقد ليس بانتظار موافقة المستأجر");
    }
    const b = body as { note?: string };
    contract.status = "drafting";
    contract.changeRequestNote = b.note?.trim() || null;
    return ok(maskLeaseContract(contract));
  }
  /* Canonical, ID-addressed retrieval — mirrors GET /contracts/:id on the
   * real backend. Never derives "the" contract from just (owner, tenant);
   * always this exact row. */
  if (seg[0] === "contracts" && seg.length === 2 && method === "GET") {
    if (!user) return unauth();
    const contract = db.leaseContracts.find((c) => c.id === seg[1]);
    if (!contract) return err(404, "غير موجود");
    const match = db.matchConnections.find((m) => m.id === contract.matchConnectionId);
    if (!match || (match.tenantId !== user.id && match.ownerId !== user.id)) {
      return err(403, "غير مسموح");
    }
    return ok(maskLeaseContract(contract));
  }

  /* ------------------------- partner leads (PRO-16) ---------------------- */
  if (path === "/partner-leads" && method === "POST") {
    if (!user) return unauth();
    const b = body as CreatePartnerLeadRequest;
    if (user.role === "admin") return forbidden();
    if (b.consent !== true || !["MOVING", "INSURANCE"].includes(b.serviceType))
      return err(400, "PARTNER_LEAD_CONSENT_REQUIRED");
    if (
      db.partnerLeads.some(
        (lead) =>
          lead.userId === user.id &&
          lead.serviceType === b.serviceType &&
          lead.status === "PENDING",
      )
    ) {
      return codedErr(409, "PARTNER_LEAD_ALREADY_PENDING", "PARTNER_LEAD_ALREADY_PENDING");
    }
    const now = new Date().toISOString();
    const created = {
      id: nextId("lead"),
      userId: user.id,
      serviceType: b.serviceType,
      status: "PENDING" as const,
      consentedAt: now,
      createdAt: now,
    };
    db.partnerLeads.push(created);
    return ok(created);
    /* Legacy batch partner-routing mock intentionally disabled.
    const created = b.serviceTypes.map((serviceType) => {
      const lead = {
        id: nextId("lead"),
        tenantId: user.id,
        serviceType,
        partnerName: serviceType === "MOVING" ? "نقل المنصورة" : "تأمين دلتا",
        status: "PENDING" as const,
        createdAt: new Date().toISOString(),
      };
      db.partnerLeads.push(lead);
      return lead;
    });
    return ok({ items: created });
    */
  }

  /* --------------------------- notifications ----------------------------- */
  if (path === "/notifications" && method === "GET") {
    if (!user) return unauth();
    const items = db.notifications.filter((n) => n.userId === user.id).slice(0, 20);
    return ok({ items, unread: items.filter((n) => !n.isRead).length });
  }
  if (seg[0] === "notifications" && seg[2] === "read" && method === "POST") {
    if (!user) return unauth();
    const n = db.notifications.find((x) => x.id === seg[1] && x.userId === user.id);
    if (n) n.isRead = true;
    return ok();
  }
  if (path === "/notifications/read-all" && method === "POST") {
    if (!user) return unauth();
    db.notifications.filter((n) => n.userId === user.id).forEach((n) => (n.isRead = true));
    return ok();
  }

  /* --------------------------- admin (PRO-07/08) ------------------------- */
  if (path === "/admin/session" && method === "GET") {
    const denied = requireAdmin();
    if (denied) return denied;
    const role = admin!.adminRole ?? "super-admin";
    return ok({
      id: admin!.id,
      fullName: admin!.fullName,
      role,
      roleName: adminRoleLabels[role],
      capabilities: capabilitiesFor(admin!),
    });
  }
  if (path === "/admin/queues" && method === "GET") {
    const denied = requireAdmin();
    if (denied) return denied;
    const kycQueue = db.verifications.filter((v) => v.status === "PENDING").map(kycQueueItem);
    const propertyQueue = db.properties
      .filter((p) => p.status === "PENDING" && p.approvedAt === null)
      .map(propertyQueueItem);
    const editedPropertyQueue = db.properties
      .filter((p) => p.status === "PENDING" && p.approvedAt !== null)
      .map(editedPropertyQueueItem);
    const requestQueue = db.tenantRequests
      .filter((r) => r.status === "PENDING")
      .map(requestQueueItem);
    const reviewQueue = db.reviews.filter((r) => r.status === "PENDING").map(reviewQueueItem);
    return ok({ kycQueue, propertyQueue, editedPropertyQueue, requestQueue, reviewQueue });
  }
  if (seg[0] === "admin" && seg[1] === "kyc" && seg.length === 3 && method === "GET") {
    const denied = requireCap("kyc:review");
    if (denied) return denied;
    const v = db.verifications.find((x) => x.userId === seg[2]);
    if (!v) return err(404, "غير موجود");
    return ok({
      userId: v.userId,
      userName: db.users.find((u) => u.id === v.userId)?.fullName ?? "مستخدم",
      nationalId: v.nationalId,
      nationalIdFrontUrl: v.nationalIdFrontUrl,
      nationalIdBackUrl: v.nationalIdBackUrl,
      selfieUrl: v.selfieUrl,
      submittedAt: v.submittedAt,
    });
  }
  if (seg[0] === "admin" && seg[1] === "kyc" && seg[3] === "review" && method === "POST") {
    const denied = requireCap("kyc:review");
    if (denied) return denied;
    const v = db.verifications.find((x) => x.userId === seg[2]);
    // Compare-and-swap on PENDING (requirements.md §2).
    if (!v || v.status !== "PENDING") return err(409, "تمت مراجعة هذا الطلب بالفعل");
    const b = body as ReviewDecision;
    if (b.decision === "reject" && !b.reason?.trim()) return err(400, "سبب الرفض مطلوب");
    v.status = b.decision === "approve" ? "APPROVED" : "REJECTED";
    v.rejectionReason = b.decision === "reject" ? b.reason!.trim() : null;
    v.reviewedBy = admin!.id;
    v.reviewedAt = new Date().toISOString();
    audit(admin!, `kyc:${b.decision} ${v.userId}`, v.userId);
    if (b.decision === "approve")
      notify(v.userId, "EKYC_APPROVED", "تم توثيق هويتك", "يمكنك الآن استخدام كل المزايا.");
    return ok();
  }
  if (seg[0] === "admin" && seg[1] === "properties" && seg[3] === "review" && method === "POST") {
    const denied = requireCap(
      (body as ReviewDecision)?.decision === "reject" ? "property:reject" : "property:approve",
    );
    if (denied) return denied;
    const p = db.properties.find((x) => x.id === seg[2]);
    if (!p || p.status !== "PENDING") return err(409, "تمت مراجعة هذا الطلب بالفعل");
    const b = body as ReviewDecision;
    if (b.decision === "reject" && !b.reason?.trim()) return err(400, "سبب الرفض مطلوب");
    p.status = b.decision === "approve" ? "APPROVED" : "REJECTED";
    p.rejectionReason = b.decision === "reject" ? b.reason!.trim() : null;
    p.approvedBy = admin!.id;
    p.approvedAt = new Date().toISOString();
    audit(admin!, `property:${b.decision} ${p.id}`, p.id);
    // On approval the backend also embeds the text into ChromaDB (PRO-09).
    if (b.decision === "approve")
      notify(
        p.ownerId,
        "PROPERTY_APPROVED",
        "تمت الموافقة على إعلانك",
        "أصبح إعلانك ظاهرًا للمستأجرين الآن.",
        `/landlord/properties/${p.id}`,
      );
    return ok({ status: p.status });
  }
  if (seg[0] === "admin" && seg[1] === "requests" && seg.length === 3 && method === "GET") {
    const denied = requireCap("request:approve");
    if (denied) return denied;
    const r = db.tenantRequests.find((x) => x.id === seg[2]);
    if (!r) return err(404, "غير موجود");
    const tenant = db.users.find((u) => u.id === r.tenantId);
    return ok({
      id: r.id,
      // Admins see the tenant here on purpose — see contracts/admin.ts.
      tenantName: tenant?.fullName ?? "مستأجر",
      tenantVerificationStatus: isVerified(r.tenantId) ? "APPROVED" : "NOT_SUBMITTED",
      minBudget: r.minBudget,
      maxBudget: r.maxBudget,
      preferredLocations: r.preferredLocations,
      propertyType: r.propertyType,
      requiredBedrooms: r.requiredBedrooms,
      needsFurnished: r.needsFurnished,
      flexibilityScore: r.flexibilityScore,
      lifestyleRequirements: r.lifestyleRequirements,
      status: r.status,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt,
    });
  }
  if (seg[0] === "admin" && seg[1] === "reviews" && seg.length === 3 && method === "GET") {
    const denied = requireCap("review:moderate");
    if (denied) return denied;
    const r = db.reviews.find((x) => x.id === seg[2]);
    if (!r) return err(404, "غير موجود");
    return ok({
      id: r.id,
      reviewerName: db.users.find((u) => u.id === r.reviewerId)?.fullName ?? "مستأجر",
      propertyId: r.propertyId,
      propertyTitle: db.properties.find((p) => p.id === r.propertyId)?.title ?? "عقار",
      rating: r.rating,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt,
    });
  }
  if (seg[0] === "admin" && seg[1] === "requests" && seg[3] === "review" && method === "POST") {
    const denied = requireCap(
      (body as ReviewDecision)?.decision === "reject" ? "request:reject" : "request:approve",
    );
    if (denied) return denied;
    const r = db.tenantRequests.find((x) => x.id === seg[2]);
    if (!r || r.status !== "PENDING") return err(409, "تمت مراجعة هذا الطلب بالفعل");
    const b = body as ReviewDecision;
    if (b.decision === "reject" && !b.reason?.trim()) return err(400, "سبب الرفض مطلوب");
    r.status = b.decision === "approve" ? "APPROVED" : "REJECTED";
    r.rejectionReason = b.decision === "reject" ? b.reason!.trim() : null;
    r.approvedBy = admin!.id;
    audit(admin!, `request:${b.decision} ${r.id}`, r.id);
    if (b.decision === "approve") {
      // Published to verified landlords (SRS 3.2.2).
      db.users
        .filter((u) => u.role === "landlord" && isVerified(u.id))
        .forEach((u) =>
          notify(
            u.id,
            "NEW_TENANT_REQUEST",
            "طلب سكن جديد",
            "طلب جديد قد يطابق أحد عقاراتك.",
            "/landlord/requests",
          ),
        );
    }
    return ok({ status: r.status });
  }
  if (seg[0] === "admin" && seg[1] === "reviews" && seg[3] === "review" && method === "POST") {
    const denied = requireCap("review:moderate");
    if (denied) return denied;
    const r = db.reviews.find((x) => x.id === seg[2]);
    if (!r || r.status !== "PENDING") return err(409, "تمت مراجعة هذا الطلب بالفعل");
    const b = body as ReviewDecision;
    if (b.decision === "reject" && !b.reason?.trim()) return err(400, "سبب الرفض مطلوب");
    r.status = b.decision === "approve" ? "APPROVED" : "REJECTED";
    r.reviewedBy = admin!.id;
    audit(admin!, `review:${b.decision} ${r.id}`, r.id);
    if (b.decision === "approve")
      notify(
        r.reviewerId,
        "REVIEW_APPROVED",
        "تم نشر تقييمك",
        "أصبح تقييمك ظاهرًا على صفحة العقار.",
      );
    return ok({ status: r.status });
  }
  if (path === "/admin/stats" && method === "GET") {
    const denied = requireCap("payment:view");
    if (denied) return denied;
    const monthly = [
      { month: "فبراير", revenue: 4100, transactions: 31 },
      { month: "مارس", revenue: 3800, transactions: 28 },
      { month: "أبريل", revenue: 5200, transactions: 39 },
      { month: "مايو", revenue: 6100, transactions: 44 },
      { month: "يونيو", revenue: 5400, transactions: 41 },
      { month: "يوليو", revenue: 3200, transactions: 22 },
    ];
    const pendingModeration =
      db.properties.filter((p) => p.status === "PENDING").length +
      db.verifications.filter((v) => v.status === "PENDING").length +
      db.tenantRequests.filter((r) => r.status === "PENDING").length +
      db.reviews.filter((r) => r.status === "PENDING").length;
    return ok({
      summary: {
        totalRevenue: monthly.reduce((s, m) => s + m.revenue, 0),
        totalTransactions: monthly.reduce((s, m) => s + m.transactions, 0),
        activeListings: db.properties.filter((p) => p.status === "APPROVED").length,
        pendingModeration,
      },
      monthlyRevenue: monthly,
      moderationDistribution: [
        {
          label: "تمت الموافقة",
          value: db.properties.filter((p) => p.status === "APPROVED").length,
        },
        {
          label: "قيد المراجعة",
          value: db.properties.filter((p) => p.status === "PENDING").length,
        },
        { label: "مرفوض", value: db.properties.filter((p) => p.status === "REJECTED").length },
      ],
    });
  }

  /* ------------- admin team / RBAC (restored — conflicts.md B2-R) --------- */

  if (path === "/admin/team" && method === "GET") {
    const denied = requireCap("admin:manage");
    if (denied) return denied;
    return ok({ items: db.users.filter((u) => u.role === "admin").map(toTeamMember) });
  }
  if (path === "/admin/team" && method === "POST") {
    const denied = requireCap("admin:create");
    if (denied) return denied;
    const b = body as CreateAdminRequest;
    if (db.users.some((u) => u.email === b.email))
      return err(409, "هذا البريد الإلكتروني مسجّل بالفعل");
    const created: MockUser = {
      id: nextId("usr"),
      fullName: b.fullName,
      email: b.email,
      passwordHash: "mock",
      phoneNumber: "01000000000",
      role: "admin",
      adminRole: b.role,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(created);
    audit(admin!, `admin:create ${created.id} (${b.role})`, created.id);
    return ok(toTeamMember(created));
  }
  if (seg[0] === "admin" && seg[1] === "team" && seg.length === 3 && method === "PATCH") {
    const denied = requireCap("admin:manage");
    if (denied) return denied;
    const target = db.users.find((u) => u.id === seg[2] && u.role === "admin");
    if (!target) return err(404, "غير موجود");
    // Guard against an admin dropping their own privileges and locking the
    // team out — the real backend must enforce this too.
    if (target.id === admin!.id) return forbidden("لا يمكنك تعديل صلاحيات حسابك");
    const b = body as UpdateAdminRequest;
    if (b.role !== undefined) {
      target.adminRole = b.role;
      audit(admin!, `admin:role ${target.id} → ${b.role}`, target.id);
    }
    if (b.disabled !== undefined) {
      target.isActive = !b.disabled;
      audit(admin!, `admin:${b.disabled ? "disable" : "enable"} ${target.id}`, target.id);
    }
    target.updatedAt = new Date().toISOString();
    return ok(toTeamMember(target));
  }
  if (seg[0] === "admin" && seg[1] === "team" && seg[3] === "reset-password" && method === "POST") {
    const denied = requireCap("admin:manage");
    if (denied) return denied;
    const target = db.users.find((u) => u.id === seg[2] && u.role === "admin");
    if (!target) return err(404, "غير موجود");
    audit(admin!, `admin:reset-password ${target.id}`, target.id);
    return ok({ sent: true });
  }

  if (path === "/admin/audit-log" && method === "GET") {
    const denied = requireCap("audit:view");
    if (denied) return denied;
    // Append-only and read-only: there is deliberately no write/delete route.
    return ok({
      items: db.auditLog.slice(0, 50).map((e) => ({
        id: e.id,
        actorName: e.actorName,
        action: e.action,
        subjectId: e.subjectId,
        at: e.at,
      })),
    });
  }
  if (path === "/admin/login-history" && method === "GET") {
    const denied = requireCap("audit:view");
    if (denied) return denied;
    return ok({
      items: db.loginHistory
        .slice(0, 50)
        .map((e) => ({ id: e.id, adminName: e.adminName, ip: e.ip, at: e.at, success: e.success })),
    });
  }

  /* ------------ support tickets (restored — conflicts.md B2-R) ------------ */

  if (path === "/admin/tickets" && method === "GET") {
    const denied = requireCap("ticket:reply");
    if (denied) return denied;
    const items = [...db.tickets]
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
      .map(toTicketSummary);
    return ok({ items });
  }
  if (seg[0] === "admin" && seg[1] === "tickets" && seg.length === 3 && method === "GET") {
    const denied = requireCap("ticket:reply");
    if (denied) return denied;
    const t = db.tickets.find((x) => x.id === seg[2]);
    return t ? ok(toTicketDetail(t)) : err(404, "غير موجود");
  }
  if (seg[0] === "admin" && seg[1] === "tickets" && seg[3] === "reply" && method === "POST") {
    const denied = requireCap("ticket:reply");
    if (denied) return denied;
    const t = db.tickets.find((x) => x.id === seg[2]);
    if (!t) return err(404, "غير موجود");
    const b = body as AdminReplyRequest;
    if (!b.content?.trim()) return err(400, "الرد مطلوب");
    const at = new Date().toISOString();
    t.messages.push({
      id: nextId("sm"),
      author: "admin",
      authorName: admin!.fullName,
      content: b.content.trim(),
      internal: !!b.internal,
      at,
    });
    t.lastMessageAt = at;
    // An internal note is not a customer reply — it must not move the ticket on.
    if (!b.internal) {
      if (t.status === "new" || t.status === "assigned") t.status = "in_progress";
      audit(admin!, `ticket:reply ${t.id}`, t.id);
    } else {
      audit(admin!, `ticket:note ${t.id}`, t.id);
    }
    // No notification: NOTIFICATION.type is a verbatim ERD enum with no ticket
    // member, and there is no customer-facing support UI to link to. Both
    // would need to exist first (ASSUMPTIONS.md #26).
    return ok(toTicketDetail(t));
  }
  if (seg[0] === "admin" && seg[1] === "tickets" && seg[3] === "assign" && method === "POST") {
    const denied = requireCap("ticket:reply");
    if (denied) return denied;
    const t = db.tickets.find((x) => x.id === seg[2]);
    if (!t) return err(404, "غير موجود");
    t.assignedAdminId = admin!.id;
    if (t.status === "new") t.status = "assigned";
    audit(admin!, `ticket:assign ${t.id}`, t.id);
    return ok(toTicketDetail(t));
  }
  if (seg[0] === "admin" && seg[1] === "tickets" && seg[3] === "status" && method === "POST") {
    const denied = requireCap("ticket:reply");
    if (denied) return denied;
    const t = db.tickets.find((x) => x.id === seg[2]);
    if (!t) return err(404, "غير موجود");
    t.status = (body as { status: TicketStatus }).status;
    audit(admin!, `ticket:status ${t.id} → ${t.status}`, t.id);
    return ok(toTicketDetail(t));
  }

  /* -------------------------- legal chat (PRO-17) ------------------------ */
  // Buffered variant. The UI streams via POST /legal-chat/stream (PRO-17);
  // this stays for non-streaming consumers and Jest. Both answer from ./ai.
  if (path === "/legal-chat" && method === "POST") {
    if (!user) return unauth();
    const { message } = body as ChatRequest;
    const { content, declined } = legalAnswer(message);
    return ok({ id: nextId("msg"), role: "assistant", content, declined });
  }

  return err(404, "المسار غير موجود");
}
