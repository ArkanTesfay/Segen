package catalog

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

type Title struct {
	ID              string   `json:"id"`
	Slug            string   `json:"slug"`
	Kind            string   `json:"kind"`
	Title           string   `json:"title"`
	Tagline         string   `json:"tagline"`
	Synopsis        string   `json:"synopsis"`
	Year            int      `json:"year"`
	DurationMinutes *int     `json:"durationMinutes,omitempty"`
	Seasons         *int     `json:"seasons,omitempty"`
	MaturityRating  string   `json:"maturityRating"`
	Genres          []string `json:"genres"`
	Languages       []string `json:"languages"`
	Cast            []string `json:"cast"`
	Director        string   `json:"director"`
	Rating          float64  `json:"rating"`
	TrendingRank    *int     `json:"trendingRank,omitempty"`
	IsOriginal      bool     `json:"isOriginal"`
}

func scanTitle(row interface {
	Scan(...any) error
}) (Title, error) {
	var t Title
	var genres, langs, cast pq.StringArray
	var rating sql.NullFloat64
	var rank sql.NullInt64
	var dur, seasons sql.NullInt64
	err := row.Scan(&t.ID, &t.Slug, &t.Kind, &t.Title, &t.Tagline, &t.Synopsis, &t.Year,
		&dur, &seasons, &t.MaturityRating, &genres, &langs, &cast, &t.Director, &rating, &rank, &t.IsOriginal)
	if err != nil {
		return t, err
	}
	t.Genres = []string(genres)
	t.Languages = []string(langs)
	t.Cast = []string(cast)
	if rating.Valid {
		t.Rating = rating.Float64
	}
	if rank.Valid {
		v := int(rank.Int64)
		t.TrendingRank = &v
	}
	if dur.Valid {
		v := int(dur.Int64)
		t.DurationMinutes = &v
	}
	if seasons.Valid {
		v := int(seasons.Int64)
		t.Seasons = &v
	}
	// Gradient placeholders until real S3 artwork; derived deterministically.
	return t, nil
}

const titleCols = `id, slug, kind, title, tagline, synopsis, release_year, duration_minutes, seasons, maturity_rating, genres, languages, cast_members, director, rating, trending_rank, is_original`

// List returns trending-first catalog, cached in Redis for 60s (speed goal).
func List(ctx context.Context, db *sql.DB, rdb *redis.Client) ([]Title, error) {
	if rdb != nil {
		if s, err := rdb.Get(ctx, "catalog:list").Result(); err == nil && s != "" {
			var cached []Title
			if json.Unmarshal([]byte(s), &cached) == nil {
				return cached, nil
			}
		}
	}
	rows, err := db.QueryContext(ctx, `SELECT `+titleCols+` FROM titles ORDER BY trending_rank NULLS LAST, rating DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Title
	for rows.Next() {
		t, err := scanTitle(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	if rdb != nil {
		if b, err := json.Marshal(out); err == nil {
			rdb.Set(ctx, "catalog:list", b, 60*time.Second)
		}
	}
	return out, nil
}

func BySlug(ctx context.Context, db *sql.DB, slug string) (Title, error) {
	row := db.QueryRowContext(ctx, `SELECT `+titleCols+` FROM titles WHERE slug = $1`, slug)
	return scanTitle(row)
}

func Search(ctx context.Context, db *sql.DB, q string) ([]Title, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+titleCols+` FROM titles
		WHERE search_tsv @@ plainto_tsquery('english', $1)
		   OR title ILIKE '%' || $1 || '%'
		ORDER BY ts_rank(search_tsv, plainto_tsquery('english', $1)) DESC, rating DESC LIMIT 30`, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Title
	for rows.Next() {
		t, err := scanTitle(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, nil
}
