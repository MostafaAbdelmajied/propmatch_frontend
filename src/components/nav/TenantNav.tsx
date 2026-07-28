"use client";

import { FileText, Heart, Inbox, MessageCircle, Search } from "lucide-react";
import { RoleNav, UserProfileHeaderNav } from "./RoleNav";

const items = [
  { href: "/tenant", label: "تصفّح", Icon: Search },
  { href: "/tenant/requests", label: "طلباتي", Icon: FileText },
  { href: "/tenant/offers", label: "العروض", Icon: Inbox },
  { href: "/contracts", label: "عقودي", Icon: FileText },
  { href: "/tenant/messages", label: "الرسائل", Icon: MessageCircle },
  { href: "/tenant/favorites", label: "المفضلة", Icon: Heart },
];

/** Client wrapper so Lucide icon components never cross the RSC boundary. */
export function TenantNav() {
  return <RoleNav items={items} rightSlot={<UserProfileHeaderNav />} />;
}
