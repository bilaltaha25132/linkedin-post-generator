/**
 * Signal Desk Gmail bridge. Runs on your own Google account as an Apps Script
 * and forwards LinkedIn emails to your Signal Desk, signed with a shared secret.
 * Setup steps: docs/email-bridge.md.
 *
 * Script Properties (Project Settings → Script Properties):
 *   APP_URL              your Signal Desk URL, no trailing slash
 *   EMAIL_INGEST_SECRET  the same value as in Vercel
 *
 * It reads only threads labelled li/inbox (your Gmail filter adds that label;
 * LinkedIn security emails are excluded by the filter), and labels each thread
 * li/sent once Signal Desk has accepted it.
 */

var INBOX_LABEL = "li/inbox";
var SENT_LABEL = "li/sent";
var BATCH = 20;

function forwardLinkedInEmails() {
  var props = PropertiesService.getScriptProperties();
  var appUrl = props.getProperty("APP_URL");
  var secret = props.getProperty("EMAIL_INGEST_SECRET");
  if (!appUrl || !secret) throw new Error("Set APP_URL and EMAIL_INGEST_SECRET in Script Properties.");

  var sent = GmailApp.getUserLabelByName(SENT_LABEL) || GmailApp.createLabel(SENT_LABEL);
  var threads = GmailApp.search("label:" + INBOX_LABEL + " -label:" + SENT_LABEL + " newer_than:7d", 0, BATCH);
  if (!threads.length) return;

  var emails = [];
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (m) {
      // Security mail never leaves the inbox, even if a filter slips.
      if (/security-noreply@linkedin\.com/i.test(m.getFrom())) return;
      emails.push({
        id: m.getId(),
        from: m.getFrom(),
        subject: m.getSubject(),
        date: m.getDate().toISOString(),
        body: m.getPlainBody().slice(0, 150000),
      });
    });
  });

  var payload = JSON.stringify({ emails: emails });
  var timestamp = String(Date.now());
  var signature = Utilities.computeHmacSha256Signature(timestamp + "." + payload, secret, Utilities.Charset.UTF_8)
    .map(function (b) {
      return ("0" + (b & 0xff).toString(16)).slice(-2);
    })
    .join("");

  var res = UrlFetchApp.fetch(appUrl + "/api/public/ingest/email", {
    method: "post",
    contentType: "application/json",
    payload: payload,
    headers: { "x-bridge-timestamp": timestamp, "x-bridge-signature": signature },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error("Signal Desk returned HTTP " + res.getResponseCode() + ": " + res.getContentText().slice(0, 300));
  }
  threads.forEach(function (thread) {
    thread.addLabel(sent);
  });
}

/** Run once: checks the forward every 10 minutes. */
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "forwardLinkedInEmails") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("forwardLinkedInEmails").timeBased().everyMinutes(10).create();
}
