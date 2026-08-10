import { state } from "./state.js";

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// Positive = days from now, negative = days ago, null if no date given.
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const ms = new Date(dateStr + "T00:00:00") - new Date(todayISO() + "T00:00:00");
  return Math.round(ms / 86400000);
}

export function formatDateLong(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function openModal(innerHtml) {
  $("#modal-body").innerHTML = innerHtml;
  $("#modal-overlay").classList.remove("hidden");
}

export function closeModal() {
  $("#modal-overlay").classList.add("hidden");
  $("#modal-body").innerHTML = "";
}
window.closeModal = closeModal;

// <option> list of recipes for select dropdowns, sorted by name.
export function buildRecipeOptions(selectedId, includeBlank = true) {
  const sorted = [...state.recipes].sort((a, b) => a.name.localeCompare(b.name));
  const blank = includeBlank ? `<option value="">-- none --</option>` : "";
  return (
    blank +
    sorted
      .map(
        (r) =>
          `<option value="${r.id}" ${r.id === selectedId ? "selected" : ""}>${escapeHtml(r.name)}</option>`
      )
      .join("")
  );
}

// <option> list of distinct previously-used item names, for quick-add datalists.
export function buildNameDatalist(items) {
  const names = [...new Set(items.map((i) => i.name).filter(Boolean))].sort();
  return names.map((n) => `<option value="${escapeHtml(n)}"></option>`).join("");
}
