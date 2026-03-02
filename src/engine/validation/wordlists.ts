/**
 * Shared lexical data used by the DocumentNormalizer.
 * Pure data module — no side effects.
 */

/** Common English stopwords that carry no semantic weight. */
export const STOPWORDS = new Set<string>([
  "a","about","above","after","again","against","all","also","am","an","and",
  "any","are","as","at","be","because","been","before","being","below","between",
  "both","but","by","can","cannot","could","did","do","does","doing","down",
  "during","each","few","for","from","further","get","got","had","has","have",
  "having","he","her","here","him","himself","his","how","i","if","in","into",
  "is","it","its","itself","just","me","more","most","my","myself","no","nor",
  "not","now","of","off","on","once","only","or","other","our","out","over",
  "own","s","same","she","should","so","some","such","than","that","the",
  "their","them","then","there","these","they","this","those","through","to",
  "too","under","until","up","us","very","was","we","were","what","when",
  "where","which","while","who","whom","why","will","with","would","you",
  "your","yourself","per","via","e.g","i.e","etc","may","might","must",
  "shall","been","being","been","let","make","made","use","used","using",
  "one","two","three","four","five","six","seven","eight","nine","ten",
  "its","it's","don't","doesn't","isn't","aren't","wasn't","weren't",
  "hasn't","haven't","hadn't","won't","wouldn't","shan't","shouldn't",
  "can't","cannot","couldn't","didn't","need","needs","needed"
]);

/** Words that are clearly adjective/adverb – exclude from noun candidates. */
export const ADJECTIVE_SUFFIXES = [
  "ful","less","ous","ious","eous","al","ial","ical","ive","ative","itive",
  "able","ible","ly","ry","ary","ery","ory","ic"
];

/**
 * Irregular verb forms mapped to their infinitive.
 * Covers the most common cases in technical writing.
 */
