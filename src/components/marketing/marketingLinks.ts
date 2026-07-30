export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@propmatch.com";

export const socialLinks = [
  {
    label: "فيسبوك",
    href: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "https://www.facebook.com/propmatch",
  },
  {
    label: "إنستجرام",
    href: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://www.instagram.com/propmatch",
  },
  {
    label: "لينكدإن",
    href: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/company/propmatch",
  },
] as const;
