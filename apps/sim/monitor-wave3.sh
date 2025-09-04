#!/bin/bash

# Wave 3 TypeScript Error Campaign Monitoring Script
# Usage: ./monitor-wave3.sh

cd /Users/jeremyparker/Desktop/Claude\ Coding\ Projects/sim/apps/sim

echo "🚀 Wave 3 TypeScript Error Campaign - Real-time Monitor"
echo "=================================================="

# Get current error count
CURRENT_ERRORS=$(npx tsc --noEmit 2>&1 | grep -E "error TS[0-9]+" | wc -l | tr -d ' ')
BASELINE=1124
REDUCTION=$((BASELINE - CURRENT_ERRORS))
PERCENTAGE=$(echo "scale=1; $REDUCTION * 100 / $BASELINE" | bc)

echo "📊 Current Status:"
echo "   • Current Errors: $CURRENT_ERRORS"
echo "   • Baseline: $BASELINE" 
echo "   • Reduction: $REDUCTION errors ($PERCENTAGE%)"
echo "   • Target: <800 errors"
echo "   • Remaining to goal: $((CURRENT_ERRORS - 800)) errors"

# Check if we've reached the goal
if [ $CURRENT_ERRORS -lt 800 ]; then
    echo "🎉 SUCCESS! Goal achieved: $CURRENT_ERRORS < 800 errors!"
else
    echo "🎯 Progress needed: $((CURRENT_ERRORS - 800)) more errors to eliminate"
fi

echo ""
echo "🔍 Top Error Types:"
npx tsc --noEmit 2>&1 | grep -E "error TS[0-9]+" | grep -oE "TS[0-9]+" | sort | uniq -c | sort -nr | head -5

echo ""
echo "📂 Top Problem Files:"
npx tsc --noEmit 2>&1 | grep -E "error TS[0-9]+" | cut -d'(' -f1 | sort | uniq -c | sort -nr | head -5

# Log the result with timestamp
echo "$(date): $CURRENT_ERRORS errors remaining" >> wave3-progress.log