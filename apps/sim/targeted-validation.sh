#!/bin/bash

# Wave 3 Targeted Validation Strategy
# Monitors high-impact files for error reduction progress

cd /Users/jeremyparker/Desktop/Claude\ Coding\ Projects/sim/apps/sim

echo "🎯 Wave 3 Targeted TypeScript Validation"
echo "========================================"

# High-Impact Files for Monitoring (Previously had most errors)
HIGH_IMPACT_FILES=(
    "executor/executor.test.ts"
    "app/api/workflows/[id]/dry-run/route.test.ts" 
    "lib/nexus/tools/list-workflows.test.ts"
    "lib/auth.test.ts"
    "serializer/serializer-advanced.test.ts"
    "lib/email/validation.test.ts"
    "tools/nexus/execute-workflow.ts"
    "components/monitoring/workflow-monitoring-panel.tsx"
)

TOTAL_ERRORS=0

echo "📊 Checking High-Impact Files:"
echo "================================"

for file in "${HIGH_IMPACT_FILES[@]}"; do
    if [ -f "$file" ]; then
        ERROR_COUNT=$(timeout 15s npx tsc --noEmit "$file" 2>&1 | grep -E "error TS[0-9]+" | wc -l | tr -d ' ')
        echo "• $file: $ERROR_COUNT errors"
        TOTAL_ERRORS=$((TOTAL_ERRORS + ERROR_COUNT))
    else
        echo "• $file: FILE NOT FOUND"
    fi
done

echo ""
echo "🎯 High-Impact Files Total: $TOTAL_ERRORS errors"

# Test a few more strategic files
echo ""
echo "📂 Additional Strategic Files:"
echo "=============================="

STRATEGIC_FILES=(
    "lib/community/reputation-system.ts"
    "tools/nexus/monitor-workflows.ts" 
    "app/templates/page.tsx"
    "lib/copilot/tools/server/files/manage-files.ts"
)

STRATEGIC_ERRORS=0

for file in "${STRATEGIC_FILES[@]}"; do
    if [ -f "$file" ]; then
        ERROR_COUNT=$(timeout 15s npx tsc --noEmit "$file" 2>&1 | grep -E "error TS[0-9]+" | wc -l | tr -d ' ')
        echo "• $file: $ERROR_COUNT errors"  
        STRATEGIC_ERRORS=$((STRATEGIC_ERRORS + ERROR_COUNT))
    else
        echo "• $file: FILE NOT FOUND"
    fi
done

echo ""
echo "🎯 Strategic Files Total: $STRATEGIC_ERRORS errors"
echo "🎯 Combined Sample Total: $((TOTAL_ERRORS + STRATEGIC_ERRORS)) errors"

# Sample a few random TypeScript files to estimate project health
echo ""
echo "🔍 Random Sample Health Check:"
echo "=============================="

SAMPLE_COUNT=0
SAMPLE_ERRORS=0

# Find and sample some .ts/.tsx files
while IFS= read -r -d '' file && [ $SAMPLE_COUNT -lt 5 ]; do
    if [[ "$file" =~ \.(ts|tsx)$ ]] && [[ "$file" != *node_modules* ]] && [[ "$file" != *.test.ts ]] && [[ "$file" != *.d.ts ]]; then
        ERROR_COUNT=$(timeout 10s npx tsc --noEmit "$file" 2>&1 | grep -E "error TS[0-9]+" | wc -l | tr -d ' ')
        echo "• $file: $ERROR_COUNT errors"
        SAMPLE_ERRORS=$((SAMPLE_ERRORS + ERROR_COUNT))
        SAMPLE_COUNT=$((SAMPLE_COUNT + 1))
    fi
done < <(find . -name "*.ts" -o -name "*.tsx" | head -20 | tr '\n' '\0')

echo ""
echo "📈 VALIDATION SUMMARY:"
echo "======================"
echo "• High-Impact Files: $TOTAL_ERRORS errors"
echo "• Strategic Files: $STRATEGIC_ERRORS errors" 
echo "• Random Sample: $SAMPLE_ERRORS errors ($SAMPLE_COUNT files)"
echo "• Estimated Project Health: $(( (TOTAL_ERRORS + STRATEGIC_ERRORS + SAMPLE_ERRORS) * 10 )) errors (rough estimate)"

# Log results with timestamp
echo "$(date): Sample validation - High:$TOTAL_ERRORS Strategic:$STRATEGIC_ERRORS Random:$SAMPLE_ERRORS" >> wave3-validation.log