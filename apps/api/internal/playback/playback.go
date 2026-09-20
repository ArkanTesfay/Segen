package playback

import (
	"context"
	"database/sql"
	"time"
)

type Progress struct {
	TitleID         string    `json:"titleId"`
	WatchedSeconds  int       `json:"watchedSeconds"`
	DurationSeconds int       `json:"durationSeconds"`
	Completed       bool      `json:"completed"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

func ensureUser(ctx context.Context, db *sql.DB, sub, email string) (string, error) {
	var id string
	err := db.QueryRowContext(ctx, `INSERT INTO users (cognito_sub, email, display_name)
		VALUES ($1, $2, $3) ON CONFLICT (cognito_sub) DO UPDATE SET email = EXCLUDED.email
		RETURNING id`, sub, email, email).Scan(&id)
	return id, err
}

func SaveProgress(ctx context.Context, db *sql.DB, sub, email, titleID string, watched, duration int) (Progress, error) {
	userID, err := ensureUser(ctx, db, sub, email)
	if err != nil {
		return Progress{}, err
	}
	completed := duration > 0 && watched >= int(float64(duration)*0.92)
	var p Progress
	err = db.QueryRowContext(ctx, `INSERT INTO watch_history (user_id, title_id, watched_seconds, duration_seconds, completed)
		VALUES ($1,$2,$3,$4,$5)
		ON CONFLICT (user_id, title_id) DO UPDATE SET watched_seconds = EXCLUDED.watched_seconds,
			duration_seconds = EXCLUDED.duration_seconds, completed = EXCLUDED.completed, updated_at = now()
		RETURNING title_id, watched_seconds, duration_seconds, completed, updated_at`,
		userID, titleID, watched, duration, completed).Scan(&p.TitleID, &p.WatchedSeconds, &p.DurationSeconds, &p.Completed, &p.UpdatedAt)
	return p, err
}

func GetProgress(ctx context.Context, db *sql.DB, sub, titleID string) (Progress, error) {
	var p Progress
	err := db.QueryRowContext(ctx, `SELECT wh.title_id, wh.watched_seconds, wh.duration_seconds, wh.completed, wh.updated_at
		FROM watch_history wh JOIN users u ON u.id = wh.user_id
		WHERE u.cognito_sub = $1 AND wh.title_id = $2`, sub, titleID).
		Scan(&p.TitleID, &p.WatchedSeconds, &p.DurationSeconds, &p.Completed, &p.UpdatedAt)
	return p, err
}

func ContinueWatching(ctx context.Context, db *sql.DB, sub string) ([]Progress, error) {
	rows, err := db.QueryContext(ctx, `SELECT wh.title_id, wh.watched_seconds, wh.duration_seconds, wh.completed, wh.updated_at
		FROM watch_history wh JOIN users u ON u.id = wh.user_id
		WHERE u.cognito_sub = $1 AND wh.completed = false ORDER BY wh.updated_at DESC LIMIT 20`, sub)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Progress
	for rows.Next() {
		var p Progress
		if err := rows.Scan(&p.TitleID, &p.WatchedSeconds, &p.DurationSeconds, &p.Completed, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, nil
}

func ToggleFavorite(ctx context.Context, db *sql.DB, sub, email, titleID string) (bool, error) {
	userID, err := ensureUser(ctx, db, sub, email)
	if err != nil {
		return false, err
	}
	var exists bool
	err = db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id=$1 AND title_id=$2)`, userID, titleID).Scan(&exists)
	if err != nil {
		return false, err
	}
	if exists {
		_, err = db.ExecContext(ctx, `DELETE FROM favorites WHERE user_id=$1 AND title_id=$2`, userID, titleID)
		return false, err
	}
	_, err = db.ExecContext(ctx, `INSERT INTO favorites (user_id, title_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, userID, titleID)
	return true, err
}

func ListFavorites(ctx context.Context, db *sql.DB, sub string) ([]string, error) {
	rows, err := db.QueryContext(ctx, `SELECT f.title_id FROM favorites f JOIN users u ON u.id=f.user_id
		WHERE u.cognito_sub=$1 ORDER BY f.created_at DESC`, sub)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, nil
}
