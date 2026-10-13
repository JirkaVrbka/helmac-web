// build-overview.mjs
// Generates docs/overview.html: a single self-contained, offline documentation page
// for the Helmac Web project (big picture, flow diagrams, security, code browser).
//
// RULES honored by this generator:
//  - All code shown in the page is read from the repository at build time
//    (never hand-copied). See resolveRef() and renderCodeBrowser().
//  - Function/class cross-reference links are computed by STATIC ANALYSIS with the
//    TypeScript compiler API (ts.createSourceFile). The code is never executed.
//  - The generator self-verifies before writing: every flow/overview/security/scenario
//    node resolves to real repository lines, and every code link targets a real symbol
//    definition. On any failure it throws and writes nothing.
//
// Usage: node scripts/build-overview.mjs   (or: npm run docs:overview)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const OUT = path.join(REPO, "docs", "overview.html");

// ---------------------------------------------------------------------------
// 1. Collect the embedded (core) source set for the code browser.
// ---------------------------------------------------------------------------

const EMBED_DIRS = [
    "app",
    "lib",
    "contexts",
    "types",
    "prisma",
    "styles",
];
const EMBED_ROOT_FILES = ["proxy.ts", "instrumentation.ts"];

const EXCLUDE_DIR = new Set(["icons", "node_modules", ".next", "migrations"]);

function isSourceFile(p) {
    return /\.(ts|tsx)$/.test(p) || p.endsWith("schema.prisma");
}

function walk(dir, acc) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (EXCLUDE_DIR.has(e.name)) continue;
            walk(full, acc);
        } else if (isSourceFile(e.name)) {
            acc.push(full);
        }
    }
}

const embedAbs = [];
for (const d of EMBED_DIRS) walk(path.join(REPO, d), embedAbs);
for (const f of EMBED_ROOT_FILES) {
    const full = path.join(REPO, f);
    if (fs.existsSync(full)) embedAbs.push(full);
}
embedAbs.sort();

// ---------------------------------------------------------------------------
// 2. Read files + parse symbols (TS compiler API).
// ---------------------------------------------------------------------------

const fileCache = new Map(); // absPath -> { rel, text, lines }
function readFile(abs) {
    if (fileCache.has(abs)) return fileCache.get(abs);
    const text = fs.readFileSync(abs, "utf8");
    const rec = {
        rel: path.relative(REPO, abs).split(path.sep).join("/"),
        text,
        lines: text.split("\n"),
    };
    fileCache.set(abs, rec);
    return rec;
}

function scriptKindFor(abs) {
    if (abs.endsWith(".tsx")) return ts.ScriptKind.TSX;
    if (abs.endsWith(".ts")) return ts.ScriptKind.TS;
    return ts.ScriptKind.TS;
}

// parseSymbols: returns { symbols:[{name,kind,startLine,endLine,start,end,nameStart,nameEnd,exported}],
//                         idents:[{name,start,end,line,col,nameOf}] }
// Lines/cols are 1-based for display, 0-based internally where noted.
function parseSymbols(abs) {
    if (abs.endsWith("schema.prisma")) return { symbols: [], idents: [] };
    const { text } = readFile(abs);
    const sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true, scriptKindFor(abs));
    const symbols = [];
    const idents = [];
    const posLine = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;

    function isExported(node) {
        const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
        return !!mods && mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    }

    function addSym(name, nameNode, node, kind) {
        if (!name) return;
        symbols.push({
            name,
            kind,
            startLine: posLine(node.getStart(sf)),
            endLine: posLine(node.getEnd()),
            start: node.getStart(sf),
            end: node.getEnd(),
            nameStart: nameNode.getStart(sf),
            nameEnd: nameNode.getEnd(),
            exported: isExported(node),
        });
    }

    function classifyConst(decl) {
        const init = decl.initializer;
        if (!init) return "const";
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return "func";
        if (ts.isCallExpression(init)) return "func"; // cache(async ...), NextAuth(...)
        return "const";
    }

    for (const stmt of sf.statements) {
        if (ts.isFunctionDeclaration(stmt) && stmt.name) {
            addSym(stmt.name.text, stmt.name, stmt, "func");
        } else if (ts.isClassDeclaration(stmt) && stmt.name) {
            addSym(stmt.name.text, stmt.name, stmt, "class");
        } else if (ts.isInterfaceDeclaration(stmt)) {
            addSym(stmt.name.text, stmt.name, stmt, "type");
        } else if (ts.isTypeAliasDeclaration(stmt)) {
            addSym(stmt.name.text, stmt.name, stmt, "type");
        } else if (ts.isEnumDeclaration(stmt)) {
            addSym(stmt.name.text, stmt.name, stmt, "enum");
        } else if (ts.isVariableStatement(stmt)) {
            for (const decl of stmt.declarationList.declarations) {
                if (ts.isIdentifier(decl.name)) {
                    addSym(decl.name.text, decl.name, stmt, classifyConst(decl));
                } else if (ts.isObjectBindingPattern(decl.name)) {
                    for (const el of decl.name.elements) {
                        if (ts.isIdentifier(el.name)) {
                            addSym(el.name.text, el.name, stmt, "const");
                        }
                    }
                }
            }
        }
    }

    // All identifier occurrences (for linking).
    const nameNodeSet = new Set(symbols.map((s) => s.nameStart + ":" + s.nameEnd));
    (function visit(node) {
        if (ts.isIdentifier(node)) {
            const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf));
            idents.push({
                name: node.text,
                start: node.getStart(sf),
                end: node.getEnd(),
                line: lc.line + 1,
                col: lc.character, // 0-based
                isDefName: nameNodeSet.has(node.getStart(sf) + ":" + node.getEnd()),
            });
        }
        ts.forEachChild(node, visit);
    })(sf);

    return { symbols, idents };
}

