package api

import (
	"database/sql"
	"net/http"
	"net/mail"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"preactvillacarmen/internal/httpx"
)

// Legacy admin tool endpoint: /emailAdvertising/sendEmailAndWhastappAd.php?action=send&type=all|email|whatsapp
// The original PHP implementation used PHPMailer + Twilio. In Go we support:
// - extracting unique contacts from `bookings`
// - WhatsApp sending via UAZAPI if configured (UAZAPI_URL + UAZAPI_TOKEN)
// Email sending is currently a no-op unless you wire SMTP; we count them as failed with a clear log entry.
func (s *Server) handleSendEmailAndWhatsappAd(w http.ResponseWriter, r *http.Request) {
	restaurantID, ok := restaurantIDFromContext(r.Context())
	if !ok {
		httpx.WriteJSON(w, http.StatusNotFound, map[string]any{
			"success": false,
			"error":   "Unknown restaurant",
			"logs":    []string{"Unknown restaurant"},
		})
		return
	}

	action := strings.TrimSpace(r.URL.Query().Get("action"))
	if action != "send" {
		httpx.WriteJSON(w, http.StatusNotFound, map[string]any{
			"success": false,
			"error":   "Not found",
			"logs":    []string{"Endpoint only supports ?action=send"},
		})
		return
	}

	campaignType := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("type")))
	if campaignType != "all" && campaignType != "email" && campaignType != "whatsapp" {
		campaignType = "all"
	}

	results := map[string]any{
		"success":        false,
		"total_emails":   0,
		"total_phones":   0,
		"emails_sent":    0,
		"emails_failed":  0,
		"whatsapp_sent":  0,
		"whatsapp_failed": 0,
		"details":        []any{},
		"logs":           []string{},
	}
	logs := results["logs"].([]string)
	details := results["details"].([]any)

	logs = append(logs, "Iniciando extracción de contactos únicos...")

	rows, err := s.db.QueryContext(r.Context(), `
		SELECT DISTINCT contact_email, contact_phone
		FROM bookings
		WHERE restaurant_id = ?
		  AND (contact_email IS NOT NULL OR contact_phone IS NOT NULL)
	`, restaurantID)
	if err != nil {
		results["logs"] = append(logs, "✗ Error extrayendo contactos: "+err.Error())
		results["error"] = err.Error()
		httpx.WriteJSON(w, http.StatusOK, results)
		return
	}
	defer rows.Close()

	emails := map[string]bool{}
	phones := map[string]bool{}

	for rows.Next() {
		var email sql.NullString
		var phone sql.NullString
		if err := rows.Scan(&email, &phone); err != nil {
			continue
		}
		if email.Valid {
			e := strings.TrimSpace(email.String)
			if e != "" {
				if _, err := mail.ParseAddress(e); err == nil {
					emails[e] = true
				}
			}
		}
		if phone.Valid {
			p := strings.TrimSpace(phone.String)
			if p != "" {
				// Keep digits only.
				p = strings.Map(func(r rune) rune {
					if r >= '0' && r <= '9' {
						return r
					}
					return -1
				}, p)
				if len(p) == 11 && strings.HasPrefix(p, "34") {
					p = p[2:]
				}
				if len(p) == 9 {
					phones[p] = true
				}
			}
		}
	}

	results["total_emails"] = len(emails)
	results["total_phones"] = len(phones)
	logs = append(logs, "Encontrados "+strconv.Itoa(len(emails))+" emails únicos y "+strconv.Itoa(len(phones))+" teléfonos únicos")

	// Deterministic order for logs/results.
	emailList := make([]string, 0, len(emails))
	for e := range emails {
		emailList = append(emailList, e)
	}
	sort.Strings(emailList)

	phoneList := make([]string, 0, len(phones))
	for p := range phones {
		phoneList = append(phoneList, p)
	}
	sort.Strings(phoneList)

	branding, _ := s.loadRestaurantBranding(r.Context(), restaurantID)
	brandName := strings.TrimSpace(branding.BrandName)
	if brandName == "" {
		brandName = "Restaurante"
	}
	baseURL := strings.TrimRight(publicBaseURL(r), "/")

	advertisingMessage := "🌟 ¡La magia vuelve a " + brandName + "!\n\n" +
		"⛱️ Tras las vacaciones, abrimos nuestras puertas para que disfrutes de momentos inolvidables en familia en nuestro entorno mágico.\n" +
		"🧑🏻‍🍳 Saborea la esencia de la cocina mediterránea casera, con productos de la tierra de primera calidad.\n" +
		"🥘 Reconocidos en el Top 50 Paella de Las Provincias.\n\n" +
		"Reserva ya: " + baseURL

	if campaignType == "all" || campaignType == "email" {
		// Email sending not implemented in Go backend (no SMTP configured).
		logs = append(logs, "Comenzando envío de emails...")
		for _, e := range emailList {
			results["emails_failed"] = results["emails_failed"].(int) + 1
			details = append(details, map[string]any{
				"type":    "email",
				"contact": e,
				"name":    "Estimado cliente",
				"success": false,
				"error":   "Email sending not configured (SMTP not set up in Go backend)",
			})
			logs = append(logs, "✗ Email NO enviado a: "+e+" (SMTP no configurado)")
		}
	} else {
		logs = append(logs, "Omitiendo envío de emails (no incluido en este tipo de campaña)")
	}

	if campaignType == "all" || campaignType == "whatsapp" {
		logs = append(logs, "Comenzando envío de WhatsApp...")

		uazURL, uazToken := s.uazapiBaseAndToken(r.Context(), restaurantID)
		sendURL := ""
		if uazURL != "" {
			sendURL = uazURL + "/send/text"
			if uazToken != "" {
				sendURL += "?token=" + url.QueryEscape(uazToken)
			}
		}

		if sendURL == "" {
			for _, p := range phoneList {
				results["whatsapp_failed"] = results["whatsapp_failed"].(int) + 1
				details = append(details, map[string]any{
					"type":    "whatsapp",
					"contact": p,
					"name":    "Estimado cliente",
					"success": false,
					"error":   "UAZAPI_URL/UAZAPI_TOKEN not configured",
				})
			}
			logs = append(logs, "✗ WhatsApp NO enviados: UAZAPI_URL/UAZAPI_TOKEN no configurados")
		} else {
			for _, p := range phoneList {
				number := "34" + p
				body, code, err := sendUazAPI(r.Context(), sendURL, map[string]any{
					"number": number,
					"text":   advertisingMessage,
				})
				sent := err == nil && (code == 200 || code == 201)
				if sent {
					results["whatsapp_sent"] = results["whatsapp_sent"].(int) + 1
					logs = append(logs, "✓ WhatsApp enviado a: +34"+p)
				} else {
					results["whatsapp_failed"] = results["whatsapp_failed"].(int) + 1
					logs = append(logs, "✗ Error enviando WhatsApp a: +34"+p)
				}
				detail := map[string]any{
					"type":    "whatsapp",
					"contact": p,
					"name":    "Estimado cliente",
					"success": sent,
				}
				if !sent {
					if err != nil {
						detail["error"] = err.Error()
					} else {
						detail["error"] = "HTTP " + strconv.Itoa(code) + ": " + body
					}
				}
				details = append(details, detail)
			}
		}
	} else {
		logs = append(logs, "Omitiendo envío de WhatsApp (no incluido en este tipo de campaña)")
	}

	results["logs"] = logs
	results["details"] = details
	results["success"] = results["emails_sent"].(int) > 0 || results["whatsapp_sent"].(int) > 0

	httpx.WriteJSON(w, http.StatusOK, results)
}
