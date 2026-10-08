// Injected into the page (and its frames) by the side panel while a run is on.
// It reads the page into a numbered element list for the model, and does the
// small DOM jobs the panel can't do from outside. Real mouse and keyboard input
// comes from the panel through the debugger; the fallbacks here are only for
// controls inside frames, which the debugger can't aim at.
(() => {
  if (window.__sd) return;

  const INTERACTIVE = [
    "a[href]",
    "button",
    "input:not([type=hidden])",
    "select",
    "textarea",
    "summary",
    "[contenteditable='']",
    "[contenteditable='true']",
    ...["button", "link", "checkbox", "radio", "combobox", "option", "menuitem", "menuitemradio", "menuitemcheckbox", "tab", "switch", "textbox", "searchbox", "listbox", "spinbutton", "slider", "treeitem", "gridcell"].map(
      (r) => `[role='${r}']`,
    ),
  ].join(",");

  // Fields that are his to answer: demographics, consent, attestations, secrets.
  const HIS =
    /\b(gender|sex|race|racial|ethnic\w*|veteran|disabilit\w*|sexual orientation|pronouns?|consent\w*|privacy|terms|certif\w*|attest\w*|acknowledg\w*|i agree|i confirm|i declare|declaration|signature|sign here|date of birth|birth ?date|passport|national id|ssn|social security|iqama|cnic|emirates id|password|card number|cvv|cvc|iban|bank|routing)\b/i;
  const SUBMIT = /\b(submit|send|finish|complete|confirm|apply)\b/i;
  const NOT_SUBMIT = /\b(next|continue|save|back|previous|add|upload|attach|search|filter|sign in|log ?in|cancel|close|more|edit|remove)\b/i;
  const PAY = /\b(pay|place order|purchase|checkout|buy now)\b/i;
  const GENERIC = /^(attach|upload|browse|choose file|select file|enter manually|add|add another|remove|edit|delete|clear)$/i;

  const refs = new Map();
  const refOf = new WeakMap();
  let counter = 0;
  // Frames number their refs "§:n"; the panel rewrites that to "f<frameId>:n".
  const prefix = window.top === window ? "" : "§:";

  const clean = (s, n = 160) => {
    const t = (s || "").replace(/\s+/g, " ").trim();
    return t.length > n ? `${t.slice(0, n - 1)}…` : t;
  };
  const q = (s) => JSON.stringify(s);

  function visible(el) {
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }

  // Custom checkboxes, radios and drop zones hide the real input behind a label.
  function shown(el) {
    if (visible(el)) return true;
    if (el.tagName === "INPUT" && /^(checkbox|radio|file)$/i.test(el.type)) {
      return [...(el.labels || [])].some(visible) || (el.parentElement && visible(el.parentElement));
    }
    return false;
  }

  function textOf(el) {
    return clean(el.innerText || el.textContent || "", 200);
  }

  // The question a control answers when nothing labels it: the nearest text just above it.
  function questionFor(el) {
    let node = el;
    for (let depth = 0; depth < 5 && node.parentElement; depth++) {
      const parent = node.parentElement;
      if (parent.tagName === "FIELDSET") {
        const legend = parent.querySelector("legend");
        if (legend) return clean(legend.innerText, 200);
      }
      let sib = node.previousElementSibling;
      while (sib) {
        if (!sib.matches(INTERACTIVE) && !sib.querySelector("input,select,textarea")) {
          const t = clean(sib.innerText, 200);
          if (t) return t;
        }
        sib = sib.previousElementSibling;
      }
      node = parent;
    }
    return "";
  }

  function nameOf(el) {
    const by = el.getAttribute("aria-labelledby");
    if (by) {
      const t = by
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.innerText || "")
        .join(" ");
      if (clean(t)) return clean(t);
    }
    const aria = el.getAttribute("aria-label");
    if (aria && clean(aria)) return clean(aria);
    if (el.labels && el.labels.length) {
      const t = [...el.labels].map((l) => l.innerText).join(" ");
      if (clean(t)) return clean(t);
    }
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || el.getAttribute("role") === "combobox") {
      const t = el.getAttribute("placeholder") || el.getAttribute("title") || questionFor(el) || el.getAttribute("name") || "";
      return clean(t);
    }
    const img = el.querySelector?.("img[alt]");
    return clean(el.innerText || el.value || el.getAttribute("title") || img?.alt || "", 120);
  }

  function roleOf(el) {
    const role = el.getAttribute("role");
    if (role) return role;
    const tag = el.tagName;
    if (tag === "A") return "link";
    if (tag === "BUTTON" || tag === "SUMMARY") return "button";
    if (tag === "SELECT") return "select";
    if (tag === "TEXTAREA") return "textarea";
    if (tag === "INPUT") {
      const t = (el.type || "text").toLowerCase();
      if (t === "checkbox" || t === "radio" || t === "file") return t;
      if (t === "submit" || t === "button" || t === "reset" || t === "image") return "button";
      return t === "text" ? "textbox" : `textbox:${t}`;
    }
    if (el.isContentEditable) return "textarea";
    return "clickable";
  }

  function isHis(el, name) {
    if (el.type === "password" || /^cc-/.test(el.getAttribute("autocomplete") || "")) return true;
    const group = el.type === "radio" || el.type === "checkbox" ? questionFor(el) : "";
    return HIS.test(`${name} ${group}`);
  }

  function refFor(el) {
    let r = refOf.get(el);
    if (!r) {
      r = `${prefix}${++counter}`;
      refOf.set(el, r);
      refs.set(r, new WeakRef(el));
    }
    return r;
  }

  function line(el) {
    const role = roleOf(el);
    const name = nameOf(el);
    const bits = [`[${refFor(el)}]`, role, q(name)];
    const tag = el.tagName;
    if (tag === "INPUT" && el.type === "file") {
      bits.push(el.files?.length ? `attached=${q(el.files[0].name)}` : "empty");
      if (el.accept) bits.push(`accepts=${el.accept}`);
      const group = questionFor(el);
      if (group && group !== name) bits.push(`for=${q(clean(group, 80))}`);
    } else if (tag === "INPUT" && (el.type === "checkbox" || el.type === "radio")) {
      bits.push(el.checked ? "checked" : "unchecked");
      const group = questionFor(el);
      if (group && group !== name) bits.push(`question=${q(clean(group, 160))}`);
    } else if (tag === "SELECT") {
      const opts = [...el.options].slice(0, 40).map((o) => `${o.selected ? "*" : ""}${clean(o.textContent, 60)}`);
      bits.push(`options=[${opts.join(" | ")}${el.options.length > 40 ? ` | …${el.options.length - 40} more` : ""}]`);
    } else if (/^(INPUT|TEXTAREA)$/.test(tag) && el.type !== "password") {
      bits.push(`value=${q(clean(el.value, 120))}`);
      const ph = el.getAttribute("placeholder");
      if (ph && clean(ph) !== name) bits.push(`placeholder=${q(clean(ph, 60))}`);
    } else if (el.isContentEditable) {
      bits.push(`value=${q(clean(el.innerText, 120))}`);
    } else if (role === "combobox") {
      bits.push(`value=${q(clean(el.value ?? el.innerText, 80))}`);
    }
    // "Attach" or "Enter manually" means nothing without the field it belongs to.
    if (role === "button" && GENERIC.test(name)) {
      const group = questionFor(el);
      if (group) bits.push(`for=${q(clean(group, 80))}`);
    }
    if (tag === "A") {
      const href = el.getAttribute("href") || "";
      if (href && !href.startsWith("#") && !href.startsWith("javascript:")) bits.push(`href=${clean(href, 90)}`);
    }
    if (el.required || el.getAttribute("aria-required") === "true") bits.push("required");
    if (el.disabled || el.getAttribute("aria-disabled") === "true") bits.push("disabled");
    if (el.getAttribute("aria-invalid") === "true") bits.push("invalid");
    const exp = el.getAttribute("aria-expanded");
    if (exp) bits.push(exp === "true" ? "expanded" : "collapsed");
    if (el.getAttribute("aria-selected") === "true" || el.getAttribute("aria-checked") === "true") bits.push("selected");
    if (role !== "link" && role !== "button" && isHis(el, name)) bits.push("(his: leave)");
    return bits.join(" ");
  }

  function clickableDiv(el) {
    if (el.children.length > 3 || !el.innerText || el.innerText.length > 120) return false;
    if (el.closest(INTERACTIVE)) return false;
    return getComputedStyle(el).cursor === "pointer" && getComputedStyle(el.parentElement || el).cursor !== "pointer";
  }

  const ALERT = /\b(error|invalid|alert|warning)\b/i;

  function snapshot() {
    const out = [];
    let budget = 45000;
    const emit = (s) => {
      if (budget <= 0) return;
      budget -= s.length + 1;
      out.push(budget > 0 ? s : "… (page cut short here; scroll or act on what's above)");
    };
    const flags = { captcha: false, password: false };

    const walk = (root) => {
      for (const el of root.children) {
        if (budget <= 0) return;
        const tag = el.tagName;
        if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG|svg|PATH|HEAD|META|LINK)$/.test(tag)) continue;
        if (tag === "IFRAME") {
          const src = el.getAttribute("src") || "";
          if (/recaptcha|hcaptcha|turnstile|challenges\.cloudflare|arkoselabs|funcaptcha/i.test(src)) {
            // Invisible reCAPTCHA keeps a badge frame on many forms; only a challenge on screen needs him.
            const r = el.getBoundingClientRect();
            const challenge = /bframe|challenge|turnstile|cloudflare|arkose|funcaptcha/i.test(src);
            if (visible(el) && (challenge ? r.width > 100 : r.width > 280 && r.height > 280)) flags.captcha = true;
          } else if (visible(el) && src) emit(`[frame] src=${clean(src, 120)}`);
          continue;
        }
        const special = tag === "INPUT" && /^(checkbox|radio|file)$/i.test(el.type);
        if (!special && !visible(el)) continue;
        if (tag === "INPUT" && el.type === "password") flags.password = true;

        if (el.matches(INTERACTIVE) || (tag !== "BODY" && clickableDiv(el))) {
          if (!shown(el)) continue;
          emit(line(el));
          const role = el.getAttribute("role");
          if (role === "listbox" || role === "radiogroup" || role === "group" || role === "menu" || role === "tablist" || role === "grid") walk(el);
          if (el.shadowRoot) walk(el.shadowRoot);
          continue;
        }
        if (/^H[1-4]$/.test(tag)) {
          const t = textOf(el);
          if (t) emit(`# ${t}`);
          continue;
        }
        const role = el.getAttribute("role");
        if (role === "alert" || role === "status" || (ALERT.test(el.className?.toString?.() || "") && el.children.length <= 2)) {
          const t = textOf(el);
          if (t && t.length < 200) {
            emit(`! ${t}`);
            continue;
          }
        }
        if (el.shadowRoot) walk(el.shadowRoot);
        const leafy = !el.querySelector(`${INTERACTIVE},h1,h2,h3,h4,iframe,[role=alert]`);
        if (leafy && ![...el.children].some(clickableDiv)) {
          const t = textOf(el);
          if (t) emit(t);
          continue;
        }
        walk(el);
      }
    };
    if (document.body) walk(document.body);
    return { text: out.join("\n"), flags, title: document.title, url: location.href };
  }

  function get(ref) {
    const el = refs.get(ref)?.deref();
    return el && el.isConnected ? el : null;
  }

  // The element a click or keystroke should land on: hidden inputs act through their label.
  function target(el) {
    if (!visible(el) && el.labels?.[0] && visible(el.labels[0])) return el.labels[0];
    return el;
  }

  function info(ref) {
    const el = get(ref);
    if (!el) return { found: false };
    const t = target(el);
    t.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    const r = t.getBoundingClientRect();
    const name = nameOf(el);
    const form = el.closest("form");
    const filled = form ? [...form.querySelectorAll("input,textarea,select")].filter((f) => (f.type === "file" ? f.files?.length : f.value && f.type !== "hidden" && f.type !== "checkbox" && f.type !== "radio")).length : 0;
    const role = roleOf(el);
    const label = `${name} ${el.value && el.tagName === "INPUT" ? el.value : ""}`;
    const buttonish = role === "button" || role === "link" || el.type === "submit";
    const submitLike =
      buttonish && !NOT_SUBMIT.test(label) && (el.type === "submit" || SUBMIT.test(label)) && (!/\bapply\b/i.test(label) || filled >= 2 || /submit|send/i.test(label));
    return {
      found: true,
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      w: r.width,
      h: r.height,
      tag: el.tagName,
      type: (el.type || "").toLowerCase(),
      role,
      name,
      his: isHis(el, name),
      submitLike,
      pay: buttonish && PAY.test(label),
      editable: /^(INPUT|TEXTAREA)$/.test(el.tagName) || el.isContentEditable || role === "combobox" || role === "textbox",
    };
  }

  // Select the field's text so the next typed text replaces it.
  function prime(ref) {
    const el = get(ref);
    if (!el) return false;
    el.focus();
    if (typeof el.select === "function") el.select();
    else if (el.isContentEditable) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    return document.activeElement === el || el.contains(document.activeElement);
  }

  function fire(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function setValue(ref, text) {
    const el = get(ref);
    if (!el) return "not found";
    el.focus();
    if (el.isContentEditable) {
      el.innerText = text;
    } else {
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, text);
    }
    fire(el, "input");
    fire(el, "change");
    return "typed";
  }

  function selectOption(ref, option) {
    const el = get(ref);
    if (!el) return "not found";
    if (el.tagName !== "SELECT") return "not a native select; click it and pick the option instead";
    const want = clean(option).toLowerCase();
    const opts = [...el.options];
    const hit = opts.find((o) => clean(o.textContent).toLowerCase() === want) || opts.find((o) => clean(o.textContent).toLowerCase().startsWith(want)) || opts.find((o) => o.value.toLowerCase() === want);
    if (!hit) return `no option "${option}"`;
    el.value = hit.value;
    fire(el, "input");
    fire(el, "change");
    return `selected "${clean(hit.textContent, 60)}"`;
  }

  function click(ref) {
    const el = get(ref);
    if (!el) return "not found";
    const t = target(el);
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
      t.dispatchEvent(new (type.startsWith("pointer") ? PointerEvent : MouseEvent)(type, { bubbles: true, cancelable: true, composed: true }));
    }
    t.click();
    return "clicked";
  }

  function key(name) {
    const el = document.activeElement || document.body;
    for (const type of ["keydown", "keyup"]) el.dispatchEvent(new KeyboardEvent(type, { key: name, bubbles: true, cancelable: true }));
    return "pressed";
  }

  function checked(ref) {
    const el = get(ref);
    if (!el) return null;
    if ("checked" in el && /^(checkbox|radio)$/.test(el.type)) return el.checked;
    const aria = el.getAttribute("aria-checked");
    return aria === null ? null : aria === "true";
  }

  function upload(ref, b64, filename) {
    let el = get(ref);
    if (!el) return "not found";
    if (!(el.tagName === "INPUT" && el.type === "file")) {
      el = el.querySelector?.("input[type=file]") || el.closest("form,div,section")?.querySelector("input[type=file]");
    }
    if (!el) return "no file input near that element";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], filename, { type: "application/pdf" }));
    el.files = dt.files;
    fire(el, "input");
    fire(el, "change");
    return el.files.length ? `attached ${filename}` : "the page refused the file";
  }

  // What the form holds right now, for the approval card: he sees exactly what would be sent.
  function filled(ref) {
    const near = ref ? get(ref) : null;
    const root = near?.closest("form") || document;
    const fields = [];
    const missing = [];
    const seen = new Set();
    for (const f of root.querySelectorAll("input,select,textarea,[contenteditable='true'],[role=combobox]")) {
      if (fields.length >= 60) break;
      const type = (f.type || "").toLowerCase();
      if (/^(hidden|submit|button|reset|image|password|search)$/.test(type) || !shown(f)) continue;
      let label = nameOf(f);
      let value = "";
      if (type === "checkbox" || type === "radio") {
        if (!f.checked) continue;
        const group = questionFor(f);
        if (group && group !== label) {
          value = label;
          label = group;
        } else value = "yes";
      } else if (type === "file") value = f.files?.[0]?.name || "";
      else if (f.tagName === "SELECT") value = f.selectedIndex > 0 || f.value ? clean(f.options[f.selectedIndex]?.textContent, 80) : "";
      else value = f.isContentEditable ? f.innerText : f.value ?? f.innerText;
      value = clean(value, 300);
      const key = `${label}|${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (value) fields.push({ label: clean(label, 80) || "(unlabelled)", value });
      else if (f.required || f.getAttribute("aria-required") === "true") missing.push(clean(label, 80) || "(unlabelled)");
    }
    return { fields, missing };
  }

  // Enter in a plain text input submits most forms, which would skip his approval.
  function enterRisk() {
    const el = document.activeElement;
    if (!el || el.tagName !== "INPUT" || !el.form) return false;
    if (el.getAttribute("role") === "combobox" || el.getAttribute("aria-autocomplete") || el.getAttribute("list")) return false;
    return !/^(checkbox|radio|file|button)$/i.test(el.type);
  }

  function viewport() {
    return { w: innerWidth, h: innerHeight };
  }

  function settled() {
    return document.readyState === "complete";
  }

  // The glow round the page while the agent works, and a box on what it's about to touch.
  function overlay(on, label) {
    if (window.top !== window) return;
    let frame = document.getElementById("__sd-frame");
    if (!on) {
      frame?.remove();
      document.getElementById("__sd-mark")?.remove();
      return;
    }
    if (!frame) {
      frame = document.createElement("div");
      frame.id = "__sd-frame";
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText =
        "position:fixed;inset:0;z-index:2147483646;pointer-events:none;box-shadow:inset 0 0 0 2px rgba(76,152,253,.9),inset 0 0 28px rgba(76,152,253,.35);border-radius:2px;";
      const pill = document.createElement("div");
      pill.style.cssText =
        "position:fixed;left:50%;bottom:14px;transform:translateX(-50%);padding:6px 12px;border-radius:999px;background:#1c1c1c;color:#fff;font:500 12px/1.3 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);white-space:nowrap;max-width:80vw;overflow:hidden;text-overflow:ellipsis;";
      frame.append(pill);
      document.documentElement.append(frame);
    }
    frame.firstChild.textContent = label || "Signal Desk agent is working. Pause or stop it from the side panel.";
  }

  function mark(ref) {
    if (window.top !== window) return;
    const el = get(ref);
    document.getElementById("__sd-mark")?.remove();
    if (!el) return;
    const r = target(el).getBoundingClientRect();
    const box = document.createElement("div");
    box.id = "__sd-mark";
    box.setAttribute("aria-hidden", "true");
    box.style.cssText = `position:fixed;left:${r.left - 3}px;top:${r.top - 3}px;width:${r.width + 6}px;height:${r.height + 6}px;z-index:2147483647;pointer-events:none;border:2px solid #4c98fd;border-radius:6px;background:rgba(76,152,253,.12);transition:opacity .4s;`;
    document.documentElement.append(box);
    setTimeout(() => (box.style.opacity = "0"), 900);
    setTimeout(() => box.remove(), 1400);
  }

  window.__sd = { snapshot, info, prime, setValue, selectOption, click, key, checked, upload, filled, enterRisk, viewport, settled, overlay, mark };
})();
