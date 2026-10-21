/* Helmac Web overview — client interaction. No build step; runs offline. */
(function () {
    "use strict";
    var D = window.__DATA__;

    function h(html) {
        return String(html)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
    function $(sel, root) {
        return (root || document).querySelector(sel);
    }
    function node(id) {
        return D.nodes[id];
    }

    var VIEWS = [
        { id: "prehled", label: "Přehled" },
        { id: "postupy", label: "Postupy" },
        { id: "bezpecnost", label: "Bezpečnost" },
        { id: "kod", label: "Kód" },
    ];
    var main = $("#main");
    var tabsEl = $("#tabs");

    // ---------------- theme ----------------
    var themeBtn = $("#themeBtn");
    function readTheme() {
        try {
            return localStorage.getItem("helmac-theme") || "auto";
        } catch {
            return "auto";
        }
    }
    function applyTheme(t) {
        document.documentElement.setAttribute("data-theme", t);
        themeBtn.textContent = t === "dark" ? "☾" : t === "light" ? "☀" : "◐";
    }
    applyTheme(readTheme());
    themeBtn.addEventListener("click", function () {
        var order = ["auto", "light", "dark"];
        var cur = readTheme();
        var next = order[(order.indexOf(cur) + 1) % order.length];
        try {
            localStorage.setItem("helmac-theme", next);
        } catch {}
        applyTheme(next);
    });

    // ---------------- tabs / views ----------------
    var views = {};
    VIEWS.forEach(function (v) {
        var btn = document.createElement("button");
        btn.className = "tab";
        btn.textContent = v.label;
        btn.dataset.view = v.id;
        btn.addEventListener("click", function () {
            showView(v.id);
        });
        tabsEl.appendChild(btn);
        var sec = document.createElement("section");
        sec.className = "view";
        sec.id = "view-" + v.id;
        main.appendChild(sec);
        views[v.id] = sec;
    });
    function showView(id) {
        stopScenario();
        VIEWS.forEach(function (v) {
            views[v.id].classList.toggle("active", v.id === id);
            $(".tab[data-view=" + v.id + "]").classList.toggle(
                "active",
                v.id === id
            );
        });
        window.scrollTo(0, 0);
    }

    // ---------------- big picture ----------------
    function renderOverview() {
        var s = views.prehled;
        var html = "";
        html += "<h1>Co je Helmac Web</h1>";
        html +=
            '<p class="lede">Web pro každoroční akci s veřejnou registrací a administrátorským rozhraním. ' +
            "Návštěvník se přihlásí přes dynamický formulář, správce spravuje ročníky, obsah a hromadné e-maily. " +
            "Postaveno na Next.js (App Router), TypeScriptu, PostgreSQL (Prisma) a MUI.</p>";
        html += '<div class="stats">';
        html += stat(D.meta.files, "souborů v prohlížeči kódu");
        html += stat(D.meta.lines.toLocaleString("cs"), "řádků kódu");
        html += stat(D.meta.symbols, "propojených funkcí/typů");
        html += stat(D.flows.length, "postupů s diagramem");
        html += "</div>";
        html +=
            "<h2>Velký obraz: vstupy → zpracování → databáze → odpovědi</h2>";
        html +=
            '<p class="lede">Klikni na kterýkoli blok — otevře se popis a přesný kód z repozitáře.</p>';
        html += '<div class="phases">';
        D.overview.phases.forEach(function (ph) {
            html +=
                '<div class="phase"><h3>' +
                h(ph.title) +
                "</h3><p>" +
                h(ph.desc) +
                "</p>";
            ph.nodes.forEach(function (nid) {
                var n = node(nid);
                html +=
                    '<button class="chip" data-single="' +
                    nid +
                    '">' +
                    h(n.label) +
                    "<small>" +
                    h(n.loc) +
                    "</small></button>";
            });
            html += "</div>";
        });
        html += "</div>";
        s.innerHTML = html;
        s.querySelectorAll(".chip").forEach(function (b) {
            b.addEventListener("click", function () {
                openModal([b.dataset.single], 0, "Velký obraz");
            });
        });
    }
    function stat(v, label) {
        return (
            '<div class="stat"><b>' +
            h(v) +
            "</b><span>" +
            h(label) +
            "</span></div>"
        );
    }

    // ---------------- flows list + diagram ----------------
    function renderFlows() {
        var s = views.postupy;
        s.innerHTML =
            '<div id="flowList"></div><div id="flowDiagram" hidden></div>';
        var list = $("#flowList", s);
        var html = "<h1>Postupy</h1>";
        html +=
            '<p class="lede">Každý postup je klikací diagram. Klikni na krok a otevře se jeho popis a kód; mezi kroky přepínáš šipkami ‹ › nebo klávesami ← →. Tlačítkem „Přehrát scénář“ projdeš typickou cestu animovaně.</p>';
        html += '<div class="flow-grid">';
        D.flows.forEach(function (fl) {
            html +=
                '<button class="flow-card" data-flow="' +
                fl.id +
                '"><h3>' +
                h(fl.title) +
                "</h3><p>" +
                h(fl.summary) +
                '</p><div class="meta">' +
                fl.steps.length +
                " kroků →</div></button>";
        });
        html += "</div>";
        list.innerHTML = html;
        list.querySelectorAll(".flow-card").forEach(function (b) {
            b.addEventListener("click", function () {
                openFlow(b.dataset.flow);
            });
        });
    }

    function openFlow(flowId) {
        var fl = D.flows.find(function (f) {
            return f.id === flowId;
        });
        $("#flowList").hidden = true;
        var dia = $("#flowDiagram");
        dia.hidden = false;
        var html = '<div class="diagram-head">';
        html +=
            '<button class="btn ghost" id="flowBack">← Všechny postupy</button>';
        html +=
            '<button class="btn primary" id="playBtn">▶ Přehrát scénář</button>';
        html +=
            '<button class="btn" id="firstStep">Otevřít od začátku</button>';
        html += "</div>";
        html += "<h1>" + h(fl.title) + "</h1>";
        html += '<p class="lede">' + h(fl.summary) + "</p>";
        html += '<div class="svg-wrap">' + buildSvg(fl) + "</div>";
        dia.innerHTML = html;
        $("#flowBack").addEventListener("click", function () {
            stopScenario();
            dia.hidden = true;
            $("#flowList").hidden = false;
            window.scrollTo(0, 0);
        });
        $("#playBtn").addEventListener("click", function () {
            playScenario(fl);
        });
        $("#firstStep").addEventListener("click", function () {
            openModal(fl.steps, 0, fl.title);
        });
        dia.querySelectorAll(".node-g").forEach(function (g) {
            g.addEventListener("click", function () {
                stopScenario();
                openModal(fl.steps, parseInt(g.dataset.i, 10), fl.title);
            });
        });
        window.scrollTo(0, 0);
    }

    function wrapText(str, max) {
        var words = str.split(" ");
        var lines = [];
        var cur = "";
        for (var i = 0; i < words.length; i++) {
            var t = cur ? cur + " " + words[i] : words[i];
            if (t.length > max && cur) {
                lines.push(cur);
                cur = words[i];
            } else cur = t;
            if (lines.length === 2) break;
        }
        if (cur && lines.length < 2) lines.push(cur);
        if (lines.length === 2 && cur !== lines[1]) {
        } // keep two lines max
        return lines.slice(0, 2);
    }

    function buildSvg(fl) {
        var W = 320,
            x = 12,
            w = W - 24,
            nh = 68,
            gap = 100,
            top = 14;
        var count = fl.steps.length;
        var H = top + count * gap - (gap - nh) + 6;
        var svg =
            '<svg class="flow" viewBox="0 0 ' +
            W +
            " " +
            H +
            '" role="img" aria-label="Diagram: ' +
            h(fl.title) +
            '">';
        svg +=
            '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="4" orient="auto">' +
            '<path d="M0,0 L8,4 L0,8 Z" fill="currentColor" class="arrow-head"/></marker></defs>';
        // arrows first (under nodes)
        for (var i = 0; i < count - 1; i++) {
            var y1 = top + i * gap + nh;
            var y2 = top + (i + 1) * gap;
            svg +=
                '<line class="flow-arrow" data-ai="' +
                i +
                '" x1="' +
                W / 2 +
                '" y1="' +
                y1 +
                '" x2="' +
                W / 2 +
                '" y2="' +
                (y2 - 2) +
                '"/>';
        }
        for (var j = 0; j < count; j++) {
            var n = node(fl.steps[j]);
            var y = top + j * gap;
            var lines = wrapText(n.label, 34);
            svg +=
                '<g class="node-g" data-i="' +
                j +
                '" tabindex="0" role="button" aria-label="' +
                h(n.label) +
                '">';
            svg +=
                '<rect class="node-rect" x="' +
                x +
                '" y="' +
                y +
                '" width="' +
                w +
                '" height="' +
                nh +
                '" rx="12"/>';
            svg +=
                '<text class="node-num" x="' +
                (x + 12) +
                '" y="' +
                (y + 22) +
                '">' +
                (j + 1) +
                "</text>";
            var ty = y + 22;
            for (var k = 0; k < lines.length; k++) {
                svg +=
                    '<text class="node-label" x="' +
                    (x + 30) +
                    '" y="' +
                    (ty + k * 17) +
                    '">' +
                    h(lines[k]) +
                    "</text>";
            }
            svg +=
                '<text class="node-loc" x="' +
                (x + 30) +
                '" y="' +
                (y + nh - 12) +
                '">' +
                h(n.loc) +
                "</text>";
            svg += "</g>";
        }
        svg += "</svg>";
        return svg;
    }

    // ---------------- scenario animation ----------------
    var scenarioTimer = null;
    function stopScenario() {
        if (scenarioTimer) {
            clearInterval(scenarioTimer);
            scenarioTimer = null;
        }
        document.querySelectorAll(".node-g.pulse").forEach(function (g) {
            g.classList.remove("pulse");
        });
        document.querySelectorAll(".flow-arrow.lit").forEach(function (a) {
            a.classList.remove("lit");
        });
    }
    function playScenario() {
        stopScenario();
        var dia = $("#flowDiagram");
        var groups = dia.querySelectorAll(".node-g");
        var arrows = dia.querySelectorAll(".flow-arrow");
        var i = 0;
        function step() {
            groups.forEach(function (g) {
                g.classList.remove("pulse");
            });
            arrows.forEach(function (a) {
                a.classList.remove("lit");
            });
            if (i >= groups.length) {
                stopScenario();
                return;
            }
            var g = groups[i];
            g.classList.add("pulse");
            if (i > 0 && arrows[i - 1]) arrows[i - 1].classList.add("lit");
            g.scrollIntoView({ behavior: "smooth", block: "center" });
            i++;
        }
        step();
        scenarioTimer = setInterval(step, 850);
    }

    function renderScenarioBar() {
        // scenario shortcuts on overview, jumping into the right flow and auto-playing
        var s = views.prehled;
        var bar = document.createElement("div");
        bar.innerHTML =
            '<h2>Scénáře</h2><p class="lede">Rychlý start: vyber typickou situaci a projdi ji animovaně v diagramu.</p>';
        var wrap = document.createElement("div");
        wrap.className = "diagram-head";
        D.scenarios.forEach(function (sc) {
            var b = document.createElement("button");
            b.className = "btn";
            b.textContent = "▶ " + sc.title;
            b.addEventListener("click", function () {
                showView("postupy");
                openFlow(sc.flowId);
                setTimeout(function () {
                    playScenario(
                        D.flows.find(function (f) {
                            return f.id === sc.flowId;
                        })
                    );
                }, 60);
            });
            wrap.appendChild(b);
        });
        bar.appendChild(wrap);
        s.appendChild(bar);
    }

    // ---------------- security ----------------
    function renderSecurity() {
        var s = views.bezpecnost;
        var html = "<h1>Bezpečnost</h1>";
        html +=
            '<p class="lede">Nic není jen vypsané — klikni na kartu a uvidíš přesné místo v kódu, které daný mechanismus zajišťuje.</p>';
        html += '<div class="sec-grid">';
        D.security.forEach(function (c, i) {
            html +=
                '<button class="sec-card" data-sec="' +
                i +
                '"><h3>' +
                h(c.label) +
                "</h3><p>" +
                h(c.desc) +
                '</p><div class="meta">' +
                h(c.loc) +
                "</div></button>";
        });
        html += "</div>";
        s.innerHTML = html;
        s.querySelectorAll(".sec-card").forEach(function (b) {
            b.addEventListener("click", function () {
                openSecModal(parseInt(b.dataset.sec, 10));
            });
        });
    }

    // ---------------- modal (flow steps + overview single) ----------------
    var modalRoot = $("#modalRoot");
    var modalState = null; // { items:[entry], index, title }
    function entryFromNode(id) {
        var n = node(id);
        return {
            label: n.label,
            desc: n.desc,
            loc: n.loc,
            codeHtml: n.codeHtml,
            fileIdx: n.fileIdx,
            line: n.line,
        };
    }

    function openModal(stepIds, index, title) {
        modalState = {
            items: stepIds.map(entryFromNode),
            index: index,
            title: title,
        };
        drawModal();
    }
    function openSecModal(index) {
        modalState = {
            items: D.security.slice(),
            index: index,
            title: "Bezpečnost",
        };
        drawModal();
    }
    function drawModal() {
        var st = modalState;
        var e = st.items[st.index];
        var n = st.items.length;
        var html = '<div class="modal" role="dialog" aria-modal="true">';
        html +=
            "<header><div><h3>" +
            h(e.label) +
            '</h3><div class="idx">' +
            h(st.title) +
            " · " +
            (st.index + 1) +
            "/" +
            n +
            "</div></div>";
        html += '<div class="nav">';
        html +=
            '<button class="icon-btn" id="mPrev" aria-label="Předchozí"' +
            (st.index === 0 ? " disabled" : "") +
            ">‹</button>";
        html +=
            '<button class="icon-btn" id="mNext" aria-label="Další"' +
            (st.index === n - 1 ? " disabled" : "") +
            ">›</button>";
        html +=
            '<button class="icon-btn" id="mClose" aria-label="Zavřít">✕</button>';
        html += "</div></header>";
        html += '<div class="body">';
        html += '<p class="desc">' + h(e.desc) + "</p>";
        html += '<div class="loc-bar"><code>' + h(e.loc) + "</code>";
        if (e.fileIdx !== null && e.fileIdx !== undefined)
            html +=
                '<button class="btn ghost" id="mOpen">Otevřít v prohlížeči kódu →</button>';
        html += "</div>";
        html += '<pre class="code">' + e.codeHtml + "</pre>";
        html += "</div></div>";
        modalRoot.innerHTML = html;
        modalRoot.hidden = false;
        $("#mClose").addEventListener("click", closeModal);
        var p = $("#mPrev"),
            nx = $("#mNext");
        if (p)
            p.addEventListener("click", function () {
                if (modalState.index > 0) {
                    modalState.index--;
                    drawModal();
                }
            });
        if (nx)
            nx.addEventListener("click", function () {
                if (modalState.index < modalState.items.length - 1) {
                    modalState.index++;
                    drawModal();
                }
            });
        var op = $("#mOpen");
        if (op)
            op.addEventListener("click", function () {
                var f = e.fileIdx,
                    l = e.line;
                closeModal();
                showView("kod");
                openFile(f, l, true);
            });
    }
    function closeModal() {
        modalRoot.hidden = true;
        modalRoot.innerHTML = "";
        modalState = null;
    }
    modalRoot.addEventListener("click", function (ev) {
        if (ev.target === modalRoot) closeModal();
    });

    // ---------------- code browser ----------------
    var cbState = { fileIdx: null, back: [] };
    function renderCodeBrowser() {
        var s = views.kod;
        var files = D.code.files;
        var listHtml = "";
        files.forEach(function (f) {
            var parts = f.path.split("/");
            var base = parts.pop();
            var dir = parts.length ? parts.join("/") + "/" : "";
            listHtml +=
                '<button class="cb-file" data-f="' +
                f.idx +
                '"><span class="dir">' +
                h(dir) +
                "</span>" +
                h(base) +
                "</button>";
        });
        s.innerHTML =
            "<h1>Prohlížeč kódu</h1>" +
            '<p class="lede">Celé jádro aplikace z repozitáře. Jméno funkce nebo typu je odkaz na jeho definici; u definice vidíš, kde se používá, co volá a jaké testy ji spouští. Hledání: klávesa <b>/</b>. Zpět: tlačítko ← nebo klávesa Backspace.</p>' +
            '<div class="cb"><aside class="cb-aside"><h4>Soubory (' +
            files.length +
            ')</h4><div class="cb-files">' +
            listHtml +
            "</div></aside>" +
            '<div class="cb-main"><div class="cb-bar"><button class="btn ghost" id="cbBack" disabled>← Zpět</button>' +
            '<span class="path" id="cbPath">— vyber soubor —</span><span class="hint">/ = hledat</span></div>' +
            '<div class="cb-code" id="cbCode"></div></div></div>';
        s.querySelectorAll(".cb-file").forEach(function (b) {
            b.addEventListener("click", function () {
                pushBack();
                openFile(parseInt(b.dataset.f, 10));
            });
        });
        $("#cbBack").addEventListener("click", goBack);
        // event delegation for symbol links
        $("#cbCode").addEventListener("click", function (ev) {
            var a = ev.target.closest("a.sym");
            if (a) {
                ev.preventDefault();
                pushBack();
                jumpToSymbol(parseInt(a.dataset.sym, 10));
                return;
            }
            var d = ev.target.closest("span.sym.def");
            if (d) {
                showPanel(parseInt(d.dataset.sym, 10));
            }
        });
        // open first lib file by default
        var def =
            files.find(function (f) {
                return /^lib\//.test(f.path);
            }) || files[0];
        if (def) openFile(def.idx);
    }
    function fileByIdx(idx) {
        return D.code.files.find(function (f) {
            return f.idx === idx;
        });
    }
    function pushBack() {
        var code = $("#cbCode");
        if (cbState.fileIdx !== null)
            cbState.back.push({
                idx: cbState.fileIdx,
                scroll: code ? code.scrollTop : 0,
            });
        updateBackBtn();
    }
    function goBack() {
        var prev = cbState.back.pop();
        if (!prev) return;
        openFile(prev.idx, null, false, prev.scroll);
        updateBackBtn();
    }
    function updateBackBtn() {
        var b = $("#cbBack");
        if (b) b.disabled = cbState.back.length === 0;
    }
    function openFile(idx, line, highlight, scrollTop) {
        var f = fileByIdx(idx);
        if (!f) return;
        cbState.fileIdx = idx;
        $("#cbPath").textContent = f.path;
        var code = $("#cbCode");
        code.innerHTML = '<pre class="code">' + f.html + "</pre>";
        views.kod.querySelectorAll(".cb-file").forEach(function (b) {
            b.classList.toggle("active", parseInt(b.dataset.f, 10) === idx);
        });
        if (line) {
            var target = document.getElementById("F" + idx + "L" + line);
            if (target) {
                target.scrollIntoView({ block: "center" });
                flash(target);
            }
        } else if (scrollTop != null) {
            code.scrollTop = scrollTop;
        } else {
            code.scrollTop = 0;
        }
        updateBackBtn();
    }
    function flash(el) {
        el.style.transition = "background .1s";
        el.style.background = "var(--accent-weak)";
        setTimeout(function () {
            el.style.background = "";
        }, 900);
    }
    function jumpToSymbol(symId) {
        var sym = D.code.symbols.find(function (s) {
            return s.id === symId;
        });
        if (!sym) return;
        showView("kod");
        openFile(sym.fileIdx, sym.line, true);
        var def = document.getElementById("S" + symId);
        if (def) {
            def.scrollIntoView({ block: "center" });
        }
        showPanel(symId);
    }

    var panelEl = null;
    function showPanel(symId) {
        var sym = D.code.symbols.find(function (s) {
            return s.id === symId;
        });
        if (!sym) return;
        if (panelEl) panelEl.remove();
        var p = document.createElement("div");
        p.className = "panel";
        var kindLabel =
            {
                func: "funkce",
                class: "třída",
                type: "typ",
                enum: "enum",
                const: "konstanta",
            }[sym.kind] || sym.kind;
        var html =
            '<button class="icon-btn close" id="pClose" aria-label="Zavřít">✕</button>';
        html +=
            "<h4>" +
            h(sym.name) +
            (sym.exported ? '<span class="tag exp">export</span>' : "") +
            "</h4>";
        html +=
            '<div class="kind">' +
            kindLabel +
            " · " +
            h(fileByIdx(sym.fileIdx).path) +
            ":" +
            sym.line +
            "</div>";
        html +=
            '<div class="grp"><b>Kde se používá (' +
            sym.uses.length +
            ")</b><br>";
        if (sym.uses.length === 0)
            html += '<span class="none">nepoužito jinde v jádru</span>';
        else
            sym.uses.slice(0, 40).forEach(function (u) {
                html +=
                    '<button class="ref" data-uf="' +
                    u.fileIdx +
                    '" data-ul="' +
                    u.line +
                    '">' +
                    h(fileByIdx(u.fileIdx).path) +
                    ":" +
                    u.line +
                    "</button>";
            });
        if (sym.uses.length > 40)
            html +=
                '<span class="none">… a dalších ' +
                (sym.uses.length - 40) +
                "</span>";
        html += "</div>";
        html +=
            '<div class="grp"><b>Co volá (' + sym.calls.length + ")</b><br>";
        if (sym.calls.length === 0)
            html +=
                '<span class="none">nevolá žádný známý symbol z jádra</span>';
        else
            sym.calls.forEach(function (cid) {
                var c = D.code.symbols.find(function (s) {
                    return s.id === cid;
                });
                if (c)
                    html +=
                        '<button class="ref" data-sid="' +
                        cid +
                        '">' +
                        h(c.name) +
                        "</button>";
            });
        html += "</div>";
        html +=
            '<div class="grp"><b>Testy</b><br><span class="none">Projekt nemá žádné testy (tests/ je prázdný).</span></div>';
        p.innerHTML = html;
        document.body.appendChild(p);
        panelEl = p;
        $("#pClose").addEventListener("click", function () {
            p.remove();
            panelEl = null;
        });
        p.querySelectorAll(".ref[data-uf]").forEach(function (b) {
            b.addEventListener("click", function () {
                pushBack();
                openFile(
                    parseInt(b.dataset.uf, 10),
                    parseInt(b.dataset.ul, 10),
                    true
                );
            });
        });
        p.querySelectorAll(".ref[data-sid]").forEach(function (b) {
            b.addEventListener("click", function () {
                pushBack();
                jumpToSymbol(parseInt(b.dataset.sid, 10));
            });
        });
    }

    // ---------------- search ----------------
    var searchRoot = $("#searchRoot");
    var searchSel = 0,
        searchHits = [];
    function openSearch() {
        searchRoot.hidden = false;
        searchRoot.innerHTML =
            '<div class="search-box"><input id="sInput" placeholder="Hledat funkci, typ nebo třídu…" autocomplete="off" spellcheck="false"><div class="search-results" id="sResults"></div></div>';
        var inp = $("#sInput");
        inp.focus();
        inp.addEventListener("input", function () {
            runSearch(inp.value);
        });
        runSearch("");
    }
    function closeSearch() {
        searchRoot.hidden = true;
        searchRoot.innerHTML = "";
    }
    function runSearch(q) {
        q = q.trim().toLowerCase();
        var syms = D.code.symbols;
        searchHits = (
            q
                ? syms.filter(function (s) {
                      return s.name.toLowerCase().indexOf(q) >= 0;
                  })
                : syms.slice()
        )
            .sort(function (a, b) {
                if (q) {
                    var ai = a.name.toLowerCase().indexOf(q),
                        bi = b.name.toLowerCase().indexOf(q);
                    if (ai !== bi) return ai - bi;
                }
                return a.name.localeCompare(b.name);
            })
            .slice(0, 80);
        searchSel = 0;
        var res = $("#sResults");
        var html = "";
        searchHits.forEach(function (s, i) {
            html +=
                '<button class="sr' +
                (i === 0 ? " sel" : "") +
                '" data-sid="' +
                s.id +
                '"><span class="k">' +
                h(s.kind) +
                '</span><span class="n">' +
                h(s.name) +
                '</span><span class="p">' +
                h(fileByIdx(s.fileIdx).path) +
                ":" +
                s.line +
                "</span></button>";
        });
        if (searchHits.length === 0)
            html =
                '<div style="padding:16px;color:var(--muted)">Nic nenalezeno.</div>';
        res.innerHTML = html;
        res.querySelectorAll(".sr").forEach(function (b) {
            b.addEventListener("click", function () {
                var id = parseInt(b.dataset.sid, 10);
                closeSearch();
                jumpToSymbol(id);
            });
        });
    }
    function moveSearch(delta) {
        if (!searchHits.length) return;
        searchSel = (searchSel + delta + searchHits.length) % searchHits.length;
        var items = $("#sResults").querySelectorAll(".sr");
        items.forEach(function (it, i) {
            it.classList.toggle("sel", i === searchSel);
        });
        if (items[searchSel])
            items[searchSel].scrollIntoView({ block: "nearest" });
    }

    // ---------------- keyboard ----------------
    document.addEventListener("keydown", function (ev) {
        var typing = /^(INPUT|TEXTAREA)$/.test(
            document.activeElement && document.activeElement.tagName
        );
        if (!searchRoot.hidden) {
            if (ev.key === "Escape") {
                closeSearch();
            } else if (ev.key === "ArrowDown") {
                ev.preventDefault();
                moveSearch(1);
            } else if (ev.key === "ArrowUp") {
                ev.preventDefault();
                moveSearch(-1);
            } else if (ev.key === "Enter") {
                ev.preventDefault();
                var hit = searchHits[searchSel];
                if (hit) {
                    closeSearch();
                    jumpToSymbol(hit.id);
                }
            }
            return;
        }
        if (modalState) {
            if (ev.key === "Escape") closeModal();
            else if (ev.key === "ArrowLeft") {
                if (modalState.index > 0) {
                    modalState.index--;
                    drawModal();
                }
            } else if (ev.key === "ArrowRight") {
                if (modalState.index < modalState.items.length - 1) {
                    modalState.index++;
                    drawModal();
                }
            }
            return;
        }
        if (typing) return;
        if (ev.key === "/") {
            ev.preventDefault();
            openSearch();
        } else if (ev.key === "Escape") {
            if (panelEl) {
                panelEl.remove();
                panelEl = null;
            }
        } else if (ev.key === "Backspace" && $(".view#view-kod.active")) {
            ev.preventDefault();
            goBack();
        }
    });
    searchRoot.addEventListener("click", function (ev) {
        if (ev.target === searchRoot) closeSearch();
    });

    // ---------------- init ----------------
    renderOverview();
    renderScenarioBar();
    renderFlows();
    renderSecurity();
    renderCodeBrowser();
    showView("prehled");
})();
