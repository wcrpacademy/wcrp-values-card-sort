# Values Card Sort — Day-of setup

Run through this the day before and again 30 minutes before the session.

## Kit

- Laptop with Python 3, charger, the `values-card-sort` folder
- Travel router or old router + power cable, power bank, South African plug adapter (type M/N)
- Printed QR cards: **online link**, plus **offline Wi-Fi join** and **offline page URL**
- Paper worksheets
- Extension lead

## Day before

1. Test the online link on the venue Wi-Fi with 2–3 phones. Send one test result with code `TEST` and check it lands in the Google Sheet.
2. Test the offline setup with your laptop and router (see below).
3. Newsletter: sign up once with your own email from the online link, and check you appear in MailerLite (in the right group). If it says "We couldn't sign you up", check the Script properties and the field keys (`npm run mailerlite`).
4. Decide the default: **online** if venue Wi-Fi works, otherwise **offline**.

## 30 minutes before

**Online mode**

1. Open the online link on your phone and send a `TEST` result.
2. Open the Google Sheet (or `admin.html`) and check the row appears.
3. Put the online QR on the slide.

**Offline mode (backup)**

1. Power on the router; connect the laptop; confirm it has the reserved IP (`ipconfig`).
2. Turn off laptop sleep and battery saver.
3. In the folder: `python server.py`. Allow it on **private networks** if Windows Firewall asks.
4. On your phone: scan the Wi-Fi QR, then the page QR; send a `TEST` result; check `results.csv`.
5. Keep the offline QR cards ready.

## During

- Online: "Scan the QR and keep this tab open until you see Saved."
- Offline: "Join the Wi-Fi first. Your phone will say no internet; that's expected. Turn mobile data off."
- Can't scan: read out the URL under the QR.
- Phone won't work: paper worksheet.
- Watch the count rise in the Sheet or admin view.

## Switching to offline mid-session

If the venue internet drops: phones keep their results and retry every 15 seconds, so nothing is lost as long as the online tab stays open (or is reopened later, with internet). Move people to the offline Wi-Fi only if the internet is gone for more than a few minutes.

Careful: the offline page is a different web address, and browsers keep each address's saved data separate. A result saved on the online page does **not** move to the laptop. People who already finished online should keep that tab and let it send later; people who switch to offline start the sort again there (or use the paper worksheet).

## After

1. Delete the `TEST` rows.
2. If offline was used: import `results.csv` into the Google Sheet.
3. Export the Sheet to CSV for Doc Lau and Lora.
4. Turn off the Apps Script web app; take the online page down; stop `server.py` (`Ctrl + C`).
5. Collect paper worksheets and add them to the Sheet by hand.

## If things go wrong

| Problem | Fix |
|---|---|
| "Not sent yet" stays on screen | Internet is down or slow: wait, it retries; or switch to offline |
| Phones join the router but the page won't open | Check the laptop IP; allow Python through the firewall; use `http://`, not `https://` |
| Phone keeps dropping the router Wi-Fi | Turn off mobile data; Android: choose "Keep Wi-Fi connection" |
| Duplicate rows | Shouldn't happen (deduped by submission ID); if it does, keep the first |
| Laptop dies | Online mode is unaffected; offline: results stay on phones, use worksheets |
| Router dies | Online if internet works; otherwise worksheets |
