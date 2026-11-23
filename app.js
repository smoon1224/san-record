const STORAGE_KEY = "san-record-ledger-v1";
const defaultState = {
  shops: ["지마켓", "쿠팡", "네이버쇼핑"].map((name) => ({ id: crypto.randomUUID(), name })),
  cards: ["신한하이", "현대카드", "국민카드"].map((name) => ({ id: crypto.randomUUID(), name })),
  purchases: [],
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.shops) && Array.isArray(saved.cards) && Array.isArray(saved.purchases)) return saved;
  } catch (error) {
    console.warn("저장된 구매 기록을 읽지 못했습니다.", error);
  }
  return structuredClone(defaultState);
}

let state = loadState();
let editingPurchaseId = null;
let managingType = "shops";
let editingListItemId = null;
let toastTimer;

const purchaseForm = document.querySelector("#purchase-form");
const shopSelect = document.querySelector("#purchase-shop");
const cardSelect = document.querySelector("#purchase-card");
const purchaseDate = document.querySelector("#purchase-date");
const purchaseAmount = document.querySelector("#purchase-amount");
const purchaseProduct = document.querySelector("#purchase-product");
const recordsBody = document.querySelector("#records-body");
const emptyState = document.querySelector("#empty-state");
const managerDialog = document.querySelector("#manager-dialog");
const managerForm = document.querySelector("#manager-form");
const managerName = document.querySelector("#manager-name");
const managerList = document.querySelector("#manager-list");

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dateString(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function formatCurrency(amount) {
  return `₩${new Intl.NumberFormat("ko-KR").format(amount)}`;
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  return `${year}.${month}.${day}`;
}

function persistAndRender() {
  saveState();
  renderOptions();
  renderRecords();
  renderSummary();
}

function renderOptions() {
  const currentShop = shopSelect.value;
  const currentCard = cardSelect.value;
  const fill = (select, items, previous) => {
    select.replaceChildren(new Option("선택해 주세요", ""));
    items.forEach((item) => select.add(new Option(item.name, item.id)));
    if (items.some((item) => item.id === previous)) select.value = previous;
    select.disabled = items.length === 0;
  };
  fill(shopSelect, state.shops, currentShop);
  fill(cardSelect, state.cards, currentCard);
  document.querySelector("#submit-button").disabled = !state.shops.length || !state.cards.length;
}

function getVisiblePurchases() {
  const query = document.querySelector("#search-input").value.trim().toLocaleLowerCase("ko-KR");
  const selectedMonth = document.querySelector("#month-filter").value;
  return [...state.purchases]
    .filter((purchase) => !selectedMonth || purchase.date.startsWith(selectedMonth))
    .filter((purchase) => {
      if (!query) return true;
      const shopName = state.shops.find((shop) => shop.id === purchase.shopId)?.name ?? "";
      return `${purchase.product} ${shopName}`.toLocaleLowerCase("ko-KR").includes(query);
    })
    .sort((left, right) => right.date.localeCompare(left.date) || right.createdAt - left.createdAt);
}

function renderRecords() {
  const purchases = getVisiblePurchases();
  document.querySelector("#visible-count").textContent = new Intl.NumberFormat("ko-KR").format(purchases.length);
  recordsBody.replaceChildren();
  emptyState.classList.toggle("hidden", purchases.length > 0);
  purchases.forEach((purchase) => {
    const shopName = state.shops.find((shop) => shop.id === purchase.shopId)?.name ?? "삭제된 쇼핑몰";
    const cardName = state.cards.find((card) => card.id === purchase.cardId)?.name ?? "삭제된 구매 수단";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(purchase.date)}</td>
      <td class="product-cell"></td>
      <td><span class="store-label"></span></td>
      <td class="card-label"></td>
      <td class="amount-cell">${formatCurrency(purchase.amount)}</td>
      <td><div class="row-actions"><button type="button" data-action="edit" aria-label="${escapeHtml(purchase.product)} 수정">수정</button><button type="button" data-action="delete" aria-label="${escapeHtml(purchase.product)} 삭제">삭제</button></div></td>`;
    row.querySelector(".product-cell").textContent = purchase.product;
    row.querySelector(".store-label").textContent = shopName;
    row.querySelector(".card-label").textContent = cardName;
    row.querySelector('[data-action="edit"]').addEventListener("click", () => beginPurchaseEdit(purchase));
    row.querySelector('[data-action="delete"]').addEventListener("click", () => deletePurchase(purchase.id));
    recordsBody.append(row);
  });
}

function renderSummary() {
  const currentMonth = dateString().slice(0, 7);
  const currentMonthPurchases = state.purchases.filter((purchase) => purchase.date.startsWith(currentMonth));
  const monthTotal = currentMonthPurchases.reduce((total, purchase) => total + purchase.amount, 0);
  const allTotal = state.purchases.reduce((total, purchase) => total + purchase.amount, 0);
  document.querySelector("#month-total").textContent = formatCurrency(monthTotal);
  document.querySelector("#month-count").innerHTML = `${currentMonthPurchases.length}<span class="value-unit">건</span>`;
  document.querySelector("#all-total").textContent = formatCurrency(allTotal);
  document.querySelector("#all-caption").textContent = `총 ${state.purchases.length}건의 기록`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function resetPurchaseForm() {
  editingPurchaseId = null;
  purchaseForm.reset();
  purchaseDate.value = dateString();
  document.querySelector("#entry-title").textContent = "새 구매 기록";
  document.querySelector("#submit-button").innerHTML = '<span aria-hidden="true">＋</span> 기록 추가';
  document.querySelector("#cancel-edit").classList.add("hidden");
}

function beginPurchaseEdit(purchase) {
  editingPurchaseId = purchase.id;
  purchaseDate.value = purchase.date;
  shopSelect.value = purchase.shopId;
  cardSelect.value = purchase.cardId;
  purchaseAmount.value = purchase.amount;
  purchaseProduct.value = purchase.product;
  document.querySelector("#entry-title").textContent = "구매 기록 수정";
  document.querySelector("#submit-button").innerHTML = "변경 사항 저장";
  document.querySelector("#cancel-edit").classList.remove("hidden");
  document.querySelector(".entry-section").scrollIntoView({ behavior: "smooth", block: "start" });
  purchaseProduct.focus({ preventScroll: true });
}

function deletePurchase(id) {
  const purchase = state.purchases.find((item) => item.id === id);
  if (!purchase || !window.confirm(`'${purchase.product}' 기록을 삭제할까요?`)) return;
  state.purchases = state.purchases.filter((item) => item.id !== id);
  if (editingPurchaseId === id) resetPurchaseForm();
  persistAndRender();
  showToast("구매 기록을 삭제했습니다.");
}

function openManager(type) {
  managingType = type;
  editingListItemId = null;
  renderManager();
  if (!managerDialog.open) managerDialog.showModal();
}

function renderManager() {
  const isShop = managingType === "shops";
  const items = state[managingType];
  document.querySelector("#manager-title").textContent = isShop ? "쇼핑몰 관리" : "구매 수단 관리";
  document.querySelector("#shop-tab").classList.toggle("active", isShop);
  document.querySelector("#card-tab").classList.toggle("active", !isShop);
  document.querySelector("#shop-tab").setAttribute("aria-selected", String(isShop));
  document.querySelector("#card-tab").setAttribute("aria-selected", String(!isShop));
  managerName.value = editingListItemId ? items.find((item) => item.id === editingListItemId)?.name ?? "" : "";
  managerName.placeholder = isShop ? "쇼핑몰 이름 입력" : "카드 또는 결제 수단 입력";
  document.querySelector("#manager-submit").textContent = editingListItemId ? "저장" : "추가";
  document.querySelector("#manager-hint").textContent = isShop ? "구매 기록에서 선택할 쇼핑몰을 관리합니다." : "구매 기록에서 선택할 카드와 결제 수단을 관리합니다.";
  managerList.replaceChildren();
  items.forEach((item) => {
    const usageCount = state.purchases.filter((purchase) => purchase[isShop ? "shopId" : "cardId"] === item.id).length;
    const listItem = document.createElement("li");
    listItem.className = "manager-item";
    listItem.innerHTML = `<span class="manager-item-name"></span><div class="manager-item-actions"><button type="button" data-action="edit">수정</button><button type="button" data-action="delete">삭제</button></div>`;
    listItem.querySelector(".manager-item-name").textContent = item.name;
    if (usageCount) {
      const usage = document.createElement("small");
      usage.textContent = `${usageCount}건 사용 중`;
      listItem.querySelector(".manager-item-name").append(usage);
    }
    listItem.querySelector('[data-action="edit"]').addEventListener("click", () => {
      editingListItemId = item.id;
      renderManager();
      managerName.focus();
    });
    listItem.querySelector('[data-action="delete"]').addEventListener("click", () => deleteManagedItem(item, isShop));
    managerList.append(listItem);
  });
}

function deleteManagedItem(item, isShop) {
  const property = isShop ? "shopId" : "cardId";
  if (state.purchases.some((purchase) => purchase[property] === item.id)) {
    showToast("구매 기록에서 사용 중인 항목은 삭제할 수 없습니다.");
    return;
  }
  state[managingType] = state[managingType].filter((candidate) => candidate.id !== item.id);
  if (editingListItemId === item.id) editingListItemId = null;
  persistAndRender();
  renderManager();
  showToast("목록에서 삭제했습니다.");
}

function exportCsv() {
  const purchases = getVisiblePurchases();
  if (!purchases.length) {
    showToast("내보낼 구매 기록이 없습니다.");
    return;
  }
  const rows = [["구매 날짜", "구매한 물품", "쇼핑몰", "구매 수단", "금액"]];
  purchases.forEach((purchase) => rows.push([
    purchase.date,
    purchase.product,
    state.shops.find((shop) => shop.id === purchase.shopId)?.name ?? "삭제된 쇼핑몰",
    state.cards.find((card) => card.id === purchase.cardId)?.name ?? "삭제된 구매 수단",
    String(purchase.amount),
  ]));
  const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `san-record-${dateString()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

purchaseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!purchaseForm.reportValidity()) return;
  const wasEditing = Boolean(editingPurchaseId);
  const purchase = {
    id: editingPurchaseId ?? crypto.randomUUID(),
    date: purchaseDate.value,
    shopId: shopSelect.value,
    cardId: cardSelect.value,
    amount: Number(purchaseAmount.value),
    product: purchaseProduct.value.trim(),
    createdAt: editingPurchaseId ? state.purchases.find((item) => item.id === editingPurchaseId)?.createdAt ?? Date.now() : Date.now(),
  };
  if (!purchase.product || !Number.isSafeInteger(purchase.amount) || purchase.amount < 1) {
    showToast("물품명과 올바른 금액을 입력해 주세요.");
    return;
  }
  if (editingPurchaseId) state.purchases = state.purchases.map((item) => item.id === editingPurchaseId ? purchase : item);
  else state.purchases.push(purchase);
  persistAndRender();
  resetPurchaseForm();
  showToast(wasEditing ? "구매 기록을 수정했습니다." : "구매 기록을 추가했습니다.");
});

managerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = managerName.value.trim();
  if (!name) return;
  const items = state[managingType];
  if (items.some((item) => item.name.toLocaleLowerCase("ko-KR") === name.toLocaleLowerCase("ko-KR") && item.id !== editingListItemId)) {
    showToast("이미 등록된 이름입니다.");
    return;
  }
  if (editingListItemId) state[managingType] = items.map((item) => item.id === editingListItemId ? { ...item, name } : item);
  else items.push({ id: crypto.randomUUID(), name });
  editingListItemId = null;
  persistAndRender();
  renderManager();
  showToast("목록을 저장했습니다.");
});

document.querySelector("#manage-shops-side").addEventListener("click", () => openManager("shops"));
document.querySelector("#manage-shops-inline").addEventListener("click", () => openManager("shops"));
document.querySelector("#manage-cards-side").addEventListener("click", () => openManager("cards"));
document.querySelector("#manage-cards-inline").addEventListener("click", () => openManager("cards"));
document.querySelector("#shop-tab").addEventListener("click", () => { managingType = "shops"; editingListItemId = null; renderManager(); });
document.querySelector("#card-tab").addEventListener("click", () => { managingType = "cards"; editingListItemId = null; renderManager(); });
document.querySelector("#close-manager").addEventListener("click", () => managerDialog.close());
document.querySelector("#cancel-edit").addEventListener("click", resetPurchaseForm);
document.querySelector("#search-input").addEventListener("input", renderRecords);
document.querySelector("#month-filter").addEventListener("input", renderRecords);
document.querySelector("#export-button").addEventListener("click", exportCsv);
managerDialog.addEventListener("click", (event) => {
  if (event.target === managerDialog) managerDialog.close();
});

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date());
document.querySelector("#month-filter").value = dateString().slice(0, 7);
purchaseDate.value = dateString();
persistAndRender();