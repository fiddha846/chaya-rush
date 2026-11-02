/**
 * CHAYA RUSH — single source of truth for the menu.
 *
 * Every price shown in the UI, every valid order, and every earning
 * calculation MUST read from this file. Do not duplicate prices in UI code.
 *
 * Prices are fictional in-game rupees. Nothing here represents real money.
 */

export const CURRENCY_SYMBOL = "₹"; // Fictional in-game currency only.

/** Exact item IDs (case-sensitive, spaces preserved) and fictional prices. */
export const MENU_ITEMS = [
  { id: "chaya", price: 12 },
  { id: "kattan chaya", price: 10 },
  { id: "kaapi", price: 12 },
  { id: "boost", price: 15 },
  { id: "samoosa", price: 15 },
  { id: "pazhampori", price: 15 },
  { id: "chickenroll", price: 20 },
  { id: "paripuvada", price: 15 },
  { id: "ullivada", price: 12 },
  { id: "mutta baji", price: 15 },
  { id: "uzhnnvada", price: 12 },
  { id: "bonda", price: 12 },
  { id: "sugiyan", price: 12 },
];

/** Fast lookup by ID. */
export const MENU_BY_ID = Object.freeze(
  Object.fromEntries(MENU_ITEMS.map((item) => [item.id, item]))
);

export function getMenuItem(id) {
  return MENU_BY_ID[id] ?? null;
}

export function isValidItem(id) {
  return Object.prototype.hasOwnProperty.call(MENU_BY_ID, id);
}

/** Earnings for a served item. Always read the price from MENU_BY_ID. */
export function earningsFor(id) {
  const item = getMenuItem(id);
  return item ? item.price : 0;
}

/** Format any amount in the fictional in-game currency. */
export function formatRupees(amount) {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${CURRENCY_SYMBOL}${value}`;
}
