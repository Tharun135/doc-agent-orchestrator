# Documentation Agent Orchestrator

A VS Code extension that generates governance-driven AI prompts for technical documentation and provides side-by-side diff previews of AI rewrites.

## Quick Start

**New to this extension?** [Read the Getting Started Guide →](https://tharun.gitbook.io/documentation-agent-orchestrator/)

It enforces strict governance rules so AI either:

- Documents exactly what is provided, preserving ambiguity explicitly, or

- Stops and asks questions when documentation would require inventing behavior

It does not rewrite for style, clarity, or elegance.
It exists to protect correctness.

### Why this exists

AI is fluent but unreliable.

When rewriting documentation, AI often:

- Invents features

- Implies steps that do not exist

- Changes established terminology

- Fills gaps with guesses

These mistakes are hard to notice and costly to fix later.

Documentation Agent Orchestrator prevents that by making AI behavior constrained, inspectable, and defensible.

### What this extension does

- Generates governed AI prompts for documentation

- Forces AI to preserve ambiguity instead of guessing

- Allows questions only when documentation cannot be generated without invention

- Shows a side-by-side diff so you can validate changes before accepting them

### What this extension deliberately does NOT do

This is important.

The extension does not:

- Polish sentences

- Improve wording or tone

- Simplify language

- Add missing details

- “Help” by filling gaps

If you want better writing, use a different tool.
If you want AI to stop lying, use this one.

### Supported documentation types

- Procedures

- Concepts

- Troubleshooting guides

These are document types where correctness matters more than phrasing.

### Typical workflow

1. Select source content in VS Code

1. Run Generate Documentation Prompt

1. Choose documentation type

1. Paste the prompt into your AI assistant (ChatGPT, Claude, etc.)

1. Paste the AI response back into VS Code

1. Run Preview Documentation Rewrite Diff

1. Review changes and preserved ambiguities

1. Accept or reject knowingly

### Governance model (in plain language)

Every prompt enforces these rules:

- No feature or behavior invention

- No terminology changes

- No implied steps

- No silent assumptions

Ambiguity in the source is preserved explicitly, not resolved.

Clarifying questions are asked only when proceeding would require guessing.

### Output behavior

Generated documentation includes:

- Structured content (based on selected type)

- A Preserved Ambiguities section listing vague or unspecified terms

- Clarifying questions only if the task is blocked

This makes uncertainty visible instead of hiding it in fluent text.

### Known limitations

- Vague input stays vague by design

- The extension will not “improve” incomplete requirements

- It may feel less helpful than general AI tools

- Human review is still required

This tradeoff is intentional.

### Requirements

VS Code 1.104.0 or later

Access to an AI assistant (ChatGPT, Claude, Copilot, etc.)

### Commands

Generate Documentation Prompt
Create a governance-driven AI prompt from selected content

Preview Documentation Rewrite Diff
Compare original content with AI-generated documentation

### Who this is for

This extension is for:

- Technical writers

- Documentation engineers

- Docs-as-code teams

- Anyone accountable for documentation accuracy

If you want AI to write better, this tool is not for you.
If you want AI output you can trust, it is.

### Contributing

Found a bug or have a feature request? 
[Open an issue](https://github.com/Tharun135/doc-agent-orchestrator/issues)

