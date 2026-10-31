import { useLocation } from "wouter-preact";
import { EditorialLanding } from "../../components/EditorialLanding";
import { EventInquiryForm } from "../../components/EventInquiryForm";
import { celebrationContent } from "../../lib/celebrationContent";
import { useI18n } from "../../lib/i18n";

export function CelebrationLanding() {
  const [location] = useLocation();
  const { lang } = useI18n();
  const content =
    celebrationContent[location]?.[lang] || celebrationContent["/bodas"][lang];
  const defaultEventType =
    location === "/bodas"
      ? "wedding"
      : location === "/comuniones"
        ? "communion"
        : location === "/bautizos"
          ? "baptism" // Coordination id: event_inquiry_type_baptism (public_event_inquiry.go)
        : location === "/eventos-empresa"
          ? "company"
          : "";
  return (
    <EditorialLanding content={content} id={`celebration-${location.slice(1)}`}>
      <EventInquiryForm key={location} defaultEventType={defaultEventType} />
    </EditorialLanding>
  );
}
