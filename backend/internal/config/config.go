package config

import (
	"os"
)

type MySQLConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
}

type Config struct {
	Addr             string
	StaticDir        string
	CORSAllowOrigins string
	AdminToken       string
	BunnyPullBaseURL string
	BunnyStorageZone string
	BunnyStorageKey  string
	MySQL            MySQLConfig
}

func Load() Config {
	port := getenv("PORT", "8080")

	return Config{
		Addr:             ":" + port,
		StaticDir:        os.Getenv("STATIC_DIR"),
		CORSAllowOrigins: os.Getenv("CORS_ALLOW_ORIGINS"),
		AdminToken:       os.Getenv("ADMIN_TOKEN"),
		BunnyPullBaseURL: getenv("BUNNY_PULL_BASE_URL", "https://villacarmen.b-cdn.net"),
		BunnyStorageZone: getenv("BUNNY_STORAGE_ZONE", "villacarmen"),
		BunnyStorageKey:  os.Getenv("BUNNY_STORAGE_ACCESS_KEY"),
		MySQL: MySQLConfig{
			Host:     getenv("DB_HOST", "127.0.0.1"),
			Port:     getenv("DB_PORT", "3306"),
			User:     getenv("DB_USER", "villacarmen"),
			Password: getenv("DB_PASSWORD", "villacarmen"),
			DBName:   getenv("DB_NAME", "villacarmen"),
		},
	}
}

func getenv(key, fallback string) string {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	return val
}
