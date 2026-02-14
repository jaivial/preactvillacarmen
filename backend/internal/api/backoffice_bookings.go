package api

import (
	"context"
	"database/sql"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"preactvillacarmen/internal/httpx"
)

func (s *Server) handleBOBookingsList(w http.ResponseWriter, r *http.Request) {
	a, ok := boAuthFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	date := strings.TrimSpace(r.URL.Query().Get("date"))
	if date == "" || !isValidISODate(date) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid date format. Use YYYY-MM-DD",
		})
		return
	}

	status := strings.TrimSpace(r.URL.Query().Get("status"))
	switch status {
	case "", "pending", "confirmed":
	default:
		status = ""
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))

	limit := 50
	if v := strings.TrimSpace(r.URL.Query().Get("limit")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	offset := 0
	if v := strings.TrimSpace(r.URL.Query().Get("offset")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 && n <= 1_000_000 {
			offset = n
		}
	}

	restaurantID := a.ActiveRestaurantID

	where := "WHERE reservation_date = ? AND restaurant_id = ?"
	args := []any{date, restaurantID}
	if status != "" {
		where += " AND status = ?"
		args = append(args, status)
	}
	if q != "" {
		where += " AND (customer_name LIKE ? OR contact_phone LIKE ? OR contact_email LIKE ?)"
		pat := "%" + q + "%"
		args = append(args, pat, pat, pat)
	}

	var total int
	if err := s.db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM bookings "+where, args...).Scan(&total); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Error consultando bookings")
		return
	}

	sqlQuery := `
		SELECT
			id,
			customer_name,
			contact_email,
			DATE_FORMAT(reservation_date, '%Y-%m-%d') AS reservation_date,
			TIME_FORMAT(reservation_time, '%H:%i:%s') AS reservation_time,
			party_size,
			contact_phone,
			status,
			arroz_type,
			arroz_servings,
			babyStrollers,
			highChairs,
			table_number
		FROM bookings
	` + where + `
		ORDER BY reservation_time ASC, id ASC
		LIMIT ? OFFSET ?
	`
	argsList := append(append([]any{}, args...), limit, offset)

	rows, err := s.db.QueryContext(r.Context(), sqlQuery, argsList...)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Error consultando bookings")
		return
	}
	defer rows.Close()

	type row struct {
		ID              int
		CustomerName    string
		ContactEmail    string
		ReservationDate string
		ReservationTime string
		PartySize       int
		ContactPhone    sql.NullString
		Status          sql.NullString
		ArrozType       sql.NullString
		ArrozServings   sql.NullString
		BabyStrollers   sql.NullInt64
		HighChairs      sql.NullInt64
		TableNumber     sql.NullString
	}

	var bookings []map[string]any
	for rows.Next() {
		var b row
		if err := rows.Scan(
			&b.ID,
			&b.CustomerName,
			&b.ContactEmail,
			&b.ReservationDate,
			&b.ReservationTime,
			&b.PartySize,
			&b.ContactPhone,
			&b.Status,
			&b.ArrozType,
			&b.ArrozServings,
			&b.BabyStrollers,
			&b.HighChairs,
			&b.TableNumber,
		); err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Error leyendo bookings")
			return
		}

		bookings = append(bookings, map[string]any{
			"id":               b.ID,
			"customer_name":    b.CustomerName,
			"contact_email":    b.ContactEmail,
			"reservation_date": b.ReservationDate,
			"reservation_time": b.ReservationTime,
			"party_size":       b.PartySize,
			"contact_phone":    nullStringOrNil(b.ContactPhone),
			"status":           defaultString(b.Status, "pending"),
			"arroz_type":       nullStringOrNil(b.ArrozType),
			"arroz_servings":   nullStringOrNil(b.ArrozServings),
			"babyStrollers":    nullInt64OrNil(b.BabyStrollers),
			"highChairs":       nullInt64OrNil(b.HighChairs),
			"table_number":     nullStringOrNil(b.TableNumber),
		})
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success":  true,
		"bookings": bookings,
		"total":    total,
	})
}

