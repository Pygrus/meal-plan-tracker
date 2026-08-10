import { db } from "./firebase-init.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { state } from "./state.js";
import { $, $all, escapeHtml, openModal, closeModal } from "./utils.js";

const STATUSES = ["In rotation", "Idea to try", "Made before"];

let filterStatus = "All";
let filterText = "";
const expandedComments = new Set();
const commentsCache = {};
const commentUnsubs = {};

function addRecipe(fields) {
  return addDoc(collection(db, "recipes"), {
    ...fields,
    votesToRemove: [],
    createdBy: state.user.displayName || state.user.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function updateRecipe(id, fields) {
  return updateDoc(doc(db, "recipes", id), { ...fields, updatedAt: serverTimestamp() });
}

async function deleteRecipe(id) {
  const recipe = state.recipes.find((r) => r.id === id);
  if (!confirm(`Delete "${recipe ? recipe.name : "this recipe"}"? This can't be undone.`)) return;
  await deleteDoc(doc(db, "recipes", id));
}

async function toggleVoteToRemove(id) {
  const recipe = state.recipes.find((r) => r.id === id);
  if (!recipe) return;
  const uid = state.user.uid;
  const has = (recipe.votesToRemove || []).includes(uid);
  await updateDoc(doc(db, "recipes", id), {
    votesToRemove: has ? arrayRemove(uid) : arrayUnion(uid),
  });
}

function toggleComments(recipeId) {
  if (expandedComments.has(recipeId)) {
    expandedComments.delete(recipeId);
  } else {
    expandedComments.add(recipeId);
    if (!commentUnsubs[recipeId]) {
      const col = collection(db, "recipes", recipeId, "comments");
      commentUnsubs[recipeId] = onSnapshot(query(col, orderBy("createdAt")), (snap) => {
        commentsCache[recipeId] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderRecipeCards();
      });
    }
  }
  renderRecipeCards();
}

function submitComment(event, recipeId) {
  event.preventDefault();
  const input = event.target.elements.text;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  addDoc(collection(db, "recipes", recipeId, "comments"), {
    text,
    authorUid: state.user.uid,
    authorName: state.user.displayName || state.user.email,
    createdAt: serverTimestamp(),
  });
}

function ingredientRowHtml(ing = {}) {
  return `
    <div class="ingredient-row">
      <input type="text" placeholder="Ingredient" class="ing-name" value="${escapeHtml(ing.name || "")}">
      <input type="text" placeholder="Qty" class="ing-qty" value="${escapeHtml(ing.quantity ?? "")}">
      <input type="text" placeholder="Unit" class="ing-unit" value="${escapeHtml(ing.unit || "")}">
      <input type="text" placeholder="Est. cost/unit" class="ing-cost" value="${escapeHtml(ing.estCostPerUnit ?? "")}">
      <button type="button" class="btn-link btn-danger" onclick="this.closest('.ingredient-row').remove()">Remove</button>
    </div>`;
}

function readIngredientRows(form) {
  return $all(".ingredient-row", form)
    .map((row) => ({
      name: row.querySelector(".ing-name").value.trim(),
      quantity: row.querySelector(".ing-qty").value.trim(),
      unit: row.querySelector(".ing-unit").value.trim(),
      estCostPerUnit: row.querySelector(".ing-cost").value.trim(),
    }))
    .filter((i) => i.name);
}

function recipeFormHtml(recipe) {
  const isEdit = !!recipe;
  const ingredients = recipe?.ingredients?.length ? recipe.ingredients : [{}];
  return `
    <h2>${isEdit ? "Edit" : "Add"} Recipe</h2>
    <form id="recipe-form">
      <label>Name
        <input type="text" name="name" required value="${escapeHtml(recipe?.name || "")}">
      </label>
      <label>Category
        <input type="text" name="category" placeholder="Weeknight, Saturday, Slow cooker..." value="${escapeHtml(recipe?.category || "")}">
      </label>
      <label>Status
        <select name="status">
          ${STATUSES.map((s) => `<option ${recipe?.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </label>
      <label>Suggested By
        <input type="text" name="suggestedBy" value="${escapeHtml(recipe?.suggestedBy || state.user.displayName || "")}">
      </label>
      <label>Notes
        <textarea name="notes">${escapeHtml(recipe?.notes || "")}</textarea>
      </label>
      <label>Ingredients</label>
      <div id="ingredient-rows">${ingredients.map(ingredientRowHtml).join("")}</div>
      <button type="button" class="btn-secondary" onclick="document.getElementById('ingredient-rows').insertAdjacentHTML('beforeend', window.__ingredientRowHtml())">+ Add ingredient</button>
      <div class="form-actions">
        <button type="button" class="btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn-primary">${isEdit ? "Save" : "Add"}</button>
      </div>
    </form>`;
}
window.__ingredientRowHtml = ingredientRowHtml;

function readRecipeForm(form) {
  const fd = new FormData(form);
  return {
    name: fd.get("name").trim(),
    category: fd.get("category").trim(),
    status: fd.get("status"),
    suggestedBy: fd.get("suggestedBy").trim(),
    notes: fd.get("notes").trim(),
    ingredients: readIngredientRows(form),
  };
}

export function openAddRecipeModal() {
  openModal(recipeFormHtml(null));
  $("#recipe-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await addRecipe(readRecipeForm(e.target));
    closeModal();
  });
}

function openEditRecipeModal(recipe) {
  openModal(recipeFormHtml(recipe));
  $("#recipe-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await updateRecipe(recipe.id, readRecipeForm(e.target));
    closeModal();
  });
}

function commentsSectionHtml(recipe) {
  if (!expandedComments.has(recipe.id)) {
    return `<button class="btn-link" onclick="window.toggleComments('${recipe.id}')">Comments</button>`;
  }
  const comments = commentsCache[recipe.id] || [];
  return `
    <div class="comments">
      <button class="btn-link" onclick="window.toggleComments('${recipe.id}')">Hide comments</button>
      ${comments
        .map(
          (c) => `<div class="comment"><strong>${escapeHtml(c.authorName)}:</strong> ${escapeHtml(c.text)}</div>`
        )
        .join("")}
      <form onsubmit="window.submitComment(event, '${recipe.id}')" class="comment-form">
        <input type="text" name="text" placeholder="Add a comment...">
        <button type="submit" class="btn-secondary">Send</button>
      </form>
    </div>`;
}

function recipeCardHtml(recipe) {
  const voted = (recipe.votesToRemove || []).includes(state.user.uid);
  const voteCount = (recipe.votesToRemove || []).length;
  return `
    <div class="card">
      <div class="card-header">
        <strong>${escapeHtml(recipe.name)}</strong>
        <span class="badge">${escapeHtml(recipe.status || "")}</span>
      </div>
      <div class="card-body">
        ${recipe.category ? `<div class="tag">${escapeHtml(recipe.category)}</div>` : ""}
        ${recipe.suggestedBy ? `<div class="notes">Suggested by ${escapeHtml(recipe.suggestedBy)}</div>` : ""}
        ${recipe.notes ? `<div class="notes">${escapeHtml(recipe.notes)}</div>` : ""}
        ${
          recipe.ingredients?.length
            ? `<details><summary>${recipe.ingredients.length} ingredient(s)</summary>
                <ul>${recipe.ingredients
                  .map((i) => `<li>${escapeHtml(i.quantity)} ${escapeHtml(i.unit)} ${escapeHtml(i.name)}</li>`)
                  .join("")}</ul>
              </details>`
            : ""
        }
        ${commentsSectionHtml(recipe)}
      </div>
      <div class="card-actions">
        <button class="btn-link" onclick="window.editRecipe('${recipe.id}')">Edit</button>
        <button class="btn-link btn-danger" onclick="window.deleteRecipe('${recipe.id}')">Delete</button>
        <button class="btn-link ${voted ? "btn-warning" : ""}" onclick="window.toggleVoteToRemove('${recipe.id}')">
          ${voted ? "Un-vote" : "Vote to remove"} ${voteCount ? `(${voteCount})` : ""}
        </button>
      </div>
    </div>`;
}

function renderRecipeCards() {
  const grid = $("#recipe-card-grid");
  if (!grid) return;
  const filtered = state.recipes
    .filter((r) => filterStatus === "All" || r.status === filterStatus)
    .filter((r) => !filterText || r.name.toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  grid.innerHTML = filtered.length
    ? filtered.map(recipeCardHtml).join("")
    : `<p class="empty">No recipes match.</p>`;
}

export function renderRecipes() {
  const container = $("#recipes-view");
  if (!container) return;

  // Filter bar + grid wrapper are only rebuilt here; renderRecipeCards() alone updates the
  // grid on every keystroke so the search input never loses focus mid-type.
  container.innerHTML = `
    <div class="filter-bar">
      <select id="recipe-status-filter">
        ${["All", ...STATUSES].map((s) => `<option ${filterStatus === s ? "selected" : ""}>${s}</option>`).join("")}
      </select>
      <input type="text" id="recipe-text-filter" placeholder="Search recipes..." value="${escapeHtml(filterText)}">
    </div>
    <div class="card-grid" id="recipe-card-grid"></div>`;

  $("#recipe-status-filter").addEventListener("change", (e) => {
    filterStatus = e.target.value;
    renderRecipeCards();
  });
  $("#recipe-text-filter").addEventListener("input", (e) => {
    filterText = e.target.value;
    renderRecipeCards();
  });

  renderRecipeCards();
}

window.editRecipe = (id) => {
  const recipe = state.recipes.find((r) => r.id === id);
  if (recipe) openEditRecipeModal(recipe);
};
window.deleteRecipe = deleteRecipe;
window.toggleVoteToRemove = toggleVoteToRemove;
window.toggleComments = toggleComments;
window.submitComment = submitComment;
