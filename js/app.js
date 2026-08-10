import { db, isConfigured } from "./firebase-init.js";
import { signIn, signOutUser, watchAuth, isAllowed } from "./auth.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { state } from "./state.js";
import { $, $all } from "./utils.js";
import { renderPantry, openAddPantryModal } from "./pantry.js";
import { renderRecipes, openAddRecipeModal } from "./recipes.js";
import { renderMealPlan, openAddMealModal } from "./mealplan.js";

let unsubscribers = [];

function showScreen(name) {
  for (const el of $all(".screen")) el.classList.add("hidden");
  $(`#${name}`).classList.remove("hidden");
}

function renderAll() {
  renderPantry();
  renderRecipes();
  renderMealPlan();
}

function startListening() {
  const recipesQ = query(collection(db, "recipes"), orderBy("name"));
  unsubscribers.push(
    onSnapshot(recipesQ, (snap) => {
      state.recipes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      state.recipesById = Object.fromEntries(state.recipes.map((r) => [r.id, r]));
      renderAll();
    })
  );

  const pantryQ = query(collection(db, "pantryItems"), orderBy("name"));
  unsubscribers.push(
    onSnapshot(pantryQ, (snap) => {
      state.pantryItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderAll();
    })
  );

  const mealPlanQ = query(collection(db, "mealPlan"), orderBy("date"));
  unsubscribers.push(
    onSnapshot(mealPlanQ, (snap) => {
      state.mealPlan = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderAll();
    })
  );
}

function stopListening() {
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
}

function switchTab(tabName) {
  for (const btn of $all(".tab-btn")) btn.classList.toggle("active", btn.dataset.tab === tabName);
  for (const view of $all(".tab-view")) view.classList.toggle("active", view.id === `${tabName}-view`);
  for (const fab of $all(".fab")) fab.classList.toggle("hidden", fab.dataset.tabOnly !== tabName);
}

function initApp() {
  if (!isConfigured) {
    showScreen("not-configured-screen");
    return;
  }

  $("#sign-in-btn").addEventListener("click", () => signIn().catch((err) => alert(err.message)));
  $("#sign-out-btn").addEventListener("click", () => signOutUser());
  $("#unauthorized-sign-out-btn").addEventListener("click", () => signOutUser());

  for (const btn of $all(".tab-btn")) {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  }
  $("#add-pantry-btn").addEventListener("click", openAddPantryModal);
  $("#add-recipe-btn").addEventListener("click", openAddRecipeModal);
  $("#add-meal-btn").addEventListener("click", openAddMealModal);

  $("#modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") window.closeModal();
  });

  watchAuth((user) => {
    stopListening();
    state.user = user;

    if (!user) {
      showScreen("login-screen");
      return;
    }
    if (!isAllowed(user)) {
      showScreen("unauthorized-screen");
      return;
    }

    $("#user-name").textContent = user.displayName || user.email;
    showScreen("app-screen");
    switchTab("pantry");
    startListening();
  });
}

document.addEventListener("DOMContentLoaded", initApp);
