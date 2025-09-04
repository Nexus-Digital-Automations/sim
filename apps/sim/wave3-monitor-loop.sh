#!/bin/bash

# Wave 3 Continuous Monitoring Loop
# Tracks error reduction progress every 15 minutes

cd /Users/jeremyparker/Desktop/Claude\ Coding\ Projects/sim/apps/sim

echo "🚀 Starting Wave 3 Continuous Monitoring Loop"
echo "============================================="
echo "Target: Reduce from 1,461+ errors to <800 errors"
echo ""

while true; do
    TIMESTAMP=$(date '+%H:%M')
    
    echo "[$TIMESTAMP] 🔍 Wave 3 Progress Check"
    echo "=================================="
    
    # Run targeted validation
    bash targeted-validation.sh > temp-validation.txt 2>&1
    
    # Extract key metrics
    HIGH_IMPACT=$(grep "High-Impact Files Total:" temp-validation.txt | grep -oE "[0-9]+" | head -1)
    STRATEGIC=$(grep "Strategic Files Total:" temp-validation.txt | grep -oE "[0-9]+" | head -1)
    SAMPLE_TOTAL=$(grep "Combined Sample Total:" temp-validation.txt | grep -oE "[0-9]+" | head -1)
    
    echo "📊 Progress Summary:"
    echo "   • High-Impact: $HIGH_IMPACT errors"
    echo "   • Strategic: $STRATEGIC errors" 
    echo "   • Sample Total: $SAMPLE_TOTAL errors"
    
    # Check if we've reached target
    if [ "$SAMPLE_TOTAL" -lt 800 ]; then
        echo "🎉 SUCCESS! Target achieved: $SAMPLE_TOTAL < 800 errors!"
        echo "Wave 3 campaign SUCCESSFUL!"
        break
    else
        REMAINING=$((SAMPLE_TOTAL - 800))
        echo "🎯 Progress needed: $REMAINING more errors to eliminate"
    fi
    
    # Log progress
    echo "[$TIMESTAMP] Sample: $SAMPLE_TOTAL (High: $HIGH_IMPACT, Strategic: $STRATEGIC)" >> wave3-monitoring.log
    
    echo ""
    echo "⏱️  Next check in 15 minutes..."
    echo "===============================\n"
    
    # Wait 15 minutes (900 seconds) 
    sleep 900
done

echo "🏆 Wave 3 Monitoring Complete!"