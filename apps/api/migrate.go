package main

import (
	"log"
	"os"
	"path/filepath"
)

func runMigrations() {
	if sqlDB == nil {
		return
	}
	entries, err := filepath.Glob("migrations/*.sql")
	if err != nil || len(entries) == 0 {
		entries, _ = filepath.Glob("apps/api/migrations/*.sql")
	}
	for _, f := range entries {
		b, err := os.ReadFile(f)
		if err != nil {
			log.Printf("migration skip %s: %v", f, err)
			continue
		}
		if _, err := sqlDB.Exec(string(b)); err != nil {
			log.Printf("migration %s: %v", f, err)
		} else {
			log.Printf("migration applied: %s", f)
		}
	}
}
