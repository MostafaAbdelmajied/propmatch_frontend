import type { AccountRole } from "@/src/lib/api/contracts/auth";
import type { PersistedVerificationStatus } from "@/src/lib/api/contracts/verification";
import type { PropertyType } from "@/src/lib/api/contracts/property";
import type { PropertyStatus, ModerationStatus } from "@/src/lib/api/contracts/common";
import type { TenantRequestStatus } from "@/src/lib/api/contracts/tenantRequest";
import type { OfferStatus } from "@/src/lib/api/contracts/offer";
import type { MatchConnectionStatus } from "@/src/lib/api/contracts/match";
import type { PaymentType, PaymentStatus } from "@/src/lib/api/contracts/payment";
import type { PartnerServiceType, PartnerLeadStatus } from "@/src/lib/api/contracts/partnerLead";
import type { NotificationType } from "@/src/lib/api/contracts/notification";
import type { Capability } from "@/src/lib/api/contracts/common";
import { ROLE_CAPABILITIES, type AdminRole } from "@/src/lib/api/contracts/admin";
import type { SupportAuthor, TicketStatus } from "@/src/lib/api/contracts/support";
import { emitMockEvent } from "./events";

/**
 * In-memory mock database standing in for the NestJS + PostgreSQL backend.
 * Table-per-ERD-entity: nothing here exists that isn't in the Final ERD.
 *
 * State lives for the dev-server (or test) process lifetime — enough to run
 * every V1 flow end to end: signup → eKYC → listing → admin approval →
 * tenant request → owner offer → acceptance → phone reveal → B2B lead.
 */

/* ------------------------------- entities ------------------------------- */

/** ERD: USER (+ passwordHash, which never leaves this file). */
export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  phoneNumber: string;
  role: AccountRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Admin sub-role. NOT in the ERD — restored per conflicts.md B2-R, which is
   * why it hangs off USER rather than living in its own table. Only ever set
   * when `role === "admin"`.
   */
  adminRole?: AdminRole;
}

