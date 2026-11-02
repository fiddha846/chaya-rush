/**
 * CHAYA RUSH — Malayalam display text.
 *
 * STATUS: APPROVED by the owner (2026-11-03).
 * Labels are kept separate from the item IDs in menu.js so wording can be
 * edited without touching game logic.
 */

/** Display label per menu item ID. Keys MUST match menu.js IDs exactly. */
export const MENU_LABELS_ML = {
  chaya: "ചായ",
  "kattan chaya": "കട്ടൻ ചായ",
  kaapi: "കാപ്പി",
  boost: "ബൂസ്റ്റ്",
  samoosa: "സമോസ",
  pazhampori: "പഴംപൊരി",
  chickenroll: "ചിക്കൻ റോൾ",
  paripuvada: "പരിപ്പുവട",
  ullivada: "ഉള്ളിവട",
  "mutta baji": "മുട്ട ബജി",
  uzhnnvada: "ഉഴുന്നുവട",
  bonda: "ബോണ്ട",
  sugiyan: "സുഗിയാൻ",
};

/** Shop name and general UI words. */
export const UI_LABELS_ML = {
  shopName: "ചായക്കട",
  menuBoardTitle: "ചായയും പലഹാരങ്ങളും",
};

/**
 * Compliments shown after a correct serve, keyed by the item that was served.
 * The game picks from the matching list; if an item is missing it falls back
 * to THANK_YOU_GENERIC_ML.
 */
export const THANK_YOU_BY_ITEM_ML = {
  chaya: ["ചായ സൂപ്പർ!", "നല്ല ചൂടുള്ള ചായ!"],
  "kattan chaya": ["കട്ടൻ ചായ നല്ല കട്ടി!", "കട്ടൻ ചായ കിടിലൻ!"],
  kaapi: ["കാപ്പിയുടെ മണം ഗംഭീരം!", "കാപ്പി കിടിലൻ!"],
  boost: ["ബൂസ്റ്റ് സൂപ്പർ!", "ബൂസ്റ്റ് കുടിച്ചിട്ട് ഉഷാറായി!"],
  samoosa: ["സമോസ കിടിലൻ!", "സമോസയുടെ ഉള്ള് നിറച്ചിട്ടുണ്ട്!"],
  pazhampori: ["പഴംപൊരി സൂപ്പർ!", "പഴംപൊരി കണ്ടാൽ ചായ മറക്കും!"],
  chickenroll: ["ചിക്കൻ റോൾ കിടിലൻ!", "ചിക്കൻ റോളിൽ ചിക്കൻ കുറവല്ല!"],
  paripuvada: ["പരിപ്പുവട നന്നായിട്ടുണ്ട്!", "പരിപ്പുവടയുടെ രുചി കൊള്ളാം!"],
  ullivada: ["ഉള്ളിവട സൂപ്പർ!", "ഉള്ളിവട നന്നായി വറുത്തിട്ടുണ്ട്!"],
  "mutta baji": ["മുട്ട ബജി കിടിലൻ!", "മുട്ട ബജി നന്നായിട്ടുണ്ട്!"],
  uzhnnvada: ["ഉഴുന്നുവട ഗംഭീരം!", "ഉഴുന്നുവട നല്ല രുചി!"],
  bonda: ["ബോണ്ട സൂപ്പർ!", "ബോണ്ട നന്നായിട്ടുണ്ട്!"],
  sugiyan: ["സുഗിയാൻ നല്ല മധുരം!", "സുഗിയാൻ കിടിലൻ!"],
};

/** Fallback compliments when an item has no specific lines. */
export const THANK_YOU_GENERIC_ML = [
  "പലഹാരം കിടിലൻ!",
  "ഇനി ഒരു പലഹാരം കൂടി!",
  "പലഹാരം നന്നായിട്ടുണ്ട്!",
  "നല്ല രുചി!",
];

/**
 * Complaints shown when a customer's patience runs out.
 * The order stays visible; these lines are additive only.
 *
 * Deliberately item-agnostic: no line names a specific snack or drink, so any
 * of them can appear on any order.
 */
export const COMPLAINT_ML = [
  "ഞാൻ കാത്തിരുന്ന് തളർന്നു.",
  "ഞാൻ ഇതുവരെ കാത്തിരിക്കുന്നു!",
  "എന്റെ ഓർഡർ മറന്നോ?",
  "കാത്തിരിക്കാൻ ഞാൻ ആളല്ല!",
  "ഇത് ചായക്കടയാണോ, ആശുപത്രിയാണോ?",
  "എന്റെ ഓർഡർ ഇനിയും വന്നില്ലേ?",
  "ഓർഡർ മറന്നോ?",
];
