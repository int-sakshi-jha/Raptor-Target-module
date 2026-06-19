// Built from this template by Vite — do not edit public/firebase-messaging-sw.js by hand.
importScripts("https://www.gstatic.com/firebasejs/__FIREBASE_JS_VERSION__/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/__FIREBASE_JS_VERSION__/firebase-messaging-compat.js");
firebase.initializeApp(__FIREBASE_CONFIG__);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  var n = payload.notification || {};
  var d = payload.data || {};
  var title = n.title || d.title || "Notification";
  var body = n.body || d.body || "";
  var openUrl = d.click_action || d.action_url || d.url || "/";
  return self.registration.showNotification(title, {
    body: body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: d.tag || "fcm-" + (d.id || Date.now()),
    data: Object.assign({ openUrl: openUrl }, d),
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var raw = (event.notification.data && event.notification.data.openUrl) || "/";
  var url;
  try {
    url = new URL(raw, self.location.origin).href;
  } catch (e) {
    url = self.location.origin + "/";
  }
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var c = clientList[i];
        if (c.url.indexOf(self.location.origin) === 0 && "focus" in c) {
          return c.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
