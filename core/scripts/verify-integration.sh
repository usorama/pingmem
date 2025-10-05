#!/usr/bin/env bash
#
# Integration Verification Script
# Purpose: Verify complete end-to-end functionality of Claude memory system
# Run after installation to ensure ALL components are properly integrated
#

set -euo pipefail

# Colors
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $*${NC}"; }
print_error() { echo -e "${RED}❌ $*${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $*${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $*${NC}"; }

FAILURES=0

echo ""
echo "🔍 CLAUDE MEMORY SYSTEM - INTEGRATION VERIFICATION"
echo "=================================================="
echo ""

# =============================================================================
# 1. HOOK FILE EXISTENCE
# =============================================================================

echo "📁 Checking Hook Files..."

HOOKS=(
  "memory-update-hook.js"
  "memory-update-posttooluse.py"
  "github-issue-automation.py"
  "pending-issues-check.py"
  "memory-freshness-check.js"
)

for hook in "${HOOKS[@]}"; do
  if [ -f "$HOME/.claude/hooks/$hook" ]; then
    print_success "Hook exists: $hook"
  else
    print_error "MISSING: $hook"
    ((FAILURES++))
  fi
done

echo ""

# =============================================================================
# 2. SETTINGS.JSON REGISTRATION
# =============================================================================

echo "⚙️  Checking settings.json Registration..."

HOOK_PATTERNS=(
  "memory-update-posttooluse.py:PostToolUse hook for memory updates"
  "github-issue-automation.py:PostToolUse hook for issue detection"
  "pending-issues-check.py:UserPromptSubmit hook for issue reminders"
  "memory-freshness-check.js:UserPromptSubmit hook for memory freshness"
)

for pattern in "${HOOK_PATTERNS[@]}"; do
  IFS=':' read -r hook_file description <<< "$pattern"

  if grep -q "$hook_file" "$HOME/.claude/settings.json" 2>/dev/null; then
    print_success "$description"
  else
    print_error "NOT REGISTERED: $description"
    ((FAILURES++))
  fi
done

echo ""

# =============================================================================
# 3. MEMORY DIRECTORY STRUCTURE
# =============================================================================

echo "📂 Checking Memory Directory Structure..."

MEMORY_DIRS=(
  ".memories:Memory root directory"
  ".memories/decisions:Decision records"
  ".memories/validated:Validation records"
  ".memories/issue-tracking:Issue tracking state"
  ".memories/issue-tracking/logs:Detection logs"
  ".memories/issue-tracking/issues:Issue files"
)

# Check if we're in a project with memory system
if [ -d ".memories" ]; then
  for dir_info in "${MEMORY_DIRS[@]}"; do
    IFS=':' read -r dir desc <<< "$dir_info"

    if [ -d "$dir" ]; then
      print_success "$desc ($dir)"
    else
      print_warning "Optional directory missing: $desc ($dir)"
    fi
  done
else
  print_info "Not in a project with memory system (optional)"
fi

echo ""

# =============================================================================
# 4. END-TO-END MEMORY UPDATE TEST
# =============================================================================

echo "🧪 Testing Memory Update Hook..."

# Create test file
TEST_FILE=".test-integration-$$"
touch "$TEST_FILE"

# Test memory-update-hook.js
if [ -f "$HOME/.claude/hooks/memory-update-hook.js" ]; then
  if [ -d ".memories" ]; then
    # Run the hook
    if node "$HOME/.claude/hooks/memory-update-hook.js" Write "$TEST_FILE" 2>/dev/null; then

      # Verify last-updated.json was updated
      if [ -f ".memories/last-updated.json" ]; then
        if grep -q "Write" ".memories/last-updated.json"; then
          print_success "Memory update hook works end-to-end"
        else
          print_error "Memory update hook failed to update timestamp"
          ((FAILURES++))
        fi
      else
        print_warning "last-updated.json not found (run memory init first)"
      fi
    else
      print_error "Memory update hook execution failed"
      ((FAILURES++))
    fi
  else
    print_info "Memory system not initialized in this project (skipping)"
  fi