func (s *Server) handleBOBookingCancel(w http.ResponseWriter, r *http.Request) {
	a, ok := boAuthFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := strings.TrimSpace(chi.URLParam(r, "id"))
	bookingID, err := strconv.Atoi(id)
	if err != nil || bookingID <= 0 {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid booking id",
		})
		return
	}

	restaurantID := a.ActiveRestaurantID

	type booking struct {
		ID              int
		ReservationDate string
		PartySize       int
		ReservationTime string
		CustomerName    string
		ContactPhone    sql.NullString
		ContactEmail    sql.NullString
		Commentary      sql.NullString
		ArrozType       sql.NullString
		ArrozServings   sql.NullString
		BabyStrollers   sql.NullInt64
		HighChairs      sql.NullInt64
		SpecialMenu     sql.NullInt64
		MenuDeGrupoID   sql.NullInt64
		PrincipalesJSON sql.NullString
	}

	var cancelled booking
	err = withTx(r.Context(), s.db, func(ctx context.Context, tx *sql.Tx) error {
		var b booking
		row := tx.QueryRowContext(ctx, `
			SELECT
				id,
				DATE_FORMAT(reservation_date, '%Y-%m-%d') AS reservation_date,
				party_size,
				TIME_FORMAT(reservation_time, '%H:%i:%s') AS reservation_time,
				customer_name,
				contact_phone,
				contact_email,
				commentary,
				arroz_type,
				arroz_servings,
				babyStrollers,
				highChairs,
				special_menu,
				menu_de_grupo_id,
				principales_json
			FROM bookings
			WHERE id = ? AND restaurant_id = ?
		`, bookingID, restaurantID)
		if err := row.Scan(
			&b.ID,
			&b.ReservationDate,
			&b.PartySize,
			&b.ReservationTime,
			&b.CustomerName,
			&b.ContactPhone,
			&b.ContactEmail,
			&b.Commentary,
			&b.ArrozType,
			&b.ArrozServings,
			&b.BabyStrollers,
			&b.HighChairs,
			&b.SpecialMenu,
			&b.MenuDeGrupoID,
			&b.PrincipalesJSON,
		); err != nil {
			return err
		}

		cancelled = b

		_, err := tx.ExecContext(ctx, `
			INSERT INTO cancelled_bookings
				(restaurant_id, booking_id, reservation_date, party_size, reservation_time, customer_name,
				 contact_phone, contact_email, commentary, arroz_type, arroz_servings,
				 babyStrollers, highChairs, cancellation_date, cancelled_by,
				 special_menu, menu_de_grupo_id, principales_json)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'staff', ?, ?, ?)
		`,
			restaurantID,
			b.ID,
			b.ReservationDate,
			b.PartySize,
			b.ReservationTime,
			b.CustomerName,
			b.ContactPhone.String,
			b.ContactEmail.String,
			b.Commentary.String,
			nullStringOrNil(b.ArrozType),
			nullStringOrNil(b.ArrozServings),
			nullIntToInt(b.BabyStrollers),
			nullIntToInt(b.HighChairs),
			int64OrZero(b.SpecialMenu),
			nullInt64OrNil(b.MenuDeGrupoID),
			nullStringOrNil(b.PrincipalesJSON),
		)
		if err != nil {
			return err
		}

		res, err := tx.ExecContext(ctx, "DELETE FROM bookings WHERE id = ? AND restaurant_id = ?", bookingID, restaurantID)
		if err != nil {
			return err
		}
		affected, _ := res.RowsAffected()
		if affected <= 0 {
			return sql.ErrNoRows
		}
		return nil
	})
	if err != nil {
		if err == sql.ErrNoRows {
			httpx.WriteJSON(w, http.StatusOK, map[string]any{
				"success": false,
				"message": "Booking not found",
			})
			return
		}
		httpx.WriteError(w, http.StatusInternalServerError, "Error cancelando booking")
		return
	}

	s.emitN8nWebhookAsync(restaurantID, "booking.cancelled", map[string]any{
		"source":          "backoffice_cancel",
		"cancelledBy":     "staff",
		"bookingId":       cancelled.ID,
		"reservationDate": cancelled.ReservationDate,
		"reservationTime": cancelled.ReservationTime,
		"partySize":       cancelled.PartySize,
		"customerName":    cancelled.CustomerName,
		"contactPhone":    cancelled.ContactPhone.String,
		"contactEmail":    cancelled.ContactEmail.String,
	})

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
	})
}
