# Documentation Agent Orchestrator

A VS Code extension that generates governance-driven AI prompts for technical documentation and provides side-by-side diff previews of AI rewrites.

## Quick Start

**New to this extension?** [Read the Getting Started Guide →](https://tharun.gitbook.io/documentation-agent-orchestrator/)

1. **Select** any text or rough notes in VS Code
2. **Press** `Ctrl+Shift+P` and type "Generate Documentation Prompt"
3. **Choose** your documentation type (Procedure, Concept, or Troubleshooting)
4. **Copy** the generated prompt (auto-copied to clipboard)
5. **Paste** into Claude, ChatGPT, or any AI assistant
6. **Get** governance-compliant documentation without hallucinations

[See full demo →](#usage)

## Features

### 🎯 Generate AI Documentation Prompts
Transform your rough notes or existing content into structured AI prompts with built-in governance rules:

- **Procedure Documentation** - Convert steps into formal procedures
- **Concept Explanations** - Turn technical notes into clear concept docs
- **Troubleshooting Guides** - Structure problem-solving documentation

Each prompt includes:
- ✅ Governance rules (prevent AI from inventing features)
- ✅ Ambiguity preservation (AI documents vague details as-is, doesn't demand perfection)
- ✅ Selective questioning (AI asks only when task completion requires invention)
- ✅ Structured output templates
- ✅ Quality enforcement

### 📊 Preview Documentation Rewrites
Compare original content with AI-generated documentation using VS Code's built-in diff viewer:

- Side-by-side comparison
- Highlight changes
- Easy validation before committing

## Usage

### 1. Generate Documentation Prompt

1. Select text in your editor (or open a file with content)
2. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run: **"Generate Documentation Prompt"**
4. Choose task type: Procedure, Concept, or Troubleshooting
5. Describe your intent (e.g., "Document the login process")
6. The prompt opens in a new tab and is copied to clipboard
7. Paste into your AI assistant (Claude, Copilot, ChatGPT, etc.)

### 2. Preview Documentation Rewrite

1. After getting AI output, paste it into a VS Code file
2. Open Command Palette
3. Run: **"Preview Documentation Rewrite Diff"**
4. Review the side-by-side comparison
5. Validate changes before finalizing

## Requirements

- VS Code 1.104.0 or higher
- Access to an AI assistant (Claude, GitHub Copilot, ChatGPT, etc.)

## Commands

This extension contributes the following commands:

- `Generate Documentation Prompt` - Create a governance-driven AI prompt from selected content
- `Preview Documentation Rewrite Diff` - Compare original content with AI-rewritten documentation

## Governance Features

The extension enforces these governance rules in every prompt:

- **No feature invention** - AI cannot make up functionality not stated or implied
- **No terminology changes** - Preserves established terms from your source
- **Preserve ambiguity** - When source is vague, AI documents it as-is rather than guessing
- **Question only when blocked** - AI asks questions only when documentation cannot be generated without inventing behavior (not for every missing detail)
- **No silent assumptions** - AI flags when it needs to make choices about unstated behavior

## Example Workflow

**Input (rough notes):**
```
User clicks login. Credentials checked. Valid → dashboard. Invalid → error. Admins get extra options.
```

**AI Prompt Generated:**
- Includes governance rules
- Preserves ambiguity when appropriate
- Asks questions only if task completion requires invention
- Defines output structure

**AI Response:**
- Documents vague details as-is ("extra options"), OR
- Asks clarifying questions only when blocked by undefined references

**Diff Preview:**
- Compare original vs rewritten
- Validate accuracy
- Accept or iterate

## Known Issues

- Diff preview requires running "Generate Documentation Prompt" first
- Context is reset when VS Code restarts

## Release Notes

### 0.0.1

Initial release:

- Generate governance-driven documentation prompts
- Preview documentation rewrites with diff view
- Support for 3 documentation types: Procedure, Concept, Troubleshooting

---

## Contributing

Found a bug or have a feature request? [Open an issue](https://github.com/yourusername/doc-agent-orchestrator/issues)

## License

MIT

