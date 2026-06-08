(function () {
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("error");

  async function checkSession() {
    try {
      const res = await fetch("/api/me", { credentials: "same-origin" });
      if (res.ok) {
        window.location.href = "/dashboard.html";
      }
    } catch {
      /* stay on login */
    }
  }

  checkSession();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.remove("visible");
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        errorEl.textContent = data.error || "Parolă invalidă";
        errorEl.classList.add("visible");
        return;
      }
      window.location.href = "/dashboard.html";
    } catch {
      errorEl.textContent = "Eroare de rețea. Încearcă din nou.";
      errorEl.classList.add("visible");
    }
  });
})();
