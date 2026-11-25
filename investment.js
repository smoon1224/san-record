const STORAGE_KEY = "san-record-investment-v1";

const seedRows = [
  ["2019-06-14",2000,"","",0,""],["2019-06-14",-2000,"",2363700,1181.85,""],["2019-06-16",0,"",10000000,0,""],["2019-06-20",0,"",-10000000,0,10000000],["2019-08-02",8500,"지수친구","",0,""],["2019-08-02",-8500,"",10121035,1190.71,""],["2019-08-16",0,"",-10000000,0,10000000],["2019-09-08",30000,"성현미국여행","",0,""],["2019-09-08",200,"성현미국경비","",0,""],["2019-09-09",-10000,"",11858500,1185.85,""],["2019-09-10",0,"",-10000000,0,10000000],["2019-09-11",-5000,"",5935000,1187,""],["2019-09-11",-5000,"",5927750,1185.55,""],["2019-09-17",0,"",-10000000,0,10000000],["2019-09-19",-5000,"",5950000,1190,""],["2019-09-20",0,"",-10000000,0,10000000],["2019-09-26",-5000,"",5965000,1193,""],["2019-09-26",-200,"",238600,1193,""],
  ["2019-11-04",20400,"용호방문","",0,""],["2019-11-05",-10000,"",11566400,1156.64,""],["2019-11-07",0,"",-10000000,0,10000000],["2019-11-08",-5000,"",5750000,1150,""],["2019-11-08",0,"",-10000000,0,10000000],["2019-11-11",-5000,"",5750000,1150,""],["2019-11-11",0,"",-10000000,0,10000000],["2019-11-30",500,"미국여행경비현금","",0,""],["2019-11-30",100,"준호부조금","",0,""],["2019-11-30",32000,"미국가족여행","",0,""],["2019-12-05",-10000,"",11800000,1180,""],["2019-12-08",0,"",-10000000,0,10000000],["2019-12-09",-10000,"",11800000,1180,""],["2019-12-11",-10000,"",11820000,1182,""],
  ["2020-01-02",0,"",-10000000,0,10000000],["2020-01-06",0,"",-8000000,0,8000000],["2020-01-10",0,"",-2000000,0,2000000],["2020-02-01",8500,"지수친구","",0,""],["2020-02-10",-10000,"",11800000,1180,""],["2020-02-22",0,"",-10000000,0,10000000],["2022-11-04",10000,"한국방문해서 줌","",0,""],["2023-01-22",-10000,"",14174200,1417.42,""],["2023-01-22",0,"",-20000000,0,20000000]
];

function makeSeed() {
  return seedRows.map((row, index) => ({
    id: `investment-${index + 1}`,
    date: row[0],
    dollar: Number(row[1] || 0),
    note: row[2] || "",
    exchange: Number(row[3] || 0),
    rate: Number(row[4] || 0),
    invested: Number(row[5] || 0),
  }));
}

let records = [];
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  records = saved && Array.isArray(saved.records) ? saved.records : makeSeed();
} catch (error) {
  records = makeSeed();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ records }));
}

function money(value) {
  return `₩${new Intl.NumberFormat("ko-KR").format(value)}`;
}

function dollar(value) {
  const prefix = value < 0 ? "-$" : "$";
  return `${prefix}${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(Math.abs(value))}`;
}

function render() {
  const dollarBalance = records.reduce((sum, row) => sum + Number(row.dollar || 0), 0);
  const exchangeBalance = records.reduce((sum, row) => sum + Number(row.exchange || 0), 0);
  const investedBalance = records.reduce((sum, row) => sum + Number(row.invested || 0), 0);
  const search = document.querySelector("#investment-search")?.value?.trim().toLocaleLowerCase("ko-KR") || "";
  const month = document.querySelector("#investment-month")?.value || "";
  const visible = records
    .filter((row) => !month || row.date.startsWith(month))
    .filter((row) => !search || `${row.note} ${row.date}`.toLocaleLowerCase("ko-KR").includes(search))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalDollar = document.querySelector("#total-dollar");
  const totalExchanged = document.querySelector("#total-exchanged");
  const totalInvested = document.querySelector("#total-invested");
  if (totalDollar) totalDollar.textContent = dollar(dollarBalance);
  if (totalExchanged) totalExchanged.textContent = money(exchangeBalance);
  if (totalInvested) totalInvested.textContent = money(investedBalance);

  const count = document.querySelector("#investment-count");
  if (count) count.textContent = new Intl.NumberFormat("ko-KR").format(visible.length);

  const body = document.querySelector("#investment-body");
  if (!body) return;
  body.replaceChildren();
  const empty = document.querySelector("#investment-empty");
  if (empty) empty.classList.toggle("hidden", visible.length > 0);

  visible.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td></td><td></td><td></td><td class="align-right"></td><td class="align-right"></td><td class="align-right"></td><td><div class="row-actions"><button type="button">삭제</button></div></td>`;
    tr.children[0].textContent = row.date.replaceAll("-", ".");
    tr.children[1].textContent = row.dollar ? dollar(row.dollar) : "";
    tr.children[2].textContent = row.note || "";
    tr.children[3].textContent = row.exchange ? money(row.exchange) : "";
    tr.children[4].textContent = row.rate ? new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(row.rate) : "";
    tr.children[5].textContent = row.invested ? money(row.invested) : "";
    tr.querySelector("button").addEventListener("click", () => {
      if (!window.confirm("이 투자 기록을 삭제할까요?")) return;
      records = records.filter((item) => item.id !== row.id);
      save();
      render();
    });
    body.append(tr);
  });
}

save();
render();

const form = document.querySelector("#investment-form");
const type = document.querySelector("#investment-type");
const date = document.querySelector("#investment-date");
const dollarInput = document.querySelector("#investment-dollar");
const exchangeInput = document.querySelector("#investment-exchange");
const rateInput = document.querySelector("#investment-rate");
const investInput = document.querySelector("#investment-invest");
const noteInput = document.querySelector("#investment-note");

function updateFields() {
  const value = type?.value;
  document.querySelector("#dollar-field")?.classList.toggle("hidden", value !== "dollar");
  document.querySelector("#exchange-field")?.classList.toggle("hidden", value !== "exchange");
  document.querySelector("#rate-field")?.classList.toggle("hidden", value !== "exchange");
  document.querySelector("#invest-field")?.classList.toggle("hidden", value !== "invest");
  if (dollarInput) dollarInput.required = value === "dollar";
  if (exchangeInput) exchangeInput.required = value === "exchange";
  if (rateInput) rateInput.required = value === "exchange";
  if (investInput) investInput.required = value === "invest";
}

if (type) type.addEventListener("change", updateFields);
document.querySelector("#investment-search")?.addEventListener("input", render);
document.querySelector("#investment-month")?.addEventListener("input", render);

if (date) {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  date.value = local.toISOString().slice(0, 10);
}
updateFields();

if (form) form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const kind = type.value;
  records.push({
    id: crypto.randomUUID(),
    date: date.value,
    dollar: kind === "dollar" ? Number(dollarInput.value) : 0,
    note: noteInput.value.trim(),
    exchange: kind === "exchange" ? Number(exchangeInput.value) : 0,
    rate: kind === "exchange" ? Number(rateInput.value) : 0,
    invested: kind === "invest" ? Number(investInput.value) : 0,
  });
  save();
  form.reset();
  date.value = dateString;
  type.value = "dollar";
  updateFields();
  render();
});

function dateString() { return ""; }
