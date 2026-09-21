import { Mail, MessageCircle } from "lucide-react";
import {
  buildInstagramProfileUrl,
  buildMailtoUrl,
  buildWhatsAppMessageUrl,
  hasPublicContact,
  type ContactChannels,
} from "@agenda/domain";
import { InstagramIcon } from "@/components/icons/InstagramIcon";

type ContactLinksProps = {
  contact: ContactChannels;
  message?: string;
  emailSubject?: string;
};

export function ContactLinks({ contact, message, emailSubject }: ContactLinksProps) {
  if (!hasPublicContact(contact)) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {contact.instagram ? (
        <a
          href={buildInstagramProfileUrl(contact.instagram)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm"
        >
          <InstagramIcon className="size-4" />
          Instagram
        </a>
      ) : null}
      {contact.whatsapp ? (
        <a
          href={buildWhatsAppMessageUrl(contact.whatsapp, message)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm"
        >
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp
        </a>
      ) : null}
      {contact.email ? (
        <a href={buildMailtoUrl(contact.email, emailSubject)} className="btn-secondary text-sm">
          <Mail className="size-4" aria-hidden />
          Email
        </a>
      ) : null}
    </div>
  );
}
