#!/bin/bash

# Account Unlock Helper Script
# Makes it easier to unlock accounts without typing the full path

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   EthioCraft Account Unlock Helper    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if email is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Email address is required${NC}"
    echo ""
    echo "Usage:"
    echo "  ./unlock-account.sh <email> [newPassword]"
    echo ""
    echo "Examples:"
    echo "  ./unlock-account.sh user@email.com              # Unlock only"
    echo "  ./unlock-account.sh user@email.com NewPass123!  # Unlock + reset password"
    echo ""
    exit 1
fi

EMAIL=$1
PASSWORD=$2

echo -e "${YELLOW}📧 Email: ${EMAIL}${NC}"

if [ -n "$PASSWORD" ]; then
    echo -e "${YELLOW}🔐 New Password: ${PASSWORD}${NC}"
    echo -e "${YELLOW}⚠️  Remember to advise user to change this password!${NC}"
else
    echo -e "${YELLOW}🔓 Unlocking account (keeping existing password)${NC}"
fi

echo ""
echo -e "${GREEN}Running unlock script...${NC}"
echo ""

# Run the Node.js script
if [ -n "$PASSWORD" ]; then
    node server/scripts/unlockAccount.js "$EMAIL" "$PASSWORD"
else
    node server/scripts/unlockAccount.js "$EMAIL"
fi

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Success! Account has been unlocked.${NC}"
    
    if [ -n "$PASSWORD" ]; then
        echo ""
        echo -e "${YELLOW}📋 Send these credentials to the user:${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "Email: $EMAIL"
        echo "Password: $PASSWORD"
        echo ""
        echo "Please change your password immediately at:"
        echo "https://ethiocraft.com/security"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    fi
else
    echo -e "${RED}❌ Failed to unlock account. Check the error above.${NC}"
fi

echo ""
