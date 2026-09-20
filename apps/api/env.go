package main

import (
	"bufio"
	"log"
	"os"
	"strings"
)

// loadDotEnv reads KEY=VALUE pairs from a local .env file so `go run .` works
// without exporting Cognito/Postgres/Redis variables in every shell.
// Real environment variables always win, and a missing file is not an error.
func loadDotEnv() {
	f, err := os.Open(".env")
	if err != nil {
		return
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.TrimSpace(val)
		// Allow quoted values: KEY="value" / KEY='value'
		val = strings.Trim(val, `"'`)
		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); !exists {
			if err := os.Setenv(key, val); err != nil {
				log.Printf("WARN: could not set %s: %v", key, err)
			}
		}
	}
}