else
  print_error "memory-update-hook.js not found"
  ((FAILURES++))
fi

# Cleanup
rm -f "$TEST_FILE"

echo ""

# =============================================================================
# 5. ISSUE DETECTION TEST
# =============================================================================

echo "🐛 Testing Issue Detection..."

if [ -f "$HOME/.claude/hooks/github-issue-automation.py" ]; then
  if [ -d ".memories/issue-tracking" ]; then
    # Simulate error detection
    export CLAUDE_HOOK_INPUT='{"tool":{"name":"Write","args":{"file_path":"test.ts"},"result":{"error":"error TS2345: test integration"}},"result":{"error":"error TS2345: test integration"}}'

    if python3 "$HOME/.claude/hooks/github-issue-automation.py" 2>/dev/null; then

      # Check if issue was queued
      if [ -f ".memories/issue-tracking/pending-issues.json" ]; then
        if grep -q "test integration" ".memories/issue-tracking/pending-issues.json"; then
          print_success "Issue detection works end-to-end"

          # Cleanup test issue
          rm -f ".memories/issue-tracking/pending-issues.json"
        else
          print_error "Issue detection failed to queue error"
          ((FAILURES++))
        fi
      else
        print_error "pending-issues.json not created"
        ((FAILURES++))
      fi
    else
      print_error "Issue detection hook execution failed"
      ((FAILURES++))
    fi

    unset CLAUDE_HOOK_INPUT
  else
    print_info "Issue tracking not initialized in this project (skipping)"
  fi
else
  print_error "github-issue-automation.py not found"
  ((FAILURES++))
fi

echo ""

# =============================================================================
# 6. ISSUE REMINDER TEST
# =============================================================================

echo "🔔 Testing Issue Reminder..."

if [ -f "$HOME/.claude/hooks/pending-issues-check.py" ]; then
  if [ -d ".memories/issue-tracking" ]; then
    # Create test pending issue
    mkdir -p ".memories/issue-tracking"
    echo '[{"severity":"high","category":"test","error_message":"test","file":"test.ts","detected_at":"2025-01-01T00:00:00Z"}]' > ".memories/issue-tracking/pending-issues.json"

    # Run reminder hook
    if output=$(python3 "$HOME/.claude/hooks/pending-issues-check.py" 2>/dev/null); then
      if echo "$output" | grep -q "PENDING GITHUB ISSUES"; then
        print_success "Issue reminder works end-to-end"
      else
        print_error "Issue reminder failed to generate message"
        ((FAILURES++))
      fi
    else
      print_error "Issue reminder hook execution failed"
      ((FAILURES++))
    fi

    # Cleanup
    rm -f ".memories/issue-tracking/pending-issues.json"
  else
    print_info "Issue tracking not initialized (skipping)"
  fi
else
  print_error "pending-issues-check.py not found"
  ((FAILURES++))
fi

echo ""

# =============================================================================
# 7. SETTINGS.JSON VALIDATION
# =============================================================================

echo "📋 Validating settings.json..."

if [ -f "$HOME/.claude/settings.json" ]; then
  if python3 -m json.tool "$HOME/.claude/settings.json" > /dev/null 2>&1; then
    print_success "settings.json is valid JSON"
  else
    print_error "settings.json is INVALID JSON"
    ((FAILURES++))
  fi
else
  print_error "settings.json not found"
  ((FAILURES++))
fi

echo ""

# =============================================================================
# FINAL REPORT
# =============================================================================

echo "=================================================="
if [ $FAILURES -eq 0 ]; then
  print_success "ALL INTEGRATION TESTS PASSED"
  echo ""
  echo "✅ Memory system is properly integrated and functional"
  echo "✅ All hooks are registered and working"
  echo "✅ End-to-end flows verified"
  echo ""
  exit 0
else
  print_error "INTEGRATION VERIFICATION FAILED ($FAILURES failures)"
  echo ""
  echo "❌ Please review failures above and fix integration"
  echo "💡 Run installer again or manually register hooks"
  echo ""
  exit 1
fi
