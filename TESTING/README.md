# Testing Validation Framework

## How to Use This Framework

This directory contains everything you need to validate the extension's governance model:

### **Directory Structure**
```
TESTING/
├── inputs/           → 15 real-world test cases
├── responses/        → Simulated AI responses with classifications
└── TESTING-REPORT.md → Complete analysis and results
```

---

## Quick Validation Process

### **1. Review Simulated Responses**

Each response file includes:
- AI-generated documentation
- "Preserved Ambiguities" section
- Classification: PASS/FAIL
- Analysis notes

**Look for:**
- ✅ Vague terms documented as-is
- ✅ No invented features or specifications
- ✅ Appropriate blocking (rare)
- ✅ No unnecessary blocking (common content should flow)

### **2. Test with Live Extension**

**Steps:**
1. Open any input file from `inputs/`
2. Select all content (Ctrl+A)
3. Run: "Generate Documentation Prompt"
4. Paste prompt into your AI assistant (Claude, ChatGPT)
5. Compare actual AI response with simulated response

**Check:**
- Did real AI behave similarly?
- Were ambiguities preserved?
- Was blocking appropriate?
- Any invented details?

### **3. Track Failures**

Use this classification system:

| Failure Type | What to Look For |
|-------------|------------------|
| **❌ Invented Behavior** | Made-up features, fabricated specs, assumed details |
| **❌ Blocked Unnecessarily** | Stopped when documentation was possible |
| **❌ Preserved Ambiguity Incorrectly** | Expanded vague terms or over-specified |

---

## Test Coverage Summary

| Input Type | Count | Examples |
|-----------|-------|----------|
| Jira Tickets | 1 | Feature request with acceptance criteria |
| Slack Messages | 1 | Bug report with vague details |
| Confluence Pages | 1 | Partial specification |
| Release Notes | 1 | High-level feature list |
| Email Requests | 1 | Request for documentation |
| Code Comments | 1 | Deployment process |
| Meeting Notes | 1 | Design decision |
| Support Tickets | 1 | User issue report |
| README Sections | 1 | CLI tool documentation |
| Whiteboard Notes | 1 | System architecture |
| API Examples | 1 | Response format |
| Git Commits | 1 | Feature implementation |
| Product Specs | 1 | Extremely vague requirements |
| Checklists | 1 | Onboarding procedure |
| Error Logs | 1 | Production issue |

---

## Expected Results (from Simulation)

### **Success Metrics:**
- **14/15** generated output (93%)
- **1/15** blocked appropriately (7%)
- **0/15** invented behavior (0%)
- **0/15** blocked unnecessarily (0%)

### **Key Validations:**

✅ **Test 13 (Vague Notification Spec)**
- Most ambiguous input
- Extreme test of preservation
- No invented channels or types

✅ **Test 05 (API Limits Email)**
- Only legitimate block
- Request FOR docs, not content TO document
- Correct blocking behavior

---

## Adding New Test Cases

### **Process:**
1. Create input file: `inputs/XX-description.txt`
2. Test with live extension
3. Document response: `responses/XX-description-response.md`
4. Classify result:
   - Generated output? Yes/No
   - Preserved ambiguity? Yes/No
   - Blocked unnecessarily? Yes/No
   - Invented behavior? Yes/No

### **Response Template:**
```markdown
# AI Response - Test XX: Description

[Documentation output]

## Preserved Ambiguities
- **"term"** - explanation of what's vague

---

## Classification: ✅ PASS / ❌ FAIL

**Did it generate output?** Yes/No
**Preserved ambiguity correctly?** Yes/No
**Blocked unnecessarily?** Yes/No
**Invented behavior?** Yes/No

**Notes:**
- Key observations
```

---

## Regression Testing

**When to retest:**
- After governance rule changes
- After prompt generator updates
- Before major releases
- When adding new documentation types

**Quick regression check:**
1. Run tests 01, 05, 13 (cover key scenarios)
2. Verify preservation, blocking, and extreme ambiguity
3. If all pass, full suite likely passes

---

## Real User Validation

**After simulation testing:**

1. **Collect real user inputs**
   - Actual Jira tickets from your team
   - Real Slack conversations
   - Existing partial docs

2. **Monitor for patterns**
   - Consistent blocking on specific input types?
   - Repeated invention of certain details?
   - User frustration with blocking?

3. **Iterate governance rules**
   - Only if patterns show actual failures
   - Don't change based on single edge cases

---

## Success Criteria

Your extension governance is working if:

✅ **No hallucinations** - AI doesn't invent features  
✅ **Ambiguity respected** - Vague inputs produce vague (but accurate) outputs  
✅ **Workflow not blocked** - Real work proceeds with preserved uncertainty  
✅ **Blocking is rare** - Only when task truly requires invention

**These 15 tests validate all four criteria.**