/** ERD: IDENTITY_VERIFICATION (1:1 user). Absence == NOT_SUBMITTED. */
export interface MockVerification {
  id: string;
  userId: string;
  nationalId: string;
  nationalIdFrontUrl: string;
  nationalIdBackUrl: string;
  selfieUrl: string;
  status: PersistedVerificationStatus;
  reviewedBy: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

/** ERD: USER_QUOTA (1:1, landlords only). */
export interface MockQuota {
  id: string;
  userId: string;
  planType: "FREE" | "PREMIUM";
  planExpiresAt: string | null;
  maxActiveListings: number;
  freeListingsLeft: number;
  optimizerUsesLeft: number;
  freeOffersLeft: number;
  documentationPackCredits: number;
  lastResetDate: string | null;
}

/** ERD: PROPERTY_IMAGE. */
export interface MockPropertyImage {
  id: string;
  propertyId: string;
  imageUrl: string;
  displayOrder: number;
  isCover: boolean;
}

/** ERD: PROPERTY. */
export interface MockProperty {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  governorate: string;
  city: string;
  district: string;
  manualAddress: string;
  propertyType: PropertyType;
  propertyAroundServices: string | null;
  rentAmount: number;
  areaM2: number;
  bedrooms: number;
  bathrooms: number;
  isFurnished: boolean;
  hasElevator: boolean;
  hasParking: boolean;
  contactRevealed: boolean;
  status: PropertyStatus;
  isBoosted: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** ERD: TENANT_REQUEST. */
export interface MockTenantRequest {
  id: string;
  tenantId: string;
  minBudget: number;
  maxBudget: number;
  preferredLocations: string;
  propertyType: PropertyType;
  requiredBedrooms: number;
  needsFurnished: boolean;
  flexibilityScore: number;
  lifestyleRequirements: string;
  status: TenantRequestStatus;
  approvedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** ERD: OWNER_OFFER. */
export interface MockOffer {
  id: string;
  ownerId: string;
  tenantRequestId: string;
  propertyId: string;
  pitchMessage: string;
  proposedPrice: number;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
}

/** ERD: FAVORITE. */
export interface MockFavorite {
  id: string;
  tenantId: string;
  propertyId: string;
  createdAt: string;
}

/** ERD: MATCH_CONNECTION — the anchor of the PII-reveal gate. */
export interface MockMatchConnection {
  id: string;
  tenantId: string;
  propertyId: string;
  ownerId: string;
  matchScore: number;
  status: MatchConnectionStatus;
  createdAt: string;
}

/** ERD: PROPERTY_REVIEW. */
export interface MockReview {
  id: string;
  reviewerId: string;
  propertyId: string;
  rating: number;
  comment: string;
  status: ModerationStatus;
  reviewedBy: string | null;
  createdAt: string;
}

/** ERD: LEASE_CONTRACT — one per CONNECTED match connection. Handshake
 * model: landlord drafts/edits while "drafting", locks it to "reviewing",
 * tenant approves ("generated", the only status with a real pdfUrl) or
 * rejects back to "drafting" with a changeRequestNote. */
export interface MockLeaseContract {
  id: string;
  matchConnectionId: string;
  status: "drafting" | "reviewing" | "generated";
  changeRequestNote: string | null;
  generatedByUserId: string;
  ownerName: string;
  ownerNationalId: string | null;
  tenantName: string;
  tenantNationalId: string | null;
  rentAmount: number;
  propertyAddress: string;
  startDate: string;
  endDate: string;
  customClauses: string[];
  witness1Name: string | null;
  witness1NationalId: string | null;
  witness2Name: string | null;
  witness2NationalId: string | null;
  pdfUrl: string | null;
  createdAt: string;
}

/** ERD: PARTNER_LEAD. */
export interface MockPartnerLead {
  id: string;
  tenantId: string;
  serviceType: PartnerServiceType;
  partnerName: string | null;
  status: PartnerLeadStatus;
  createdAt: string;
}

/** ERD: NOTIFICATION. */
export interface MockNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link: string | null;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

/* ------- restored, non-ERD entities (conflicts.md B2-R / ASSUMPTIONS #26) ------- */

/** Append-only log of sensitive admin actions. */
export interface MockAuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  subjectId: string;
  at: string;
}

export interface MockLoginEntry {
  id: string;
  adminId: string;
  adminName: string;
  ip: string;
  at: string;
  success: boolean;
}

export interface MockSupportMessage {
  id: string;
  author: SupportAuthor;
  authorName: string;
  content: string;
  internal: boolean;
  at: string;
}

export interface MockTicket {
  id: string;
  subject: string;
  userId: string;
  status: TicketStatus;
  assignedAdminId: string | null;
  messages: MockSupportMessage[];
  createdAt: string;
  lastMessageAt: string;
}

export interface MockDb {
  users: MockUser[];
  verifications: MockVerification[];
  quotas: MockQuota[];
  properties: MockProperty[];
  propertyImages: MockPropertyImage[];
  tenantRequests: MockTenantRequest[];
  offers: MockOffer[];
  favorites: MockFavorite[];
  matchConnections: MockMatchConnection[];
  reviews: MockReview[];
  leaseContracts: MockLeaseContract[];
  partnerLeads: MockPartnerLead[];
  notifications: MockNotification[];
  /* Non-ERD — see above. */
  auditLog: MockAuditEntry[];
  loginHistory: MockLoginEntry[];
  tickets: MockTicket[];
}

/* -------------------------------- helpers -------------------------------- */

let idCounter = 100;
export const nextId = (prefix: string) => `${prefix}_${idCounter++}`;

const NOW = "2026-07-16T09:00:00.000Z";
const IMG = (slug: string) =>
  `https://images.unsplash.com/${slug}?w=800&h=500&fit=crop&auto=format`;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

function makeUser(
  id: string,
  fullName: string,
  email: string,
  role: AccountRole,
  phoneNumber: string,
  adminRole?: AdminRole,
): MockUser {
  return {
    id,
    fullName,
    email,
    passwordHash: "mock",
    phoneNumber,
    role,
    isActive: true,
    lastLoginAt: null,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: NOW,
    ...(adminRole ? { adminRole } : {}),
  };
}

function makeVerification(
  userId: string,
  status: PersistedVerificationStatus,
  last4: string,
): MockVerification {
  return {
    id: nextId("ekyc"),
    userId,
    nationalId: `2990112010${last4}`,
    nationalIdFrontUrl: "https://cdn.example.com/id-front.jpg",
    nationalIdBackUrl: "https://cdn.example.com/id-back.jpg",
    selfieUrl: "https://cdn.example.com/selfie.jpg",
    status,
    reviewedBy: status === "PENDING" ? null : "usr_admin",
    rejectionReason: status === "REJECTED" ? "صورة البطاقة غير واضحة، أعد الرفع بإضاءة أفضل" : null,
    submittedAt: ago(30 * 60_000),
    reviewedAt: status === "PENDING" ? null : ago(20 * 60_000),
  };
}

function makeQuota(userId: string): MockQuota {
  return {
    id: nextId("quota"),
    userId,
    planType: "FREE",
    planExpiresAt: null,
    maxActiveListings: 1,
    freeListingsLeft: 0,
    optimizerUsesLeft: 0,
    freeOffersLeft: 3,
    documentationPackCredits: 0,
    lastResetDate: null,
  };
}

interface PropertySeed {
  id: string;
  ownerId: string;
  title: string;
  district: string;
  rentAmount: number;
  propertyType?: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  areaM2?: number;
  isFurnished?: boolean;
  isBoosted?: boolean;
  status?: PropertyStatus;
  description: string;
  propertyAroundServices?: string;
  image?: string;
}

function makeProperty(s: PropertySeed): MockProperty {
  const status = s.status ?? "APPROVED";
  return {
    id: s.id,
    ownerId: s.ownerId,
    title: s.title,
    description: s.description,
    governorate: "الدقهلية",
    city: "المنصورة",
    district: s.district,
    manualAddress: `${s.district}، شارع الجمهورية، عمارة ١٢، المنصورة`,
    propertyType: s.propertyType ?? "APARTMENT",
    propertyAroundServices: s.propertyAroundServices ?? null,
    rentAmount: s.rentAmount,
    areaM2: s.areaM2 ?? 100,
    bedrooms: s.bedrooms ?? 2,
    bathrooms: s.bathrooms ?? 1,
    isFurnished: s.isFurnished ?? false,
    hasElevator: true,
    hasParking: false,
    contactRevealed: false,
    status,
    isBoosted: s.isBoosted ?? false,
    approvedBy: status === "APPROVED" ? "usr_admin" : null,
    approvedAt: status === "APPROVED" ? ago(2 * 24 * 60 * 60_000) : null,
    rejectionReason: null,
    createdAt: ago(3 * 24 * 60 * 60_000),
    updatedAt: NOW,
  };
}

/* --------------------------------- seed ---------------------------------- */

function seed(): MockDb {
  const users: MockUser[] = [
    makeUser("usr_tenant", "أحمد محمود", "tenant@example.com", "tenant", "01011112222"),
    makeUser("usr_tenant2", "سارة إبراهيم", "tenant2@example.com", "tenant", "01033334444"),
    makeUser("usr_landlord", "محمد السيد", "landlord@example.com", "landlord", "01055556666"),
    makeUser(
      "usr_landlord2",
      "خالد عبد العزيز",
      "landlord2@example.com",
      "landlord",
      "01077778888",
    ),
    makeUser(
      "usr_admin",
      "مشرف المنصة",
      "admin@example.com",
      "admin",
      "01099990000",
      "super-admin",
    ),
    // Scoped admins — restored per conflicts.md B2-R, no ERD entity.
    makeUser(
      "usr_admin_kyc",
      "ياسمين فؤاد",
      "kyc@example.com",
      "admin",
      "01099991111",
      "kyc-reviewer",
    ),
    makeUser(
      "usr_admin_support",
      "عمرو شاكر",
      "support@example.com",
      "admin",
      "01099992222",
      "customer-support",
    ),
    makeUser(
      "usr_admin_readonly",
      "هبة السيد",
      "readonly@example.com",
      "admin",
      "01099993333",
      "read-only",
    ),
  ];

  const verifications: MockVerification[] = [
    // usr_tenant has no row → NOT_SUBMITTED (progressive verification).
    makeVerification("usr_tenant2", "APPROVED", "1234"),
    makeVerification("usr_landlord", "APPROVED", "4821"),
    makeVerification("usr_landlord2", "PENDING", "7715"), // sits in the admin queue
  ];

  const quotas: MockQuota[] = [makeQuota("usr_landlord"), makeQuota("usr_landlord2")];

  const properties: MockProperty[] = [
    makeProperty({
      id: "prop_1",
      ownerId: "usr_landlord",
      title: "شقة مفروشة قرب جامعة المنصورة",
      district: "حي الجامعة",
      rentAmount: 4500,
      areaM2: 95,
      isFurnished: true,
      isBoosted: true,
      propertyAroundServices: "جامعة المنصورة، مستشفى الطوارئ، مواصلات، سوبر ماركت، صيدلية",
      description:
        "شقة مفروشة بالكامل على بعد دقائق من جامعة المنصورة، تشطيب سوبر لوكس، بها إنترنت فايبر وتكييف في كل غرفة. مثالية للطلبة أو الأطباء العاملين بالمستشفى الجامعي.",
      image: IMG("photo-1522708323590-d24dbb6b0267"),
    }),
    makeProperty({
      id: "prop_2",
      ownerId: "usr_landlord",
      title: "شقة واسعة بحي توريل",
      district: "توريل",
      rentAmount: 6000,
      bedrooms: 3,
      bathrooms: 2,
      areaM2: 150,
      propertyAroundServices: "مدارس، نادي، مواصلات، أسواق",
      description:
        "شقة عائلية واسعة في أهدأ مناطق توريل، ٣ غرف وريسبشن كبير، قريبة من المدارس والخدمات، عداد كهرباء ومياه مستقل.",
      image: IMG("photo-1484154218962-a197022b5858"),
    }),
    makeProperty({
      id: "prop_3",
      ownerId: "usr_landlord2",
      title: "ستوديو حديث بالمشاية",
      district: "المشاية",
      rentAmount: 3000,
      propertyType: "STUDIO",
      bedrooms: 1,
      areaM2: 55,
      isFurnished: true,
      propertyAroundServices: "كافيهات، مطاعم، كورنيش، مواصلات",
      description:
        "ستوديو مفروش حديث التشطيب على المشاية السفلية، إطلالة مميزة، يصلح لفرد أو اثنين.",
      image: IMG("photo-1502672260266-1c1ef2d93688"),
    }),
    makeProperty({
      id: "prop_4",
      ownerId: "usr_landlord2",
      title: "فيلا بجديلة",
      district: "جديلة",
      rentAmount: 12000,
      propertyType: "VILLA",
      bedrooms: 4,
      bathrooms: 3,
      areaM2: 320,
      propertyAroundServices: "هدوء، مساحات خضراء، جراج",
      description:
        "فيلا دورين بحديقة خاصة في جديلة، تشطيب فاخر، مناسبة لعائلة كبيرة تبحث عن الهدوء.",
      image: IMG("photo-1560448204-e02f11c3d0e2"),
    }),
    makeProperty({
      id: "prop_5",
      ownerId: "usr_landlord",
      title: "شقة قيد المراجعة - وسط البلد",
      district: "وسط البلد",
      rentAmount: 5200,
      areaM2: 110,
      status: "PENDING", // sits in the admin queue
      description: "شقة في قلب وسط البلد قريبة من كل الخدمات والمواصلات، تصلح للعائلات الصغيرة.",
      image: IMG("photo-1505873242700-f289a29e1724"),
    }),
  ];

  const propertyImages: MockPropertyImage[] = properties.map((p, i) => ({
    id: nextId("img"),
    propertyId: p.id,
    imageUrl: [
      IMG("photo-1522708323590-d24dbb6b0267"),
      IMG("photo-1484154218962-a197022b5858"),
      IMG("photo-1502672260266-1c1ef2d93688"),
      IMG("photo-1560448204-e02f11c3d0e2"),
      IMG("photo-1505873242700-f289a29e1724"),
    ][i],
    displayOrder: 0,
    isCover: true,
  }));

  const tenantRequests: MockTenantRequest[] = [
    {
      id: "req_1",
      tenantId: "usr_tenant2",
      minBudget: 3000,
      maxBudget: 5500,
      preferredLocations: "حي الجامعة، توريل",
      propertyType: "APARTMENT",
      requiredBedrooms: 2,
      needsFurnished: true,
      flexibilityScore: 7,
      lifestyleRequirements:
        "أبحث عن شقة هادئة قريبة من جامعة المنصورة، مفروشة، مناسبة لشخصين، وبها إنترنت جيد لأنني أعمل من المنزل.",
      status: "APPROVED",
      approvedBy: "usr_admin",
      rejectionReason: null,
      createdAt: ago(4 * 60 * 60_000),
      updatedAt: NOW,
    },
    {
      id: "req_2",
      tenantId: "usr_tenant",
      minBudget: 2500,
      maxBudget: 4000,
      preferredLocations: "المشاية، وسط البلد",
      propertyType: "STUDIO",
      requiredBedrooms: 1,
      needsFurnished: true,
      flexibilityScore: 4,
      lifestyleRequirements: "ستوديو صغير قريب من الكورنيش، هادئ، ومناسب لطالب.",
      status: "PENDING", // sits in the admin queue
      approvedBy: null,
      rejectionReason: null,
      createdAt: ago(12 * 60_000),
      updatedAt: NOW,
    },
  ];

  const reviews: MockReview[] = [
    {
      id: "rev_1",
      reviewerId: "usr_tenant2",
      propertyId: "prop_1",
      rating: 5,
      comment: "شقة نظيفة جدًا والمالك متعاون، قريبة من الجامعة فعلًا.",
      status: "APPROVED",
      reviewedBy: "usr_admin",
      createdAt: ago(5 * 24 * 60 * 60_000),
    },
    {
      id: "rev_2",
      reviewerId: "usr_tenant",
      propertyId: "prop_2",
      rating: 4,
      comment: "المكان هادئ والمساحة ممتازة، لكن الإيجار مرتفع قليلًا.",
      status: "PENDING", // sits in the admin queue
      reviewedBy: null,
      createdAt: ago(25 * 60_000),
    },
  ];

  /* ---- non-ERD seed (conflicts.md B2-R) ---- */

  const auditLog: MockAuditEntry[] = [
    {
      id: "aud_1",
      actorId: "usr_admin",
      actorName: "مشرف المنصة",
      action: "property:approve prop_1",
      subjectId: "prop_1",
      at: ago(3 * 60 * 60_000),
    },
    {
      id: "aud_2",
      actorId: "usr_admin",
      actorName: "مشرف المنصة",
      action: "kyc:review usr_landlord",
      subjectId: "usr_landlord",
      at: ago(5 * 60 * 60_000),
    },
    {
      id: "aud_3",
      actorId: "usr_admin",
      actorName: "مشرف المنصة",
      action: "request:approve req_1",
      subjectId: "req_1",
      at: ago(26 * 60 * 60_000),
    },
  ];

  const loginHistory: MockLoginEntry[] = [
    {
      id: "lgn_1",
      adminId: "usr_admin",
      adminName: "مشرف المنصة",
      ip: "197.54.12.8",
      at: ago(20 * 60_000),
      success: true,
    },
    {
      id: "lgn_2",
      adminId: "usr_admin_kyc",
      adminName: "ياسمين فؤاد",
      ip: "156.203.44.19",
      at: ago(2 * 60 * 60_000),
      success: true,
    },
    {
      id: "lgn_3",
      adminId: "usr_admin",
      adminName: "مشرف المنصة",
      ip: "41.35.7.201",
      at: ago(9 * 60 * 60_000),
      success: false,
    },
  ];

  const tickets: MockTicket[] = [
    {
      id: "tkt_1",
      subject: "لم يتم تحديث رصيد الإعلانات بعد الدفع",
      userId: "usr_landlord",
      status: "new",
      assignedAdminId: null,
      createdAt: ago(40 * 60_000),
      lastMessageAt: ago(35 * 60_000),
      messages: [
        {
          id: "sm_1",
          author: "user",
          authorName: "محمد السيد",
          content: "دفعت رسوم إعلان جديد ولم يتغير الرصيد.",
          internal: false,
          at: ago(40 * 60_000),
        },
        {
          id: "sm_2",
          author: "ai",
          authorName: "المساعد الآلي",
          content: "تحديث الرصيد يتم عبر بوابة الدفع وقد يستغرق دقائق. سأحوّلك لموظف دعم للمتابعة.",
          internal: false,
          at: ago(35 * 60_000),
        },
      ],
    },
    {
      id: "tkt_2",
      subject: "استفسار عن سبب رفض التوثيق",
      userId: "usr_landlord2",
      status: "in_progress",
      assignedAdminId: "usr_admin_support",
      createdAt: ago(3 * 60 * 60_000),
      lastMessageAt: ago(50 * 60_000),
      messages: [
        {
          id: "sm_3",
          author: "user",
          authorName: "خالد عبد العزيز",
          content: "طلب التوثيق قيد المراجعة من يومين، هل من مشكلة؟",
          internal: false,
          at: ago(3 * 60 * 60_000),
        },
        {
          id: "sm_4",
          author: "admin",
          authorName: "عمرو شاكر",
          content: "طلبك في قائمة المراجعة وسيتم الرد خلال 24 ساعة.",
          internal: false,
          at: ago(60 * 60_000),
        },
        {
          id: "sm_5",
          author: "admin",
          authorName: "عمرو شاكر",
          content: "صورة البطاقة غير واضحة — نطلب إعادة الرفع إذا لم تتحسن.",
          internal: true,
          at: ago(50 * 60_000),
        },
      ],
    },
  ];

  return {
    users,
    verifications,
    quotas,
    properties,
    propertyImages,
    tenantRequests,
    offers: [],
    favorites: [],
    matchConnections: [],
    reviews,
    leaseContracts: [],
    partnerLeads: [],
    notifications: [],
    auditLog,
    loginHistory,
    tickets,
  };
}

export let db: MockDb = seed();

/** Test helper — reset all mock state between tests. */
export function resetDb() {
  idCounter = 100;
  db = seed();
}

/* ------------------------------ auth helpers ------------------------------ */

/**
 * Mock tokens are JWT-shaped (unsigned) so proxy.ts's expiry decode works:
 * base64url header + payload {sub, exp} + fake signature.
 */
function fakeJwt(userId: string, ttlSeconds: number): string {
  const b64 = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const header = b64({ alg: "none", typ: "JWT" });
  const payload = b64({ sub: userId, exp: Math.floor(Date.now() / 1000) + ttlSeconds });
  return `${header}.${payload}.mock`;
}

export function findUserByToken(authHeader: string | null): MockUser | null {
  const token = authHeader?.replace(/^Bearer\s+/, "");
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf-8"));
    if (typeof payload.sub !== "string") return null;
    const user = db.users.find((u) => u.id === payload.sub);
    return user && user.isActive ? user : null;
  } catch {
    return null;
  }
}

export function tokensFor(user: MockUser) {
  return {
    accessToken: fakeJwt(user.id, 60 * 60),
    refreshToken: fakeJwt(user.id, 60 * 60 * 24 * 7),
    user: toPublicUser(user),
  };
}

/**
 * `NOT_SUBMITTED` is the only derived state: it means no verification row.
 */
export function verificationStatusFor(userId: string) {
  const v = db.verifications.find((x) => x.userId === userId);
  if (!v) return "NOT_SUBMITTED" as const;
  return v.status;
}

export function toPublicUser(user: MockUser) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    verificationStatus: verificationStatusFor(user.id),
  };
}

