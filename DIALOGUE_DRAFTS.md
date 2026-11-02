# Dialogue — Chaya Rush

Status: **APPROVED by the owner (2026-11-03) and wired into the game.**
The source of truth is now `src/config/strings.ml.js`; this file is kept for the
English glosses, tone notes and history. If a line is edited, change
`strings.ml.js` and update this document together.

When a customer is served correctly, the game picks a line from
`THANK_YOU_BY_ITEM_ML[itemId]` (falling back to `THANK_YOU_GENERIC_ML`). When
patience expires, it picks from `COMPLAINT_ML` and keeps the order visible.

Please check the Malayalam spelling, tone, and whether any line feels rude
rather than funny.

---

## Thank-you options (after a correct serve)

| # | Malayalam | English gloss | Tone |
| --- | --- | --- | --- |
| T1 | ചായ സൂപ്പർ! | This tea is superb! | Casual, energetic |
| T2 | കൊള്ളാം, നല്ല ചായ! | Nice, good tea! | Simple, warm |
| T3 | അടിപൊളി! | Awesome! | Slangy, young |
| T4 | നല്ല ചൂടുള്ള ചായ! വീണ്ടും വരാം. | Nice hot tea! I'll come again. | Warm, polite |

Recommended starter set: **T2 + T4** (safe, warm, works for any item).

---

## Complaint options (patience expired)

| # | Malayalam | English gloss | Tone |
| --- | --- | --- | --- |
| C1 | ചായ ഇനിയും വന്നില്ലേ? | Hasn't my tea come yet? | Impatient |
| C2 | ഞാൻ കാത്തിരുന്ന് തളർന്നു. | I'm tired of waiting. | Mild, weary |
| C3 | ചായയ്ക്ക് ഇത്രേം സമയമോ? | This much time for tea? | Colloquial, incredulous |
| C4 | അടുത്ത തവണ ഞാൻ വീട്ടിൽ നിന്ന് കുടിച്ചോളാം! | Next time I'll just drink at home! | Dramatic, funny |

Recommended starter set: **C1 + C3** (clearly about waiting, not about the shop's
quality, and funny without being insulting).

---

## Questions for the owner (resolved)

Approved as written; the wired text lives in `src/config/strings.ml.js`. The
questions below are retained for context.

1. Approve, edit, or replace any line?
2. Should complaints mention the specific item (e.g. "ചായ ഇനിയും...") or stay
   generic so one line fits every order? The drafts above are tea-specific; a
   generic version would use "ഓർഡർ" (order) instead of "ചായ".
3. Are T3 ("അടിപൊളി") and C4 acceptable in tone for the intended audience?

---

## Additional thank-you options (batch 2)

| # | Malayalam | English gloss | Tone |
| --- | --- | --- | --- |
| T5 | ചായ കിടിലൻ! | The tea is awesome! | Slangy |
| T6 | ഇതാണ് ടേസ്റ്റ്! | Now THIS is taste! | Playful |
| T7 | ഒരു ഗ്ലാസ് കൂടി ഇല്ലേ? | Isn't there one more glass? | Impressed |
| T8 | ചായ കുടിച്ചിട്ട് ഉഷാറായി! | I feel refreshed after that tea! | Happy |
| T9 | നാടൻ ചായയുടെ രുചി! | The taste of proper local tea! | Nostalgic |
| T10 | സൂപ്പർ ചായ, നന്ദി! | Super tea, thanks! | Polite |
| T11 | ഇന്നത്തെ ചായ ഗംഭീരം! | Today's tea is magnificent! | Enthusiastic |
| T12 | ചായ കൊണ്ട് വന്നതിന് നന്ദി! | Thanks for bringing the tea! | Very polite |

## Additional complaint options (batch 2)

| # | Malayalam | English gloss | Tone |
| --- | --- | --- | --- |
| C5 | ചായ കിട്ടുമോ ഇല്ലേ? | Will I get tea or not? | Impatient |
| C6 | ഇവിടെ ചായ ഉണ്ടോ? | Is there tea here at all? | Dry, funny |
| C7 | ഞാൻ ഇതുവരെ കാത്തിരിക്കുന്നു! | I've been waiting all this while! | Exasperated |
| C8 | ചായയല്ലേ, എന്താ ഇത്ര നേരം? | It's only tea, why so long? | Colloquial |
| C9 | എന്റെ ഓർഡർ മറന്നോ? | Did you forget my order? | Direct |
| C10 | കാത്തിരിക്കാൻ ഞാൻ ആളല്ല! | I'm not the waiting type! | Blunt, funny |
| C11 | ചായ വരുന്നത് കാണാൻ ഞാൻ ജീവിച്ചിരിക്കണോ? | Do I have to stay alive to see the tea arrive? | Melodramatic |
| C12 | ഇത് ചായക്കടയാണോ, ആശുപത്രിയാണോ? | Is this a tea shop or a hospital? | Absurd, funny |
| C13 | ചായ ഒന്ന് വേഗം കിട്ടിയാൽ നന്നായിരുന്നു. | It would be nice to get the tea a little faster. | Polite |
| C14 | ദയവായി ചായ ഒന്ന് നോക്കുമോ? | Could you please check on the tea? | Very polite |
| C15 | എന്റെ ഓർഡർ ഇനിയും വന്നില്ലേ? | Hasn't my order come yet? | Item-generic |
| C16 | ഓർഡർ മറന്നോ? | Forgot the order? | Item-generic, short |