export const IRREGULAR_VERBS: Record<string, string> = {
  "is":"be","are":"be","was":"be","were":"be","been":"be","being":"be",
  "has":"have","had":"have","having":"have",
  "does":"do","did":"do","done":"do","doing":"do",
  "went":"go","goes":"go","gone":"go","going":"go",
  "ran":"run","runs":"run","running":"run",
  "got":"get","gets":"get","gotten":"get","getting":"get",
  "set":"set","sets":"set","setting":"set",
  "put":"put","puts":"put","putting":"put",
  "made":"make","makes":"make","making":"make",
  "took":"take","takes":"take","taken":"take","taking":"take",
  "gave":"give","gives":"give","given":"give","giving":"give",
  "came":"come","comes":"come","coming":"come",
  "saw":"see","sees":"see","seen":"see","seeing":"see",
  "said":"say","says":"say","saying":"say",
  "wrote":"write","written":"write","writing":"write","writes":"write",
  "sent":"send","sends":"send","sending":"send",
  "found":"find","finds":"find","finding":"find",
  "used":"use","uses":"use","using":"use",
  "called":"call","calls":"call","calling":"call",
  "opened":"open","opens":"open","opening":"open",
  "closed":"close","closes":"close","closing":"close",
  "selected":"select","selects":"select","selecting":"select",
  "clicked":"click","clicks":"click","clicking":"click",
  "entered":"enter","enters":"enter","entering":"enter",
  "started":"start","starts":"start","starting":"start",
  "stopped":"stop","stops":"stop","stopping":"stop",
  "configured":"configure","configures":"configure","configuring":"configure",
  "connected":"connect","connects":"connect","connecting":"connect",
  "loaded":"load","loads":"load","loading":"load",
  "saved":"save","saves":"save","saving":"save",
  "deleted":"delete","deletes":"delete","deleting":"delete",
  "updated":"update","updates":"update","updating":"update",
  "deployed":"deploy","deploys":"deploy","deploying":"deploy",
  "installed":"install","installs":"install","installing":"install",
  "created":"create","creates":"create","creating":"create",
  "removed":"remove","removes":"remove","removing":"remove",
  "added":"add","adds":"add","adding":"add",
  "checked":"check","checks":"check","checking":"check",
  "verified":"verify","verifies":"verify","verifying":"verify",
  "enabled":"enable","enables":"enable","enabling":"enable",
  "disabled":"disable","disables":"disable","disabling":"disable",
  "triggered":"trigger","triggers":"trigger","triggering":"trigger",
  "initialized":"initialize","initializes":"initialize","initializing":"initialize",
  "validated":"validate","validates":"validate","validating":"validate",
  "generated":"generate","generates":"generate","generating":"generate",
  "processed":"process","processes":"process","processing":"process",
  "returned":"return","returns":"return","returning":"return",
  "defined":"define","defines":"define","defining":"define",
  "assigned":"assign","assigns":"assign","assigning":"assign",
  "imported":"import","imports":"import","importing":"import",
  "exported":"export","exports":"export","exporting":"export",
  "mapped":"map","maps":"map","mapping":"map",
  "logged":"log","logs":"log","logging":"log",
  "passed":"pass","passes":"pass","passing":"pass",
  "failed":"fail","fails":"fail","failing":"fail",
  "built":"build","builds":"build","building":"build",
  "compiled":"compile","compiles":"compile","compiling":"compile",
  "tested":"test","tests":"test","testing":"test",
  "submitted":"submit","submits":"submit","submitting":"submit",
  "confirmed":"confirm","confirms":"confirm","confirming":"confirm",
  "prompted":"prompt","prompts":"prompt","prompting":"prompt",
  "raised":"raise","raises":"raise","raising":"raise",
  "thrown":"throw","throws":"throw","throwing":"throw",
  "caught":"catch","catches":"catch","catching":"catch",
  "handled":"handle","handles":"handle","handling":"handle",
  "navigated":"navigate","navigates":"navigate","navigating":"navigate",
  "redirected":"redirect","redirects":"redirect","redirecting":"redirect",
  "merged":"merge","merges":"merge","merging":"merge",
  "synced":"sync","syncs":"sync","syncing":"sync",
  "synchronized":"synchronize","synchronizes":"synchronize","synchronizing":"synchronize",
  // Technical writing imperative base forms — kept here so lemmatizeVerb
  // returns the word itself when called on the base form.
  "click":"click","check":"check","submit":"submit","scroll":"scroll",
  "install":"install","pull":"pull","push":"push","merge":"merge",
  "navigate":"navigate","upload":"upload","download":"download",
  "rename":"rename","reset":"reset","restart":"restart","refresh":"refresh",
  "expand":"expand","collapse":"collapse","select":"select",
  "toggle":"toggle","filter":"filter","sort":"sort","search":"search",
  "type":"type","paste":"paste","copy":"copy","cut":"cut",
  "launch":"launch","run":"run","stop":"stop","start":"start",
  "resume":"resume","pause":"pause","cancel":"cancel","abort":"abort",
  "grant":"grant","revoke":"revoke","assign":"assign","apply":"apply",
  "publish":"publish","archive":"archive","restore":"restore",
};

/** Ambiguity signal phrases in technical prose. */
export const AMBIGUITY_PHRASES: RegExp[] = [
  /\bif (necessary|needed|required|applicable)\b/i,
  /\bas required\b/i,
  /\bwhere (necessary|applicable|appropriate)\b/i,
  /\bappropriate (configuration|settings?|values?)\b/i,
  /\badvanced (settings?|options?|configuration)\b/i,
  /\bstandard (workflow|procedure|process)\b/i,
  /\busual (process|steps?|workflow)\b/i,
  /\betc\.?\b/i,
  /\band (so on|similar)\b/i,
  /\bsuch as\b/i,
  /\b(may|might|possibly|potentially) (be|need|require)\b/i,
];
