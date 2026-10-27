import { useMemo, useRef, useState } from "preact/hooks";
import type { CSSProperties } from "preact/compat";
import { Counter } from "./reservas/Counter";
import {
  PopoverSelect,
  type PopoverSelectOption,
} from "./reservas/PopoverSelect";
import { ReservationCalendar } from "./reservas/ReservationCalendar";
import {
  buildCountries,
  countrySelectOptions,
} from "./reservas/countryOptions";
import { apiFetch } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { buildCalendarCells, isoFromLocalDate } from "../lib/reservationCalendar";
import "./EventInquiryForm.css";

export const EVENT_INQUIRY_MAX_GUESTS = 500;
export type EventInquiryValues = {
  name: string;
  email: string;
  emailRepeat: string;
  countryCode: string;
  phone: string;
  adults: number;
  children: number;
  eventType: string;
  date: string;
  notes: string;
};
type Props = { defaultEventType?: string };
type Delivery = {
  customerEmail: boolean;
  restaurantEmail: boolean;
  customerWhatsApp: boolean;
  restaurantWhatsApp: number;
};

export function validateEventInquiryValues(
  v: EventInquiryValues,
  todayISO: string,
  maxISO: string,
): string {
  if (v.name.trim().length < 2) return "name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) return "email";
  if (v.email.trim().toLowerCase() !== v.emailRepeat.trim().toLowerCase())
    return "emailRepeat";
  if (
    !/^\d{1,4}$/.test(v.countryCode) ||
    !/^\d{6,15}$/.test(v.phone) ||
    (v.countryCode + v.phone).length > 15
  )
    return "phone";
  if (
    !Number.isInteger(v.adults) ||
    !Number.isInteger(v.children) ||
    v.adults < 1 ||
    v.children < 0 ||
    v.adults + v.children > EVENT_INQUIRY_MAX_GUESTS
  )
    return "guests";
  if (
    !["wedding", "communion", "birthday", "company", "baptism"].includes(
      v.eventType,
    )
  )
    return "eventType";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(v.date) ||
    v.date < todayISO ||
    v.date > maxISO
  )
    return "date";
  if (v.notes.length > 2000) return "notes";
  return "";
}

