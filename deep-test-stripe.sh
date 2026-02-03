#!/bin/bash

# Deep Test Suite for Stripe Connect
# Uses provided session token to test the exact user flow

API_URL="http://localhost:3000"
# SESSION_TOKEN provided by user
SESSION_TOKEN="d49e8ca6448cc545bbe52b59fb70df132c955e36b1e63c862db7713334dfb100"

echo "🧪 Deep Stripe Connect Test"
echo "=========================="
echo "Using Session Token: $SESSION_TOKEN"
echo ""

# 1. Check Initial Auth & Status
echo "1️⃣  Checking Auth & Initial Status..."
STATUS_RES=$(curl -s -X GET "$API_URL/api/consultant360/stripe/status" \
  -H "Cookie: consultantToken=$SESSION_TOKEN; hrm8SessionId=$SESSION_TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $STATUS_RES"
echo ""

# 2. Initiate Onboarding
echo "2️⃣  Initiating Onboarding..."
ONBOARD_RES=$(curl -s -X POST "$API_URL/api/consultant360/stripe/onboard" \
  -H "Cookie: consultantToken=$SESSION_TOKEN; hrm8SessionId=$SESSION_TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $ONBOARD_RES"
ACCOUNT_ID=$(echo $ONBOARD_RES | jq -r 'if .data then .data.accountId else null end')
ONBOARD_URL=$(echo $ONBOARD_RES | jq -r 'if .data then .data.onboardingUrl else null end')

echo "👉 Account ID: $ACCOUNT_ID"
echo "👉 Onboard URL: $ONBOARD_URL"
echo ""

if [ "$ACCOUNT_ID" == "null" ]; then
    echo "❌ Failed to create account. Stopping."
    exit 1
fi

# 3. Simulate Frontend Mock Page Actions (Approve)
# This mimics what the React page does: POST to Approve
echo "3️⃣  Simulating Frontend Approval (as browser would)..."
APPROVE_RES=$(curl -s -X POST "$API_URL/api/integrations/stripe/approve-mock-account" \
  -H "Cookie: consultantToken=$SESSION_TOKEN; hrm8SessionId=$SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"accountId\": \"$ACCOUNT_ID\"}")

echo "Response: $APPROVE_RES"
echo ""

# 4. Verify Status Post-Approval
echo "4️⃣  Verifying Status After Approval..."
FINAL_STATUS=$(curl -s -X GET "$API_URL/api/consultant360/stripe/status" \
  -H "Cookie: consultantToken=$SESSION_TOKEN; hrm8SessionId=$SESSION_TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $FINAL_STATUS"
echo ""

# 5. Check mock client memory state directly (if possible, or infer from status)
STATUS_STATE=$(echo $FINAL_STATUS | jq -r 'if .data then .data.status else "unknown" end')
if [ "$STATUS_STATE" == "active" ]; then
    echo "✅ SUCCESS: Account is active and connected."
else
    echo "❌ FAILURE: Account status is $STATUS_STATE (expected 'active')"
fi
