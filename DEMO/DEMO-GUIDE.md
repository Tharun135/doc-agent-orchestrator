# Demo Guide - Documentation Agent Orchestrator

## Demo Structure

```
DEMO/
├── 1-INPUT-SAMPLES/
│   ├── incomplete-input.txt           → Truly blocked (undefined references)
│   ├── ambiguous-but-valid-input.txt  → Vague but documentable
│   └── complete-input.txt             → Full detailed content
└── 2-AI-RESPONSES/
    ├── response-incomplete-input.md    → AI asks questions (blocked)
    ├── response-ambiguous-but-valid.md → AI preserves ambiguity
    └── response-complete-input.md      → AI generates full docs
```

---

## **DEMO FLOW**

### **Scenario 1: Truly Incomplete Input** (Shows When AI Should Ask Questions)

**1. Show the Input**
Open: `1-INPUT-SAMPLES/incomplete-input.txt`

```
User logs in and completes the standard workflow. 
System validates input and takes appropriate action.
```

**2. Use Extension**
- Select all text (Ctrl+A)
- Command Palette (Ctrl+Shift+P)
- Run: "Generate Documentation Prompt"
- Choose: "Procedure"
- Intent: "Document the login workflow"

**3. Show AI Response**
Open: `2-AI-RESPONSES/response-incomplete-input.md`

**Key Point:** AI asks questions because undefined references block task completion
- ❌ "Standard workflow" - undefined reference, can't document
- ❌ "Appropriate action" - no concrete behavior specified
- This SHOULD block because documentation would require inventing behavior

---

### **Scenario 2: Ambiguous But Valid Input** (Shows Preserved Ambiguity)

**1. Show the Input**
Open: `1-INPUT-SAMPLES/ambiguous-but-valid-input.txt`

```
User clicks login button. System checks credentials. 
If valid, redirect to dashboard. If invalid, show error message. 
Admin users get extra options.
```

**2. Use Extension**
- Select all text (Ctrl+A)
- Command Palette (Ctrl+Shift+P)
- Run: "Generate Documentation Prompt"
- Choose: "Procedure"
- Intent: "Document the login flow"

**3. Show AI Response**
Open: `2-AI-RESPONSES/response-ambiguous-but-valid.md`

**Key Points:** AI documents with preserved ambiguity:
- ✅ "Login button" (doesn't invent label)
- ✅ "Error message" (doesn't invent text)
- ✅ "Extra options" (doesn't list made-up features)
- No blocking - task is completable as-is

---

### **Scenario 3: Complete Input** (Shows Best Case)

**1. Show the Input**
Open: `1-INPUT-SAMPLES/complete-input.txt`

Full detailed content with all specifics.

**2. Use Extension**
- Select all text (Ctrl+A)
- Command Palette (Ctrl+Shift+P)
- Run: "Generate Documentation Prompt"
- Choose: "Procedure"
- Intent: "Document user login steps"

**3. Show AI Response**
Open: `2-AI-RESPONSES/response-complete-input.md`

**Key Points:** AI creates precise documentation:
- ✅ Preserves exact terminology ("Sign In", "Admin Panel")
- ✅ Keeps exact error message text
- ✅ Uses exact colors (blue button, red error)
- ✅ No invented features

**4. Preview Diff** (Optional)
- Command: "Preview Documentation Rewrite Diff"
- Shows side-by-side comparison

---

## **The Critical Distinction**

### **Preserve Ambiguity (Default):**
"Extra options" → Document as "additional options"  
"Error message" → Document as "an error message is displayed"  
"Dashboard" → Document as "the dashboard"

### **Ask Questions (Exception):**
"Standard workflow" → BLOCK: What is this workflow?  
"Appropriate action" → BLOCK: What specific action?  
"Follow usual process" → BLOCK: Undefined reference

---

## **Value Proposition**

### **Without Extension:**
❌ AI invents features ("Remember Me", "Forgot Password")  
❌ AI changes terminology  
❌ AI adds "helpful" troubleshooting  
❌ Writers waste time removing hallucinations

### **With Extension:**
✅ Undefined references → AI asks questions (prevents invention)  
✅ Vague but valid → AI preserves ambiguity (doesn't block workflow)  
✅ Complete info → AI follows strict rules  
✅ Documentation is accurate on first pass

---

## **Live Demo Tips**

1. **Start with Scenario 2** - Shows preserved ambiguity (most common case)
2. **Then Scenario 1** - Shows legitimate blocking (rare but important)
3. **Then Scenario 3** - Shows best case (complete information)
4. **Emphasize**: Ambiguity preservation prevents workflow blocking
5. **Clarify**: Questions only when task requires inventing behavior

**Time: 7-10 minutes for complete demo**