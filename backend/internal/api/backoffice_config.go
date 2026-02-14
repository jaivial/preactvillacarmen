package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"preactvillacarmen/internal/httpx"
)

type boConfigDayRequest struct {
	Date   string `json:"date"`
	IsOpen bool   `json:"isOpen"`
}

func (s *Server) handleBOConfigDayGet(w http.ResponseWriter, r *http.Request) {
	a, ok := boAuthFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	date := strings.TrimSpace(r.URL.Query().Get("date"))
	if date == "" || !isValidISODate(date) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid date",
		})
		return
	}

	var isOpenInt sql.NullInt64
	err := s.db.QueryRowContext(r.Context(), `
		SELECT is_open
		FROM restaurant_days
		WHERE restaurant_id = ? AND date = ?
		LIMIT 1
	`, a.ActiveRestaurantID, date).Scan(&isOpenInt)
	if err != nil && err != sql.ErrNoRows {
		httpx.WriteError(w, http.StatusInternalServerError, "Error consultando restaurant_days")
		return
	}

	// Default: open unless explicitly closed.
	isOpen := true
	if isOpenInt.Valid {
		isOpen = isOpenInt.Int64 != 0
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"date":    date,
		"isOpen":  isOpen,
	})
}

func (s *Server) handleBOConfigDaySet(w http.ResponseWriter, r *http.Request) {
	a, ok := boAuthFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req boConfigDayRequest
	if err := readJSONBody(r, &req); err != nil {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"message": "Invalid JSON",
		})
		return
	}
	date := strings.TrimSpace(req.Date)
	if date == "" || !isValidISODate(date) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid date",
		})
		return
	}

	isOpenInt := 0
	if req.IsOpen {
		isOpenInt = 1
	}

	// Upsert by (restaurant_id, date).
	_, err := s.db.ExecContext(r.Context(), `
		INSERT INTO restaurant_days (restaurant_id, date, is_open)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE is_open = VALUES(is_open)
	`, a.ActiveRestaurantID, date, isOpenInt)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Error actualizando restaurant_days")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"date":    date,
		"isOpen":  req.IsOpen,
	})
}

type boConfigOpeningHoursRequest struct {
	Date  string   `json:"date"`
	Hours []string `json:"hours"`
}

func (s *Server) handleBOConfigOpeningHoursGet(w http.ResponseWriter, r *http.Request) {
	a, ok := boAuthFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	date := strings.TrimSpace(r.URL.Query().Get("date"))
	if date == "" || !isValidISODate(date) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid date",
		})
		return
	}

	var hoursRaw sql.NullString
	err := s.db.QueryRowContext(r.Context(), `
		SELECT hoursarray
		FROM openinghours
		WHERE restaurant_id = ? AND dateselected = ?
		LIMIT 1
	`, a.ActiveRestaurantID, date).Scan(&hoursRaw)
	if err != nil && err != sql.ErrNoRows {
		httpx.WriteError(w, http.StatusInternalServerError, "Error consultando openinghours")
		return
	}

	var hours []string
	if hoursRaw.Valid && strings.TrimSpace(hoursRaw.String) != "" {
		_ = json.Unmarshal([]byte(hoursRaw.String), &hours)
	}
	sort.Strings(hours)

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"date":    date,
		"hours":   hours,
	})
}

func (s *Server) handleBOConfigOpeningHoursSet(w http.ResponseWriter, r *http.Request) {
	a, ok := boAuthFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req boConfigOpeningHoursRequest
	if err := readJSONBody(r, &req); err != nil {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"message": "Invalid JSON",
		})
		return
	}
	date := strings.TrimSpace(req.Date)
	if date == "" || !isValidISODate(date) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid date",
		})
		return
	}

	// Normalize and dedupe HH:MM.
	seen := map[string]bool{}
	var normalized []string
	for _, h := range req.Hours {
		hhmm, err := normalizeHHMM(h)
		if err != nil {
			continue
		}
		if seen[hhmm] {
			continue
		}
		seen[hhmm] = true
		normalized = append(normalized, hhmm)
	}
	sort.Strings(normalized)

	hoursJSON, _ := json.Marshal(normalized)

	_, err := s.db.ExecContext(r.Context(), `
		INSERT INTO openinghours (restaurant_id, dateselected, hoursarray)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE hoursarray = VALUES(hoursarray)
	`, a.ActiveRestaurantID, date, string(hoursJSON))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Error actualizando openinghours")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"date":    date,
		"hours":   normalized,
	})
}

type boConfigMesasDeDosRequest struct {
	Date  string `json:"date"`
	Limit string `json:"limit"`
}

func (s *Server) handleBOConfigMesasDeDosGet(w http.ResponseWriter, r *http.Request) {
	a, ok := boAuthFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	date := strings.TrimSpace(r.URL.Query().Get("date"))
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	if !isValidISODate(date) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid date",
		})
		return
	}

	var limit sql.NullString
	err := s.db.QueryRowContext(r.Context(), `
		SELECT dailyLimit
		FROM mesas_de_dos
		WHERE restaurant_id = ? AND reservationDate = ?
		LIMIT 1
	`, a.ActiveRestaurantID, date).Scan(&limit)
	if err != nil && err != sql.ErrNoRows {
		httpx.WriteError(w, http.StatusInternalServerError, "Error consultando mesas_de_dos")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"date":    date,
		"limit":   limit.String,
	})
}

