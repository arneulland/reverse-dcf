// Torghatten Academy editor. Admin only (the page and /api/academy check the session).
// Loads one JSON file, edits it in forms, and saves through /api/academy.
(function () {
  var SIMS = { activity: "What activity costs", recovery: "Recovery maths", roic: "ROIC calculator", engine: "Growth engine", pe: "Justified P/E grid", fv: "Fair value and entry prices", sizing: "Steinhardt’s grid", rules: "Buy and trim rules", decline: "Classify the fall", sell: "Sell-rule checker", tradelog: "Trade log", review: "Annual review" };
  var ORDER = [["course", "Course page and exam"], ["mindset", "1. Mindset"], ["quality", "2. Quality"], ["valuation", "3. Valuation"], ["falling-markets", "4. Falling markets"], ["behaviour", "5. Behaviour"], ["annual-review", "6. The annual review"]];
  var key = new URLSearchParams(location.search).get("m") || "course";
  if (!ORDER.some(function (o) { return o[0] === key; })) key = "course";
  var root = document.getElementById("editor"), doc = null, dirty = false;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function mark() { dirty = true; $("#state").textContent = "Unsaved changes"; $("#state").className = "state dirty"; }

  fetch("/academy/content/" + key + ".json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) { doc = d; render(); })
    .catch(function () { root.innerHTML = "<p>Couldn’t load the content.</p>"; });

  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
  document.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); save(); } });

  // ------------------------------------------------------------- fields
  // Every input carries data-path, a dot path into doc, e.g. "lessons.2.title".
  function get(path) { return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, doc); }
  function set(path, v) {
    var ks = path.split("."), o = doc;
    for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }
  function input(path, label, hint, type) {
    var v = get(path);
    return '<div class="f"><label>' + label + (hint ? ' <small>' + hint + "</small>" : "") + "</label>" +
      (type === "area" ? '<textarea data-path="' + path + '" rows="3">' + esc(v) + "</textarea>" : '<input data-path="' + path + '"' + (type === "num" ? ' type="number" data-num' : "") + ' value="' + esc(v) + '">') + "</div>";
  }
  function lines(path, label, hint) {
    return '<div class="f"><label>' + label + (hint ? " <small>" + hint + "</small>" : "") + '</label><textarea data-lines="' + path + '" rows="4">' + esc((get(path) || []).join("\n")) + "</textarea></div>";
  }
  function rich(path, label) {
    return '<div class="f"><label>' + label + '</label><div class="rte" data-rich="' + path + '"><div class="tb">' +
      '<button type="button" data-cmd="bold" title="Bold"><b>B</b></button><button type="button" data-cmd="italic" title="Italic"><i>I</i></button>' +
      '<button type="button" data-cmd="h5" title="Subheading">H</button><button type="button" data-cmd="p" title="Paragraph">¶</button>' +
      '<button type="button" data-cmd="ul" title="Bullets">• List</button><button type="button" data-cmd="ol" title="Numbered">1. List</button>' +
      '<button type="button" data-cmd="quote" title="Quote">“ Quote</button><button type="button" data-cmd="box" title="Keep this box">▢ Box</button>' +
      '<button type="button" data-cmd="link" title="Link">🔗 Link</button><button type="button" data-cmd="html" class="r" title="Edit the HTML">&lt;/&gt; HTML</button></div>' +
      '<div class="lesson ed" contenteditable="true">' + (get(path) || "") + '</div><textarea class="raw" hidden rows="14"></textarea></div></div>';
  }
  function question(path, title) {
    var q = get(path) || { q: "", options: ["", ""], answer: 0, why: "" };
    if (!get(path)) set(path, q);
    return '<div class="card q" data-q="' + path + '"><div class="ch"><b>' + title + '</b><span class="acts">' + (title.indexOf("Task") === 0 ? "" : actions(path)) + "</span></div>" +
      input(path + ".q", "Question", "", "area") + '<div class="f"><label>Answers <small>Tick the correct one. Members see them in random order.</small></label>' +
      q.options.map(function (o, i) { return '<div class="opt"><input type="radio" name="' + path + '" data-answer="' + path + '" value="' + i + '"' + (q.answer === i ? " checked" : "") + ' title="Correct answer"><input data-path="' + path + ".options." + i + '" value="' + esc(o) + '"><button type="button" class="x" data-delopt="' + path + "|" + i + '" title="Remove answer">×</button></div>'; }).join("") +
      '<button type="button" class="add sm" data-addopt="' + path + '">+ Answer</button></div>' + input(path + ".why", "Explanation shown after answering", "", "area") + "</div>";
  }
  function actions(path) {
    return '<button type="button" data-move="' + path + '|-1" title="Move up">↑</button><button type="button" data-move="' + path + '|1" title="Move down">↓</button><button type="button" data-del="' + path + '" title="Delete">Delete</button>';
  }
  function list(path, title, add) { return '<section class="sec-e"><h2>' + title + '</h2><div class="items">' + (get(path) || []).map(add.item).join("") + '</div><button type="button" class="add" data-add="' + path + '">' + add.label + "</button></section>"; }

  // ------------------------------------------------------------- render
  function render() {
    var h = '<div class="top"><div><span class="eyebrow">Academy editor</span><h1>' + esc(key === "course" ? "Course page and exam" : doc.title) + '</h1></div><div class="ctl"><select id="pick">' +
      ORDER.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === key ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + '</select>' +
      '<a class="btn ghost" href="' + (key === "course" ? "/academy" : "/academy/" + key) + '" target="_blank">View page</a><button class="btn" id="save" type="button">Save and publish</button></div></div>' +
      '<p class="state" id="state">No changes</p><div id="errs"></div>';
    h += key === "course" ? courseForm() : moduleForm();
    root.innerHTML = h;
    wire();
  }

  function moduleForm() {
    var h = '<section class="sec-e"><h2>Module</h2><div class="g2">' + input("title", "Title", "used in lists") + input("minutes", "Minutes", "estimated time", "num") + "</div>" +
      input("heading", "Heading on the page", "wrap the highlighted words in &lt;em&gt;&lt;/em&gt;") + input("summary", "Summary", "", "area") + lines("objectives", "Learning objectives", "one per line") + "</section>";
    h += list("lessons", "Lessons", { label: "+ Add lesson", item: function (l, i) { return '<div class="card"><div class="ch"><b>Lesson ' + (i + 1) + '</b><span class="acts">' + actions("lessons." + i) + "</span></div>" + input("lessons." + i + ".title", "Title") + rich("lessons." + i + ".html", "Text") + "</div>"; } });
    h += list("exercises", "Exercises", { label: "+ Add exercise", item: function (x, i) {
      var p = "exercises." + i;
      return '<div class="card"><div class="ch"><b>Exercise ' + (i + 1) + '</b><span class="acts">' + actions(p) + '</span></div><div class="g2">' + input(p + ".title", "Title") +
        '<div class="f"><label>Simulation</label><select data-path="' + p + '.sim">' + Object.keys(SIMS).map(function (k) { return '<option value="' + k + '"' + (x.sim === k ? " selected" : "") + ">" + SIMS[k] + "</option>"; }).join("") + "</select></div></div>" +
        input(p + ".intro", "Introduction", "", "area") + question(p + ".task", "Task: members must answer this correctly to continue") + "</div>";
    } });
    h += '<section class="sec-e"><h2>Assignment</h2>' + input("assignment.title", "Title") + input("assignment.intro", "Introduction", "", "area") + input("assignment.company", "Company field label", "leave empty for no company field") +
      '<div class="items">' + (doc.assignment.fields || []).map(function (f, i) { var p = "assignment.fields." + i; return '<div class="card"><div class="ch"><b>Question ' + (i + 1) + '</b><span class="acts">' + actions(p) + "</span></div>" + input(p + ".q", "Question", "", "area") + input(p + ".hint", "Hint") + "</div>"; }).join("") +
      '</div><button type="button" class="add" data-add="assignment.fields">+ Add question</button></section>';
    h += '<section class="sec-e"><h2>Knowledge test <small>' + doc.test.length + " questions in the bank. Each attempt draws 10 at random; 80% to pass.</small></h2><div class=\"items\">" +
      doc.test.map(function (q, i) { return question("test." + i, "Question " + (i + 1)); }).join("") + '</div><button type="button" class="add" data-add="test">+ Add question</button></section>';
    h += links("tools", "Tools for this module", "/moat") + links("reading", "From the archive", "https://torghattencapital.substack.com/p/…");
    return h;
  }
  function links(path, title, ph) {
    return list(path, title, { label: "+ Add link", item: function (t, i) { var p = path + "." + i; return '<div class="card row"><div class="g3">' + input(p + ".label", "Label") + input(p + ".href", "Link", ph) + input(p + ".why", "Why read or use it") + '</div><span class="acts">' + actions(p) + "</span></div>"; } });
  }
  function courseForm() {
    var h = '<section class="sec-e"><h2>Course page</h2>' + rich("intro", "Introduction") +
      '<div class="items">' + doc.how.map(function (x, i) { return '<div class="g2">' + input("how." + i + ".0", "Box " + (i + 1) + " title") + input("how." + i + ".1", "Box " + (i + 1) + " text") + "</div>"; }).join("") + "</div>" +
      rich("outro", "Who it’s for, under the modules") + "</section>";
    h += '<section class="sec-e"><h2>Final exam</h2>' + input("exam.summary", "Summary on the course page", "", "area") + input("exam.intro", "Introduction on the exam page", "", "area") +
      '<p class="note">The exam is these cases plus two random questions from each module’s test. Members need 80%.</p><div class="items">' +
      doc.exam.cases.map(function (q, i) { return question("exam.cases." + i, "Case " + (i + 1)); }).join("") + '</div><button type="button" class="add" data-add="exam.cases">+ Add case</button></section>';
    h += '<section class="sec-e"><h2>Certificate</h2>' + rich("certificate", "Text under the name") + input("certNote", "Note under the certificate", "", "area") + "</section>";
    return h;
  }

  // ------------------------------------------------------------- behaviour
  function syncRich() {
    root.querySelectorAll("[data-rich]").forEach(function (r) {
      var raw = $(".raw", r);
      set(r.getAttribute("data-rich"), raw.hidden ? $(".ed", r).innerHTML : raw.value);
    });
  }
  function rerender() { syncRich(); var y = scrollY; render(); scrollTo(0, y); mark(); }

  function wire() {
    $("#pick").addEventListener("change", function () {
      if (dirty && !confirm("You have unsaved changes. Leave without saving?")) { this.value = key; return; }
      dirty = false; location.href = "/academy/edit?m=" + this.value;
    });
    $("#save").addEventListener("click", save);
    root.addEventListener("input", function (e) {
      var t = e.target, p = t.getAttribute("data-path"), l = t.getAttribute("data-lines");
      if (p) set(p, t.hasAttribute("data-num") ? +t.value : t.value);
      if (l) set(l, t.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean));
      mark();
    });
    root.addEventListener("change", function (e) {
      var t = e.target;
      if (t.getAttribute("data-answer")) { set(t.getAttribute("data-answer") + ".answer", +t.value); mark(); }
      if (t.tagName === "SELECT" && t.getAttribute("data-path")) { set(t.getAttribute("data-path"), t.value); mark(); }
    });
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var a;
      if ((a = b.getAttribute("data-add"))) {
        var arr = get(a) || [];
        var blank = a === "lessons" ? { title: "New lesson", html: "<p>Write here.</p>" } :
          a === "exercises" ? { id: key + "-" + Date.now().toString(36), sim: "fv", title: "New exercise", intro: "", task: { q: "", options: ["", ""], answer: 0, why: "" } } :
          a === "assignment.fields" ? { q: "", hint: "" } : a === "tools" || a === "reading" ? { label: "", href: "", why: "" } : { q: "", options: ["", "", "", ""], answer: 0, why: "" };
        syncRich(); arr.push(blank); set(a, arr); rerender(); return;
      }
      if ((a = b.getAttribute("data-del"))) {
        if (!confirm("Delete this?")) return;
        syncRich(); var ks = a.split("."), i = +ks.pop(), par = get(ks.join(".")); par.splice(i, 1); rerender(); return;
      }
      if ((a = b.getAttribute("data-move"))) {
        var pr = a.split("|"), ks2 = pr[0].split("."), j = +ks2.pop(), arr2 = get(ks2.join(".")), k = j + +pr[1];
        if (k < 0 || k >= arr2.length) return;
        syncRich(); var tmp = arr2[j]; arr2[j] = arr2[k]; arr2[k] = tmp; rerender(); return;
      }
      if ((a = b.getAttribute("data-addopt"))) { syncRich(); get(a).options.push(""); rerender(); return; }
      if ((a = b.getAttribute("data-delopt"))) {
        var q = a.split("|"), qq = get(q[0]), oi = +q[1];
        if (qq.options.length <= 2) return alert("A question needs at least two answers.");
        syncRich(); qq.options.splice(oi, 1); if (qq.answer >= oi && qq.answer > 0) qq.answer--; rerender(); return;
      }
      if ((a = b.getAttribute("data-cmd"))) { cmd(b, a); }
    });
  }

  function cmd(b, c) {
    var r = b.closest("[data-rich]"), ed = $(".ed", r), raw = $(".raw", r);
    if (c === "html") {
      if (raw.hidden) { raw.value = ed.innerHTML.replace(/(<\/(p|h5|ul|ol|blockquote|div|table)>)/g, "$1\n"); raw.hidden = false; ed.hidden = true; b.classList.add("on"); }
      else { ed.innerHTML = raw.value; raw.hidden = true; ed.hidden = false; b.classList.remove("on"); }
      mark(); return;
    }
    if (!raw.hidden) return;
    ed.focus();
    if (c === "bold" || c === "italic") document.execCommand(c);
    else if (c === "h5" || c === "p") document.execCommand("formatBlock", false, c);
    else if (c === "quote") document.execCommand("formatBlock", false, "blockquote");
    else if (c === "ul") document.execCommand("insertUnorderedList");
    else if (c === "ol") document.execCommand("insertOrderedList");
    else if (c === "box") document.execCommand("insertHTML", false, '<div class="box"><b class="t">Keep this</b>' + (String(getSelection()) || "Write the takeaway here.") + "</div><p><br></p>");
    else if (c === "link") { var u = prompt("Link address"); if (u) document.execCommand("createLink", false, u); }
    mark();
  }
  // contenteditable doesn't fire input on the wrapper in every browser
  document.addEventListener("input", function (e) { if (e.target.classList && e.target.classList.contains("ed")) mark(); }, true);

  function save() {
    if (!doc) return;
    syncRich();
    var btn = $("#save"); btn.disabled = true; btn.textContent = "Saving…";
    $("#errs").innerHTML = "";
    fetch("/api/academy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: key, content: doc }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        btn.disabled = false; btn.textContent = "Save and publish";
        if (!x.ok) {
          $("#errs").innerHTML = '<div class="errs"><b>' + esc(x.j.message || "Couldn’t save.") + "</b>" + (x.j.errors ? "<ul>" + x.j.errors.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" : "") + "</div>";
          scrollTo({ top: 0, behavior: "smooth" }); return;
        }
        dirty = false;
        $("#state").className = "state ok";
        $("#state").innerHTML = esc(x.j.message) + (x.j.commit ? ' <a href="' + x.j.commit + '" target="_blank">See the change</a>' : "");
      })
      .catch(function () { btn.disabled = false; btn.textContent = "Save and publish"; $("#errs").innerHTML = '<div class="errs"><b>No connection. Your changes are still here; try again.</b></div>'; });
  }
})();
