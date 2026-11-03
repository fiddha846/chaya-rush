/**
 * ചായക്കട — menu, prices and order grammar.
 *
 * Single source of truth for every item, price and Malayalam label.
 * Prices are fictional in-game rupees.
 */

export const CURRENCY = "₹";

export const MENU_ITEMS = [
  {
    id: "chaya",
    label: "ചായ",
    price: 12,
    kind: "drink",
    one: "ഒരു ചായ",
    combo: "ചായയും",
    color: "#c0762e",
    drink: "tea",
  },
  {
    id: "kattan",
    label: "കട്ടൻ ചായ",
    price: 10,
    kind: "drink",
    one: "ഒരു കട്ടൻ ചായ",
    combo: "കട്ടൻ ചായയും",
    color: "#8f3f1c",
    drink: "kattan",
  },
  {
    id: "kaapi",
    label: "കാപ്പി",
    price: 12,
    kind: "drink",
    one: "ഒരു കാപ്പി",
    combo: "കാപ്പിയും",
    color: "#6b3b24",
    drink: "coffee",
  },
  {
    id: "boost",
    label: "ബൂസ്റ്റ്",
    price: 15,
    kind: "drink",
    one: "ഒരു ബൂസ്റ്റ്",
    combo: "ബൂസ്റ്റും",
    color: "#8a5531",
    drink: "boost",
  },
  {
    id: "samoosa",
    label: "സമോസ",
    price: 15,
    kind: "snack",
    one: "ഒരു സമോസ",
    combo: "സമോസയും",
    shape: "samosa",
    color: "#d79a48",
  },
  {
    id: "pazhampori",
    label: "പഴംപൊറി",
    price: 15,
    kind: "snack",
    one: "ഒരു പഴംപൊറി",
    combo: "പഴംപൊറിയും",
    shape: "pazhampori",
    color: "#d9a13f",
  },
  {
    id: "chickenroll",
    label: "ചിക്കൻ റോൾ",
    price: 20,
    kind: "snack",
    one: "ഒരു ചിക്കൻ റോൾ",
    combo: "ചിക്കൻ റോളും",
    shape: "roll",
    color: "#cf8f3d",
  },
  {
    id: "paripuvada",
    label: "പരിപ്പുവട",
    price: 15,
    kind: "snack",
    one: "ഒരു പരിപ്പുവട",
    combo: "പരിപ്പുവടയും",
    shape: "vada",
    color: "#c47b32",
  },
  {
    id: "ullivada",
    label: "ഉള്ളിവട",
    price: 12,
    kind: "snack",
    one: "ഒരു ഉള്ളിവട",
    combo: "ഉള്ളിവടയും",
    shape: "vada",
    color: "#b96f2c",
  },
  {
    id: "muttabaji",
    label: "മുട്ട ബജി",
    price: 15,
    kind: "snack",
    one: "ഒരു മുട്ട ബജി",
    combo: "മുട്ട ബജിയും",
    shape: "baji",
    color: "#e0a84c",
  },
  {
    id: "uzhunnvada",
    label: "ഉഴുന്നുവട",
    price: 12,
    kind: "snack",
    one: "ഒരു ഉഴുന്നുവട",
    combo: "ഉഴുന്നുവടയും",
    shape: "vada",
    color: "#cf8b3a",
  },
  {
    id: "bonda",
    label: "ബോണ്ട",
    price: 12,
    kind: "snack",
    one: "ഒരു ബോണ്ട",
    combo: "ബോണ്ടയും",
    shape: "bonda",
    color: "#a9692f",
  },
  {
    id: "sugiyan",
    label: "സുഗിയൻ",
    price: 12,
    kind: "snack",
    one: "ഒരു സുഗിയൻ",
    combo: "സുഗിയാനും",
    shape: "sugiyan",
    color: "#b47732",
  },
];

/** Kids' counter item. Cheap on purpose; price can be changed in one place. */
export const CHOCOLATE = {
  id: "chocolate",
  label: "ചോക്ലേറ്റ്",
  price: 5,
  kind: "sweet",
  one: "ഒരു ചോക്ലേറ്റ്",
  combo: "ചോക്ലേറ്റും",
  color: "#7a2f46",
};

const ALL_BY_ID = Object.freeze(
  Object.fromEntries([...MENU_ITEMS, CHOCOLATE].map((item) => [item.id, item]))
);

export function itemById(id) {
  return ALL_BY_ID[id] ?? null;
}

export function formatMoney(amount) {
  return `${CURRENCY}${amount}`;
}

export function orderTotal(lines) {
  return lines.reduce((sum, line) => sum + (ALL_BY_ID[line.id]?.price ?? 0) * (line.qty ?? 1), 0);
}

/** Menu rows for the 3D wall board and the in-game menu panel. */
export const MENU_ROWS = MENU_ITEMS.map((item) => ({
  label: item.label,
  price: item.price,
}));

/**
 * Build a natural Malayalam spoken order from item lines.
 * Uses pre-approved conjunction forms so the grammar stays correct.
 */
const QTY_WORDS = { 2: "രണ്ട്", 3: "മൂന്ന്", 4: "നാല്" };

function spokenEntry(line, item) {
  const qty = line.qty ?? 1;
  if (qty <= 1) return { one: item.one, combo: item.combo };
  const word = QTY_WORDS[qty] ?? String(qty);
  return { one: `${word} ${item.label}`, combo: `${word} ${item.combo}` };
}

export function spokenOrder(lines) {
  const entries = lines
    .map((line) => {
      const item = ALL_BY_ID[line.id];
      return item ? spokenEntry(line, item) : null;
    })
    .filter(Boolean);
  if (!entries.length) return "ചേട്ടാ, ഒരു ചായ";

  const roll = Math.random();
  const greeting = roll < 0.72 ? "ചേട്ടാ, " : roll < 0.86 ? "ചേട്ടാ... " : "";

  if (entries.length === 1) {
    const item = entries[0];
    const tails = ["", " തരൂ.", " വേണം.", " കിട്ടുമോ?"];
    const tail = tails[Math.floor(Math.random() * tails.length)];
    return `${greeting}${item.one}${tail}`;
  }

  const tails = [".", " തരൂ.", " വേണം.", " കിട്ടുമോ?"];
  const tail = tails[Math.floor(Math.random() * tails.length)];
  return `${greeting}${entries.map((entry) => entry.combo).join(" ")}${tail}`;
}

/** Price choices offered to kids at the counter. */
export const CHOCOLATE_PRICE_CHOICES = [5, 10, 20];
