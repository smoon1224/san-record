window.investmentScriptStarted = true;
const STORAGE_KEY = "san-record-investment-v1";

async function initializeInvestmentLedger() {
  let records = [];
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.records)) records = saved.records;
  } catch (error) {
    records = [];
  }

  if (!records.length) {
    try {
      const response = await fetch("investment-seed.json", { cache: "no-store" });
      if (response.ok) records = await response.json();
    } catch (error) {
      console.warn("투자 기본 데이터를 읽지 못했습니다.", error);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ records }));
  }

  const dollarBalance = records.reduce((sum, row) => sum + Number(row.dollar || 0), 0);
  const exchangeBalance = records.reduce((sum, row) => sum + Number(row.exchange || 0), 0);
  const investedBalance = records.reduce((sum, row) => sum + Number(row.invested || 0), 0);

  document.querySelector("#total-dollar").textContent = `${dollarBalance < 0 ? "-" : ""}$${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(Math.abs(dollarBalance))}`;
  document.querySelector("#total-exchanged").textContent = `₩${new Intl.NumberFormat("ko-KR").format(exchangeBalance)}`;
  document.querySelector("#total-invested").textContent = `₩${new Intl.NumberFormat("ko-KR").format(investedBalance)}`;
  document.querySelector("#investment-count").textContent = new Intl.NumberFormat("ko-KR").format(records.length);

  const body = document.querySelector("#investment-body");
  body.replaceChildren();
  document.querySelector("#investment-empty").classList.toggle("hidden", records.length > 0);

  records.sort((left, right) => right.date.localeCompare(left.date)).forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td></td><td></td><td></td><td class="align-right"></td><td class="align-right"></td><td class="align-right"></td><td><div class="row-actions"><button type="button">삭제</button></div></td>`;
    tr.children[0].textContent = row.date.replaceAll("-", ".");
    tr.children[1].textContent = row.dollar ? `${row.dollar < 0 ? "-" : ""}$${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(Math.abs(row.dollar))}` : "";
    tr.children[2].textContent = row.note || "";
    tr.children[3].textContent = row.exchange ? `₩${new Intl.NumberFormat("ko-KR").format(row.exchange)}` : "";
    tr.children[4].textContent = row.rate ? new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(row.rate) : "";
    tr.children[5].textContent = row.invested ? `₩${new Intl.NumberFormat("ko-KR").format(row.invested)}` : "";
    tr.querySelector("button").addEventListener("click", () => {
      if (!window.confirm("이 투자 기록을 삭제할까요?")) return;
      records = records.filter((item) => item.id !== row.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ records }));
      initializeInvestmentLedger();
    });
    body.append(tr);
  });

  const typeSelect = document.querySelector("#investment-type");
  const updateFields = () => {
    const type = typeSelect.value;
    const dollarField = document.querySelector("#dollar-field");
    const exchangeField = document.querySelector("#exchange-field");
    const rateField = document.querySelector("#rate-field");
    const investField = document.querySelector("#invest-field");
    const dollarLabel = document.querySelector("#dollar-label");

    dollarField.classList.toggle("hidden", type !== "dollar");
    exchangeField.classList.toggle("hidden", type !== "exchange");
    rateField.classList.toggle("hidden", type !== "exchange");
    investField.classList.toggle("hidden", type !== "invest");

    if (dollarLabel) dollarLabel.innerHTML = type === "exchange" ? "환전할 달러 <b>*</b>" : "받은 달러 <b>*</b>";

    document.querySelector("#investment-dollar").required = type === "dollar";
    document.querySelector("#investment-exchange").required = type === "exchange";
    document.querySelector("#investment-rate").required = type === "exchange";
    document.querySelector("#investment-invest").required = type === "invest";
  };

  if (typeSelect && !typeSelect.dataset.initialized) {
    typeSelect.dataset.initialized = "true";
    typeSelect.addEventListener("change", updateFields);
  }
  updateFields();

  const form = document.querySelector("#investment-form");
  if (form && !form.dataset.initialized) {
    form.dataset.initialized = "true";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const type = document.querySelector("#investment-type").value;
      const date = document.querySelector("#investment-date").value;
      const exchangeDollar = type === "exchange" ? Number(document.querySelector("#investment-exchange").value) : 0;
      const exchangeRate = type === "exchange" ? Number(document.querySelector("#investment-rate").value) : 0;
      const exchangeWon = type === "exchange" ? Math.round(exchangeDollar * exchangeRate) : 0;
      const investWon = type === "invest" ? Number(document.querySelector("#investment-invest").value) : 0;

      if (type === "exchange" && exchangeDollar > dollarBalance) {
        window.alert("달러 잔액보다 많이 환전할 수 없습니다.");
        return;
      }
      if (type === "invest" && investWon > exchangeBalance) {
        window.alert("환전된 원화 잔액보다 많이 투자할 수 없습니다.");
        return;
      }

      records.push({
        id: crypto.randomUUID(),
        date,
        dollar: type === "dollar" ? Number(document.querySelector("#investment-dollar").value) : type === "exchange" ? -exchangeDollar : 0,
        note: document.querySelector("#investment-note").value.trim(),
        exchange: type === "exchange" ? exchangeWon : type === "invest" ? -investWon : 0,
        rate: exchangeRate,
        invested: investWon,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ records }));
      initializeInvestmentLedger();
    });
  }
}

initializeInvestmentLedger();
