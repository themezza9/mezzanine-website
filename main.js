// The Mezzanine - shared site behavior

(function () {
  var splash = document.getElementById("splash");
  if (splash) {
    var reduceMotionSplash = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem("mezzanine-splash-seen") === "1";
    } catch (e) {}

    if (alreadySeen) {
      splash.classList.add("is-hidden");
    } else {
      try {
        sessionStorage.setItem("mezzanine-splash-seen", "1");
      } catch (e) {}
      document.body.style.overflow = "hidden";
      var hideDelay = reduceMotionSplash ? 200 : 400;
      setTimeout(function () {
        splash.classList.add("is-hiding");
        document.body.style.overflow = "";
        splash.addEventListener(
          "transitionend",
          function () {
            splash.classList.add("is-hidden");
          },
          { once: true }
        );
      }, hideDelay);
    }
  }

  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav-toggle");
  var mobileMenu = document.querySelector(".mobile-menu");

  function onScroll() {
    if (!nav) return;
    if (window.scrollY > 8) nav.classList.add("is-scrolled");
    else nav.classList.remove("is-scrolled");
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle && mobileMenu) {
    toggle.addEventListener("click", function () {
      var open = toggle.classList.toggle("is-open");
      mobileMenu.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });
    mobileMenu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.classList.remove("is-open");
        mobileMenu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  // Scroll-reveal
  var revealEls = document.querySelectorAll(".reveal");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Motif float animation is set via inline style (see index.html comment on
  // .motif-float) since CSS classes can't reach into <symbol>/<use> content -
  // so reduced-motion is enforced here in JS instead of a CSS override.
  if (reduceMotion) {
    document.querySelectorAll(".motif-float").forEach(function (el) {
      el.style.animation = "none";
    });
  }
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  // Floor-rail scroll progress ("elevator" indicator)
  var marker = document.querySelector(".floor-rail .rail-marker");
  if (marker) {
    var updateRail = function () {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      var progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      progress = Math.max(0, Math.min(1, progress));
      marker.style.top = (progress * 100) + "%";
    };
    document.addEventListener("scroll", updateRail, { passive: true });
    window.addEventListener("resize", updateRail);
    updateRail();
  }

  // Theme toggle (dark/light). Initial theme is applied synchronously by an
  // inline script in <head>, before paint, to avoid a flash of the wrong theme.
  var themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    var reflectThemeState = function () {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    };
    reflectThemeState();
    themeToggle.addEventListener("click", function () {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
      }
      try {
        localStorage.setItem("mezzanine-theme", isDark ? "light" : "dark");
      } catch (e) {}
      reflectThemeState();
    });
  }

  // Logo marquee - pause the continuous scroll while offscreen (perf, not just decoration)
  var marqueeTrack = document.getElementById("logo-marquee");
  if (marqueeTrack && "IntersectionObserver" in window) {
    var marqueeIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          marqueeTrack.classList.toggle("is-paused", !entry.isIntersecting);
        });
      },
      { threshold: 0 }
    );
    marqueeIO.observe(marqueeTrack);
  }

  // Contact form -> Web3Forms.
  // The site is static on Vercel, so submissions go to Web3Forms' API, which
  // emails them on. We post over fetch so the page can keep its inline success
  // state instead of bouncing to Web3Forms' default thank-you page.
  var form = document.querySelector("#contact-form");
  if (form) {
    var errorBox = document.querySelector("#form-error");
    var submitBtn = form.querySelector("[type=submit]");
    var submitLabel = submitBtn ? submitBtn.textContent : "";
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var validateField = function (field) {
      var wrap = field.closest(".field");
      var value = field.value.trim();
      var ok = value !== "" && (field.type !== "email" || emailPattern.test(value));
      if (wrap) wrap.classList.toggle("has-error", !ok);
      return ok;
    };

    form.querySelectorAll("[required]").forEach(function (field) {
      // Only re-validate after a field has already failed once, so we never
      // shout at someone who is still mid-typing.
      field.addEventListener("blur", function () {
        if (field.closest(".field") && field.closest(".field").classList.contains("has-error")) validateField(field);
      });
      field.addEventListener("input", function () {
        var wrap = field.closest(".field");
        if (wrap && wrap.classList.contains("has-error")) validateField(field);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var firstInvalid = null;
      form.querySelectorAll("[required]").forEach(function (field) {
        if (!validateField(field) && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      if (errorBox) errorBox.hidden = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending\u2026";
      }

      fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form)
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || !data.success) throw new Error(data.message || "Web3Forms responded " + res.status);
          });
        })
        .then(function () {
          var success = document.querySelector("#form-success");
          form.hidden = true;
          if (success) {
            success.hidden = false;
            success.setAttribute("tabindex", "-1");
            success.focus();
          }
        })
        .catch(function () {
          if (errorBox) errorBox.hidden = false;
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitLabel;
          }
        });
    });
  }
})();