export function quotaFor(userId: string): MockQuota | undefined {
  return db.quotas.find((q) => q.userId === userId);
}

/**
 * An admin's capability set, derived from their sub-role. Restored per
 * conflicts.md B2-R. Non-admins hold no admin capabilities; an admin with no
 * sub-role (e.g. one created before the restore) falls back to super-admin so
 * the seed admin never locks itself out.
 */
export function capabilitiesFor(user: MockUser): Capability[] {
  if (user.role !== "admin") return [];
  return ROLE_CAPABILITIES[user.adminRole ?? "super-admin"];
}

export function hasCapability(user: MockUser | null, capability: Capability): boolean {
  return !!user && capabilitiesFor(user).includes(capability);
}

/** Append to the audit log. Every sensitive admin action routes through here. */
export function audit(actor: MockUser, action: string, subjectId: string) {
  db.auditLog.unshift({
    id: nextId("aud"),
    actorId: actor.id,
    actorName: actor.fullName,
    action,
    subjectId,
    at: new Date().toISOString(),
  });
}

export function isVerified(userId: string): boolean {
  return verificationStatusFor(userId) === "APPROVED";
}

/** ERD: NOTIFICATION — pushed over Socket.io in the real build (PRO-06). */
export function notify(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link: string | null = null,
) {
  const id = nextId("ntf");
  const createdAt = new Date().toISOString();
  db.notifications.unshift({ id, userId, title, message, link, type, isRead: false, createdAt });
  // PRO-06: push it to the recipient if a socket server is listening. The row
  // is persisted either way — the socket is delivery, not storage, so a
  // disconnected client catches up on its next GET /notifications.
  // `userId` routes the event; it is not part of the client-facing payload.
  emitMockEvent({
    kind: "notification",
    userId,
    payload: { id, title, message, link, type, isRead: false, createdAt },
  });
}
