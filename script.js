const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".site-nav");
const faqItems = document.querySelectorAll(".faq-item");

const cursorDot = document.createElement("div");
const cursorRing = document.createElement("div");
const cursorGlow = document.createElement("div");

cursorDot.className = "cursor-dot";
cursorRing.className = "cursor-ring";
cursorGlow.className = "cursor-glow";
document.body.append(cursorGlow, cursorRing, cursorDot);

const cursorState = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  targetX: window.innerWidth / 2,
  targetY: window.innerHeight / 2,
  ringX: window.innerWidth / 2,
  ringY: window.innerHeight / 2,
};

const rootStyle = document.documentElement.style;

const starThreshold = 80;
let stars = [];
let starMouseX = window.innerWidth / 2;
let starMouseY = window.innerHeight / 2;
let starFramePending = false;

// Generate random stars across the viewport and hero
function generateStars() {
  const heroSection = document.querySelector(".hero");
  if (!heroSection) return;

  // Create 80 scattered stars across full background
  for (let i = 0; i < 80; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.position = "fixed";
    star.style.left = Math.random() * window.innerWidth + "px";
    star.style.top = Math.random() * window.innerHeight + "px"; // Full viewport height
    star.style.width = Math.random() * 2 + 1 + "px";
    star.style.height = star.style.width;
    star.style.borderRadius = "50%";
    star.style.background =
      "rgba(255, 255, 255, " + (Math.random() * 0.8 + 0.2) + ")";
    star.style.pointerEvents = "none";
    star.style.zIndex = "10";
    document.body.appendChild(star);
    stars.push(star);
  }
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function animateCursor() {
  cursorState.x = lerp(cursorState.x, cursorState.targetX, 0.22);
  cursorState.y = lerp(cursorState.y, cursorState.targetY, 0.22);
  cursorState.ringX = lerp(cursorState.ringX, cursorState.targetX, 0.14);
  cursorState.ringY = lerp(cursorState.ringY, cursorState.targetY, 0.14);

  cursorDot.style.transform = `translate3d(${cursorState.x}px, ${cursorState.y}px, 0)`;
  cursorRing.style.transform = `translate3d(${cursorState.ringX}px, ${cursorState.ringY}px, 0)`;
  cursorGlow.style.transform = `translate3d(${cursorState.ringX}px, ${cursorState.ringY}px, 0)`;

  requestAnimationFrame(animateCursor);
}

function updateStarHover() {
  if (stars.length === 0) {
    starFramePending = false;
    return;
  }

  stars.forEach((star) => {
    const rect = star.getBoundingClientRect();
    const starX = rect.left + rect.width / 2;
    const starY = rect.top + rect.height / 2;
    const dx = starMouseX - starX;
    const dy = starMouseY - starY;
    const distance = Math.hypot(dx, dy);

    if (distance < starThreshold) {
      star.classList.add("star-active");
    } else {
      star.classList.remove("star-active");
    }
  });

  starFramePending = false;
}

document.addEventListener("mousemove", (event) => {
  cursorState.targetX = event.clientX;
  cursorState.targetY = event.clientY;
  starMouseX = event.clientX;
  starMouseY = event.clientY;

  const offsetX = (event.clientX - window.innerWidth / 2) * 0.02;
  const offsetY = (event.clientY - window.innerHeight / 2) * 0.02;
  rootStyle.setProperty("--star-offset-x", `${offsetX}px`);
  rootStyle.setProperty("--star-offset-y", `${offsetY}px`);

  if (!starFramePending && stars.length > 0) {
    starFramePending = true;
    requestAnimationFrame(updateStarHover);
  }
});

document.addEventListener("mousedown", () => {
  cursorRing.classList.add("cursor-click");
  cursorGlow.classList.add("cursor-click");
});

document.addEventListener("mouseup", () => {
  cursorRing.classList.remove("cursor-click");
  cursorGlow.classList.remove("cursor-click");
});

const hoverTargets = document.querySelectorAll("a, button, .hero-button");
hoverTargets.forEach((target) => {
  target.addEventListener("pointerenter", () => {
    cursorRing.classList.add("cursor-hover");
    cursorGlow.classList.add("cursor-hover");
  });
  target.addEventListener("pointerleave", () => {
    cursorRing.classList.remove("cursor-hover");
    cursorGlow.classList.remove("cursor-hover");
  });
});

navToggle?.addEventListener("click", () => {
  navMenu?.classList.toggle("open");
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!navMenu?.contains(target) && !navToggle?.contains(target)) {
    navMenu?.classList.remove("open");
  }
});

faqItems.forEach((item) => {
  const button = item.querySelector(".faq-question");
  button?.addEventListener("click", () => {
    item.classList.toggle("open");
  });
});

const revealElements = document.querySelectorAll(".scroll-reveal");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.2,
    rootMargin: "0px 0px -10% 0px",
  },
);

revealElements.forEach((el, index) => {
  if (
    !el.classList.contains("reveal-left") &&
    !el.classList.contains("reveal-right")
  ) {
    el.classList.add(index % 2 === 0 ? "reveal-left" : "reveal-right");
  }
  revealObserver.observe(el);
});

// Schedule tab switching
const scheduleTabs = document.querySelectorAll(".schedule-tab");
const scheduleDays = document.querySelectorAll(".schedule-day");

scheduleTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const day = tab.getAttribute("data-day");

    // Remove active class from all tabs and days
    scheduleTabs.forEach((t) => t.classList.remove("active"));
    scheduleDays.forEach((d) => d.classList.remove("active"));

    // Add active class to clicked tab and corresponding day
    tab.classList.add("active");
    document
      .querySelector(`.schedule-day[data-day="${day}"]`)
      .classList.add("active");
  });
});

generateStars();
animateCursor();
