document.querySelectorAll("[data-scroll]").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.scroll;

    const target = targetId === "top"
      ? document.documentElement
      : document.getElementById(targetId);

    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
});

 archiveLink?.addEventListener("click", (event) => {
        event.preventDefault();

        // Якщо вже на головній — прокручуємо без зміни URL
        if (window.location.pathname === "/") {
            const albums = document.querySelector("#albums");

            if (albums) {
                albums.scrollIntoView({ behavior: "smooth" });
            }

            return;
        }

        // Якщо на 404 — переходимо на головну без хешу
        window.location.href = "/";
    });