// ---------------------------------------------------------------------------
// 3. Build global symbol table across the embedded set.
// ---------------------------------------------------------------------------

const files = []; // { abs, rel, idx, lines, symbols, idents }
embedAbs.forEach((abs, idx) => {
    const rec = readFile(abs);
    const { symbols, idents } = parseSymbols(abs);
    files.push({ abs, rel: rec.rel, idx, lines: rec.lines, symbols, idents });
});

const fileIdxByRel = new Map(files.map((f) => [f.rel, f.idx]));

// name -> list of {fileIdx, sym}
const nameToDefs = new Map();
for (const f of files) {
    for (const s of f.symbols) {
        if (!nameToDefs.has(s.name)) nameToDefs.set(s.name, []);
        nameToDefs.get(s.name).push({ fileIdx: f.idx, sym: s });
    }
}
// Only UNIQUELY-defined names become links (guarantees correct, existing target).
const uniqueName = new Map(); // name -> {fileIdx, sym, id}
let symIdSeq = 0;
for (const [name, defs] of nameToDefs) {
    if (defs.length === 1) {
        uniqueName.set(name, { ...defs[0], id: symIdSeq++ });
    }
}

// Assign symbol records with uses/calls.
const symbolRecords = []; // {id,name,kind,fileIdx,line,endLine,exported,uses:[],calls:[]}
const symById = new Map();
for (const [name, u] of uniqueName) {
    const rec = {
        id: u.id,
        name,
        kind: u.sym.kind,
        fileIdx: u.fileIdx,
        line: u.sym.startLine,
        endLine: u.sym.endLine,
        exported: u.sym.exported,
        uses: [],
        calls: new Set(),
    };
    symbolRecords.push(rec);
    symById.set(u.id, rec);
}
symbolRecords.sort((a, b) => a.name.localeCompare(b.name));

// Compute uses (all non-def occurrences of a unique name) and calls (unique names
// referenced inside a symbol's body span).
for (const f of files) {
    for (const occ of f.idents) {
        const u = uniqueName.get(occ.name);
        if (!u) continue;
        const rec = symById.get(u.id);
        const isSelfDef = occ.isDefName && u.fileIdx === f.idx;
        if (!isSelfDef) {
            rec.uses.push({ fileIdx: f.idx, line: occ.line });
        }
        // calls: which enclosing symbol (in THIS file) contains this occurrence?
        for (const s of f.symbols) {
            if (occ.start >= s.start && occ.end <= s.end) {
                const owner = uniqueName.get(s.name);
                if (owner && owner.fileIdx === f.idx && owner.id !== u.id && !occ.isDefName) {
                    symById.get(owner.id).calls.add(u.id);
                }
            }
        }
    }
}
for (const rec of symbolRecords) rec.calls = [...rec.calls];

// ---------------------------------------------------------------------------
// 4. HTML helpers.
// ---------------------------------------------------------------------------

