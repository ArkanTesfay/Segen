package auth

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Verifier checks RS256 Cognito ID/access tokens via JWKS. Same code path
// will guard playback authorize + favorites/history once Postgres lands.
type Verifier struct {
	issuer   string
	clientID string
	jwksURL  string
	client   *http.Client

	mu   sync.RWMutex
	keys map[string]*rsa.PublicKey
	exp  time.Time
}

func NewVerifierFromEnv() *Verifier {
	poolID := os.Getenv("COGNITO_USER_POOL_ID")
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "us-east-1"
	}
	issuer := os.Getenv("COGNITO_ISSUER")
	if issuer == "" && poolID != "" {
		issuer = fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s", region, poolID)
	}
	return &Verifier{
		issuer:   issuer,
		clientID: os.Getenv("COGNITO_WEB_CLIENT_ID"),
		jwksURL:  strings.TrimSuffix(issuer, "/") + "/.well-known/jwks.json",
		client:   &http.Client{Timeout: 8 * time.Second},
		keys:     map[string]*rsa.PublicKey{},
	}
}

type jwk struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Alg string `json:"alg"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func (v *Verifier) keyFunc(token *jwt.Token) (any, error) {
	if token.Method.Alg() != "RS256" {
		return nil, fmt.Errorf("unexpected alg %s", token.Method.Alg())
	}
	kid, _ := token.Header["kid"].(string)
	if kid == "" {
		return nil, fmt.Errorf("missing kid")
	}
	v.mu.RLock()
	k, ok := v.keys[kid]
	exp := v.exp
	v.mu.RUnlock()
	if !ok || time.Now().After(exp) {
		if err := v.refresh(); err != nil {
			return nil, err
		}
		v.mu.RLock()
		k, ok = v.keys[kid]
		v.mu.RUnlock()
		if !ok {
			return nil, fmt.Errorf("unknown kid %s", kid)
		}
	}
	return k, nil
}

func (v *Verifier) refresh() error {
	if v.jwksURL == "/.well-known/jwks.json" || strings.HasPrefix(v.jwksURL, "/") {
		return fmt.Errorf("COGNITO_ISSUER not configured")
	}
	resp, err := v.client.Get(v.jwksURL)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	var doc struct {
		Keys []jwk `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return err
	}
	next := map[string]*rsa.PublicKey{}
	for _, k := range doc.Keys {
		if k.Kty != "RSA" {
			continue
		}
		nb, err := base64.RawURLEncoding.DecodeString(k.N)
		if err != nil {
			continue
		}
		eb, err := base64.RawURLEncoding.DecodeString(k.E)
		if err != nil {
			continue
		}
		// exponent is big-endian
		exp := 0
		for _, b := range eb {
			exp = exp<<8 + int(b)
		}
		next[k.Kid] = &rsa.PublicKey{N: new(big.Int).SetBytes(nb), E: exp}
	}
	v.mu.Lock()
	v.keys = next
	v.exp = time.Now().Add(1 * time.Hour)
	v.mu.Unlock()
	return nil
}

// Claims returned to handlers.
type Claims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	// Cognito access tokens carry `client_id` instead of `aud`.
	ClientID string `json:"client_id"`
	jwt.RegisteredClaims
}

func (v *Verifier) Verify(tokenStr string) (*Claims, error) {
	if v.issuer == "" {
		return nil, fmt.Errorf("COGNITO_ISSUER not configured")
	}
	claims := &Claims{}
	tok, err := jwt.ParseWithClaims(tokenStr, claims, v.keyFunc,
		jwt.WithIssuer(v.issuer),
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, err
	}
	if !tok.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	// Bind the token to THIS app client. Cognito ID tokens have aud == client id;
	// access tokens have no aud and use the client_id claim instead. Tokens issued
	// for any other client of the same pool must be rejected.
	if v.clientID != "" {
		audMatch := false
		for _, a := range claims.Audience {
			if a == v.clientID {
				audMatch = true
				break
			}
		}
		if !audMatch && claims.ClientID != v.clientID {
			return nil, fmt.Errorf("token not issued for this app client")
		}
	}
	if claims.Subject == "" {
		return nil, fmt.Errorf("token missing sub")
	}
	return claims, nil
}
