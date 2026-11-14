# Every AI feature is optional (0.7.4.3)

The app works fully without an AI key. Without a key every AI button is greyed out (anything with the AI badge, plus the Food Coach / Gym Coach pills and bubbles); tapping one says "This needs an AI key." with an **Add Key** button to Settings › AI.

Each AI job also has a way to do it by hand:

| AI feature | Where | The way without AI |
|---|---|---|
| Food Coach chat | pill beside Log Food | Log Food: search, "Usually at this time", barcode |
| Gym Coach chat | pill beside Create a Workout | Create a Workout, the exercise picker, Form pages |
| Quick Log | Log Food sheet | Log Food search (one food at a time) |
| Fill My Macros | Log Food sheet | Today's bars show what's left; Log Food lists your usual foods for this time of day |
| Photo of Nutrition Label | Add Food | Type the label in, or scan the barcode |
| Photo of an item (fridge / foods) | Add / Fridge | Scan the barcode or search |
| Receipt / shopping photo | Fridge › Add | Scan barcodes, search, or tick Groceries |
| Check My Foods | My Foods | Edit a food by hand |
| Quick Recipe (type it, the chef builds it) | Cook | My Own Recipe (add ingredients by search) |
| Suggest a Recipe / Get a Recipe | Cook | My Own Recipe |
| Quick Add (mixed dishes not in the built-in list) | Today | Built-in dishes still work; otherwise Log Food search or add the food |
| What Next? AI advice | Live workout | The "muscles you haven't hit yet" list above it (no AI) |
| Recovery note after a workout | Recovery | The built-in recovery estimate |

Rules for new AI features (every branch):
- Show the AI badge (`class="aiafter"` or `AI.badge()`) on the button that starts it, or use a robot face if it opens a coach chat. That alone greys it out without a key; no key check needed in your code.
- If a button starts AI but can't show the badge, add `data-ai` to it.
- Add the "way without AI" to this table.
