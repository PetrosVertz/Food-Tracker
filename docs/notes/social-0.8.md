# Social Hub items that need accounts and a server (0.8)

Petros's notes, kept for the 0.8 plan (accounts + small server with one AI key).

1. **Live ring and live exercise.** The circle around a friend's photo in the Social Hub glows **only while they are in an active workout**; tapping their circle shows **which exercise they are doing right now**. Needs: an account per user, friends list, and the app sending small "now doing this exercise" updates to the server while a workout is open (opt-in, with an off switch), and friends reading them. Not possible on the phone alone. The ring on your own photo can already follow `d.live`.
2. **Find friends through contacts.** A plain web app on iPhone **cannot read the contact list** (the Contact Picker is not available in iPhone web apps). Options for 0.8, in order of effort: invite by **link or QR** (a QR share already exists), search by **username**, and, only with accounts, match by **hashed phone number or email** the user chooses to upload (explicit consent, never upload raw contacts). A native wrapper app would be needed to read the real contact list.
3. Privacy: friends see only what the user allows (rank, streak, live status); every sharing switch defaults off.