function PhoneDigits({
  value,
  countryCode,
  onChange,
  label,
}: {
  value: string;
  countryCode: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const count =
    countryCode === "34"
      ? 9
      : countryCode === "1"
        ? 10
        : Math.min(12, 15 - countryCode.length);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(count, " ").slice(0, count).split("");
  const update = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, "");
    if (!incoming) {
      const next = value.split("");
      next.splice(index, 1);
      onChange(next.join(""));
      refs.current[index]?.focus();
      return;
    }
    const next = value.split("");
    incoming
      .slice(0, count - index)
      .split("")
      .forEach((digit, offset) => {
        next[index + offset] = digit;
      });
    onChange(next.join("").slice(0, count));
    refs.current[Math.min(count - 1, index + incoming.length)]?.focus();
  };
  return (
    <div
      class="event-inquiry-digits"
      role="group"
      aria-label={label}
      data-testid="event-inquiry-phone-digits"
      style={{ "--phone-digit-count": count } as CSSProperties}
    >
      {digits.map((digit, index) => (
        <input
          ref={(el) => {
            refs.current[index] = el;
          }}
          key={`${countryCode}-${index}`}
          value={digit.trim()}
          type="tel"
          inputmode="numeric"
          autocomplete={index === 0 ? "tel-national" : "off"}
          aria-label={`${label} ${index + 1}`}
          data-testid={`event-inquiry-phone-digit-${index}`}
          onInput={(e) => update(index, (e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[index].trim() && index > 0)
              refs.current[index - 1]?.focus();
            if (e.key === "ArrowLeft" && index > 0) {
              e.preventDefault();
              refs.current[index - 1]?.focus();
            }
            if (e.key === "ArrowRight" && index < count - 1) {
              e.preventDefault();
              refs.current[index + 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            update(index, e.clipboardData?.getData("text") || "");
          }}
        />
      ))}
    </div>
  );
}

export function EventInquiryForm({ defaultEventType = "" }: Props) {
  const { lang } = useI18n();
  const text = (es: string, en: string) => (lang === "en" ? en : es);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayISO = useMemo(() => isoFromLocalDate(today), [today]);
  const maxISO = useMemo(
    () =>
      isoFromLocalDate(
        new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()),
      ),
    [today],
  );
  const [viewMonth0, setViewMonth0] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [values, setValues] = useState<EventInquiryValues>({
    name: "",
    email: "",
    emailRepeat: "",
    countryCode: "34",
    phone: "",
    adults: 2,
    children: 0,
    eventType: defaultEventType,
    date: "",
    notes: "",
  });
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [heldHeight, setHeldHeight] = useState<number>();
  const formRef = useRef<HTMLFormElement>(null);
  const set = <K extends keyof EventInquiryValues>(
    key: K,
    value: EventInquiryValues[K],
  ) => setValues((old) => ({ ...old, [key]: value }));
  const countries = useMemo(() => buildCountries(text), [lang]);
  const countryOptions = useMemo(
    () => countrySelectOptions(countries),
    [countries],
  );
  const eventOptions = useMemo<PopoverSelectOption[]>(
    () => [
      { value: "wedding", label: text("Boda", "Wedding") },
      { value: "communion", label: text("Comunión", "Communion") },
      { value: "birthday", label: text("Cumpleaños", "Birthday") },
      { value: "company", label: text("Comida de empresa", "Company meal") },
      { value: "baptism", label: text("Bautizo", "Baptism") },
    ],
    [lang],
  );
  const rules = useMemo(
    () => ({
      todayISO,
      maxISO,
      // An enquiry has no booking availability or regular-weekday closure rules.
      openedDays: new Set(
        buildCalendarCells(viewYear, viewMonth0).map((cell) => cell.iso),
      ),
      closedDays: new Set<string>(),
      specialDates: {},
      monthAvailability: null,
    }),
    [todayISO, maxISO, viewYear, viewMonth0],
  );
  const errors: Record<string, [string, string]> = {
    name: ["Escribe tu nombre y apellidos.", "Enter your full name."],
    email: ["Escribe un email válido.", "Enter a valid email address."],
    emailRepeat: [
      "Los dos emails no coinciden.",
      "The two email addresses do not match.",
    ],
    phone: ["Completa un teléfono válido.", "Enter a valid phone number."],
    guests: [
      "El total debe estar entre 1 y 500 personas.",
      "The total must be between 1 and 500 guests.",
    ],
    eventType: ["Selecciona un tipo de evento.", "Select an event type."],
    date: [
      "Selecciona una fecha entre hoy y los próximos dos años.",
      "Choose a date between today and the next two years.",
    ],
    notes: ["Máximo 2000 caracteres.", "Maximum 2000 characters."],
  };
  const submit = async (event: Event) => {
    event.preventDefault();
    const invalid = validateEventInquiryValues(values, todayISO, maxISO);
    if (invalid) {
      setStatus("error");
      setHeldHeight(undefined);
      setMessage(text(...errors[invalid]));
      return;
    }
    setHeldHeight(formRef.current?.offsetHeight);
    setStatus("loading");
    setMessage("");
    try {
      const response = await apiFetch("/api/public/event-inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ ...values, language: lang, website }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success)
        throw new Error(
          data?.message ||
            text(
              "No se pudo enviar la consulta.",
              "The enquiry could not be sent.",
            ),
        );
      setDelivery(data.notifications || null);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setHeldHeight(undefined);
      setMessage(
        error instanceof Error
          ? error.message
          : text(
              "No se pudo enviar la consulta.",
              "The enquiry could not be sent.",
            ),
      );
    }
  };
  const field = (
    key: string,
    label: string,
    input: preact.ComponentChildren,
  ) => (
    <label class={`event-inquiry-field event-inquiry-field--${key}`}>
      <span>{label}</span>
      {input}
    </label>
  );

  return (
    <section
      class="event-inquiry container"
      id="event-inquiry"
      aria-labelledby="event-inquiry-title"
      data-testid="event-inquiry"
    >
      <div class="event-inquiry-heading">
        <p class="event-inquiry-kicker">
          {text(
            "Hablemos de tu celebración",
            "Let’s talk about your celebration",
          )}
        </p>
        <h2 id="event-inquiry-title">
          {text(
            "Solicita información para tu evento",
            "Request information for your event",
          )}
        </h2>
        <p>
          {text(
            "Cuéntanos qué tienes en mente y te responderemos con una propuesta personalizada.",
            "Tell us what you have in mind and we will reply with a personalised proposal.",
          )}
        </p>
        <strong class="event-inquiry-notice">
          {text(
            "Esto es solo una solicitud de información y NO una reserva.",
            "This is an information request only and NOT a reservation.",
          )}
        </strong>
      </div>
      <div
        class="event-inquiry-stage"
        style={
          heldHeight && status !== "error"
            ? { minHeight: `${heldHeight}px` }
            : undefined
        }
      >
        {status === "loading" ? (
          <div
            class="event-inquiry-loading"
            role="status"
            aria-live="polite"
            style={{ minHeight: `${heldHeight || 0}px` }}
            data-testid="event-inquiry-loading"
          >
            <span class="event-inquiry-spinner" aria-hidden="true" />
            <p>{text("Enviando tu solicitud…", "Sending your request…")}</p>
          </div>
        ) : status === "success" ? (
          <div
            class="event-inquiry-success"
            role="status"
            aria-live="polite"
            data-testid="event-inquiry-success"
          >
            <span class="event-inquiry-success-icon" aria-hidden="true">
              ✓
            </span>
            <h3>{text("¡Solicitud recibida!", "Request received!")}</h3>
            <p>
              {delivery?.customerWhatsApp && delivery?.customerEmail
                ? text(
                    "Te hemos enviado una confirmación por WhatsApp y email.",
                    "We have sent you a confirmation by WhatsApp and email.",
                  )
                : delivery?.customerWhatsApp
                  ? text(
                      "Te hemos enviado una confirmación por WhatsApp.",
                      "We have sent you a confirmation by WhatsApp.",
                    )
                  : delivery?.customerEmail
                    ? text(
                        "Te hemos enviado una confirmación por email.",
                        "We have sent you a confirmation by email.",
                      )
                    : text(
                        "Hemos recibido correctamente tu solicitud.",
                        "We have successfully received your request.",
                      )}
            </p>
            <p>
              {text(
                "Nuestro equipo contestará a tu petición de información en breve. Esto NO es una reserva.",
                "Our team will respond to your information request shortly. This is NOT a reservation.",
              )}
            </p>
            <button
              type="button"
              class="event-inquiry-reset"
              onClick={() => {
                setStatus("idle");
                setHeldHeight(undefined);
                setValues((old) => ({
                  ...old,
                  name: "",
                  email: "",
                  emailRepeat: "",
                  phone: "",
                  date: "",
                  notes: "",
                }));
              }}
            >
              {text("Enviar otra consulta", "Send another enquiry")}
            </button>
          </div>
        ) : (
          <form
            ref={formRef}
            class="event-inquiry-form"
            onSubmit={submit}
            noValidate
            data-testid="event-inquiry-form"
          >
            <div class="event-inquiry-grid">
              {field(
                "name",
                text("Nombre y apellidos", "Full name"),
                <input
                  class="resvInput"
                  name="name"
                  autocomplete="name"
                  maxlength={120}
                  value={values.name}
                  onInput={(e) => set("name", e.currentTarget.value)}
                  required
                />,
              )}
              {field(
                "eventType",
                text("Tipo de evento", "Event type"),
                <PopoverSelect
                  testId="event-inquiry-type"
                  ariaLabel={text("Tipo de evento", "Event type")}
                  value={values.eventType}
                  options={eventOptions}
                  onChange={(value) => set("eventType", value)}
                  placeholder={text(
                    "Selecciona una opción",
                    "Select an option",
                  )}
                />,
              )}
              {field(
                "email",
                "Email",
                <input
                  class="resvInput"
                  name="email"
                  type="email"
                  autocomplete="email"
                  maxlength={254}
                  value={values.email}
                  onInput={(e) => set("email", e.currentTarget.value)}
                  required
                />,
              )}
              {field(
                "emailRepeat",
                text("Repite tu email", "Confirm your email"),
                <input
                  class="resvInput"
                  name="emailRepeat"
                  type="email"
                  autocomplete="email"
                  maxlength={254}
                  value={values.emailRepeat}
                  onInput={(e) => set("emailRepeat", e.currentTarget.value)}
                  required
                />,
              )}
              <div class="event-inquiry-phone-layout">
                {field(
                  "country",
                  text("Prefijo del país", "Country code"),
                  <PopoverSelect
                    testId="event-inquiry-country"
                    ariaLabel={text("Prefijo del país", "Country code")}
                    value={values.countryCode}
                    options={countryOptions}
                    onChange={(value) =>
                      setValues((old) => ({
                        ...old,
                        countryCode: value,
                        phone: "",
                      }))
                    }
                    searchable
                    placeholder={text("Selecciona un país", "Select a country")}
                    searchPlaceholder={text("Buscar país", "Search country")}
                  />,
                )}
                <div class="event-inquiry-field event-inquiry-field--phone">
                  <span>
                    {text(
                      "Teléfono (dígito a dígito)",
                      "Phone number (one digit per box)",
                    )}
                  </span>
                  <div class="event-inquiry-phone" dir="ltr">
                    <PhoneDigits
                      value={values.phone}
                      countryCode={values.countryCode}
                      onChange={(value) => set("phone", value)}
                      label={text("Dígito del teléfono", "Phone digit")}
                    />
                  </div>
                </div>
              </div>
              <div class="event-inquiry-field">
                <Counter
                  testId="event-inquiry-adults"
                  ariaLabel={text("Número de personas", "Number of guests")}
                  subtitle={text(
                    "Adultos y mayores de 12 años",
                    "Adults and guests aged 12+",
                  )}
                  value={values.adults}
                  min={1}
                  max={EVENT_INQUIRY_MAX_GUESTS - values.children}
                  onChange={(value) => set("adults", value)}
                />
              </div>
              <div class="event-inquiry-field">
                <Counter
                  testId="event-inquiry-children"
                  ariaLabel={text("Número de niños", "Number of children")}
                  subtitle={text("Menores de 12 años", "Under 12 years old")}
                  value={values.children}
                  min={0}
                  max={EVENT_INQUIRY_MAX_GUESTS - values.adults}
                  onChange={(value) => set("children", value)}
                />
              </div>
              <div class="event-inquiry-field event-inquiry-field--date">
                <span class="event-inquiry-label">
                  {text("Fecha orientativa", "Preferred date")}
                </span>
                <ReservationCalendar
                  testId="event-inquiry-calendar"
                  title={
                    values.date || text("Selecciona una fecha", "Select a date")
                  }
                  selectedDate={values.date || null}
                  todayISO={todayISO}
                  viewMonth0={viewMonth0}
                  viewYear={viewYear}
                  onViewChange={(month, year) => {
                    setViewMonth0(month);
                    setViewYear(year);
                  }}
                  monthAvailability={null}
                  rules={rules}
                  onPickDate={(iso) => set("date", iso)}
                  text={text}
                  lang={lang}
                />
              </div>
              {field(
                "notes",
                text(
                  "Alergias, intolerancias y otros detalles (opcional)",
                  "Allergies, intolerances and other details (optional)",
                ),
                <textarea
                  class="resvInput"
                  name="notes"
                  rows={5}
                  maxlength={2000}
                  value={values.notes}
                  placeholder={text(
                    "Cuéntanos cualquier detalle que debamos conocer…",
                    "Tell us anything we should know…",
                  )}
                  onInput={(e) => set("notes", e.currentTarget.value)}
                />,
              )}
            </div>
            <label class="event-inquiry-honeypot" aria-hidden="true">
              Website
              <input
                name="website"
                tabindex={-1}
                autocomplete="off"
                value={website}
                onInput={(e) => setWebsite(e.currentTarget.value)}
              />
            </label>
            {status === "error" ? (
              <p
                class="event-inquiry-error"
                role="alert"
                data-testid="event-inquiry-error"
              >
                {message}
              </p>
            ) : null}
            <p class="event-inquiry-disclaimer">
              {text(
                "Al enviar, solicitas información; no estás haciendo una reserva.",
                "By submitting, you are requesting information; you are not making a reservation.",
              )}
            </p>
            <button
              class="event-inquiry-submit"
              type="submit"
              data-testid="event-inquiry-submit"
            >
              {text("Solicitar información", "Request information")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
