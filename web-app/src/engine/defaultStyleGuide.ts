export const DEFAULT_STYLE_GUIDE = `# Technical Writing Review Rules

## File Naming Conventions
- Filenames must not contain whitespace
- Filenames must not contain dots (except before extension)
- Filenames must not contain special characters
- Filenames must be lowercase
- Use hyphens or underscores instead of dots or whitespace
- Filenames should match the page title (shortened, without pronouns)
- Product names should be omitted from filenames when file is in product subfolder

## Sentence Structure and Length
- Keep sentences under 20 words
- Break long descriptions into smaller chunks
- Use simple, specific, clear, and informative wording
- Use consistent words and grammatical forms throughout
- Avoid abbreviations unless defined first and added to global glossary

## Headings
- Use short descriptive headings
- Capitalize only the first letter of first word and proper nouns
- Use "-ing" form of verbs in headings (e.g., "Adding a new element" not "Add a new element")
- Use descriptive headings for main heading (h1)
- Avoid using level 4+ headings when possible
- Do not end headings with punctuation
- Add blank lines before and after headings

## User Interface References
- Use double quotation marks for UI elements users click or interact with
- Use inline code for terminal commands, code settings, parameters, messages, and filenames
- Use inline code for values entered in text fields
- Use \\\`++<key>++\\\` syntax for keyboard shortcuts

## Tone and Voice
- Use natural, conversational language (not robotic, funny, cool, or clever)
- Address users in second-person (you)
- Use first-person plural for the application (we)
- Use gender-neutral language
- Use polite language
- Use "please" and "sorry" only when necessary for something inconvenient or unplanned
- Use positive framing instead of negative
- Use positive contractions to avoid sounding too formal (you will, we have)
- Avoid negative contractions (can't, won't)

## Capitalization
- Capitalize first letter of first word in titles, sentences, tooltips, menu items, list items, and buttons
- Capitalize proper nouns (places, organizations, tools, languages, products)
- Capitalize named app functions and UI elements

## Grammar and Tense
- Use present simple tense for actions and instructions
- Use simple verb forms only (avoid continuous, progressive, or compound forms)
- Use active voice instead of passive voice
- State conditions before activities
- Put the goal of an action at the beginning

## Punctuation
- Use exclamation marks only for high-level warnings
- Use question marks only when necessary
- Use colons to introduce lists
- Use full stops at the end of all full sentences
- Use full stops before file extensions (.csv, .txt, .zip)
- Use ellipsis only for transitional text (Upload…)
- Use single quotation marks for possession
- Avoid ampersands unless in product or company name
- Avoid asterisks in applications
- Avoid brackets ( ) and [ ]
- Avoid semi-colons
- Rule for commas: "If in doubt leave it out"

## Spacing
- No space before percent sign (%)
- No space before colon, semi-colon, or ellipsis
- Add space after colon or semi-colon
- Add space before and after quotation marks, hyphens, and em dashes
- Add space before unit of measurement (11 kg, 32 bits)
- Exception: No space for times (11am, 4pm)

## Lists
- Use consistent full stops in lists (all or none, not mixed)
- Make lists parallel (same look, length, punctuation, capitalization)
- Use fragments or full sentences in lists, not both
- If one bullet has two sentences, use full stops for all bullets
- Use lists for multiple examples instead of long sentences
- Introduce lists with description followed by colon
- Use tables if list items have descriptions or additional information
- Avoid excessive nesting in multi-level lists
- Add blank lines before and after lists
- Add proper spacing after list markers
- Indent nested lists consistently (4 spaces)

## Numbered Lists for Procedures
- Start each action item with capital letter
- Start with the verb and avoid "you"
- Do not use temporal words (after that, then, at the end)
- Each step must describe a single, discrete user action
- Result descriptions must belong to the step that triggers them
- Add two trailing spaces at line end when continuing step content on next line
- Indent continuation content with 4 spaces (results, images, explanatory text)
- Images must visually represent the state described in that step
- Use numbered lists to break down actions into small sequential steps

## Screenshots and Images
- Use screenshots to make steps clearer, show results, or provide app layout overview
- Use light mode for app UI screenshots
- Use red frame (3px border, #FF0000) to highlight UI content
- Use dark background (#000028) for overview graphics
- Blur internal or private data
- Maintain consistent screenshot size throughout topic or chapter
- Use same settings and example project for related screenshots
- Store as PNG or JPEG in "images" folder
- Use 120 dpi resolution
- Do not change resolution after creation
- Use plain orange boxes (#FF9000, 1.5pt outline, rounded edges) for highlights
- Redact personal information before publishing

## Notices and Admonitions
- Use correct syntax with 4 spaces indentation when part of a list
- Use correct hint type (note, info, warning, etc.)
- Use hints only when needed, not for every piece of information
- Place hints before the action if information is required beforehand
- Do not overuse "please note" phrases; use admonitions instead

## Time-Based Vocabulary
- Use "latest" for most recent (implies more may follow)
- Use "previous" for the version before current (not "last")
- Use "last" only if truly final with nothing to follow
- Use "recent" for events that happened a short time ago

## Code Blocks
- Display complete code for examples
- Use title parameter to indicate which file is involved
- Specify language for fenced code blocks
- Use consistent code fence style (backticks or tildes)

## Words and Phrases to Avoid
- Avoid filler words: for that reason, therefore, according, furthermore
- Avoid "to do" (too generic)
- Avoid "should" and "could" (provides room for interpretation)
- Avoid "master/slave" terminology
- Avoid weak expressions: it is, there is, there are
- Avoid nominalized verbs
- Avoid "please" (not necessary)
- Avoid colloquial expressions: simply, it's very easy, just
- Avoid abbreviations like e.g. (use "for example" or "such as")

## Content Organization Principles
- Group same content together at one location
- Describe instructions in chronological order
- Use case-based writing (what user can do and how)
- Avoid conjunctives (too many interpretations)
- Avoid excessive explicit notes that interrupt reading flow
- Limit use of italic and bold text
- Do not use hard returns in middle of sentences

## Tables
- Ensure all table rows have correct number of columns matching header
- Add trailing pipe to all table rows
- Use format \\\`| --- | --- |\\\` with spaces around pipes for separator rows
- Consolidate multi-line value ranges onto single line using semicolons

## Links
- Present links as description of target rather than URL itself
- Use proper link syntax for URLs
- Ensure link titles or labels are not blank

## Product Names
- Write full product name followed by abbreviated form in parentheses on first use
- Example: SIMATIC Project SDC Control App (SDC DCA)
- Continue using abbreviation throughout document after introduction

## General Formatting
- Remove trailing spaces from lines
- Remove hard tabs; use spaces instead
- Remove multiple consecutive blank lines (max 1 blank line)
- Add space after hash in headings
- Files should end with single newline character
- First line should be top-level heading (H1)
- Use only one H1 per file
- Increment heading levels by one (no skipping levels)
- Keep line lengths under 80 characters (except for long URLs or unbreakable strings)
- Avoid raw HTML tags; use pure Markdown syntax whenever possible
`;