func (s *Server) handleBOConfigMesasDeDosSet(w http.ResponseWriter, r *http.Request) {
	a, ok := boAuthFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req boConfigMesasDeDosRequest
	if err := readJSONBody(r, &req); err != nil {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"message": "Invalid JSON",
		})
		return
	}

	date := strings.TrimSpace(req.Date)
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	if !isValidISODate(date) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid date",
		})
		return
	}

	limit := strings.TrimSpace(req.Limit)
	if limit == "" {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "limit requerido",
		})
		return
	}
	// Legacy semantics: "sin_limite" means 999.
	if strings.EqualFold(limit, "sin_limite") {
		limit = "999"
	}
	if _, err := strconv.Atoi(limit); err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "limit invalido",
		})
		return
	}

	_, err := s.db.ExecContext(r.Context(), `
		INSERT INTO mesas_de_dos (restaurant_id, reservationDate, dailyLimit)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE dailyLimit = VALUES(dailyLimit)
	`, a.ActiveRestaurantID, date, limit)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Error actualizando mesas_de_dos")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"date":    date,
		"limit":   limit,
	})
}

type boConfigSalonCondesaRequest struct {
	Date  string `json:"date"`
	State bool   `json:"state"`
}

func (s *Server) handleBOConfigSalonCondesaGet(w http.ResponseWriter, r *http.Request) {
	a, ok := boAuthFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	date := strings.TrimSpace(r.URL.Query().Get("date"))
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	if !isValidISODate(date) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid date",
		})
		return
	}

	var state sql.NullInt64
	err := s.db.QueryRowContext(r.Context(), `
		SELECT state
		FROM salon_condesa
		WHERE restaurant_id = ? AND date = ?
		LIMIT 1
	`, a.ActiveRestaurantID, date).Scan(&state)
	if err != nil && err != sql.ErrNoRows {
		httpx.WriteError(w, http.StatusInternalServerError, "Error consultando salon_condesa")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"date":    date,
		"state":   state.Valid && state.Int64 != 0,
	})
}

func (s *Server) handleBOConfigSalonCondesaSet(w http.ResponseWriter, r *http.Request) {
	a, ok := boAuthFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req boConfigSalonCondesaRequest
	if err := readJSONBody(r, &req); err != nil {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"message": "Invalid JSON",
		})
		return
	}

	date := strings.TrimSpace(req.Date)
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	if !isValidISODate(date) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid date",
		})
		return
	}

	stateInt := 0
	if req.State {
		stateInt = 1
	}

	_, err := s.db.ExecContext(r.Context(), `
		INSERT INTO salon_condesa (restaurant_id, date, state)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE state = VALUES(state)
	`, a.ActiveRestaurantID, date, stateInt)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Error actualizando salon_condesa")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"date":    date,
		"state":   req.State,
	})
}

type boConfigDailyLimitRequest struct {
	Date  string `json:"date"`
	Limit int    `json:"limit"`
}

func (s *Server) handleBOConfigDailyLimitGet(w http.ResponseWriter, r *http.Request) {
	a, ok := boAuthFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	date := strings.TrimSpace(r.URL.Query().Get("date"))
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	if !isValidISODate(date) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid date",
		})
		return
	}

	restaurantID := a.ActiveRestaurantID

	// Best-effort daily limit (reservation_manager schema is legacy).
	var dailyLimit sql.NullInt64
	_ = s.db.QueryRowContext(r.Context(), `
		SELECT dailyLimit
		FROM reservation_manager
		WHERE restaurant_id = ? AND reservationDate = ?
		ORDER BY id DESC
		LIMIT 1
	`, restaurantID, date).Scan(&dailyLimit)

	limit := int64(45)
	if dailyLimit.Valid {
		limit = dailyLimit.Int64
	}

	var totalPeople int64
	_ = s.db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(party_size), 0)
		FROM bookings
		WHERE restaurant_id = ? AND reservation_date = ?
	`, restaurantID, date).Scan(&totalPeople)

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success":          true,
		"date":             date,
		"limit":            limit,
		"totalPeople":      totalPeople,
		"freeBookingSeats": limit - totalPeople,
	})
}

func (s *Server) handleBOConfigDailyLimitSet(w http.ResponseWriter, r *http.Request) {
	a, ok := boAuthFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req boConfigDailyLimitRequest
	if err := readJSONBody(r, &req); err != nil {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"message": "Invalid JSON",
		})
		return
	}

	date := strings.TrimSpace(req.Date)
	if date == "" || !isValidISODate(date) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid date",
		})
		return
	}
	if req.Limit < 0 || req.Limit > 500 {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": "Invalid limit",
		})
		return
	}

	// Keep a single row per (restaurant_id, date): reservation_manager lacks a unique key in dumps.
	restaurantID := a.ActiveRestaurantID
	_, _ = s.db.ExecContext(r.Context(), "DELETE FROM reservation_manager WHERE restaurant_id = ? AND reservationDate = ?", restaurantID, date)
	_, err := s.db.ExecContext(r.Context(), `
		INSERT INTO reservation_manager (restaurant_id, reservationDate, dailyLimit)
		VALUES (?, ?, ?)
	`, restaurantID, date, req.Limit)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Error actualizando reservation_manager")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"date":    date,
		"limit":   req.Limit,
	})
}

