package cache

import (
	"context"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

func OpenFromEnv() *redis.Client {
	addr := os.Getenv("REDIS_URL")
	if addr == "" {
		addr = "redis://localhost:6379"
	}
	opt, err := redis.ParseURL(addr)
	if err != nil {
		opt = &redis.Options{Addr: "localhost:6379"}
	}
	rdb := redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = rdb.Ping(ctx).Err()
	return rdb
}