function esc(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// Render a code slice (plain, with line numbers) from a file for modals.
function sliceHtml(lines, startLine, endLine) {
    const out = [];
    for (let n = startLine; n <= endLine && n <= lines.length; n++) {
        out.push(
            '<div class="cl"><span class="ln">' +
                n +
                '</span><span class="lc">' +
                esc(lines[n - 1] ?? "") +
                "</span></div>"
        );
    }
    return out.join("");
}

// ---------------------------------------------------------------------------
// 5. Reference resolution (code shown always comes from the repo).
// ---------------------------------------------------------------------------

const MAX_SLICE = 52;
const resolveErrors = [];

// ref: { file?, symbol?, lineStart?, lineEnd?, note? }
function resolveRef(ref, ctx) {
    try {
        let abs = ref.file ? path.join(REPO, ref.file) : null;
        if (abs && !fs.existsSync(abs)) throw new Error("file not found: " + ref.file);

        if (ref.symbol) {
            let fileIdx = null;
            let rec = null;
            let sym = null;
            if (abs) {
                const parsed = parseSymbols(abs);
                const cands = parsed.symbols.filter((s) => s.name === ref.symbol);
                if (cands.length === 0) throw new Error("symbol '" + ref.symbol + "' not in " + ref.file);
                sym = cands[0];
                rec = readFile(abs);
                if (fileIdxByRel.has(rec.rel)) fileIdx = fileIdxByRel.get(rec.rel);
            } else {
                const u = uniqueName.get(ref.symbol);
                if (!u) {
                    const defs = nameToDefs.get(ref.symbol);
                    throw new Error(
                        "symbol '" + ref.symbol + "' " + (defs ? "ambiguous (" + defs.length + " defs)" : "not found") + " (add file)"
                    );
                }
                fileIdx = u.fileIdx;
                sym = u.sym;
                rec = readFile(files[fileIdx].abs);
            }
            const startLine = sym.startLine;
            const endLine = Math.min(sym.endLine, startLine + MAX_SLICE - 1);
            return {
                loc: rec.rel + ":" + startLine,
                codeHtml: sliceHtml(rec.lines, startLine, endLine),
                fileIdx,
                line: startLine,
            };
        }

        // Literal line range (used for prisma schema, vercel.json, config blocks).
        if (ref.lineStart != null) {
            if (!abs) throw new Error("lineStart requires file");
            const rec = readFile(abs);
            const start = ref.lineStart;
            const end = Math.min(ref.lineEnd ?? ref.lineStart, rec.lines.length);
            if (start < 1 || start > rec.lines.length) throw new Error("bad lineStart " + start + " in " + ref.file);
            const fileIdx = fileIdxByRel.has(rec.rel) ? fileIdxByRel.get(rec.rel) : null;
            return {
                loc: rec.rel + ":" + start,
                codeHtml: sliceHtml(rec.lines, start, end),
                fileIdx,
                line: start,
            };
        }
        throw new Error("ref needs symbol or lineStart");
    } catch (err) {
        resolveErrors.push("[" + ctx + "] " + err.message);
        return { loc: "??", codeHtml: '<div class="cl"><span class="lc">ERR</span></div>', fileIdx: null, line: 1 };
    }
}

// vercel.json for the cron block (not a TS file, embed by lines).
function vercelCronRef(note) {
    const abs = path.join(REPO, "vercel.json");
    const rec = readFile(abs);
    return { file: "vercel.json", lineStart: 1, lineEnd: Math.min(rec.lines.length, 16), note };
}

// ---------------------------------------------------------------------------
// 6. Content model — plain-Czech narrative + repo references.
//    (Narrative in Czech; identifiers verbatim.)
// ---------------------------------------------------------------------------

// Each node: { id, label, desc, ref }
const NODES = {};
function node(id, label, desc, ref) {
    NODES[id] = { id, label, desc, ref };
    return id;
}

// --- Registration (public) ---
node("reg-page", "Veřejná stránka /registrace", "Server Component načte aktivní ročník a definici formuláře, zkontroluje, zda je registrace otevřená, a vykreslí formulář.", { file: "app/(public)/registrace/page.tsx", symbol: "RegistracePage" });
node("reg-form", "Formulář (klient)", "Klientská komponenta sbírá vyplněná pole a přes useActionState pošle data na server. Po úspěchu přepne na poděkování s QR platbou.", { file: "components/public/features/registration/DynamicRegistrationForm.tsx", symbol: "DynamicRegistrationForm" });
node("reg-action", "Server Action: submitDynamicRegistration", "Serverová akce přijme data z formuláře, dohledá aktivní ročník a připraví data ke zpracování.", { file: "lib/actions/public/registration.ts", symbol: "submitDynamicRegistration" });
node("reg-zod", "Validace (Zod)", "Dynamicky sestavené Zod schéma ověří každé pole podle jeho typu (e-mail, číslo, povinnost). Chyby se vrátí zpět k poli.", { file: "lib/validators/registration-submission.ts", symbol: "buildSubmissionSchema" });
node("reg-checks", "Kontroly: kapacita a duplicita", "Ověří volnou kapacitu a že se stejný e-mail nehlásí dvakrát. Čte přes PostgreSQL funkce a Prisma.", { file: "lib/services/v2.ts", symbol: "checkCapacity" });
node("reg-write", "Zápis do databáze (transakce)", "V jedné transakci se uloží přihláška a zároveň se zapíše normalizovaný „v2\" strom objednávky (objednávka → osoby → položky).", { file: "lib/utils/v2-dual-write.ts", symbol: "createV2Order" });
node("reg-resp", "Odpověď + potvrzovací e-mail", "Sestaví se QR platba (SPAYD) a odešle potvrzovací e-mail. Uživateli se vrátí stav s variabilním symbolem a částkou.", { file: "lib/utils/email.ts", symbol: "generateQRPaymentImage" });

// --- Admin create year (CRUD rhythm) ---
node("yr-page", "Admin: seznam ročníků", "Server Component načte ročníky z databáze (s počty stránek/novinek/alb) a vykreslí seznam s filtry.", { file: "app/admin/rocniky/page.tsx", symbol: "YearsPage" });
node("yr-auth", "Autorizace: requireAdmin", "Každá mutace nejprve ověří roli. Hierarchie: SUPER_ADMIN > ADMIN > EDITOR.", { file: "lib/auth.ts", symbol: "requireAuth" });
node("yr-action", "Server Action: createYear", "Serverová akce ověří roli, přečte data, zvaliduje, zkontroluje duplicitu roku a zapíše.", { file: "lib/actions/years.ts", symbol: "createYear" });
node("yr-zod", "Validace: createYearSchema", "Zod schéma pro ročník (rok 2000–2100, název, volitelné datumy). updateYearSchema = schema.partial().", { file: "lib/validators/year.ts", symbol: "createYearSchema" });
node("yr-write", "Zápis + výchozí stránky", "Uloží ročník a založí 7 výchozích stránek (úvod, program, registrace, …). Pak revalidatePath a redirect.", { file: "lib/actions/years.ts", symbol: "createDefaultPages" });
node("yr-read", "Čtení: getActiveYear (cache)", "Servisní vrstva je jen pro čtení, obalená React cache() pro deduplikaci v rámci jednoho renderu.", { file: "lib/services/years.ts", symbol: "getActiveYear" });

// --- Admin login / auth ---
node("auth-login", "Přihlášení (server action)", "Formulář volá login(), ten zavolá NextAuth signIn s poskytovatelem Credentials.", { file: "lib/actions/auth.ts", symbol: "login" });
node("auth-authorize", "Ověření hesla (Argon2)", "authorize() najde uživatele podle e-mailu a ověří heslo přes argon2.verify proti uloženému hashi.", { file: "lib/auth.ts", lineStart: 22, lineEnd: 48 });
node("auth-config", "Konfigurace + guard", "authConfig drží callbacky (role do JWT/session) a authorized(), který blokuje /admin bez přihlášení.", { file: "lib/auth.config.ts", symbol: "authConfig" });
node("auth-proxy", "Proxy (middleware)", "Skutečný vstupní bod ochrany tras je proxy.ts: /admin řeší NextAuth, /ucet řeší veřejný JWT.", { file: "proxy.ts", symbol: "proxy" });
node("auth-public", "Veřejný uživatel (jose JWT)", "Druhý, samostatný systém: veřejní uživatelé mají vlastní podepsaný JWT v httpOnly cookie.", { file: "lib/public-auth.ts", symbol: "getPublicSession" });

// --- Upload ---
node("up-route", "POST /api/upload", "Route handler ověří roli, převezme soubor z FormData a zkontroluje typ a velikost.", { file: "app/api/upload/route.ts", symbol: "POST" });
node("up-gate", "Kontrola typu a velikosti", "Povolené typy (ALLOWED_TYPES) a maximální velikost (MAX_FILE_SIZE = 15 MB). Název se sanitizuje.", { file: "app/api/upload/route.ts", symbol: "sanitizeFilename" });
node("up-r2", "Uložení do Cloudflare R2", "V produkci jde soubor do R2 (S3-kompatibilní). V dev prostředí se ukládá lokálně do public/uploads.", { file: "lib/r2.ts", symbol: "uploadToR2" });
node("up-client", "S3 klient", "Líně vytvořený S3Client míří na R2 endpoint účtu s přihlašovacími údaji z prostředí.", { file: "lib/r2.ts", symbol: "getClient" });

// --- Rich text ---
node("rt-editor", "Editor Tiptap (admin)", "Admin píše obsah ve WYSIWYG editoru. Výstup je Markdown (přes tiptap-markdown).", { file: "components/admin/rich-text-editor.tsx", symbol: "RichTextEditor" });
node("rt-html2md", "HTML → Markdown", "Pomocná konverze (Turndown + GFM) pro migraci staršího HTML obsahu do Markdownu.", { file: "lib/utils/html-to-markdown.ts", symbol: "htmlToMarkdown" });
node("rt-render", "Veřejné vykreslení", "Na veřejných stránkách se Markdown renderuje přes react-markdown s bezpečnou sanitizací.", { file: "components/ui/markdown-content.tsx", symbol: "MarkdownContent" });
node("rt-sanitize", "Sanitizace HTML", "sanitizeSchema rozšiřuje výchozí whitelist tagů/atributů. Nic mimo whitelist se nevykreslí.", { file: "components/ui/markdown-content.tsx", symbol: "sanitizeSchema" });

// --- Mass email queue ---
node("mail-start", "startCampaign (admin)", "Admin spustí hromadný e-mail: stav → SENDING, vyřeší příjemce, založí položky fronty a nakopne zpracování.", { file: "lib/actions/email-campaigns.ts", symbol: "startCampaign" });
node("mail-kick", "kickEmailQueue", "Fire-and-forget POST na procesní route s hlavičkou Bearer CRON_SECRET (5s timeout, chyba se jen zaloguje).", { file: "lib/utils/email-queue.ts", symbol: "kickEmailQueue" });
node("mail-route", "Procesní route (self-chain)", "Route ověří CRON_SECRET, zpracuje dávku a dokud zbývají položky, znovu nakopne sama sebe (after()).", { file: "app/api/email-queue/process/route.ts", symbol: "POST" });
node("mail-process", "processEmailQueue + advisory lock", "Vše běží v transakci s pg_try_advisory_xact_lock — jen jedna instance globálně odebírá frontu.", { file: "lib/utils/email-queue.ts", symbol: "processEmailQueue" });
node("mail-drain", "drainQueue (dávka)", "Zabere nejstarší SENDING kampaň, pošle jednu škrcenou dávku, hlídá hodinové/denní limity a stav pauzy.", { file: "lib/utils/email-queue.ts", symbol: "drainQueue" });
node("mail-smtp", "SMTP transport (Seznam)", "Poolovaný nodemailer transport: pool:true, maxConnections:1, maxMessages:100 (limity Seznam.cz).", { file: "lib/utils/email.ts", symbol: "createSmtpTransporterForAccount" });
node("mail-cron", "Denní crony (záchrana)", "Vercel Hobby crony běží 1×/den: update-prices (nakopne zaseklou frontu) a sync-payments.", vercelCronRef("Záchranné crony pro zaseklý řetězec"));

// --- Search / filtering (there is no dedicated search feature) ---
node("find-dup", "findDuplicateEmail", "Lookup: ověří, že se stejný e-mail v ročníku nehlásí podruhé (jedna registrace na e-mail).", { file: "lib/services/v2.ts", symbol: "findDuplicateEmail" });
node("find-cap", "checkCapacity", "Lookup: spočítá obsazenost volby a odmítne přihlášku nad kapacitu.", { file: "lib/services/v2.ts", symbol: "checkCapacity" });
node("find-years", "getYears (filtry)", "Admin filtrování seznamu: getYears bere filtry a staví Prisma dotaz (komponenta ListFilters v UI).", { file: "app/admin/rocniky/page.tsx", symbol: "getYears" });
node("find-order", "getOrderByLegacyId", "Dohledání detailu objednávky přes PostgreSQL funkci (v2_get_form_structure) a $queryRaw.", { file: "lib/services/v2.ts", symbol: "getOrderByLegacyId" });

// --- Overview (big picture) extra nodes ---
node("ov-db", "Prisma klient (singleton)", "Jediná instance PrismaClient pro celou aplikaci (lib/db.ts). Přes ni jdou všechny dotazy do PostgreSQL.", { file: "lib/db.ts", symbol: "db" });
node("ov-schema", "Schéma: model V2Order", "Datový model objednávky v PostgreSQL (tabulka v2_orders). Součást normalizovaného „v2\" katalogu.", { file: "prisma/schema.prisma", symbol: null, lineStart: 836, lineEnd: 872 });

const FLOWS = [
    {
        id: "registrace",
        title: "Registrace účastníka",
        summary: "Od otevření formuláře po potvrzovací e-mail s QR platbou. Typická cesta veřejného návštěvníka.",
        steps: ["reg-page", "reg-form", "reg-action", "reg-zod", "reg-checks", "reg-write", "reg-resp"],
    },
    {
        id: "admin-rocnik",
        title: "Admin: založení ročníku",
        summary: "Rytmus všech admin úprav: stránka → serverová akce (role → validace → zápis → revalidace → redirect).",
        steps: ["yr-page", "yr-auth", "yr-action", "yr-zod", "yr-write", "yr-read"],
    },
    {
        id: "auth",
        title: "Přihlášení a ochrana tras",
        summary: "Dvě oddělené brány: admin (NextAuth + Argon2) a veřejný uživatel (jose JWT). Ochranu řeší proxy.ts.",
        steps: ["auth-login", "auth-authorize", "auth-config", "auth-proxy", "auth-public"],
    },
    {
        id: "upload",
        title: "Nahrávání souborů",
        summary: "Obrázky a přílohy: kontrola role, typu a velikosti, pak uložení do Cloudflare R2 (nebo lokálně v dev).",
        steps: ["up-route", "up-gate", "up-r2", "up-client"],
    },
    {
        id: "richtext",
        title: "Formátovaný obsah",
        summary: "Admin píše v Tiptap editoru (výstup Markdown), veřejné stránky renderují přes react-markdown s sanitizací.",
        steps: ["rt-editor", "rt-html2md", "rt-render", "rt-sanitize"],
    },
    {
        id: "emaily",
        title: "Hromadné e-maily (fronta)",
        summary: "Škrcená, sama se řetězící fronta s globálními limity a advisory lockem. Žádný minutový cron není potřeba.",
        steps: ["mail-start", "mail-kick", "mail-route", "mail-process", "mail-drain", "mail-smtp", "mail-cron"],
    },
    {
        id: "hledani",
        title: "Vyhledávání a filtrování",
        summary: "Samostatné hledání v appce není — místo něj cílené lookupy a filtry: duplicity, kapacita, filtry seznamů, detail objednávky.",
        steps: ["find-dup", "find-cap", "find-years", "find-order"],
    },
];

const OVERVIEW = {
    phases: [
        {
            title: "1 · Vstupy",
            desc: "Odkud přicházejí data",
            nodes: ["reg-form", "yr-page", "up-route", "mail-start"],
        },
        {
            title: "2 · Zpracování",
            desc: "Server Actions, validace, autorizace, fronta",
            nodes: ["reg-action", "reg-zod", "yr-auth", "mail-process"],
        },
        {
            title: "3 · Databáze",
            desc: "Prisma + PostgreSQL",
            nodes: ["ov-db", "ov-schema", "reg-write"],
        },
        {
            title: "4 · Odpovědi",
            desc: "Co se vrátí ven",
            nodes: ["reg-resp", "yr-read", "mail-smtp"],
        },
    ],
};

const SECURITY = [
    { label: "Argon2 hashování hesel", desc: "Admin hesla se ověřují přes argon2.verify, nikdy se neukládají v plaintextu.", ref: { file: "lib/auth.ts", lineStart: 22, lineEnd: 48 } },
    { label: "Dvě oddělené auth brány", desc: "Admin (NextAuth) a veřejný uživatel (jose JWT) jsou oddělené systémy s různými secrety.", ref: { file: "lib/public-auth.ts", symbol: "getPublicSession" } },
    { label: "Role a oprávnění", desc: "requireAuth/requireAdmin/requireEditor hlídají hierarchii rolí na začátku každé mutace.", ref: { file: "lib/auth.ts", symbol: "requireAuth" } },
    { label: "CRON_SECRET (fail-closed)", desc: "Procesní a cron routy vyžadují Bearer CRON_SECRET; chybějící secret = odmítnuto.", ref: { file: "app/api/email-queue/process/route.ts", symbol: "POST" } },
    { label: "Zod validace vstupů", desc: "Každé pole formuláře se validuje serverově podle typu před jakýmkoli zápisem.", ref: { file: "lib/validators/registration-submission.ts", symbol: "buildFieldSchema" } },
    { label: "Advisory lock u fronty", desc: "pg_try_advisory_xact_lock zajistí, že e-maily odebírá jen jedna instance — žádné dvojí odeslání.", ref: { file: "lib/utils/email-queue.ts", symbol: "processEmailQueue" } },
    { label: "httpOnly session cookie", desc: "Veřejná session je v httpOnly cookie, nedostupná z JavaScriptu v prohlížeči.", ref: { file: "lib/public-auth.ts", symbol: "setPublicSession" } },
    { label: "Sanitizace HTML obsahu", desc: "Uživatelský Markdown se renderuje přes rehype-sanitize s whitelistem tagů a atributů.", ref: { file: "components/ui/markdown-content.tsx", symbol: "sanitizeSchema" } },
];

const SCENARIOS = [
    { id: "s-reg", title: "Účastník se registruje", flowId: "registrace" },
    { id: "s-mail", title: "Admin rozešle hromadný e-mail", flowId: "emaily" },
    { id: "s-year", title: "Admin založí ročník", flowId: "admin-rocnik" },
    { id: "s-login", title: "Admin se přihlásí", flowId: "auth" },
];

// ---------------------------------------------------------------------------
// 7. Resolve all refs (fills code + self-check targets).
// ---------------------------------------------------------------------------

const resolvedNodes = {};
for (const [id, n] of Object.entries(NODES)) {
    const r = resolveRef(n.ref, "node:" + id);
    resolvedNodes[id] = { id, label: n.label, desc: n.desc, loc: r.loc, codeHtml: r.codeHtml, fileIdx: r.fileIdx, line: r.line };
}
const resolvedSecurity = SECURITY.map((c, i) => {
    const r = resolveRef(c.ref, "security:" + i);
    return { label: c.label, desc: c.desc, loc: r.loc, codeHtml: r.codeHtml, fileIdx: r.fileIdx, line: r.line };
});

// ---------------------------------------------------------------------------
// 8. Render the code browser (full embedded source with symbol links).
// ---------------------------------------------------------------------------

function renderFileCode(f) {
    // Build per-line maps of identifier spans we will linkify.
    const perLine = new Map(); // line(1-based) -> [{col,endCol,symId,isDef}]
    for (const occ of f.idents) {
        const u = uniqueName.get(occ.name);
        if (!u) continue;
        const isDef = occ.isDefName && u.fileIdx === f.idx;
        const endCol = occ.col + (occ.end - occ.start);
        if (!perLine.has(occ.line)) perLine.set(occ.line, []);
        perLine.get(occ.line).push({ col: occ.col, endCol, symId: u.id, isDef });
    }
    const out = [];
    for (let i = 0; i < f.lines.length; i++) {
        const n = i + 1;
        const raw = f.lines[i];
        let html;
        const spans = (perLine.get(n) || []).sort((a, b) => a.col - b.col);
        if (spans.length === 0) {
            html = esc(raw);
        } else {
            let cur = 0;
            let acc = "";
            for (const s of spans) {
                if (s.col < cur) continue; // overlap guard
                acc += esc(raw.slice(cur, s.col));
                const word = esc(raw.slice(s.col, s.endCol));
                if (s.isDef) {
                    acc += '<span class="sym def" id="S' + s.symId + '" data-sym="' + s.symId + '">' + word + "</span>";
                } else {
                    acc += '<a class="sym" href="#S' + s.symId + '" data-sym="' + s.symId + '">' + word + "</a>";
                }
                cur = s.endCol;
            }
            acc += esc(raw.slice(cur));
            html = acc;
        }
        out.push('<div class="cl" id="F' + f.idx + "L" + n + '"><span class="ln">' + n + '</span><span class="lc">' + html + "</span></div>");
    }
    return out.join("");
}

const codeFiles = files.map((f) => ({
    idx: f.idx,
    path: f.rel,
    lines: f.lines.length,
    html: renderFileCode(f),
}));

const codeSymbols = symbolRecords.map((s) => ({
    id: s.id,
    name: s.name,
    kind: s.kind,
    fileIdx: s.fileIdx,
    line: s.line,
    exported: s.exported,
    uses: s.uses,
    calls: s.calls,
}));

// ---------------------------------------------------------------------------
// 9. SELF-CHECK (authoritative). Throw before writing if anything is wrong.
// ---------------------------------------------------------------------------

const errors = [...resolveErrors];

// (a) every flow step references a known, resolved node
for (const fl of FLOWS) {
    for (const sid of fl.steps) {
        if (!resolvedNodes[sid]) errors.push("flow " + fl.id + " references missing node " + sid);
    }
}
// (b) every overview node resolves
for (const ph of OVERVIEW.phases) {
    for (const sid of ph.nodes) {
        if (!resolvedNodes[sid]) errors.push("overview references missing node " + sid);
    }
}
// (c) every scenario points at a real flow
for (const sc of SCENARIOS) {
    if (!FLOWS.find((f) => f.id === sc.flowId)) errors.push("scenario " + sc.id + " -> unknown flow " + sc.flowId);
}
// (d) every resolved node/security card points at a real line
for (const [id, n] of Object.entries(resolvedNodes)) {
    if (n.loc === "??") errors.push("node " + id + " failed to resolve to a line");
    if (n.fileIdx != null) {
        const f = files[n.fileIdx];
        if (!f || n.line < 1 || n.line > f.lines.length) errors.push("node " + id + " line out of range");
    }
}
resolvedSecurity.forEach((c, i) => {
    if (c.loc === "??") errors.push("security card " + i + " failed to resolve");
});
// (e) every code link target id exists
const defIds = new Set(codeSymbols.map((s) => "S" + s.id));
let linkChecked = 0;
for (const cf of codeFiles) {
    const re = /href="#(S\d+)"/g;
    let m;
    while ((m = re.exec(cf.html))) {
        linkChecked++;
        if (!defIds.has(m[1])) errors.push("code link " + m[1] + " in " + cf.path + " has no definition");
    }
}

if (errors.length) {
    console.error("SELF-CHECK FAILED (" + errors.length + "):");
    for (const e of errors.slice(0, 40)) console.error("  - " + e);
    process.exit(1);
}

const totalLines = files.reduce((a, f) => a + f.lines.length, 0);
console.log(
    "self-check OK · files=" + files.length + " lines=" + totalLines + " symbols=" + codeSymbols.length + " links=" + linkChecked
);

// ---------------------------------------------------------------------------
// 10. Assemble the page.
// ---------------------------------------------------------------------------

const DATA = {
    meta: {
        generatedAt: new Date().toISOString().slice(0, 10),
        files: files.length,
        lines: totalLines,
        symbols: codeSymbols.length,
    },
    nodes: resolvedNodes,
    flows: FLOWS,
    overview: OVERVIEW,
    security: resolvedSecurity,
    scenarios: SCENARIOS,
    code: { files: codeFiles, symbols: codeSymbols },
};

const dataJson = JSON.stringify(DATA)
    .split("<").join("\\u003c")
    .split(String.fromCharCode(0x2028)).join("\\u2028")
    .split(String.fromCharCode(0x2029)).join("\\u2029");

const CSS = readTemplate("overview.css");
const JS = readTemplate("overview.js");

function readTemplate(name) {
    return fs.readFileSync(path.join(__dirname, "overview-assets", name), "utf8");
}

const HTML =
    "<!doctype html>\n" +
    '<html lang="cs" data-theme="auto">\n' +
    "<head>\n" +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    "<title>Helmac Web — průvodce projektem</title>\n" +
    '<meta name="description" content="Interaktivní průvodce projektem Helmac Web: velký obraz, diagramy postupů a prohlížeč kódu.">\n' +
    "<style>\n" + CSS + "\n</style>\n" +
    "</head>\n<body>\n" +
    BODY_HTML() +
    '<script>window.__DATA__=' + dataJson + ";</script>\n" +
    "<script>\n" + JS + "\n</script>\n" +
    "</body>\n</html>\n";

function BODY_HTML() {
    return [
        '<header class="top">',
        '  <div class="brand"><span class="logo">⬢</span><div><b>Helmac Web</b><small>průvodce projektem</small></div></div>',
        '  <nav class="tabs" id="tabs"></nav>',
        '  <button class="theme" id="themeBtn" title="Světlý/tmavý režim" aria-label="Přepnout režim">◐</button>',
        "</header>",
        '<main id="main"></main>',
        '<div class="modal-root" id="modalRoot" hidden></div>',
        '<div class="search-root" id="searchRoot" hidden></div>',
    ].join("\n");
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, HTML, "utf8");
const kb = Math.round(Buffer.byteLength(HTML) / 1024);
console.log("wrote " + path.relative(REPO, OUT) + " (" + kb + " KB)");
