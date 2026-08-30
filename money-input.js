/**
 * Thousands separators inside text fields.
 *
 * A number input cannot show grouped digits — browsers render its value raw —
 * so money fields are plain text fields marked with data-money, and this
 * regroups them as they are typed while keeping the caret where the typist
 * left it.
 */
(function (global) {
  "use strict";

  // Everything that is not a digit or a decimal point is separator noise.
  function toRaw(text) {
    const cleaned = String(text == null ? "" : text).replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    return parts.length > 1 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
  }

  function group(raw) {
    if (raw === "") return "";
    const [whole, fraction] = raw.split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return fraction === undefined ? grouped : grouped + "." + fraction;
  }

  // The numeric value behind a field, for arithmetic and storage.
  function read(input) {
    const raw = toRaw(input && input.value);
    const n = Number(raw);
    return raw === "" || raw === "." || Number.isNaN(n) ? 0 : n;
  }

  // A stored number as it should appear in a field (blank when zero).
  function display(value) {
    const n = Number(value);
    return !n || Number.isNaN(n) ? "" : group(String(n));
  }

  function write(input, value) {
    if (input) input.value = display(value);
  }

  function reformat(input) {
    const before = input.value;
    const caret = input.selectionStart;
    const formatted = group(toRaw(before));
    if (formatted === before) return;

    // Commas shift positions, so the caret is restored by counting the
    // significant characters ahead of it rather than the raw offset.
    const significantBefore =
      caret === null ? null : before.slice(0, caret).replace(/[^\d.]/g, "").length;

    input.value = formatted;

    if (significantBefore === null) return;
    let seen = 0;
    let pos = 0;
    while (pos < formatted.length && seen < significantBefore) {
      if (/[\d.]/.test(formatted[pos])) seen += 1;
      pos += 1;
    }
    try {
      input.setSelectionRange(pos, pos);
    } catch (e) {
      // Not focused, or the field does not support selection; the value stands.
    }
  }

  // Delegated so fields rebuilt by a re-render keep working.
  function attach(root) {
    (root || document).addEventListener("input", (event) => {
      const target = event.target;
      if (target && target.matches && target.matches("[data-money]")) reformat(target);
    });
  }

  global.Money = { read, write, display, reformat, attach };
})(window);
