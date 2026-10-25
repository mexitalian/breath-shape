# Google Play: closed beta guide

Everything needed to put **Breath Shape** on Google Play as a closed beta that people join with a link. Work top to bottom; each step says who does it. Last updated 24 October 2026.

Your account is a personal one made before November 2023, so there is no 12-testers-for-14-days rule: the closed test can go public whenever you're ready.

## At a glance

| What | Value |
| --- | --- |
| Store title | Breath Shape: Guided Breathing |
| Name under the icon | Breath Shape |
| Application ID | `com.mexitalian.breathing` (permanent once uploaded) |
| Category | Health & Fitness |
| Price | Free, no ads, no in-app purchases |
| Privacy policy | https://mexitalian.github.io/breath-shape/privacy.html |
| Website | https://mexitalian.github.io/breath-shape/ |
| First version | 0.1.0 |
| Graphics | [`store/`](../store) |

## 1. Make the upload key (you, once)

Google Play signs the app people download with its own key (Play App Signing). Your **upload key** proves an upload came from you. If it's ever lost or leaked, Google can reset it.

**On the Mac:**

```
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000 -storetype PKCS12
base64 -i upload.jks | pbcopy
```

**Or on the phone with [Termux](https://f-droid.org/packages/com.termux/)** (plus **Termux:API**, both from F-Droid):

```
pkg update && pkg install openjdk-17 termux-api
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000 -storetype PKCS12
base64 -w0 upload.jks | termux-clipboard-set
```

`keytool` asks for a password and a name; any name is fine.

**Then, in the repo's [Settings → Secrets → Actions](https://github.com/mexitalian/breath-shape/settings/secrets/actions), add four secrets:**

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Paste (the clipboard from the last command) |
| `ANDROID_KEYSTORE_PASSWORD` | The password you chose |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | The same password |

**Back up** `upload.jks` and the password, for example in your password manager or private Drive. Don't commit the file.

## 2. Build the app bundle (GitHub, one tap)

1. Go to [Actions → Play release → Run workflow](https://github.com/mexitalian/breath-shape/actions/workflows/release.yml).
2. Enter the version name (`0.1.0`) and run it.
3. After about 3 minutes, a release named **play-0.1.0** holds `breath-shape-0.1.0.aab`, ready to download.

Every later run makes a new version code automatically; just raise the version name, for example to 0.1.1.

## 3. Create the app in the Play Console (you)

1. Open [play.google.com/console](https://play.google.com/console) and choose **Create app**.
2. Fill in:
   - **App name:** `Breath Shape: Guided Breathing`
   - **Default language:** English (United Kingdom)
   - **App or game:** App
   - **Free or paid:** Free
3. Tick the declarations (developer policies, US export laws) and choose **Create app**.

## 4. Set up the app (the Dashboard checklist)

The Dashboard lists these as "Set up your app". Answers to paste:

**Privacy policy**
- https://mexitalian.github.io/breath-shape/privacy.html

**App access**
- All functionality is available without special access.

**Ads**
- No, my app does not contain ads.

**Content rating**
- **Email:** yours.
- **Category:** "All other app types". The wording varies; pick the non-game category that isn't social or news.
- **Every content question:** No. That covers violence, sexuality, language, drugs, gambling, users interacting or sharing content, sharing location, digital purchases and unrestricted internet.
- **Expected result:** Everyone / PEGI 3.

**Target audience and content**
- **Age groups:** 18 and over. The breath-hold and energising techniques aren't meant for children, and adult-only also keeps the app outside the Families policy.
- **Appeal to children:** No.

**News app**
- No.

**Data safety**
- **Does your app collect or share any of the required user data types?** No. History and heart checks stay on the device and are never sent anywhere; data processed only on the device doesn't count as "collected".
- **Encryption in transit and deletion questions:** they disappear once you answer No.

**Advertising ID**
- No.

**Government apps and financial features**
- No, and none.

**Health apps declaration**
- **Features:** choose the relaxation, stress-management or meditation and breathing feature. Also choose the one about measuring heart rate or vitals with the device, for the camera heart check.
- **Medical device:** No. The app is for wellbeing; the description and privacy policy both say it is not a medical device.
- The option names change from time to time; pick the nearest ones.

**Foreground service permissions** (App content → Foreground service)
- **Type:** Media playback.
- **Description:** "During a breathing session the app plays the session's vibration cues and hum sound with the screen off or the phone locked, so users can follow along with their eyes closed. A notification with a Stop button is shown for the whole session."
- **Impact if deferred or interrupted:** "The breathing cues would stop or drift out of time mid-session, and the user would lose their place in the exercise."
- **Video, if asked:** a 20–30 s screen recording, uploaded to YouTube as unlisted or to Drive with "anyone with the link":
  1. Open Bhramari and start a session.
  2. Pull down the notification shade to show the session notification.
  3. Lock the phone. The hum keeps playing; say so or hold a second phone to record the sound.
  4. Unlock and tap Stop in the notification.

## 5. Store listing (Grow → Store presence → Main store listing)

**App name** (30)
```
Breath Shape: Guided Breathing
```

**Short description** (80)
```
Guided breathing exercises to regulate body and mind through your breath.
```

**Full description** (4,000)
```
Breath Shape is a calm, simple way to do guided breathing exercises. Pick a technique, then follow the shape: it grows as you breathe in, holds when you hold, and shrinks as you breathe out. No talking, no timers to watch, just a shape to follow.

15 breathwork techniques, in four groups:

CALM & SLEEP
• Resonance breathing (coherent breathing) at your own pace, 4.5 to 6.5 breaths a minute
• 4-7-8 breathing
• Extended exhale
• Physiological sigh
• Bhramari, humming bee breath, with an optional hum
• Pursed-lip breathing

FOCUS & BALANCE
• Box breathing (square breathing), traced around a square
• Triangle breathing
• Alternate nostril breathing (Nadi Shodhana), on a split screen

ENERGISE
• Wim Hof method breathing, with your breath-hold times
• Bhastrika, bellows breath
• Kapalabhati, skull-shining breath
• Tummo, inner fire
• Connected breathing, that slows down at the end

MEASURE & TRAIN
• Buteyko control pause
• Heart rate and HRV check: cover the camera and flash with a fingertip for about a minute. See your heart rate, and your heart rate variability (RMSSD) when the signal is steady. Measure before and after a session to see the change.

FOLLOW ALONG WITH THE SCREEN OFF
Lock your phone and keep going. Gentle vibration marks each breath, and the hum keeps playing. Choose short taps, or continuous vibration that swells as you breathe in and fades as you breathe out.

MADE TO BE CALM
• One shape, one colour per technique, light and dark themes
• Drag anywhere to change the colour
• Sound, vibration and keep-screen-on settings
• Safety notes before the stronger techniques

PRIVATE BY DESIGN
No account, no ads, no tracking. Your history stays on your phone. Export it as a spreadsheet file whenever you like.

This is an early version, shared with testers. Tell us what works and what doesn't.

Breath Shape is for relaxation and general wellbeing. It is not a medical device. Do the energising and breath-hold techniques sitting or lying down, never in water or while driving, and stop if you feel unwell.
```

**Graphics** (all in [`store/`](../store))

| Slot | File |
| --- | --- |
| App icon, 512 × 512 | `icon-512.png` |
| Feature graphic, 1024 × 500 | `feature-graphic.png` |
| Phone screenshots, 1080 × 1920, in this order | `screenshot-1-home.png` … `screenshot-6-history.png` |

**Category and contact** (Store settings)
- **Category:** Health & Fitness.
- **Tags:** meditation, stress relief, wellness, or the nearest offered.
- **Email:** your public contact email (required).
- **Website:** https://mexitalian.github.io/breath-shape/

## 6. Closed testing with a Google Group

**Create the group**
1. Go to [groups.google.com](https://groups.google.com) and choose **Create group**.
2. Name it, for example **Breath Shape beta**, with the address `breath-shape-beta@googlegroups.com`.
3. Set **Who can join group: Anyone on the web can join**, and **Who can view conversations: Group members**.

**Set up the track**
1. In the Console go to **Testing → Closed testing**, open the default track and choose **Manage track**.
2. **Testers:** choose **Google Groups**, add the group address, and set the feedback email or URL. For example, use https://github.com/mexitalian/breath-shape/issues or your email.
3. **Countries:** pick where testers are; picking all is fine.

**Publish a release**
1. Choose **Create new release**.
2. **App signing:** accept **Use Google-generated key** (Play App Signing).
3. **App bundles:** upload `breath-shape-0.1.0.aab` from the GitHub release.
4. **Release name:** `0.1.0`. **Release notes:** for example "First beta: 15 techniques, heart rate and HRV check, sessions with the screen locked."
5. Choose **Next → Save → Send for review** (on the Publishing overview). The first review usually takes from a few hours to a few days.

**Invite people.** Once it's approved, share two links:
1. The group: `https://groups.google.com/g/breath-shape-beta`. Testers join it with the Google account they use on their phone.
2. The **opt-in link** from Closed testing → Testers ("Join on Android"). Testers tap **Become a tester**, then install from Google Play.

Testers update through Google Play like any app. For each new beta: run step 2 with a higher version name, then **Create new release** on the same track.

## 7. Your own phone: test build vs Play beta

- **Test builds:** from now on, test builds from GitHub ([Latest app build](https://github.com/mexitalian/breath-shape/releases/tag/app-latest)) install as **Breath Dev**, next to the Play version.
- **The old test build:** it is still installed under the Play app's ID, so Play can't install over it. Before joining the beta:
  1. Open the old "Breath Shape" or "Breathing" test app.
  2. Export your history (Settings → Your data → Export history).
  3. Uninstall it.

## 8. Going public later

When the beta is in good shape, go to **Testing → Closed testing → Promote release → Production**, or create a production release with the same bundle. Production gets its own review. Nothing else in this guide changes.
