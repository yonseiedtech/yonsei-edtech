import type { User } from "@/types";

function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export interface BusinessCardContact {
  name: string;
  org?: string;
  title?: string;
  phone?: string;
  email?: string;
  url?: string;
  note?: string;
}

export function buildVCard(c: BusinessCardContact): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVCard(c.name)}`];
  if (c.org) lines.push(`ORG:${escapeVCard(c.org)}`);
  if (c.title) lines.push(`TITLE:${escapeVCard(c.title)}`);
  if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone}`);
  if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
  if (c.url) lines.push(`URL:${c.url}`);
  if (c.note) lines.push(`NOTE:${escapeVCard(c.note)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function userToContact(user: User): BusinessCardContact {
  const orgParts = [user.affiliation, user.department].filter(Boolean);
  const note = [
    user.generation ? `연세교육공학회 ${user.generation}기` : null,
    user.field ? `관심분야: ${user.field}` : null,
  ].filter(Boolean).join(" · ");
  return {
    name: user.name,
    org: orgParts.length > 0 ? orgParts.join(" ") : "연세교육공학회",
    title: user.position,
    phone: user.phone,
    email: user.contactEmail ?? user.email,
    note: note || undefined,
  };
}

export function downloadVCard(contact: BusinessCardContact, filename?: string) {
  const vcard = buildVCard(contact);
  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `${contact.name.replace(/\s+/g, "_")}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
