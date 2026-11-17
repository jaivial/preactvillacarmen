import { useLocation } from "wouter-preact";
import { CdnGallery } from "../../components/CdnGallery";
import { EditorialLanding } from "../../components/EditorialLanding";
import { EventInquiryForm } from "../../components/EventInquiryForm";
import { celebrationContent } from "../../lib/celebrationContent";
import { celebrationGalleries } from "../../lib/galleryContent";
import { useI18n } from "../../lib/i18n";

export function CelebrationLanding() {
  const [location] = useLocation();
  const { lang } = useI18n();
  const content =
    celebrationContent[location]?.[lang] || celebrationContent["/bodas"][lang];
  const gallery = celebrationGalleries[location]?.[lang];
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
      {gallery ? (
        <CdnGallery
          id={`celebration-${location.slice(1)}`}
          label={gallery.label}
          items={gallery.items}
          portrait={location === "/eventos-empresa"}
        />
      ) : null}
      <EventInquiryForm key={location} defaultEventType={defaultEventType} />
    </EditorialLanding>
  );
}
