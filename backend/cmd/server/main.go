package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"

	"preactvillacarmen/internal/api"
	"preactvillacarmen/internal/config"
	"preactvillacarmen/internal/db"
	"preactvillacarmen/internal/db/migrations"
)

func main() {
	_ = godotenv.Overload("../.env")
	_ = godotenv.Overload(".env")

	cfg := config.Load()

	sqlDB, err := db.OpenMySQL(cfg.MySQL)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	defer sqlDB.Close()

	// Schema migrations (including backoffice auth + multitenant columns).
	{
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		if err := migrations.Apply(ctx, sqlDB); err != nil {
			log.Fatalf("db migrations: %v", err)
		}
	}

	apiServer := api.NewServer(sqlDB, cfg)
	apiHandler := apiServer.Routes()

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(15 * time.Second))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Primary API mount.
	r.Mount("/api", apiHandler)

	// Legacy compatibility: some old PHP pages call these endpoints without the "/api" prefix.
	// Keep the SPA routes working by only aliasing the legacy .php endpoints (not /vinos, /postres, etc.).
	for _, p := range []string{
		"/api_vinos.php",
		"/updateDishDia.php",
		"/toggleDishStatusDia.php",
		"/searchDishesDia.php",
		"/updateDish.php",
		"/toggleDishStatus.php",
		"/searchDishesFinde.php",
		"/updatePostre.php",
		"/searchPostres.php",
		"/fetch_arroz.php",
		"/fetch_daily_limit.php",
		"/fetch_month_availability.php",
		"/fetch_closed_days.php",
		"/fetch_mesas_de_dos.php",
		"/salon_condesa_api.php",
		"/insert_booking_front.php",
		"/insert_booking.php",
		"/fetch_bookings.php",
		"/get_booking.php",
		"/edit_booking.php",
		"/delete_booking.php",
		"/update_table_number.php",
		"/get_reservations.php",
		"/fetch_cancelled_bookings.php",
		"/reactivate_booking.php",
		"/update_daily_limit.php",
		"/limitemesasdedos.php",
		"/get_mesasdedos_limit.php",
		"/check_day_status.php",
		"/open_day.php",
		"/close_day.php",
		"/fetch_occupancy.php",
		"/gethourdata.php",
		"/savehourdata.php",
		"/update_reservation.php",
		"/checkcancel.php",
		"/modification_checker.php",
		"/get_conversation_state.php",
		"/save_conversation_state.php",
		"/n8nReminder.php",
		"/confirm_reservation.php",
		"/cancel_reservation.php",
		"/book_rice.php",
		"/emailAdvertising/sendEmailAndWhastappAd.php",
		"/menu-visibility", // legacy clients sometimes call without /api
	} {
		r.Handle(p, apiHandler)
	}
	r.Handle("/menuVisibilityBackend/*", apiHandler)
	r.Handle("/menuDeGruposBackend/*", apiHandler)

	staticDir := cfg.StaticDir
	if staticDir == "" {
		staticDir = "../frontend/dist"
	}
	staticDir, _ = filepath.Abs(staticDir)
	r.Handle("/*", api.SPAHandler(staticDir))

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       20 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("listening on %s (static=%s)", cfg.Addr, staticDir)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
