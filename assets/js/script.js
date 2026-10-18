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

