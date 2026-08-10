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
import { $, escapeHtml, formatDateLong, todayISO, openModal, closeModal, buildRecipeOptions } from "./utils.js";

const MEAL_TYPES = ["Dinner", "Breakfast", "Lunch"];
const STATUSES = ["planned", "on-their-own", "skipped"];

function addMealPlanEntry(fields) {
  return addDoc(collection(db, "mealPlan"), {
    ...fields,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function updateMealPlanEntry(id, fields) {
  return updateDoc(doc(db, "mealPlan", id), { ...fields, updatedAt: serverTimestamp() });
}

async function deleteMealPlanEntry(id) {
  if (!confirm("Delete this meal plan entry?")) return;
  await deleteDoc(doc(db, "mealPlan", id));
}

function earmarkedPantryHtml(recipeId) {
  if (!recipeId) return "";
  const items = state.pantryItems.filter((p) => p.plannedForRecipeId === recipeId);
  if (!items.length) return "";
  return `<div class="notes">Earmarked: ${items.map((i) => escapeHtml(i.name)).join(", ")}</div>`;
}

function entryCardHtml(entry) {
  const recipe = entry.recipeId ? state.recipesById[entry.recipeId] : null;
  const title =
    entry.status === "on-their-own"
      ? "Dad & Amaya on their own"
      : recipe
        ? recipe.name
        : "(no recipe set)";
  return `
    <div class="card">
      <div class="card-header">
        <strong>${escapeHtml(title)}</strong>
        <span class="badge">${escapeHtml(entry.mealType || "Dinner")}</span>
      </div>
      <div class="card-body">
        ${entry.notes ? `<div class="notes">${escapeHtml(entry.notes)}</div>` : ""}
        ${earmarkedPantryHtml(entry.recipeId)}
      </div>
      <div class="card-actions">
        <button class="btn-link" onclick="window.editMealPlanEntry('${entry.id}')">Edit</button>
        <button class="btn-link btn-danger" onclick="window.deleteMealPlanEntry('${entry.id}')">Delete</button>
      </div>
    </div>`;
}

export function renderMealPlan() {
  const container = $("#mealplan-view");
  if (!container) return;

  const byDate = {};
  for (const entry of state.mealPlan) {
    (byDate[entry.date] ||= []).push(entry);
  }
  const dates = Object.keys(byDate).sort();

  container.innerHTML = dates.length
    ? dates
        .map(
          (date) => `
      <section class="date-group">
        <h2>${formatDateLong(date)}</h2>
        <div class="card-grid">${byDate[date].map(entryCardHtml).join("")}</div>
      </section>`
        )
        .join("")
    : `<p class="empty">No meals planned yet.</p>`;
}

function mealFormHtml(entry) {
  const isEdit = !!entry;
  return `
    <h2>${isEdit ? "Edit" : "Add"} Meal Plan Entry</h2>
    <form id="mealplan-form">
      <label>Date
        <input type="date" name="date" required value="${entry?.date || todayISO()}">
      </label>
      <label>Meal Type
        <select name="mealType">
          ${MEAL_TYPES.map((t) => `<option ${entry?.mealType === t ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </label>
      <label>Recipe
        <select name="recipeId">
          ${buildRecipeOptions(entry?.recipeId || "")}
        </select>
      </label>
      <label>Status
        <select name="status">
          ${STATUSES.map((s) => `<option ${entry?.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </label>
      <label>Notes
        <textarea name="notes">${escapeHtml(entry?.notes || "")}</textarea>
      </label>
      <div class="form-actions">
        <button type="button" class="btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn-primary">${isEdit ? "Save" : "Add"}</button>
      </div>
    </form>`;
}

function readMealForm(form) {
  const fd = new FormData(form);
  return {
    date: fd.get("date"),
    mealType: fd.get("mealType"),
    recipeId: fd.get("recipeId") || null,
    status: fd.get("status"),
    notes: fd.get("notes").trim(),
  };
}

export function openAddMealModal() {
  openModal(mealFormHtml(null));
  $("#mealplan-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await addMealPlanEntry(readMealForm(e.target));
    closeModal();
  });
}

function openEditMealModal(entry) {
  openModal(mealFormHtml(entry));
  $("#mealplan-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await updateMealPlanEntry(entry.id, readMealForm(e.target));
    closeModal();
  });
}

window.editMealPlanEntry = (id) => {
  const entry = state.mealPlan.find((e) => e.id === id);
  if (entry) openEditMealModal(entry);
};
window.deleteMealPlanEntry = deleteMealPlanEntry;
