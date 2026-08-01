"use client";

import { FileText, LayoutDashboard, MessageCircle, Send, Users } from "lucide-react";
import { RoleNav, UserProfileHeaderNav } from "./RoleNav";

const items = [
  { href: "/landlord", label: "عقاراتي", Icon: LayoutDashboard },
  { href: "/landlord/requests", label: "طلبات المستأجرين", Icon: Users },
  { href: "/landlord/offers", label: "عروضي", Icon: Send },
  { href: "/contracts", label: "عقودي", Icon: FileText },
  { href: "/landlord/messages", label: "الرسائل", Icon: MessageCircle },
];

/** Client wrapper so Lucide icon components never cross the RSC boundary. */
export function LandlordNav() {
  return <RoleNav items={items} rightSlot={<UserProfileHeaderNav />} />;
}
