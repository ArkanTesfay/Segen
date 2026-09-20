// Throwaway diagnostic: prints the REAL verifier error for a token file.
package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/segen/api/internal/auth"
)

func main() {
	b, _ := os.ReadFile("../.env")
	for _, line := range strings.Split(string(b), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		os.Setenv(strings.TrimSpace(k), strings.Trim(strings.TrimSpace(v), `"'`))
	}
	raw, err := os.ReadFile("/tmp/segen-id-token.txt")
	if err != nil {
		panic(err)
	}
	fmt.Printf("COGNITO_ISSUER=%q\nCOGNITO_WEB_CLIENT_ID=%q\n", os.Getenv("COGNITO_ISSUER"), os.Getenv("COGNITO_WEB_CLIENT_ID"))

	v := auth.NewVerifierFromEnv()

	// Confirm the decoder now fills the single `sub` target.
	var probe auth.Claims
	if _, _, err := jwt.NewParser().ParseUnverified(strings.TrimSpace(string(raw)), &probe); err == nil {
		fmt.Printf("decoded: Subject=%q Email=%q ClientID=%q Aud=%v\n",
			probe.Subject, probe.Email, probe.ClientID, probe.Audience)
	}

	claims, err := v.Verify(strings.TrimSpace(string(raw)))
	if err != nil {
		fmt.Println("VERIFY FAILED:", err)
		os.Exit(1)
	}
	fmt.Printf("VERIFY OK: sub=%s email=%s\n", claims.Subject, claims.Email)
}
