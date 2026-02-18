#!/bin/bash

# Test rate limiting on /api/auth/login
# Auth endpoints are limited to 60 requests/minute

echo "Testing rate limiting on /api/auth/login..."
echo "Sending 65 requests (limit is 60)..."
echo ""

rate_limited=false
rate_limited_at=0
retry_after=""

for i in {1..65}; do
  response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8787/api/auth/login \
    -H "Content-Type: application/json" \
    -H "CF-Connecting-IP: 192.168.1.100" \
    -d '{"email":"test@test.com","password":"wrong"}')

  # Extract status code (last line)
  http_code=$(echo "$response" | tail -n1)
  # Extract body (all but last line)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" == "429" ]; then
    if [ "$rate_limited" == "false" ]; then
      rate_limited=true
      rate_limited_at=$i
      # Get full response with headers
      full_response=$(curl -s -D- -X POST http://localhost:8787/api/auth/login \
        -H "Content-Type: application/json" \
        -H "CF-Connecting-IP: 192.168.1.100" \
        -d '{"email":"test@test.com","password":"wrong"}')
      retry_after=$(echo "$full_response" | grep -i "Retry-After" | cut -d: -f2 | tr -d ' \r')
      echo "Request $i: HTTP $http_code - RATE LIMITED!"
      echo ""
      echo "=== Full 429 Response ==="
      echo "$full_response"
      echo "========================="
    else
      echo "Request $i: HTTP $http_code - RATE LIMITED"
    fi
  else
    echo "Request $i: HTTP $http_code"
  fi
done

echo ""
echo "=== SUMMARY ==="
if [ "$rate_limited" == "true" ]; then
  echo "✓ Rate limiting triggered at request #$rate_limited_at"
  if [ -n "$retry_after" ]; then
    echo "✓ Retry-After header present: $retry_after seconds"
  else
    echo "✗ Retry-After header NOT found!"
  fi
else
  echo "✗ Rate limiting NOT triggered after 65 requests!"
fi
