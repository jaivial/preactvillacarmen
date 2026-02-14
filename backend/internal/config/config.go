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
	MySQL            MySQLConfig
}

func Load() Config {
	port := getenv("PORT", "8080")

	return Config{
		Addr:             ":" + port,
		StaticDir:        os.Getenv("STATIC_DIR"),
		CORSAllowOrigins: os.Getenv("CORS_ALLOW_ORIGINS"),
		AdminToken:       os.Getenv("ADMIN_TOKEN"),
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
