package api

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"net/http"
	"strings"

	"preactvillacarmen/internal/httpx"
)

const boSessionCookieName = "bo_session"

func sha256Hex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

func (s *Server) requireBOSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie(boSessionCookieName)
		if err != nil || strings.TrimSpace(c.Value) == "" {
			httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		token := strings.TrimSpace(c.Value)
		tokenSHA := sha256Hex(token)

		var (
			sessionID          int64
			userID             int
			activeRestaurantID int
			email              string
			name               string
			isSuper            int
		)
		err = s.db.QueryRowContext(r.Context(), `
			SELECT s.id, s.user_id, s.active_restaurant_id, u.email, u.name, u.is_superadmin
			FROM bo_sessions s
			JOIN bo_users u ON u.id = s.user_id
			WHERE s.token_sha256 = ? AND s.expires_at > NOW()
			LIMIT 1
		`, tokenSHA).Scan(&sessionID, &userID, &activeRestaurantID, &email, &name, &isSuper)
		if err != nil {
			if err == sql.ErrNoRows {
				httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
				return
			}
			httpx.WriteError(w, http.StatusInternalServerError, "Error validating session")
			return
		}

		// Best-effort heartbeat.
		_, _ = s.db.ExecContext(r.Context(), "UPDATE bo_sessions SET last_seen_at = NOW() WHERE id = ?", sessionID)

		a := boAuth{
			SessionID:          sessionID,
			TokenSHA256:        tokenSHA,
			User:               boUser{ID: userID, Email: email, Name: name, isSuperadmin: isSuper != 0},
			ActiveRestaurantID: activeRestaurantID,
		}
		next.ServeHTTP(w, r.WithContext(withBOAuth(r.Context(), a)))
	})
}

