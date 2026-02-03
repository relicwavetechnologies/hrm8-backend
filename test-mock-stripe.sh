#!/bin/bash

# Mock Stripe Implementation Test Suite
# Tests all Stripe Connect functionality

API_URL="http://localhost:3000"
SESSION_TOKEN="d49e8ca6448cc545bbe52b59fb70df132c955e36b1e63c862db7713334dfb100"

echo "🧪 Mock Stripe Implementation Test Suite"
echo "=========================================="
echo ""

# Test 1: Check Stripe Status
echo "1️⃣ GET Stripe Status..."
curl -s -X GET "$API_URL/api/integrations/stripe/status" \
  -H "Cookie: consultantToken=$SESSION_TOKEN" | jq
echo ""

# Test 2: Consultant360 - Stripe Onboarding
echo "2️⃣ POST Consultant360 Stripe Onboarding..."
RESPONSE=$(curl -s -X POST "$API_URL/api/consultant360/stripe/onboard" \
  -H "Cookie: consultantToken=$SESSION_TOKEN")
echo $RESPONSE | jq
ACCOUNT_ID=$(echo $RESPONSE | jq -r '.data.accountId')
echo "Account ID: $ACCOUNT_ID"
echo ""

# Test 3: Get Consultant360 Stripe Status
echo "3️⃣ GET Consultant360 Stripe Status..."
curl -s -X GET "$API_URL/api/consultant360/stripe/status" \
  -H "Cookie: consultantToken=$SESSION_TOKEN" | jq
echo ""

# Test 4: Approve Mock Account (DEV ONLY)
echo "4️⃣ POST Approve Mock Account..."
curl -s -X POST "$API_URL/api/integrations/stripe/approve-mock-account" \
  -H "Content-Type: application/json" \
  -d "{\"accountId\": \"$ACCOUNT_ID\"}" | jq
echo ""

# Test 5: Re-check Status After Approval
echo "5️⃣ GET Status After Approval..."
curl -s -X GET "$API_URL/api/consultant360/stripe/status" \
  -H "Cookie: consultantToken=$SESSION_TOKEN" | jq
echo ""

# Test 6: Create Checkout Session
echo "6️⃣ POST Create Checkout Session ($100)..."
CHECKOUT_RESPONSE=$(curl -s -X POST "$API_URL/api/integrations/stripe/create-checkout-session" \
  -H "Cookie: consultantToken=$SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "description": "Test wallet recharge"}')
echo $CHECKOUT_RESPONSE | jq
SESSION_ID=$(echo $CHECKOUT_RESPONSE | jq -r '.data.sessionId')
echo "Session ID: $SESSION_ID"
echo ""

# Test 7: Complete Mock Payment
echo "7️⃣ POST Complete Mock Payment..."
curl -s -X POST "$API_URL/api/integrations/stripe/mock-payment-success" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\"}" | jq
echo ""

echo "✅ All tests complete!"
