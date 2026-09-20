package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/segen/api/internal/auth"
	"github.com/segen/api/internal/cache"
	"github.com/segen/api/internal/catalog"
	"github.com/segen/api/internal/db"
	"github.com/segen/api/internal/playback"
	"github.com/redis/go-redis/v9"
)

var (
	sqlDB *sql.DB
	rdb   *redis.Client
)

func main() {
	loadDotEnv()
	verifier := auth.NewVerifierFromEnv()

	var err error
	sqlDB, err = db.OpenFromEnv()
	if err != nil {
		log.Printf("WARN: postgres unavailable (%v) — /v1/titles falls back to empty until docker compose up", err)
	}
	rdb = cache.OpenFromEnv()
	runMigrations()

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]string{"status": "ok", "service": "segen-api"})
	})

	// Public catalog (CDN-friendly, Redis-cached 60s).
	mux.HandleFunc("/v1/titles", func(w http.ResponseWriter, r *http.Request) {
		if sqlDB == nil {
			writeJSON(w, []any{})
			return
		}
		titles, err := catalog.List(r.Context(), sqlDB, rdb)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, titles)
	})
	mux.HandleFunc("/v1/titles/", func(w http.ResponseWriter, r *http.Request) {
		if sqlDB == nil {
			http.NotFound(w, r)
			return
		}
		slug := r.URL.Path[len("/v1/titles/"):]
		t, err := catalog.BySlug(r.Context(), sqlDB, slug)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		writeJSON(w, t)
	})
	mux.HandleFunc("/v1/search", func(w http.ResponseWriter, r *http.Request) {
		if sqlDB == nil {
			writeJSON(w, []any{})
			return
		}
		out, err := catalog.Search(r.Context(), sqlDB, r.URL.Query().Get("q"))
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, out)
	})

	// Authenticated: Cognito JWT -> Postgres user row.
	protected := http.NewServeMux()
	protected.HandleFunc("/v1/me", func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFrom(r.Context())
		writeJSON(w, map[string]string{"sub": claims.Sub, "email": claims.Email})
	})
	protected.HandleFunc("/v1/playback/authorize", func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFrom(r.Context())
		titleID := r.URL.Query().Get("titleId")
		resume := 0
		if sqlDB != nil && titleID != "" {
			if p, err := playback.GetProgress(r.Context(), sqlDB, claims.Sub, titleID); err == nil {
				resume = p.WatchedSeconds
			}
		}
		writeJSON(w, map[string]any{
			"titleId":       titleID,
			"hlsUrl":        os.Getenv("DEMO_HLS_URL"),
			"expiresAt":     time.Now().Add(4 * time.Hour).Format(time.RFC3339),
			"resumeSeconds": resume,
		})
	})
	protected.HandleFunc("/v1/progress", func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFrom(r.Context())
		if r.Method == http.MethodGet {
			out, _ := playback.ContinueWatching(r.Context(), sqlDB, claims.Sub)
			writeJSON(w, out)
			return
		}
		var body struct {
			TitleID   string `json:"titleId"`
			Watched   int    `json:"watchedSeconds"`
			Duration  int    `json:"durationSeconds"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		p, err := playback.SaveProgress(r.Context(), sqlDB, claims.Sub, claims.Email, body.TitleID, body.Watched, body.Duration)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, p)
	})
	protected.HandleFunc("/v1/favorites", func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFrom(r.Context())
		if r.Method == http.MethodGet {
			out, _ := playback.ListFavorites(r.Context(), sqlDB, claims.Sub)
			writeJSON(w, out)
			return
		}
		titleID := r.URL.Query().Get("titleId")
		if titleID == "" {
			var body struct {
				TitleID string `json:"titleId"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			titleID = body.TitleID
		}
		added, err := playback.ToggleFavorite(r.Context(), sqlDB, claims.Sub, claims.Email, titleID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]any{"titleId": titleID, "favorited": added})
	})
	authed := auth.RequireAuth(verifier, protected)
	mux.Handle("/v1/me", authed)
	mux.Handle("/v1/me/", authed)
	mux.Handle("/v1/playback/", authed)
	mux.Handle("/v1/progress", authed)
	mux.Handle("/v1/favorites", authed)

	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}
	if _, err := strconv.Atoi(port); err != nil {
		port = "8080"
	}
	log.Printf("segen-api listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, withCORS(mux)))
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}


