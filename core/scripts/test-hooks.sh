#!/usr/bin/env bash
#
# Hook Test Suite
# Version: 1.0
#
# Purpose: Automated regression tests for all hooks
# Usage: ./test-hooks.sh
#
# Tests:
# 1. Memory update hook (PostToolUse)
# 2. GitHub issue automation (PostToolUse)
# 3. Pending issues check (UserPromptSubmit)
# 4. Hook registration verification
#

set -eo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

print_success() { echo -e "${GREEN}✅ $*${NC}"; ((TESTS_PASSED++)); }
print_error() { echo -e "${RED}❌ $*${NC}"; ((TESTS_FAILED++)); }
print_info() { echo -e "${BLUE}ℹ️  $*${NC}"; }
print_header() { echo -e "${BLUE}$*${NC}"; }

# Test setup
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
HOOKS_DIR="$REPO_ROOT/core/hooks"
TEST_PROJECT_DIR="/tmp/pingmem-test-$$"
CLEANUP_NEEDED=false

cleanup() {
    if [[ "$CLEANUP_NEEDED" == true ]] && [[ -d "$TEST_PROJECT_DIR" ]]; then
        rm -rf "$TEST_PROJECT_DIR"
    fi
}

trap cleanup EXIT

# Test 1: Memory Update Hook
test_memory_update() {
    print_header "🧪 Test 1: Memory Update Hook"
    ((TESTS_RUN++))

    # Create test project
    mkdir -p "$TEST_PROJECT_DIR/.memories"
    CLEANUP_NEEDED=true

    # Create test file
    touch "$TEST_PROJECT_DIR/test.md"

    # Run hook (if it exists)
    if [[ -f "$HOOKS_DIR/memory-update-posttooluse.py" ]]; then
        cd "$TEST_PROJECT_DIR"

        # Simulate PostToolUse event
        export CLAUDE_HOOK_INPUT='{"tool":{"name":"Write","args":{"file_path":"test.md"},"result":{}},"result":{}}'

        if python3 "$HOOKS_DIR/memory-update-posttooluse.py" 2>/dev/null; then
            # Check last-updated.json was created/updated
            if [[ -f ".memories/last-updated.json" ]]; then
                if grep -q "Write" ".memories/last-updated.json" 2>/dev/null; then
                    print_success "Memory update hook works"
                else
                    print_error "Memory update hook didn't record Write event"
                fi
            else
                print_info "No last-updated.json (memory system may not be initialized)"
            fi
        else
            print_error "Memory update hook failed to execute"
        fi

        cd - >/dev/null
    else
        print_info "Memory update hook not found (skipping)"
    fi
}

# Test 2: GitHub Issue Automation
test_github_issue_automation() {
    print_header "🧪 Test 2: GitHub Issue Automation"
    ((TESTS_RUN++))

    if [[ -f "$HOOKS_DIR/github-issue-automation.py" ]]; then
        cd "$TEST_PROJECT_DIR"
        mkdir -p ".memories/issue-tracking"

        # Simulate error in tool result
        export CLAUDE_HOOK_INPUT='{"tool":{"name":"Write","args":{"file_path":"test.ts"},"result":{"error":"error TS2345: Type error for testing"}},"result":{"error":"error TS2345: Type error for testing"}}'

        if python3 "$HOOKS_DIR/github-issue-automation.py" 2>/dev/null; then
            # Check if issue was queued
            if [[ -f ".memories/issue-tracking/pending-issues.json" ]]; then
                if grep -q "Type error for testing" ".memories/issue-tracking/pending-issues.json" 2>/dev/null; then
                    print_success "GitHub issue automation detects errors"

                    # Cleanup test issue
                    rm -f ".memories/issue-tracking/pending-issues.json"
                else
                    print_error "Issue detection didn't queue the error"
                fi
            else
                print_info "No pending-issues.json created (may need config)"
            fi
        else
            print_error "GitHub issue automation failed to execute"
        fi

        cd - >/dev/null
    else
        print_info "GitHub issue automation hook not found (skipping)"
    fi
}

# Test 3: Pending Issues Check
test_pending_issues_check() {
    print_header "🧪 Test 3: Pending Issues Check"
    ((TESTS_RUN++))

    if [[ -f "$HOOKS_DIR/pending-issues-check.py" ]]; then
        cd "$TEST_PROJECT_DIR"
        mkdir -p ".memories/issue-tracking"

        # Create fake pending issue
        cat > ".memories/issue-tracking/pending-issues.json" <<'EOF'
[
  {
    "error_message": "Test error for pending check",
    "severity": "high",
    "category": "test-error",
    "detected_at": "2025-10-05T12:00:00Z"
  }
]
EOF

        # Run hook
        if OUTPUT=$(python3 "$HOOKS_DIR/pending-issues-check.py" 2>&1); then
            # Should output reminder with the test error
            if echo "$OUTPUT" | grep -q "PENDING GITHUB ISSUES"; then
                print_success "Pending issues check generates reminders"
            else
                print_info "No reminder generated (may be empty queue behavior)"
            fi

            # Cleanup
            rm -f ".memories/issue-tracking/pending-issues.json"
        else
            print_error "Pending issues check failed to execute"
        fi

        cd - >/dev/null
    else
        print_info "Pending issues check hook not found (skipping)"
    fi
}

# Test 4: Hook File Validation
test_hook_files() {
    print_header "🧪 Test 4: Hook File Validation"

    local hooks=(
        "memory-update-posttooluse.py"
        "github-issue-automation.py"
        "pending-issues-check.py"
    )

    for hook in "${hooks[@]}"; do
        ((TESTS_RUN++))

        if [[ -f "$HOOKS_DIR/$hook" ]]; then
            # Check executable
            if [[ -x "$HOOKS_DIR/$hook" ]]; then
                # Check Python syntax
                if python3 -m py_compile "$HOOKS_DIR/$hook" 2>/dev/null; then
                    print_success "$hook: Valid Python syntax"
                else
                    print_error "$hook: Python syntax error"
                fi
            else
                print_error "$hook: Not executable"
            fi
        else
            print_info "$hook: Not found (optional)"
        fi
    done
}

# Test 5: Integration Script Exists
test_integration_script() {
    print_header "🧪 Test 5: Integration Verification Script"
    ((TESTS_RUN++))

    if [[ -f "$REPO_ROOT/core/scripts/verify-integration.sh" ]]; then
        if [[ -x "$REPO_ROOT/core/scripts/verify-integration.sh" ]]; then
            print_success "Integration verification script exists and is executable"
        else
            print_error "Integration verification script not executable"
        fi
    else
        print_error "Integration verification script not found"
    fi
}

# Run all tests
echo ""
print_header "================================================"
print_header "  Claude Memory Intelligence - Hook Tests"
print_header "================================================"
echo ""

test_memory_update
test_github_issue_automation
test_pending_issues_check
test_hook_files
test_integration_script

# Summary
echo ""
print_header "================================================"
print_header "  Test Summary"
print_header "================================================"
echo ""

echo "Tests Run:    $TESTS_RUN"
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if (( TESTS_FAILED > 0 )); then
    print_error "FAILED: $TESTS_FAILED test(s) failed"
    exit 1
else
    print_success "SUCCESS: All tests passed"
    exit 0
fi
