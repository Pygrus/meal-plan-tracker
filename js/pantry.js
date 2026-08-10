import { db } from "./firebase-init.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { state } from "./state.js";
import {
  $,
  escapeHtml,
  daysUntil,
  formatDateLong,
  openModal,
  closeModal,
  buildRecipeOptions,
  buildNameDatalist,
} from "./utils.js";

const LOCATIONS = ["Pantry", "Fridge", "Freezer"];

function logPantryEvent(action, item) {
  return addDoc(collection(db, "pantryLog"), {
    itemName: item.name,
    action, // "added" | "usedUp"
    quantity: item.quantity || "",
    at: serverTimestamp(),
    by: state.user.displayName || state.user.email,
  });
}

async function addPantryItem(fields) {
  const docRef = await addDoc(collection(db, "pantryItems"), {
    ...fields,
    addedBy: state.user.displayName || state.user.email,
    createdAt: serverTimestamp(),
  });
  logPantryEvent("added", fields);
  return docRef;
}

function updatePantryItem(id, fields) {
  return updateDoc(doc(db, "pantryItems", id), fields);
}

async function deletePantryItem(id) {
  const item = state.pantryItems.find((i) => i.id === id);
  if (!confirm(`Remove "${item ? item.name : "this item"}" — used up?`)) return;
  await deleteDoc(doc(db, "pantryItems", id));
  if (item) logPantryEvent("usedUp", item);
}

function useByBadge(useByDate) {
  const d = daysUntil(useByDate);
  if (d === null) return "";
  if (d < 0) return `<span class="badge badge-danger">Expired ${formatDateLong(useByDate)}</span>`;
  if (d <= 2) return `<span class="badge badge-danger">Use soon — ${formatDateLong(useByDate)}</span>`;
  if (d <= 5) return `<span class="badge badge-warning">Use by ${formatDateLong(useByDate)}</span>`;
  return `<span class="badge">Use by ${formatDateLong(useByDate)}</span>`;
}

function itemCardHtml(item) {
  const plannedRecipe = item.plannedForRecipeId ? state.recipesById[item.plannedForRecipeId] : null;
  const plannedLabel = plannedRecipe
    ? plannedRecipe.name
    : item.plannedForNote
      ? item.plannedForNote
      : "";
  return `
    <div class="card">
      <div class="card-header">
        <strong>${escapeHtml(item.name)}</strong>
        ${useByBadge(item.useByDate)}
      </div>
      <div class="card-body">
        <div>${escapeHtml(item.quantity || "")}</div>
        ${plannedLabel ? `<div class="tag">Planned for: ${escapeHtml(plannedLabel)}</div>` : ""}
        ${item.notes ? `<div class="notes">${escapeHtml(item.notes)}</div>` : ""}
      </div>
      <div class="card-actions">
        <button class="btn-link" onclick="window.editPantryItem('${item.id}')">Edit</button>
        <button class="btn-link btn-danger" onclick="window.deletePantryItem('${item.id}')">Used up</button>
      </div>
    </div>`;
}

export function renderPantry() {
  const container = $("#pantry-view");
  if (!container) return;
  container.innerHTML = LOCATIONS.map((loc) => {
    const items = state.pantryItems
      .filter((i) => i.location === loc)
      .sort((a, b) => a.name.localeCompare(b.name));
    return `
      <section class="location-group">
        <h2>${loc} <span class="count">(${items.length})</span></h2>
        <div class="card-grid">
          ${items.length ? items.map(itemCardHtml).join("") : `<p class="empty">Nothing here.</p>`}
        </div>
      </section>`;
  }).join("");
}

function pantryFormHtml(item) {
  const isEdit = !!item;
  return `
    <h2>${isEdit ? "Edit" : "Add"} Pantry Item</h2>
    <form id="pantry-form">
      <label>Name
        <input type="text" name="name" list="pantry-name-list" required value="${escapeHtml(item?.name || "")}">
        <datalist id="pantry-name-list">${buildNameDatalist(state.pantryItems)}</datalist>
      </label>
      <label>Location
        <select name="location">
          ${LOCATIONS.map((l) => `<option ${item?.location === l ? "selected" : ""}>${l}</option>`).join("")}
        </select>
      </label>
      <label>Quantity
        <input type="text" name="quantity" placeholder="e.g. 2 boxes" value="${escapeHtml(item?.quantity || "")}">
      </label>
      <label>Use-By Date <span class="hint">(freezer/perishable only)</span>
        <input type="date" name="useByDate" value="${item?.useByDate || ""}">
      </label>
      <label>Planned For (recipe)
        <select name="plannedForRecipeId">
          ${buildRecipeOptions(item?.plannedForRecipeId || "")}
        </select>
      </label>
      <label>Planned For (note, if not a saved recipe yet)
        <input type="text" name="plannedForNote" value="${escapeHtml(item?.plannedForNote || "")}">
      </label>
      <label>Notes
        <textarea name="notes">${escapeHtml(item?.notes || "")}</textarea>
      </label>
      <div class="form-actions">
        <button type="button" class="btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn-primary">${isEdit ? "Save" : "Add"}</button>
      </div>
    </form>`;
}

function readPantryForm(form) {
  const fd = new FormData(form);
  return {
    name: fd.get("name").trim(),
    location: fd.get("location"),
    quantity: fd.get("quantity").trim(),
    useByDate: fd.get("useByDate") || null,
    plannedForRecipeId: fd.get("plannedForRecipeId") || null,
    plannedForNote: fd.get("plannedForNote").trim(),
    notes: fd.get("notes").trim(),
  };
}

export function openAddPantryModal() {
  openModal(pantryFormHtml(null));
  $("#pantry-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await addPantryItem(readPantryForm(e.target));
    closeModal();
  });
}

function openEditPantryModal(item) {
  openModal(pantryFormHtml(item));
  $("#pantry-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await updatePantryItem(item.id, readPantryForm(e.target));
    closeModal();
  });
}

window.editPantryItem = (id) => {
  const item = state.pantryItems.find((i) => i.id === id);
  if (item) openEditPantryModal(item);
};
window.deletePantryItem = deletePantryItem;
