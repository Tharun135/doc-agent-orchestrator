# Publishing Update to VS Code Marketplace

## ✅ Step 1: Version Updated
- Changed version from `0.0.1` → `0.0.2` in package.json

## ✅ Step 2: Compiled & Packaged
- TypeScript compiled successfully
- Created: `doc-agent-orchestrator-0.0.2.vsix`

---

## 🚀 Step 3: Publish to Marketplace

### **Option A: Using Command Line**

```powershell
vsce publish
```

This will:
- Prompt for your Personal Access Token (if not saved)
- Upload the new version to the marketplace
- Automatically increment and publish

### **Option B: Using Visual Studio Marketplace Portal**

1. Go to: https://marketplace.visualstudio.com/manage/publishers/TharunSebastian
2. Click on "Documentation Agent Orchestrator"
3. Click "Update"
4. Upload the `.vsix` file: `doc-agent-orchestrator-0.0.2.vsix`
5. Click "Upload"

---

## 📝 What Changed in v0.0.2

**Major Improvements:**
- ✅ Fixed governance model: Preserves ambiguity instead of blocking
- ✅ Added "Preserved Ambiguities" section to outputs
- ✅ Updated rules to distinguish preserved ambiguity from blocked invention
- ✅ Added comprehensive testing framework (15 test cases)
- ✅ Updated README and demo materials

**Technical Changes:**
- Modified `src/engine/governance.ts`
- Updated `src/engine/promptGenerator.ts`
- Added TESTING/ directory with validation framework
- Updated DEMO/ with corrected scenarios

---

## 🔑 Personal Access Token Setup (if needed)

If you don't have a token saved:

1. Go to: https://dev.azure.com
2. Click on your profile → Security → Personal Access Tokens
3. Create new token with:
   - **Name:** VS Code Extension Publishing
   - **Organization:** All accessible organizations
   - **Scopes:** Marketplace → **Manage**
4. Copy the token
5. Run: `vsce login TharunSebastian`
6. Paste your token when prompted

---

## ⚠️ Before Publishing

**Optional: Update CHANGELOG.md**

Add release notes for v0.0.2 explaining the governance improvements.

**Optional: Exclude Test Files**

If you don't want TESTING/ in the published extension, add to `.vscodeignore`:

```
TESTING/**
demo-sample.txt
demo-complete.txt
Prerequisites.md
```

---

## 🎯 Quick Publish Command

```powershell
# Publish the update now
vsce publish
```

The marketplace will process your update in ~5-10 minutes.