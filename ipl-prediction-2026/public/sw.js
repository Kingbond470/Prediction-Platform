// IPL Prediction 2026 — Service Worker
// Handles Web Push notifications for match results

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "IPL Result", body: event.data.text() };
  }

  const title = data.title || "IPL Prediction 2026";
  const options = {
    body: data.body || "A match result is in!",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: data.tag || "ipl-result",
    renotify: true,
    data: { url: data.url || "/" },
    actions: [
      { action: "view", title: "See Result" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
