// Torghatten Academy: progress, pages and simulations.
// Content lives in content/*.json (edited from /academy/edit), models in sims.js (window.TCSims).
(function () {
  var C, S = window.TCSims, TESTN = 10, ADMIN = false; // ADMIN: preview with every step open
  var KEY = "tc-academy-v1", PASS = 0.8;
  var st = load();

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { m: {} }; } catch (e) { return { m: {} }; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function ms(slug) {
    var m = st.m[slug] || (st.m[slug] = {});
    m.read = m.read || []; m.ex = m.ex || {}; m.asg = m.asg || { company: "", a: [] }; m.test = m.test || {};
    return m;
  }
  function done(slug) { return !!(st.m[slug] && st.m[slug].test && st.m[slug].test.passed); }
  function unlocked(i) { if (ADMIN) return true; for (var k = 0; k < i; k++) if (!done(C.modules[k].slug)) return false; return true; }
  function allDone() { return ADMIN || C.modules.every(function (m) { return done(m.slug); }); }
  function progress(mod) {
    var m = ms(mod.slug), n = mod.lessons.length + mod.exercises.length + 2, d = 0;
    mod.lessons.forEach(function (_, i) { if (m.read[i]) d++; });
    mod.exercises.forEach(function (x) { if (m.ex[x.id]) d++; });
    if (asgDone(mod)) d++;
    if (m.test.passed) d++;
    return d / n;
  }
  function asgDone(mod) {
    var a = ms(mod.slug).asg;
    if (mod.assignment.company && (a.company || "").trim().length < 2) return false;
    return mod.assignment.fields.every(function (_, i) { return (a.a[i] || "").trim().length >= 15; });
  }

  // helpers
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(n, d) { return n == null || !isFinite(n) ? "–" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); }
  function pct(x, d) { return x == null || !isFinite(x) ? "–" : (x * 100).toFixed(d == null ? 1 : d) + "%"; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function words(html) { return html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length; }

  // A multiple-choice question. Tasks give feedback at once; tests grade on submit.
  function mcq(el, q, idx, mode, onRight) {
    var order = shuffle(q.options.map(function (_, i) { return i; }));
    var name = "q" + Math.random().toString(36).slice(2);
    el.innerHTML = "<p>" + (idx != null ? "<span>" + (idx + 1) + ".</span>" : "") + q.q + "</p><div class=\"opts\">" +
      order.map(function (o) { return '<label><input type="radio" name="' + name + '" value="' + o + '"> <span>' + q.options[o] + "</span></label>"; }).join("") +
      '</div><div class="fb" hidden></div>';
    var fb = $(".fb", el);
    el.value = function () { var c = $("input:checked", el); return c ? +c.value : null; };
    el.mark = function () {
      var v = el.value();
      el.querySelectorAll("label").forEach(function (l) {
        var o = +$("input", l).value;
        l.classList.toggle("right", o === q.answer);
        l.classList.toggle("wrong", o === v && v !== q.answer);
        $("input", l).disabled = true;
      });
      fb.hidden = false;
      fb.innerHTML = (v === q.answer ? "<b>Correct.</b> " : "<b>Not quite.</b> ") + (q.why || "");
      return v === q.answer;
    };
    if (mode === "task") {
      el.addEventListener("change", function () {
        var v = el.value();
        if (v === q.answer) { el.mark(); onRight && onRight(); }
        else { fb.hidden = false; fb.innerHTML = "<b>Not quite.</b> Change the inputs above and look again."; }
      });
    }
  }

  // ---------------------------------------------------------------- pages
  var page = document.body.getAttribute("data-page");
  var root = document.getElementById("academy");

  function overview() {
    var total = C.modules.reduce(function (s, m) { return s + progress(m); }, 0) / C.modules.length;
    var r = 80, circ = 2 * Math.PI * r;
    var html = '<section class="ov-hero"><div><span class="eyebrow">Members’ Corner · Academy</span>' +
      '<h1 style="margin-top:18px;font-size:clamp(36px,8vw,58px);line-height:1.04">The part analysis <em class="hl">doesn’t solve.</em></h1><hr class="rule">' +
      C.intro + '</div><div class="ring"><svg viewBox="0 0 190 190"><circle cx="95" cy="95" r="' + r + '" fill="none" stroke="rgba(244,238,226,.12)" stroke-width="10"/>' +
      '<circle cx="95" cy="95" r="' + r + '" fill="none" stroke="var(--glow)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + circ * (1 - total) + '" style="filter:drop-shadow(0 0 8px rgba(var(--glow-rgb),.8))"/></svg>' +
      '<div class="n"><b>' + Math.round(total * 100) + '%</b><span>complete</span></div></div></section>';
    html += '<div class="how">' + C.how.map(function (h) { return "<div><b>" + h[0] + "</b><span>" + h[1] + "</span></div>"; }).join("") + "</div>";
    html += '<div class="sec" style="margin-top:44px"><h2>The modules</h2></div><div class="mods">';
    C.modules.forEach(function (m, i) {
      var p = progress(m), lock = !unlocked(i), d = done(m.slug);
      html += '<a class="mod' + (d ? " done" : "") + (lock ? " locked" : "") + '" href="' + (lock ? "#" : "/academy/" + m.slug) + '"' + (lock ? ' aria-disabled="true"' : "") + '><span class="num">' + (d ? "✓" : i + 1) + '</span><div><h3>' + m.title + "</h3><p>" + m.summary + '</p><div class="bar"><i style="width:' + Math.round(p * 100) + '%"></i></div></div><span class="st">' +
        (d ? "Passed " + st.m[m.slug].test.bestRaw + "/" + (st.m[m.slug].test.n || 10) : lock ? "Locked" : p > 0 ? Math.round(p * 100) + "%" : "~" + m.minutes + " min") + "</span></a>";
    });
    var ex = st.exam || {};
    html += '<a class="mod exam' + (ex.passed ? " done" : "") + (allDone() ? "" : " locked") + '" href="' + (allDone() ? "/academy/exam" : "#") + '"><span class="num">' + (ex.passed ? "✓" : "Exam") + '</span><div><h3>Final exam</h3><p>' + C.exam.summary + '</p></div><span class="st">' + (ex.passed ? "Passed" : allDone() ? "Open" : "After module 6") + "</span></a>";
    html += '<a class="mod' + (ex.passed || ADMIN ? "" : " locked") + '" href="' + (ex.passed || ADMIN ? "/academy/certificate" : "#") + '"><span class="num">★</span><div><h3>Your certificate</h3><p>Certified Rational Investor, from Torghatten Capital. Yours when you pass the final exam.</p></div><span class="st">' + (ex.passed ? "Open" : "Locked") + "</span></a></div>";
    html += '<div class="resources">' + C.outro + "</div>";
    root.innerHTML = html;
    root.querySelectorAll('a[aria-disabled="true"],a.locked').forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); }); });
  }

  function module_(slug) {
    var i = C.modules.findIndex(function (m) { return m.slug === slug; });
    var mod = C.modules[i], m = ms(slug);
    if (!unlocked(i)) {
      root.innerHTML = '<p class="crumbs"><a href="/academy">Academy</a></p><h1>Module ' + (i + 1) + " is locked</h1><p class=\"lead\">Pass module " + i + ' first. The modules build on each other.</p><p style="margin-top:20px"><a class="btn" href="/academy/' + C.modules[i - 1].slug + '">Go to module ' + i + "</a></p>";
      return;
    }
    var mins = mod.minutes;
    var html = '<p class="crumbs"><a href="/academy">Academy</a> › Module ' + (i + 1) + " of " + C.modules.length + "</p>" +
      '<header class="mhead intro"><span class="eyebrow">Module ' + (i + 1) + "</span><h1 style=\"margin-top:16px\">" + mod.heading + '</h1><p class="lead">' + mod.summary + "</p>" +
      '<div class="meta"><span>' + mod.lessons.length + " lessons</span><span>" + mod.exercises.length + (mod.exercises.length === 1 ? " exercise" : " exercises") + "</span><span>1 assignment</span><span>' + Math.min(TESTN, mod.test.length) + '-question test</span><span>About " + mins + " minutes</span></div></header>" +
      '<div class="objectives"><h4>When you have finished this module, you can</h4><ul>' + mod.objectives.map(function (o) { return "<li>" + o + "</li>"; }).join("") + "</ul></div>";
    var steps = [];
    mod.lessons.forEach(function (l, k) { steps.push({ id: "l" + k, label: "Lesson " + (k + 1) }); });
    steps.push({ id: "ex", label: "Exercises" }, { id: "asg", label: "Assignment" }, { id: "test", label: "Test" });
    html += '<nav class="steps" id="steps">' + steps.map(function (s) { return '<a href="#' + s.id + '" data-s="' + s.id + '">' + s.label + "</a>"; }).join("") + "</nav>";
    mod.lessons.forEach(function (l, k) {
      html += '<section class="unit" id="l' + k + '"><div class="kicker"><span class="eyebrow">Lesson ' + (k + 1) + '</span><span class="tick"></span></div><h3>' + l.title + '</h3><div class="lesson">' + l.html + '</div><div class="end"></div>' +
        '<div class="readbar"><button class="btn" type="button" data-read="' + k + '" disabled>Mark as read</button><span class="hint">Read to the end to continue.</span></div></section>';
    });
    html += '<section class="unit" id="ex"><div class="kicker"><span class="eyebrow">Exercises</span><span class="tick"></span></div><h3>Try it with numbers</h3><p class="lead" style="font-size:15px">Use the simulation, then answer the task. You need the right answer to move on.</p>' +
      mod.exercises.map(function (x, k) { return '<div class="sim-block" style="margin-top:28px"><h4 class="ext">' + (k + 1) + ". " + x.title + '</h4><p style="color:var(--muted);font-size:15px;margin-top:6px">' + x.intro + '</p><div class="sim" id="sim-' + x.id + '"></div><div class="task"><span class="t">Task</span><div id="task-' + x.id + '"></div></div></div>'; }).join("") + "</section>";
    html += '<section class="unit" id="asg"><div class="kicker"><span class="eyebrow">Assignment</span><span class="tick"></span></div><h3>' + mod.assignment.title + '</h3><p style="color:var(--muted);margin-top:6px">' + mod.assignment.intro + "</p>" +
      (mod.assignment.company ? '<div class="field"><label for="asg-co">' + mod.assignment.company + '</label><input id="asg-co" value="' + esc(m.asg.company || "") + '"></div>' : "") +
      mod.assignment.fields.map(function (f, k) { return '<div class="field"><label for="asg-' + k + '">' + (k + 1) + ". " + f.q + "</label>" + (f.hint ? "<small>" + f.hint + "</small>" : "") + '<textarea id="asg-' + k + '" rows="3">' + esc(m.asg.a[k] || "") + "</textarea></div>"; }).join("") +
      '<div class="readbar"><button class="btn ghost" type="button" id="asgCopy">Copy as text</button><span class="hint" id="asgHint">Answer every question to unlock the test. Your answers stay in this browser.</span></div></section>';
    html += '<section class="unit" id="test"><div class="kicker"><span class="eyebrow">Knowledge test</span><span class="tick"></span></div><h3>' + Math.min(TESTN, mod.test.length) + ' questions</h3><p style="color:var(--muted);margin-top:6px">You need ' + Math.ceil(Math.min(TESTN, mod.test.length) * PASS) + " of " + Math.min(TESTN, mod.test.length) + ' to pass. The questions and their order change every time you take it.</p><div id="testQ"></div><div class="readbar"><button class="btn" type="button" id="submit">Submit answers</button><span class="hint" id="testHint"></span></div><div id="testOut"></div></section>';
    html += '<div id="nextCard"></div><div class="resources"><h4 style="font:600 11.5px/1 var(--body);letter-spacing:.26em;text-transform:uppercase;color:var(--glow)">Tools for this module</h4><ul>' +
      mod.tools.map(function (t) { return '<li><a href="' + t.href + '">' + t.label + "</a>: " + t.why + "</li>"; }).join("") + '</ul><h4 style="font:600 11.5px/1 var(--body);letter-spacing:.26em;text-transform:uppercase;color:var(--glow);margin-top:22px">From the archive</h4><ul>' +
      mod.reading.map(function (t) { return '<li><a href="' + t.href + '" target="_blank" rel="noopener">' + t.label + "</a>" + (t.why ? ": " + t.why : "") + "</li>"; }).join("") +
      '</ul><p style="margin-top:20px"><button class="btn ghost" type="button" id="printBtn">Save the lessons as PDF</button></p></div>';
    root.innerHTML = html;

    // lessons: unlock in order; reading to the end and a minimum time enable the button
    var seen = {}, opened = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var k = +e.target.parentNode.id.slice(1);
        if (e.isIntersecting) { seen[k] = true; tryEnable(k); }
      });
    }, { threshold: 0 });
    mod.lessons.forEach(function (l, k) {
      var sec = $("#l" + k), btn = $("[data-read]", sec);
      io.observe($(".end", sec));
      var need = Math.min(90, Math.round(words(l.html) / 600 * 60)); // a fast skim, not a race
      sec._need = need;
      btn.addEventListener("click", function () { m.read[k] = true; save(); refresh(); var nx = $("#l" + (k + 1)) || $("#ex"); nx && nx.scrollIntoView({ behavior: "smooth" }); });
    });
    function tryEnable(k) {
      var sec = $("#l" + k), btn = $("[data-read]", sec);
      if (m.read[k] || sec.classList.contains("locked")) return;
      if (!opened[k]) opened[k] = Date.now();
      var left = Math.ceil(sec._need - (Date.now() - opened[k]) / 1000);
      if (seen[k] && left <= 0) { btn.disabled = false; $(".hint", sec).textContent = "Done reading? Mark it to unlock the next step."; }
      else { $(".hint", sec).textContent = seen[k] ? "Take your time. You can continue in " + left + " s." : "Read to the end to continue."; setTimeout(function () { tryEnable(k); }, 1000); }
    }
    // start the clock when a lesson comes into view
    var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { var k = +e.target.id.slice(1); if (!opened[k] && !e.target.classList.contains("locked")) { opened[k] = Date.now(); tryEnable(k); } } }); }, { threshold: 0.15 });
    mod.lessons.forEach(function (_, k) { io2.observe($("#l" + k)); });

    // exercises
    mod.exercises.forEach(function (x) {
      SIMS[x.sim]($("#sim-" + x.id), x);
      var t = $("#task-" + x.id);
      mcq(t, x.task, null, "task", function () { m.ex[x.id] = true; save(); refresh(); });
      if (m.ex[x.id]) { var inp = t.querySelector('input[value="' + x.task.answer + '"]'); if (inp) { inp.checked = true; t.mark(); } }
    });

    // assignment
    var co = $("#asg-co");
    if (co) co.addEventListener("input", function () { m.asg.company = co.value; save(); refresh(); });
    mod.assignment.fields.forEach(function (_, k) { var ta = $("#asg-" + k); ta.addEventListener("input", function () { m.asg.a[k] = ta.value; save(); refresh(); }); });
    $("#asgCopy").addEventListener("click", function () {
      var txt = mod.title + " – " + mod.assignment.title + (co ? "\n" + mod.assignment.company + ": " + co.value : "") + "\n\n" +
        mod.assignment.fields.map(function (f, k) { return (k + 1) + ". " + f.q + "\n" + (m.asg.a[k] || "") ; }).join("\n\n");
      navigator.clipboard && navigator.clipboard.writeText(txt).then(function () { $("#asgHint").textContent = "Copied."; });
    });

    // test
    function buildTest() {
      var box = $("#testQ"); box.innerHTML = "";
      shuffle(mod.test).slice(0, TESTN).forEach(function (q, k) { var d = document.createElement("div"); d.className = "q"; box.appendChild(d); mcq(d, q, k, "test"); d._q = q; });
      $("#testOut").innerHTML = ""; $("#submit").hidden = false; $("#testHint").textContent = "";
    }
    buildTest();
    $("#submit").addEventListener("click", function () {
      var qs = Array.prototype.slice.call(document.querySelectorAll("#testQ .q"));
      if (qs.some(function (d) { return d.value() == null; })) { $("#testHint").textContent = "Answer every question first."; return; }
      var right = qs.filter(function (d) { return d.mark(); }).length, n = qs.length, ok = right / n >= PASS;
      m.test.bestRaw = Math.max(m.test.bestRaw || 0, right); m.test.n = n;
      if (ok && !m.test.passed) { m.test.passed = true; m.test.at = new Date().toISOString().slice(0, 10); }
      save(); refresh();
      $("#submit").hidden = true;
      $("#testOut").innerHTML = '<div class="score' + (ok ? "" : " fail") + '"><b>' + right + "/" + n + "</b> " + (ok ? "Passed. The explanations are under each question." : "Not yet. You need " + Math.ceil(n * PASS) + ". Read the explanations, go back to the lessons, and try again.") +
        '</div><p style="margin-top:12px"><button class="btn ghost" type="button" id="retake">' + (ok ? "Take it again" : "Try again") + "</button></p>";
      $("#retake").addEventListener("click", function () { buildTest(); $("#test").scrollIntoView({ behavior: "smooth" }); });
    });

    $("#printBtn").addEventListener("click", function () { document.body.classList.add("printing-lesson"); window.print(); setTimeout(function () { document.body.classList.remove("printing-lesson"); }, 500); });

    function refresh() {
      var prevOk = true;
      mod.lessons.forEach(function (_, k) {
        var sec = $("#l" + k);
        sec.classList.toggle("locked", !prevOk && !ADMIN); sec.classList.toggle("done", !!m.read[k]);
        $(".tick", sec).textContent = m.read[k] ? "✓ Read" : "";
        var b = $("[data-read]", sec);
        if (m.read[k]) { b.disabled = true; b.textContent = "Read"; $(".hint", sec).textContent = ""; }
        prevOk = prevOk && !!m.read[k];
      });
      var exOk = mod.exercises.every(function (x) { return m.ex[x.id]; });
      $("#ex").classList.toggle("locked", !prevOk && !ADMIN); $("#ex").classList.toggle("done", exOk);
      $(".tick", $("#ex")).textContent = exOk ? "✓ Done" : "";
      prevOk = prevOk && exOk;
      var aOk = asgDone(mod);
      $("#asg").classList.toggle("locked", !prevOk && !ADMIN); $("#asg").classList.toggle("done", aOk);
      $(".tick", $("#asg")).textContent = aOk ? "✓ Done" : "";
      prevOk = prevOk && aOk;
      $("#test").classList.toggle("locked", !prevOk && !ADMIN); $("#test").classList.toggle("done", !!m.test.passed);
      $(".tick", $("#test")).textContent = m.test.passed ? "✓ Passed " + m.test.bestRaw + "/" + (m.test.n || 10) : "";
      var stepOk = { ex: exOk, asg: aOk, test: !!m.test.passed };
      mod.lessons.forEach(function (_, k) { stepOk["l" + k] = !!m.read[k]; });
      document.querySelectorAll("#steps a").forEach(function (a) { var s = a.getAttribute("data-s"); a.classList.toggle("ok", !!stepOk[s]); a.classList.toggle("lk", $("#" + s).classList.contains("locked")); });
      var nx = C.modules[i + 1];
      $("#nextCard").innerHTML = m.test.passed ? '<div class="next"><span class="eyebrow">Module ' + (i + 1) + ' passed</span><h3 style="margin-top:12px">' + (nx ? "Next: " + nx.title : "Every module passed") + "</h3><p>" + (nx ? nx.summary : C.exam.summary) + '</p><a class="btn" href="' + (nx ? "/academy/" + nx.slug : "/academy/exam") + '">' + (nx ? "Start module " + (i + 2) : "Take the final exam") + "</a></div>" : "";
    }
    refresh();
  }

  function exam() {
    if (!allDone()) { root.innerHTML = '<p class="crumbs"><a href="/academy">Academy</a></p><h1>The exam is locked</h1><p class="lead">Pass all six modules first.</p>'; return; }
    var ex = st.exam || (st.exam = {});
    root.innerHTML = '<p class="crumbs"><a href="/academy">Academy</a> › Final exam</p><header class="intro"><span class="eyebrow">Final exam</span><h1 style="margin-top:16px">Prove it <em>under pressure.</em></h1><p class="lead">' + C.exam.intro + '</p></header><section class="unit" id="exam"><div id="examQ"></div><div class="readbar"><button class="btn" id="submit" type="button">Submit the exam</button><span class="hint" id="hint"></span></div><div id="out"></div></section>';
    function build() {
      var pool = C.exam.cases.slice();
      C.modules.forEach(function (m) { pool = pool.concat(shuffle(m.test).slice(0, 2)); });
      var box = $("#examQ"); box.innerHTML = "";
      shuffle(pool).forEach(function (q, k) { var d = document.createElement("div"); d.className = "q"; box.appendChild(d); mcq(d, q, k, "test"); });
      $("#out").innerHTML = ""; $("#submit").hidden = false;
    }
    build();
    $("#submit").addEventListener("click", function () {
      var qs = Array.prototype.slice.call(document.querySelectorAll("#examQ .q"));
      if (qs.some(function (d) { return d.value() == null; })) { $("#hint").textContent = "Answer every question first."; return; }
      var right = qs.filter(function (d) { return d.mark(); }).length, n = qs.length, ok = right / n >= PASS;
      if (ok && !ex.passed) { ex.passed = true; ex.at = new Date().toISOString().slice(0, 10); }
      ex.best = Math.max(ex.best || 0, right); ex.n = n; save();
      $("#submit").hidden = true;
      $("#out").innerHTML = '<div class="score' + (ok ? "" : " fail") + '"><b>' + right + "/" + n + "</b> " + (ok ? "You passed. Your certificate is ready." : "Not yet. You need " + Math.ceil(n * PASS) + ". Read the explanations and try again.") + "</div>" +
        (ok ? '<div class="next"><h3>Certified Rational Investor</h3><p>Add your name and print it.</p><a class="btn" href="/academy/certificate">Get your certificate</a></div>' : '<p style="margin-top:12px"><button class="btn ghost" id="again" type="button">Try again</button></p>');
      var a = $("#again"); if (a) a.addEventListener("click", function () { build(); scrollTo(0, 0); });
    });
  }

  function certificate() {
    var ex = st.exam || {};
    if (ADMIN && !ex.passed) ex = { passed: true, at: new Date().toISOString().slice(0, 10) };
    if (!ex.passed) { root.innerHTML = '<p class="crumbs"><a href="/academy">Academy</a></p><h1>Not yet</h1><p class="lead">Your certificate appears here when you pass the final exam.</p><p style="margin-top:20px"><a class="btn" href="/academy">Back to the Academy</a></p>'; return; }
    var logo = document.querySelector(".tc-brand") ? document.querySelector(".tc-brand").innerHTML : "";
    root.innerHTML = '<p class="crumbs"><a href="/academy">Academy</a> › Certificate</p><header class="intro"><span class="eyebrow">You made it</span><h1 style="margin-top:16px">Certified Rational <em>Investor.</em></h1><p class="lead">Write your name the way you want it on the certificate, then print it or save it as PDF in landscape.</p></header>' +
      '<div class="field" style="max-width:420px"><label for="nm">Your name</label><input id="nm" value="' + esc(st.name || "") + '" placeholder="Your full name"></div>' +
      '<p style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="pr" type="button">Print or save as PDF</button></p>' +
      '<div class="certwrap"><div class="cert"><div class="in"><div class="logo">' + logo + '</div><div class="k">Certificate of completion</div><div class="name" id="cn"></div><div class="title">Certified Rational Investor</div>' +
      '<div class="body">' + C.certificate + '</div><div class="foot"><div>Issued ' + ex.at + "<br>Certificate ID <span id=\"cid\"></span></div>" +
      '<div class="seal">Torghatten<br>Capital<br>★<br>Sit still</div><div style="text-align:center"><div class="sig">Arne Ulland</div>Arne Ulland, Torghatten Capital</div></div></div></div></div>' +
      '<p style="color:var(--muted);font-size:13px;margin-top:16px">' + C.certNote + "</p>";
    var nm = $("#nm");
    function draw() { st.name = nm.value; save(); $("#cn").textContent = nm.value.trim() || "Your name"; $("#cid").textContent = S.certId(nm.value, ex.at); }
    nm.addEventListener("input", draw); draw();
    $("#pr").addEventListener("click", function () { document.body.classList.add("printing-cert"); window.print(); setTimeout(function () { document.body.classList.remove("printing-cert"); }, 500); });
  }

  // ---------------------------------------------------------- simulations
  function num(el, id, label, v, step) { return '<label>' + label + '<input type="number" id="' + id + '" value="' + v + '" step="' + (step || "any") + '"></label>'; }
  function rng(id, label, v, min, max, step, unit) { return '<label>' + label + ' <b id="' + id + 'v"></b><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" data-unit="' + (unit || "") + '"></label>'; }
  function val(el, id) { var i = el.querySelector("#" + id); return i ? parseFloat(i.value) : NaN; }
  function wire(el, fn) {
    el.querySelectorAll("input,select").forEach(function (i) { i.addEventListener("input", go); });
    function go() {
      el.querySelectorAll('input[type=range]').forEach(function (r) { var b = el.querySelector("#" + r.id + "v"); if (b) b.textContent = r.value + (r.getAttribute("data-unit") || ""); });
      fn();
    }
    go();
  }
  function toggles(id, opts, on) { return '<div class="tog" id="' + id + '">' + opts.map(function (o, k) { return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (o[0] === on) + '">' + o[1] + "</button>"; }).join("") + "</div>"; }
  function togWire(el, id, fn) {
    var g = el.querySelector("#" + id);
    g.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; g.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); fn(); });
    return function () { var b = g.querySelector('[aria-pressed="true"]'); return b ? b.getAttribute("data-v") : null; };
  }

  var SIMS = {
    activity: function (el) {
      el.innerHTML = '<div class="grid">' + num(el, "a-start", "Portfolio today", 1700000) + num(el, "a-r", "Yearly return (%)", 9, 0.5) + num(el, "a-y", "Years", 20) +
        num(el, "a-t", "Trades per year", 86) + num(el, "a-c", "Average cost per trade", 212) + num(el, "a-add", "Saving per year", 0) + "</div>" +
        '<div class="out"><div><span>If you sit still</span><b class="g" id="a-o1"></b></div><div><span>If you keep trading</span><b id="a-o2"></b></div><div><span>Fees paid</span><b id="a-o3"></b></div><div><span>Wealth lost</span><b class="r" id="a-o4"></b></div></div>' +
        '<p style="color:var(--muted);font-size:13px;margin-top:10px">Only commission is counted. Spreads, taxes on realised gains and bad timing usually cost more, so this is the cheapest version of the problem.</p>';
      wire(el, function () {
        var r = S.activity({ start: val(el, "a-start"), r: val(el, "a-r") / 100, years: val(el, "a-y"), trades: val(el, "a-t"), costPerTrade: val(el, "a-c"), add: val(el, "a-add") || 0 });
        el.querySelector("#a-o1").textContent = fmt(r.calm); el.querySelector("#a-o2").textContent = fmt(r.busy);
        el.querySelector("#a-o3").textContent = fmt(r.fees); el.querySelector("#a-o4").textContent = fmt(r.lost);
      });
    },
    engine: function (el) {
      el.innerHTML = '<div class="grid">' + rng("e-g", "Growth both companies want", 10, 2, 20, 1, "%") + rng("e-ra", "ROIC, company A", 30, 4, 60, 1, "%") + rng("e-rb", "ROIC, company B", 12, 4, 60, 1, "%") + "</div>" +
        '<div class="out"><div><span>A reinvests</span><b id="e-1"></b></div><div><span>B reinvests</span><b id="e-2"></b></div><div><span>A: free cash, 10 years</span><b class="g" id="e-3"></b></div><div><span>B: free cash, 10 years</span><b id="e-4"></b></div></div>' +
        '<div class="chartbars" id="e-bars"></div><p style="color:var(--muted);font-size:13px;margin-top:8px">Both start with 100 in earnings and grow at the same rate. The bars show the cash each one can pay out over ten years.</p>';
      wire(el, function () {
        var g = val(el, "e-g") / 100, a = S.engine(100, val(el, "e-ra") / 100, g, 10), b = S.engine(100, val(el, "e-rb") / 100, g, 10);
        var ca = a.rows[9].cumFcf, cb = b.rows[9].cumFcf, mx = Math.max(Math.abs(ca), Math.abs(cb), 1);
        el.querySelector("#e-1").textContent = pct(a.reinvestRate, 0); el.querySelector("#e-2").textContent = pct(b.reinvestRate, 0);
        el.querySelector("#e-3").textContent = fmt(ca); el.querySelector("#e-4").textContent = fmt(cb);
        el.querySelector("#e-4").className = cb < 0 ? "r" : "";
        el.querySelector("#e-bars").innerHTML = '<div style="height:' + Math.max(2, ca / mx * 100) + '%"><span>A ' + fmt(ca) + '</span></div><div class="b" style="height:' + Math.max(2, Math.abs(cb) / mx * 100) + '%"><span>B ' + fmt(cb) + "</span></div>";
      });
    },
    roic: function (el) {
      el.innerHTML = '<div class="grid">' + num(el, "o-e", "Operating profit (EBIT)", 120) + num(el, "o-t", "Tax rate (%)", 25, 1) + num(el, "o-ic", "Invested capital, incl. goodwill", 600) + num(el, "o-gw", "Of which goodwill and acquired intangibles", 200) + "</div>" +
        '<div class="out"><div><span>After-tax operating profit</span><b id="o-1"></b></div><div><span>ROIC incl. goodwill</span><b class="g" id="o-2"></b></div><div><span>ROIC excl. goodwill</span><b id="o-3"></b></div><div><span>Passes the bar?</span><b id="o-4"></b></div></div>' +
        '<p style="color:var(--muted);font-size:13px;margin-top:8px">The bar is 15%, or 12% with goodwill included for serial acquirers and holding companies.</p>';
      wire(el, function () {
        var e = val(el, "o-e"), t = val(el, "o-t") / 100, ic = val(el, "o-ic"), gw = val(el, "o-gw");
        var a = S.roic(e, t, ic), b = S.roic(e, t, ic - gw);
        el.querySelector("#o-1").textContent = fmt(e * (1 - t), 1); el.querySelector("#o-2").textContent = pct(a); el.querySelector("#o-3").textContent = pct(b);
        el.querySelector("#o-4").textContent = a >= 0.15 ? "Yes" : a >= 0.12 ? "Acquirer only" : "No";
      });
    },
    pe: function (el) {
      el.innerHTML = '<div class="grid">' + rng("p-g", "Growth", 10, 2, 20, 1, "%") + rng("p-r", "ROIC", 20, 4, 40, 1, "%") + rng("p-k", "Cost of capital", 8, 6, 12, 0.5, "%") + "</div>" +
        '<div class="grid two" style="margin-top:6px">' + rng("p-t", "Years of growth", 15, 5, 25, 1, "") + num(el, "p-now", "Your stock’s P/E today (optional)", "") + "</div>" +
        '<div class="out"><div><span>Justified P/E</span><b class="g" id="p-o"></b></div><div><span>Reinvests</span><b id="p-re"></b></div><div><span>P/E with zero growth</span><b id="p-z"></b></div><div><span>Today vs justified</span><b id="p-v"></b></div></div>' +
        '<div class="scroll"><table class="heat" id="p-heat"></table></div><p style="color:var(--muted);font-size:13px;margin-top:8px">Rows are growth, columns are ROIC. With 8% and 15 years the grid is the table in the Strategy Book. NM means not meaningful: growth costs more than it earns.</p>';
      var GS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], RS = [4, 8, 12, 16, 20, 24, 30, 40];
      wire(el, function () {
        var g = val(el, "p-g") / 100, r = val(el, "p-r") / 100, k = val(el, "p-k") / 100, T = val(el, "p-t"), now = val(el, "p-now");
        var v = S.justifiedPE(g, r, k, T);
        el.querySelector("#p-o").textContent = v ? v.toFixed(1) + "x" : "NM";
        el.querySelector("#p-re").textContent = pct(g / r, 0) + " of earnings";
        el.querySelector("#p-z").textContent = (1 / k).toFixed(1) + "x";
        el.querySelector("#p-v").textContent = isFinite(now) && v ? (now / v).toFixed(2) + " x" : "–";
        var max = S.justifiedPE(0.2, 0.4, k, T);
        var h = "<tr><th>g \\ ROIC</th>" + RS.map(function (x) { return "<th>" + x + "%</th>"; }).join("") + "</tr>";
        GS.forEach(function (gg) {
          h += "<tr><th>" + gg + "%</th>" + RS.map(function (rr) {
            var p = S.justifiedPE(gg / 100, rr / 100, k, T), a = p ? Math.min(1, p / max) : 0;
            var hot = Math.abs(gg / 100 - g) < 0.011 && Math.abs(rr / 100 - r) < 0.021 ? " hot" : "";
            return '<td class="' + hot + '" style="background:rgba(var(--glow-rgb),' + (0.05 + a * 0.5).toFixed(2) + ')">' + (p ? p.toFixed(1) : "NM") + "</td>";
          }).join("") + "</tr>";
        });
        el.querySelector("#p-heat").innerHTML = h;
      });
    },
    fv: function (el) {
      el.innerHTML = '<div class="grid">' + num(el, "f-e", "Owner earnings per share today", 10, 0.01) + num(el, "f-g", "Growth per year, next 5 years (%)", 10, 0.5) + num(el, "f-x", "Exit multiple in year 5", 20, 0.5) +
        num(el, "f-h", "Hurdle for fair value (%)", 10, 0.5) + num(el, "f-p", "Share price today", 150, 0.01) + "</div>" +
        '<div class="out"><div><span>Fair value</span><b class="g" id="f-o1"></b></div><div><span>Price / fair value</span><b id="f-o2"></b></div><div><span>Implied return per year</span><b id="f-o3"></b></div><div><span>Buy limit (0.75 x FV)</span><b id="f-o4"></b></div></div>' +
        '<div class="scroll"><table style="margin-top:14px"><thead><tr><th>Return you want</th><th>8%</th><th>12%</th><th>15%</th><th>20%</th></tr></thead><tbody><tr><td>Price to pay</td><td id="f-8"></td><td id="f-12"></td><td id="f-15"></td><td id="f-20"></td></tr></tbody></table></div><div class="verdict" id="f-v"></div>';
      wire(el, function () {
        var e = val(el, "f-e"), g = val(el, "f-g") / 100, x = val(el, "f-x"), h = val(el, "f-h") / 100, p = val(el, "f-p");
        var fv = S.fairValue(e, g, x, h), irr = S.impliedIRR(p, e, g, x), ratio = p / fv;
        el.querySelector("#f-o1").textContent = fmt(fv, 2); el.querySelector("#f-o2").textContent = ratio.toFixed(2);
        el.querySelector("#f-o3").textContent = pct(irr); el.querySelector("#f-o4").textContent = fmt(fv * 0.75, 2);
        [8, 12, 15, 20].forEach(function (k) { el.querySelector("#f-" + k).textContent = fmt(S.entryPrice(k / 100, e, g, x), 2); });
        var v = el.querySelector("#f-v");
        v.className = "verdict" + (ratio >= 0.85 ? " bad" : "");
        v.textContent = ratio < 0.75 ? "Under 0.75 x fair value. The rules allow a full position." : ratio < 0.85 ? "Between 0.75 and 0.85 x fair value. A starter position under 4% is allowed. Full weight waits." : ratio <= 1.1 ? "Around fair value. Hold what you own, don't add." : "Over 1.1 x fair value. Don't buy. Trim only if the position is also over 10%.";
      });
    },
    sizing: function (el) {
      el.innerHTML = '<div class="grid two"><div><label>Do I have a differentiated view?</label>' + toggles("s-e", [["yes", "Yes, I see something others don’t"], ["no", "No"]], "yes") + "</div><div><label>Consequence if I’m wrong</label>" + toggles("s-c", [["low", "Low: I survive it"], ["high", "High: binary or hard to see"]], "low") + "</div></div>" +
        '<div class="out"><div style="grid-column:span 2"><span>Position</span><b class="g" id="s-o"></b></div><div style="grid-column:span 2"><span>Weight</span><b id="s-w"></b></div></div><div class="verdict" id="s-n"></div><p style="color:var(--muted);font-size:13px;margin-top:8px">Consequence means what happens to your wealth if the thesis is wrong, not how far the price can fall.</p>';
      var e = togWire(el, "s-e", go), c = togWire(el, "s-c", go);
      function go() { var r = S.sizing(e() === "yes", c() === "high"); el.querySelector("#s-o").textContent = r.label; el.querySelector("#s-w").textContent = r.range; el.querySelector("#s-n").textContent = r.note; }
      go();
    },
    rules: function (el) {
      el.innerHTML = '<div class="grid">' + num(el, "r-p", "Price", 80) + num(el, "r-f", "Your fair value", 100) + num(el, "r-w", "Position today (% of portfolio)", 3, 0.5) +
        num(el, "r-t", "Top-ups this year", 0, 1) + num(el, "r-th", "Same thesis today (%)", 15, 1) + num(el, "r-c", "Same category today (%)", 20, 1) + '</div><div class="out"><div><span>Price / fair value</span><b id="r-o1"></b></div><div><span>May I buy?</span><b id="r-o2"></b></div><div><span>Must I trim?</span><b id="r-o3"></b></div></div><div class="verdict" id="r-v"></div>';
      wire(el, function () {
        var r = S.ruleCheck({ price: val(el, "r-p"), fv: val(el, "r-f"), weight: val(el, "r-w") / 100, topUps: val(el, "r-t"), sameThesis: val(el, "r-th") / 100, category: val(el, "r-c") / 100 });
        el.querySelector("#r-o1").textContent = r.ratio.toFixed(2);
        el.querySelector("#r-o2").textContent = r.add === "full" ? "Yes, full" : r.add === "starter" ? "Starter only" : "No";
        el.querySelector("#r-o2").className = r.add === "no" ? "r" : "g";
        el.querySelector("#r-o3").textContent = r.trim ? "Yes" : "No";
        el.querySelector("#r-v").innerHTML = "<ul>" + r.why.map(function (w) { return "<li>" + w + "</li>"; }).join("") + "</ul>";
      });
    },
    recovery: function (el) {
      el.innerHTML = '<div class="grid two">' + rng("v-f", "The fall", 50, 5, 95, 1, "%") + rng("v-r", "Yearly return after the bottom", 10, 2, 25, 1, "%") + "</div>" +
        '<div class="out"><div style="grid-column:span 2"><span>Gain needed to get back</span><b class="g" id="v-o1"></b></div><div style="grid-column:span 2"><span>Years to get back</span><b id="v-o2"></b></div></div>' +
        '<div class="scroll"><table style="margin-top:14px"><thead><tr><th>Fall</th><th>10%</th><th>20%</th><th>33%</th><th>50%</th><th>75%</th><th>90%</th></tr></thead><tbody><tr><td>Gain needed</td>' + [0.1, 0.2, 1 / 3, 0.5, 0.75, 0.9].map(function (f) { return "<td>" + pct(S.needToRecover(f), 0) + "</td>"; }).join("") + "</tr></tbody></table></div>";
      wire(el, function () {
        var f = val(el, "v-f") / 100, r = val(el, "v-r") / 100;
        el.querySelector("#v-o1").textContent = pct(S.needToRecover(f), 0);
        el.querySelector("#v-o2").textContent = S.yearsToRecover(f, r).toFixed(1);
      });
    },
    decline: function (el) {
      var Q = [
        ["mk", "Did the broad market fall about as much in the same period?"],
        ["sc", "Did the company’s closest peers fall about as much?"],
        ["biz", "Has something changed in the business that you can verify in its own numbers or filings?"],
        ["th", "Does that change break the thesis you wrote down before you bought?"]
      ];
      el.innerHTML = Q.map(function (q) { return '<div style="margin-top:10px"><label>' + q[1] + "</label>" + toggles("d-" + q[0], [["yes", "Yes"], ["no", "No"], ["?", "Not sure"]], null) + "</div>"; }).join("") + '<div class="verdict" id="d-v">Answer the questions to classify the fall.</div>';
      var get = {};
      Q.forEach(function (q) { get[q[0]] = togWire(el, "d-" + q[0], go); });
      function go() {
        var a = {}; Q.forEach(function (q) { a[q[0]] = get[q[0]](); });
        var v = el.querySelector("#d-v"), kind, act;
        if (!a.mk || !a.sc || !a.biz) return;
        kind = a.mk === "yes" ? "a market-wide fall" : a.sc === "yes" ? "a sector fall" : "a company-specific fall";
        if (a.biz === "?" || a.th === "?") act = "You don’t know yet. That is an answer: do nothing, read the next report, and wait a quarter before you act on a surprise.";
        else if (a.biz === "yes" && a.th === "yes") act = "The thesis is broken by an outside, verifiable change. This is one of the few allowed reasons to sell. Write it in the trade log and wait two days before you place the order.";
        else if (a.biz === "yes") act = "The business changed, but not the thesis. Update the model within 30 days. Don’t trade until it’s done.";
        else act = a.mk === "yes" ? "The price fell, not the business. Follow the crash protocol: mute X, buy at your normal pace and only below your limits." : "The price fell, the business didn’t. Check whether the story behind the fall is about the next quarter or the next ten years. If you’d buy at this price, it’s an opportunity, not a warning.";
        v.className = "verdict" + (a.th === "yes" && a.biz === "yes" ? " bad" : "");
        v.innerHTML = "<b>This looks like " + kind + ".</b> " + act;
      }
    },
    sell: function (el) {
      el.innerHTML = '<p style="font-size:14px;color:var(--muted)">Tick every reason you have for selling.</p><div class="opts">' + Object.keys(S.SELL).map(function (k) { return '<label><input type="checkbox" value="' + k + '"> <span>' + S.SELL[k].t + "</span></label>"; }).join("") + '</div><div class="verdict" id="x-v">No reasons ticked.</div>';
      el.addEventListener("change", function () {
        var ks = Array.prototype.map.call(el.querySelectorAll("input:checked"), function (i) { return i.value; });
        var ok = ks.filter(function (k) { return S.SELL[k].ok; }), bad = ks.filter(function (k) { return !S.SELL[k].ok; });
        var v = el.querySelector("#x-v");
        if (!ks.length) { v.className = "verdict"; v.textContent = "No reasons ticked."; return; }
        v.className = "verdict" + (ok.length ? "" : " bad");
        v.innerHTML = ok.length ? "<b>Allowed.</b> At least one reason is on the sell list. " + (ok.indexOf("trim") >= 0 && ok.length === 1 ? "Trim to 10%, don’t sell out. " : "") + "Log it and wait two days." + (bad.length ? " The other reasons don’t count, so leave them out of the log." : "")
          : "<b>Not allowed.</b> None of these is a reason to sell under the rules. If it still feels urgent, that feeling is the thing to write down.";
      });
    },
    tradelog: function (el) {
      var LK = "tc-academy-log";
      function rows() { try { return JSON.parse(localStorage.getItem(LK)) || []; } catch (e) { return []; } }
      el.innerHTML = '<div class="grid">' + '<label>Company<input type="text" id="t-co"></label><label>Buy or sell<select id="t-side"><option>Buy</option><option>Sell</option><option>Trim</option></select></label>' + num(el, "t-amt", "Amount", "") + "</div>" +
        '<div class="field"><label for="t-why">Written reason</label><small>Which rule allows this trade? Name it.</small><textarea id="t-why" rows="2"></textarea></div><div class="grid two" style="margin-top:8px"><label>How do you feel right now?<select id="t-state"><option value="ok">Rested and calm</option><option value="late">It’s late or I’m tired</option><option value="drink">I’ve had a drink</option><option value="rush">Rushed or upset</option></select></label></div>' +
        '<p style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="button" id="t-add">Log the decision</button><button class="btn ghost" type="button" id="t-csv">Download as CSV</button></p><div class="verdict" id="t-v"></div><div class="scroll log"><table id="t-tab"></table></div>';
      function draw(msg) {
        var r = rows(), yr = new Date().getFullYear(), n = r.filter(function (x) { return x.at.slice(0, 4) == yr; }).length;
        el.querySelector("#t-v").innerHTML = msg || "Logged this year: <b>" + n + "</b> of a budget of 10.";
        el.querySelector("#t-tab").innerHTML = r.length ? "<tr><th>Decided</th><th>Earliest order</th><th>Company</th><th>Side</th><th>Amount</th><th>Reason</th></tr>" + r.slice().reverse().map(function (x) { return "<tr><td>" + x.at.replace("T", " ").slice(0, 16) + "</td><td>" + x.earliest.replace("T", " ").slice(0, 16) + "</td><td>" + esc(x.co) + "</td><td>" + x.side + "</td><td>" + esc(x.amt || "") + "</td><td>" + esc(x.why) + "</td></tr>"; }).join("") : "";
      }
      el.querySelector("#t-add").addEventListener("click", function () {
        var co = el.querySelector("#t-co").value.trim(), why = el.querySelector("#t-why").value.trim(), s = el.querySelector("#t-state").value;
        if (s !== "ok") { draw("<b>Not now.</b> The Italy trap: no decisions late at night, tired, after alcohol or in a rush. Come back tomorrow."); return; }
        if (!co || why.length < 15) { draw("<b>Missing.</b> Write the company and a reason of at least one full sentence."); return; }
        var now = new Date(), e = new Date(now.getTime() + 48 * 3600 * 1000);
        var iso = function (d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString(); };
        var r = rows(); r.push({ at: iso(now), earliest: iso(e), co: co, side: el.querySelector("#t-side").value, amt: el.querySelector("#t-amt").value, why: why });
        try { localStorage.setItem(LK, JSON.stringify(r)); } catch (x) {}
        el.querySelector("#t-co").value = ""; el.querySelector("#t-why").value = ""; el.querySelector("#t-amt").value = "";
        draw("<b>Logged.</b> Earliest time you may place the order: " + iso(e).replace("T", " ").slice(0, 16) + ". If you still want it then, go ahead.");
      });
      el.querySelector("#t-csv").addEventListener("click", function () {
        var r = rows(), q = function (s) { return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"'; };
        var csv = "decided,earliest_order,company,side,amount,reason\n" + r.map(function (x) { return [x.at, x.earliest, x.co, x.side, x.amt, x.why].map(q).join(","); }).join("\n");
        var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "trade-log.csv"; a.click();
      });
      draw();
    },
    review: function (el) {
      el.innerHTML = '<div class="grid">' + num(el, "w-s", "Value on 1 January", 1000000) + num(el, "w-e", "Value on 31 December", 1050000) + num(el, "w-d", "Net deposits during the year", 60000) +
        num(el, "w-n", "1 January holdings, untouched, valued today", 1100000) + num(el, "w-i", "Index return this year (%)", 8, 0.1) + num(el, "w-f", "Total fees paid", 4000) + "</div>" +
        '<div class="out"><div><span>Your return</span><b id="w-1"></b></div><div><span>Doing nothing</span><b id="w-2"></b></div><div><span>Index</span><b id="w-3"></b></div><div><span>Fees, % of portfolio</span><b id="w-4"></b></div></div><div class="verdict" id="w-v"></div>';
      wire(el, function () {
        var r = S.review({ start: val(el, "w-s"), end: val(el, "w-e"), deposits: val(el, "w-d"), nothing: val(el, "w-n"), index: val(el, "w-i") / 100, fees: val(el, "w-f") });
        el.querySelector("#w-1").textContent = pct(r.mine); el.querySelector("#w-2").textContent = pct(r.idle); el.querySelector("#w-3").textContent = pct(r.index); el.querySelector("#w-4").textContent = pct(r.feePct, 2);
        var v = el.querySelector("#w-v");
        v.className = "verdict" + (r.gapIdle < 0 ? " bad" : "");
        v.innerHTML = "Your activity " + (r.gapIdle < 0 ? "<b>cost</b> " : "<b>added</b> ") + pct(Math.abs(r.gapIdle)) + " compared with doing nothing, and you were " + pct(Math.abs(r.gapIndex)) + (r.gapIndex < 0 ? " <b>behind</b>" : " <b>ahead of</b>") + " the index.";
      });
    }
  };
  // Load the content, then route. Everything above is defined by now.
  function getJSON(u) { return fetch(u, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }); }
  var meP = fetch("/api/me").then(function (r) { return r.json(); }).catch(function () { return {}; });
  Promise.all([getJSON("/academy/content/course.json"), meP]).then(function (x) {
    var meta = x[0]; ADMIN = !!x[1].admin;
    return Promise.all(meta.order.map(function (s) { return getJSON("/academy/content/" + s + ".json"); })).then(function (mods) {
      meta.modules = mods; C = window.COURSE = meta;
      if (page === "overview") overview();
      else if (page === "exam") exam();
      else if (page === "certificate") certificate();
      else module_(page);
      adminBar();
    });
  }).catch(function (e) { root.innerHTML = '<p class="lead">The course couldn\u2019t load. Reload the page.</p>'; console.error(e); });

  // Admin only: a link to the editor for the page you're on.
  function adminBar() {
    meP.then(function (me) {
      if (!me.admin) return;
      var target = page === "overview" || page === "exam" || page === "certificate" ? "course" : page;
      var a = document.createElement("a");
      a.className = "editfab"; a.href = "/academy/edit?m=" + target; a.textContent = "\u270e Edit " + (target === "course" ? "course page and exam" : "this module");
      var n = document.createElement("div"); n.className = "adminnote"; n.textContent = "Admin preview: every step is open. Members unlock them in order.";
      root.insertBefore(n, root.firstChild);
      document.body.appendChild(a);
    }).catch(function () {});
  }
})();
