# Getting started with Documentation Agent Orchestrator

## 🚀 5-minute quick start

### Step 1: Have some content ready

Any rough notes or existing documentation:

- Jira tickets
- Meeting notes
- Code comments
- Slack messages
- Incomplete specs

### Step 2: Select your content

- Highlight the text in VS Code
- Or open a file containing your content

### Step 3: Generate the prompt

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type: `Generate Documentation Prompt`
3. Select it from the list

### Step 4: Choose task type

Pick what you're creating:

- **Procedure** - Step-by-step instructions
- **Concept** - Explanations of how something works
- **Troubleshooting** - Problem-solving guides

### Step 5: Describe your intent

Type a brief description:

- "Document the login flow"
- "Explain the caching system"
- "Troubleshoot deployment failures"

### Step 6: Use the generated prompt

The prompt opens in a new tab and is automatically copied to your clipboard.

**Paste it into:**

- Claude (Anthropic)
- ChatGPT (OpenAI)
- GitHub Copilot Chat
- Any AI assistant

### Step 7: Get your documentation

The AI will respond with either:

- ✅ Structured documentation (if info is sufficient)
- ❓ Clarifying questions (if critical info is missing)

### Step 8 (optional): Preview changes

If you're revising existing docs:

1. Paste AI output into a new file
2. Press `Ctrl+Shift+P`
3. Run: `Preview Documentation Rewrite Diff`
4. See side-by-side comparison

---

## 🎯 What makes this different?

### Without this extension

AI often invents features, changes terminology, and adds "helpful" details you never mentioned.

### With this extension

- **Preserves ambiguity** - Vague inputs produce accurate (if vague) outputs
- **Prevents hallucinations** - AI can't invent features
- **Blocks only when needed** - Asks questions only if documentation requires invention
- **Maintains terminology** - Uses your exact terms

---

## 📚 Examples

### Example 1: Incomplete notes

**Your input:**

```txt
User clicks login. System checks credentials. 
Redirect to dashboard if valid. Show error if not.
Admin users get extra features.
```

**What AI does:**

- Documents it accurately
- Preserves "extra features" (doesn't invent what they are)
- Uses your terminology
- Creates structured procedure

### Example 2: Complete content

**Your input:**

```txt
The homepage displays a login form with username 
and password fields. When user clicks the blue 
"Sign In" button, credentials are validated. 
Valid users redirect to /dashboard. Invalid users 
see red error: "Invalid credentials."
```

**What AI does:**

- Preserves exact details (blue button, red error, "/dashboard")
- Uses exact error message text
- Doesn't add "Forgot Password" or other features
- Creates precise documentation

### Example 3: Missing critical info

**Your input:**

```txt
User completes the standard workflow and system 
takes appropriate action.
```

**What AI does:**

- Stops and asks: "What is 'standard workflow'?"
- Asks: "What is 'appropriate action'?"
- Won't invent undefined behaviors

---

## 💡 Tips for best results

### ✅ Do

- Include specific terminology you want preserved
- Mention UI element labels exactly
- Provide error message text when known
- Include relevant technical details

### ❌ Don't

- Worry about perfect formatting
- Fill in details you don't know
- Clean up rough notes first
- Remove context or background info

**The extension handles ambiguity - you focus on accuracy.**

---

## 🆘 Common questions

**Q: Do I need perfect input?**  
A: No. The extension handles vague inputs by preserving ambiguity.

**Q: Will AI invent features?**  
A: No. Governance rules prevent invention.

**Q: What if I don't know all the details?**  
A: AI will either document what you provided or ask specific questions.

**Q: Can I use this with any AI?**  
A: Yes. Works with Claude, ChatGPT, Copilot, or any AI assistant.

**Q: Do I need to install anything else?**  
A: No. Just this extension and access to an AI assistant.

---

## 🎬 Next steps

1. Open any file with rough notes
2. Try "Generate Documentation Prompt"
3. Paste into your favorite AI
4. See governance-driven documentation

**Check out the [demo examples](DEMO/DEMO-GUIDE.md) for detailed walkthroughs.**