### Batch 2 recommendations

- Thank-you: **T5 + T8 + T12** (one slangy, one happy, one polite).
- Complaints: **C6 + C8 + C14** (funny, colloquial, polite — good variety so the
  same joke does not repeat every round).

---

## Batch 3 — item-specific compliments

Proposed structure: `THANK_YOU_BY_ITEM_ML` maps each menu ID to its own lines,
so serving a samoosa never triggers a tea compliment. If an item has no lines
(or none approved yet), fall back to the generic list below.

### Tea / drinks

| Item ID | Malayalam | English gloss |
| --- | --- | --- |
| chaya | ചായ സൂപ്പർ! | This tea is superb! |
| chaya | നല്ല ചൂടുള്ള ചായ! | Nice hot tea! |
| kattan chaya | കട്ടൻ ചായ നല്ല കട്ടി! | Nice strong kattan chaya! |
| kattan chaya | കട്ടൻ ചായ കിടിലൻ! | Kattan chaya is awesome! |
| kaapi | കാപ്പിയുടെ മണം ഗംഭീരം! | The coffee aroma is great! |
| kaapi | കാപ്പി കിടിലൻ! | The coffee is awesome! |
| boost | ബൂസ്റ്റ് സൂപ്പർ! | Boost is super! |
| boost | ബൂസ്റ്റ് കുടിച്ചിട്ട് ഉഷാറായി! | I feel energized after Boost! |

### Snacks

| Item ID | Malayalam | English gloss |
| --- | --- | --- |
| samoosa | സമോസ കിടിലൻ! | The samoosa is awesome! |
| samoosa | സമോസയുടെ ഉള്ള് നിറച്ചിട്ടുണ്ട്! | The samoosa is generously filled! |
| pazhampori | പഴംപൊരി സൂപ്പർ! | The pazhampori is super! |
| pazhampori | പഴംപൊരി കണ്ടാൽ ചായ മറക്കും! | See pazhampori, forget the tea! |
| chickenroll | ചിക്കൻ റോൾ കിടിലൻ! | The chicken roll is awesome! |
| chickenroll | ചിക്കൻ റോളിൽ ചിക്കൻ കുറവല്ല! | The chicken roll is not short on chicken! |
| paripuvada | പരിപ്പുവട നന്നായിട്ടുണ്ട്! | The paripuvada is well made! |
| paripuvada | പരിപ്പുവടയുടെ രുചി കൊള്ളാം! | The paripuvada tastes good! |
| ullivada | ഉള്ളിവട സൂപ്പർ! | The ullivada is super! |
| ullivada | ഉള്ളിവട നന്നായി വറുത്തിട്ടുണ്ട്! | The ullivada is nicely fried! |
| mutta baji | മുട്ട ബജി കിടിലൻ! | The mutta baji is awesome! |
| mutta baji | മുട്ട ബജി നന്നായിട്ടുണ്ട്! | The mutta baji is well made! |
| uzhnnvada | ഉഴുന്നുവട ഗംഭീരം! | The uzhnnvada is magnificent! |
| uzhnnvada | ഉഴുന്നുവട നല്ല രുചി! | The uzhnnvada tastes good! |
| bonda | ബോണ്ട സൂപ്പർ! | The bonda is super! |
| bonda | ബോണ്ട നന്നായിട്ടുണ്ട്! | The bonda is well made! |
| sugiyan | സുഗിയാൻ നല്ല മധുരം! | The sugiyan is nicely sweet! |
| sugiyan | സുഗിയാൻ കിടിലൻ! | The sugiyan is awesome! |

### Generic fallback (any item without approved lines)

| # | Malayalam | English gloss |
| --- | --- | --- |
| G1 | പലഹാരം കിടിലൻ! | The snack is awesome! |
| G2 | ഇനി ഒരു പലഹാരം കൂടി! | One more snack, please! |
| G3 | പലഹാരം നന്നായിട്ടുണ്ട്! | The snack is well made! |
| G4 | നല്ല രുചി! | Tastes good! |

### Batch 3 notes

- Compliment selection will match the **served item**, then the generic list.
- `ക്രിസ്പി` was avoided in favour of `നന്നായി വറുത്തിട്ടുണ്ട്` ("nicely fried").
- These lines are **approved and wired**; `strings.ml.js` is the source of truth.


