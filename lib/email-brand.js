// The Scene One logo as it appears at the top of every email we send.
//
// Kept in one place because ten templates across four files open with it
// (lib/submission-emails.js, lib/assignment-notices.js, api/review-coverage.js,
// api/questions.js) and a brand header that drifts between them is exactly the
// kind of thing nobody notices until a writer has two of our emails open.
//
// ---------------------------------------------------------------------------
// THE LOGO IS TRANSPARENT, AND THERE ARE TWO CUTS OF IT.
//
// It used to carry an opaque white plate baked into the PNG. That was there for
// one reason: a force-inverting client rewrites an email's HTML and CSS colours
// but CANNOT repaint the pixels inside an image, so a transparent black logo on
// a darkened card measured 1.27:1 — invisible bar the red dot. A plate cannot be
// repainted either, so it survived and kept the logo readable.
//
// It also showed. On every client that darkens the card, the logo sat in a white
// box, and that was judged worse than the problem it solved. So the plate is
// gone and the defence is now two images and a swap:
//
//   * -v5.png        black lockup, transparent        the default
//   * -v5-light.png  white lockup, transparent        shown in dark mode
//
// Both keep the red dot at #CD2E07; only the black ink flips.
//
// WHAT THIS COVERS, honestly, because the swap is a media query and media
// queries are exactly what the aggressive clients ignore:
//   * Apple Mail / iOS Mail — honour the light-only declarations in
//     emailDocument() and never darken the card, so they stay on the black cut.
//   * Clients that darken AND read CSS — get the white cut. Outlook's own
//     rewrite is caught by the [data-ogsc] selector, which is the attribute it
//     stamps on elements while recolouring.
//   * Gmail's Android app forces its treatment and reads neither. There the
//     black lockup sits on a dark card and is hard to see. Nothing in HTML
//     reaches it; the only fixes are a plate (what we just removed) or dropping
//     the image for styled text. This is a known, accepted gap — do not "fix" it
//     by quietly reinstating the plate without saying so.
//
// The alt text is styled dark, matching the light default, for the many clients
// that block remote images and render alt text using the img's own styles.
// NOTE the file: this is the EMAIL-ONLY artwork, not either site logo.
// The URL is absolute and hardcoded to production — an email client has no
// origin to resolve a relative path against, and it must NOT use SITE_URL,
// which is Preview-scoped on preview deploys: a preview behind Vercel
// Authentication answers an image request with a redirect to the SSO page, so
// every test email would show a broken logo.
// VERSIONED FILENAME, and it has to stay that way. An email is immutable once
// it is in an inbox, but the image it points at is not: replacing the file
// behind a stable URL silently re-renders every email ever sent. Every earlier
// version stays in place serving its own archive. If the artwork changes again,
// add -v6; do not overwrite any of them.
var LOGO_URL      = "https://sceneone.info/assets/scene-one-email-logo-v5.png";
var LOGO_URL_DARK = "https://sceneone.info/assets/scene-one-email-logo-v5-light.png";

// 120x148 is the transparent artwork's own 400x494 at a quarter scale. No plate
// means no padding baked in, so the box is the lockup itself and a touch taller
// than the plated 120x144 it replaces. Both dimensions are set as HTML
// attributes as well as CSS because Outlook ignores the CSS ones and will
// otherwise draw the image at its full 400px width.
var LOGO_W = 120;
var LOGO_H = 148;

// `marginBottom` matches whatever the template used before the logo replaced the
// text wordmark — 26px on the shells whose card padding is tighter, 30px on the
// rest.
function brandHeader(marginBottom) {
  var mb = marginBottom == null ? 30 : marginBottom;
  var common = 'border:0;outline:none;text-decoration:none;font-weight:700;' +
    'letter-spacing:5px;font-size:20px;';
  return '<div style="text-align:center;margin:0 0 ' + mb + 'px;">' +
    // Default. Alt text styled dark to match it, for clients that block images.
    '<img class="s1-logo-light" src="' + LOGO_URL + '" alt="Scene One" ' +
      'width="' + LOGO_W + '" height="' + LOGO_H + '" ' +
      'style="display:inline-block;width:' + LOGO_W + 'px;height:' + LOGO_H + 'px;' +
      common + 'color:#15110f;">' +
    // Hidden unless the stylesheet in emailDocument() turns it on. Inline
    // display:none is the fallback: a client that strips <style> simply never
    // shows this one and keeps the black cut, rather than showing both.
    '<img class="s1-logo-dark" src="' + LOGO_URL_DARK + '" alt="" ' +
      'width="' + LOGO_W + '" height="' + LOGO_H + '" ' +
      'style="display:none;width:' + LOGO_W + 'px;height:' + LOGO_H + 'px;' +
      common + 'color:#f5f1e9;">' +
    "</div>";
}

// Wrap a template's body in a real document that declares itself LIGHT-ONLY.
//
// Every template here returns a bare <div>. With no <head>, a client is never
// told what colour scheme the email supports, so it is free to invent one — and
// the aggressive ones do: they rewrite the card to near-black and, where they
// also invert images, flip the black lockup to white. The result is legible but
// it is not the brand.
//
// These four declarations are the standard way to opt out. `color-scheme` and
// `supported-color-schemes` as meta AND as CSS, because clients read one or the
// other: Apple Mail and iOS Mail honour them and leave the email alone, which
// covers most of where this was going wrong.
//
// What they do NOT cover, and nothing in HTML does: Outlook's Windows clients
// and the Gmail Android app force their own treatment regardless. The logo's
// white plate is what keeps those readable (see the note above), so the two
// defences are complementary — don't drop one because the other exists.
function emailDocument(inner) {
  return "<!doctype html><html><head>" +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light">' +
    '<meta name="supported-color-schemes" content="light">' +
    "<style>" +
      ":root{color-scheme:light;supported-color-schemes:light}" +
      // Shown only where the client darkens the card AND reads CSS. The
      // light cut is hidden in the same breath so the two never both show.
      "@media (prefers-color-scheme:dark){" +
        ".s1-logo-light{display:none!important}" +
        ".s1-logo-dark{display:inline-block!important}" +
      "}" +
      // data-ogsc is the attribute Outlook stamps on elements while it
      // recolours an email, so this catches the rewrite its media-query
      // support would miss.
      "[data-ogsc] .s1-logo-light{display:none!important}" +
      "[data-ogsc] .s1-logo-dark{display:inline-block!important}" +
    "</style>" +
    "</head><body style=\"margin:0;padding:0;background:#f5f1e9;\">" +
    inner +
    "</body></html>";
}

module.exports = { brandHeader, LOGO_URL, emailDocument };
