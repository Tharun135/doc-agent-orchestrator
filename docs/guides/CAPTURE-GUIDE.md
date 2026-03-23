# Visual Asset Capture Guide - Priority 1

## Asset 1: demo-overview.gif (Main Demo)

### What to Show:
A complete workflow from start to finish (10-15 seconds)

### Step-by-Step Recording:

1. **Preparation:**
   - Open VS Code
   - Have a file with rough notes open: `TESTING/inputs/demo-edit-datasource.md`
   - Clear any notifications
   - Set VS Code to 80% zoom for readability

2. **Recording Steps:**
   - START RECORDING
   - **Second 0-2:** Select all text (Ctrl+A) - show selection highlight
   - **Second 2-4:** Press Ctrl+Shift+P, type "Generate Documentation"
   - **Second 4-6:** Select "Procedure" from dropdown
   - **Second 6-8:** Type user intent: "Document editing data source"
   - **Second 8-10:** Show generated prompt opening in new tab
   - **Second 10-12:** Show notification "copied to clipboard"
   - **Second 12-15:** Quick scroll through the generated prompt
   - STOP RECORDING

3. **Tools to Use:**
   - **Windows:** ScreenToGif (https://www.screentogif.com/) - FREE
   - **Mac:** Kap (https://getkap.co/) - FREE
   - **Settings:** 
     - FPS: 10-12
     - Resolution: 1280x720
     - Max file size: 5MB

4. **After Recording:**
   - Trim any dead time at start/end
   - Add 1-second pause at key moments
   - Export as GIF
   - Compress if over 5MB

---

## Asset 2: command-palette.png (Command Palette)

### What to Show:
Command palette open with "Generate Documentation Prompt" visible

### Capture Steps:

1. **Setup:**
   - Open VS Code
   - Press Ctrl+Shift+P to open command palette
   - Type: "Generate Documentation Prompt"
   - Make sure the command is highlighted in the list

2. **Screenshot:**
   - Capture just the command palette area
   - Include:
     - The search box with typed text
     - The matched command highlighted
     - A few other commands above/below for context

3. **Recommended Tool:**
   - **Windows:** Win+Shift+S (built-in)
   - **Mac:** Cmd+Shift+4 (built-in)
   
4. **Framing:**
   - Don't capture entire screen
   - Crop to just the command palette
   - Include VS Code title bar for context

---

## Asset 3: doc-types.png (Documentation Type Picker)

### What to Show:
Quick pick menu showing all 7 documentation types

### Capture Steps:

1. **Setup:**
   - Open VS Code with some content selected
   - Run: Generate Documentation Prompt command
   - The quick pick menu appears with options

2. **Screenshot Timing:**
   - Capture RIGHT when the menu appears
   - Make sure all 7 types are visible:
     - Write / Rewrite Procedure
     - Explain a Technical Concept
     - Create Troubleshooting Guide
     - Create Reference Documentation
     - Write a Tutorial
     - Generate Release Notes
     - Document an API

3. **Capture:**
   - Take screenshot of the quick pick dropdown
   - Make sure text is readable
   - Include VS Code window frame for context

---

## Asset 4: diff-preview.png (Side-by-Side Diff)

### What to Show:
VS Code diff view showing original vs AI-generated content

### Capture Steps:

1. **Setup:**
   - Have original content in one file: `TESTING/inputs/demo-edit-datasource.md`
   - Have AI response ready
   - Run: "Preview Documentation Rewrite Diff"
   - Diff view opens automatically

2. **What to Capture:**
   - Left panel: Original rough notes
   - Right panel: AI-generated structured docs
   - Highlighted changes (green additions, red deletions)
   - Title bar showing "Documentation Rewrite Preview"

3. **Framing:**
   - Capture enough content to show differences
   - Make sure both panels visible
   - Include file names/tabs at top
   - Show 10-15 lines of content

4. **Tips:**
   - Position cursor on an interesting change
   - Make sure syntax highlighting is visible
   - Use a readable color theme (Light+ or Dark+)

---

## Tools Summary

### For GIFs:
- **ScreenToGif** (Windows): https://www.screentogif.com/
- **Kap** (Mac): https://getkap.co/
- **Peek** (Linux): https://github.com/phw/peek

### For Screenshots:
- **Windows:** Win + Shift + S (Snipping Tool)
- **Mac:** Cmd + Shift + 4
- **Or use:** ShareX, Lightshot, Monosnap

### For Optimization:
- **TinyPNG**: https://tinypng.com/
- **ImageOptim** (Mac): https://imageoptim.com/
- **SVGO** (CLI): For SVG optimization

---

## Quick Checklist

- [ ] Install recording tool (ScreenToGif or Kap)
- [ ] Set up VS Code with demo files
- [ ] Record demo-overview.gif (follow script above)
- [ ] Capture command-palette.png
- [ ] Capture doc-types.png
- [ ] Capture diff-preview.png
- [ ] Optimize all images
- [ ] Save to `/assets` folder
- [ ] Test README-NEW.md renders correctly

---

## Testing Your Assets

After creating assets, test them:

1. Place in `/assets` folder
2. Open README-NEW.md in VS Code
3. Right-click → "Open Preview"
4. Check if images load
5. Verify readability and size

