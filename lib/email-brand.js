// The Scene One logo as it appears at the top of every email we send.
//
// Kept in one place because ten templates across four files open with it
// (lib/submission-emails.js, lib/assignment-notices.js, api/review-coverage.js,
// api/questions.js) and a brand header that drifts between them is exactly the
// kind of thing nobody notices until a writer has two of our emails open.
//
// ---------------------------------------------------------------------------
// WHY THE LOGO FILE CARRIES ITS OWN WHITE BACKGROUND — do not swap in the plain
// transparent artwork.
//
// The obvious version (transparent black artwork on the white card) is BROKEN in
// dark mode, measured rather than guessed. A force-inverting client — the
// Outlook family above all — rewrites an email's HTML and CSS colours but
// CANNOT repaint the pixels inside a PNG. So it hands the reader a dark card
// with our black logo still black: 1.27:1 contrast, invisible bar the red dot.
//
// That is also why this was never a like-for-like swap for the letterspaced
// `SCENE ONE` text it replaced. Text got recoloured along with everything else
// and always stayed legible; an image gets no such rescue.
//
// The fix uses the same fact in our favour: if a client cannot repaint pixels,
// then a background baked INTO the image cannot be repainted either. So
// `scene-one-email-logo.png` is the black lockup on an opaque white plate with
// transparent rounded corners, and it behaves well under every mode:
//   * Normal client — the plate is the same white as the card, so it is
//     invisible and the header looks exactly like the bare black logo.
//   * Colour-rewriting client (Outlook) — the card darkens, the plate does not,
//     leaving a tidy white panel with a legible black logo.
//   * Whole-email filter/invert (some Android themes) — plate and logo invert
//     together, giving a dark panel with a white logo. Still legible.
//
// An earlier attempt painted a dark band in HTML around the WHITE artwork
// instead. It survived inversion equally well but was heavy in the light mode
// that most recipients actually see, which is the wrong trade. Don't reinstate it.
//
// The alt text is styled dark, matching the plate, for the many clients that
// block remote images and render alt text using the img's own styles.
// NOTE the file: this is the EMAIL-ONLY artwork, not either site logo. Both site
// files are transparent; this one has the white plate baked in, which is the
// whole point above. The URL is absolute and hardcoded to production — an email
// client has no origin to resolve a relative path against, and it must NOT use
// SITE_URL, which is Preview-scoped on preview deploys: a preview behind Vercel
// Authentication answers an image request with a redirect to the SSO page, so
// every test email would show a broken logo.
var LOGO_URL = "https://sceneone.info/assets/scene-one-email-logo.png";

// 185x77 holds the 920x386 plate's aspect ratio and puts the LOCKUP INSIDE it at
// 171px wide — the same size it renders at in the site's own nav. Both dimensions
// are set as HTML attributes as well as CSS because Outlook ignores the CSS ones
// and will otherwise draw the image at its full 920px width.
var LOGO_W = 185;
var LOGO_H = 77;

// `marginBottom` matches whatever the template used before the logo replaced the
// text wordmark — 26px on the shells whose card padding is tighter, 30px on the
// rest.
function brandHeader(marginBottom) {
  var mb = marginBottom == null ? 30 : marginBottom;
  return '<div style="text-align:center;margin:0 0 ' + mb + 'px;">' +
    '<img src="' + LOGO_URL + '" alt="Scene One" width="' + LOGO_W + '" height="' + LOGO_H + '" ' +
    'style="display:inline-block;width:' + LOGO_W + 'px;height:' + LOGO_H + 'px;border:0;' +
    'outline:none;text-decoration:none;font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;">' +
    "</div>";
}

module.exports = { brandHeader, LOGO_URL };
