const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".site-nav");
const navOverlay = document.querySelector(".nav-overlay");
const navClose = document.querySelector(".nav-close");
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
  navOverlay?.classList.toggle("open");
});

navClose?.addEventListener("click", () => {
  navMenu?.classList.remove("open");
  navOverlay?.classList.remove("open");
});

navOverlay?.addEventListener("click", () => {
  navMenu?.classList.remove("open");
  navOverlay?.classList.remove("open");
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (
    !navMenu?.contains(target) &&
    !navToggle?.contains(target) &&
    !navOverlay?.contains(target)
  ) {
    navMenu?.classList.remove("open");
    navOverlay?.classList.remove("open");
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

// Initialize Lucide icons
if (typeof lucide !== "undefined") {
  lucide.createIcons();
}
const API_BASE_URL =
  (window.location.hostname === "localhost" &&
    window.location.port !== "3000" &&
    window.location.port !== "") ||
  (window.location.hostname === "127.0.0.1" &&
    window.location.port !== "3000" &&
    window.location.port !== "")
    ? "http://localhost:3000"
    : "";

async function loadMembers() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/members`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.success && Array.isArray(data.members)) {
      const track = document.getElementById("team-track");
      const featuredGrid = document.getElementById("featured-members-grid");
      const featuredSection = document.getElementById("featured-members-section");

      if (track) track.innerHTML = "";
      if (featuredGrid) featuredGrid.innerHTML = "";

      // Sort featured by featured_order; keep non-featured in original order
      const featuredMembers = data.members
        .filter((m) => m.is_featured)
        .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));
      const regularMembers = data.members.filter((m) => !m.is_featured);

      function buildCard(member) {
        const card = document.createElement("div");
        card.className = "member-card";
        card.setAttribute("data-instagram", member.instagram || "");
        card.setAttribute("data-facebook", member.facebook || "");
        card.setAttribute("data-twitter", member.twitter || "");
        card.setAttribute("data-linkedin", member.linkedin || "");
        card.setAttribute("data-reddit", member.reddit || "");
        card.setAttribute("data-featured", member.is_featured ? "true" : "false");
        card.setAttribute("data-featured-order", member.featured_order || 0);

        let socialsHtml = "";
        if (member.instagram)
          socialsHtml += `<a href="${formatAbsoluteUrl(member.instagram)}" class="social-icon instagram" target="_blank"><i class="fa-brands fa-instagram"></i></a>`;
        if (member.facebook)
          socialsHtml += `<a href="${formatAbsoluteUrl(member.facebook)}" class="social-icon facebook" target="_blank"><i class="fa-brands fa-facebook"></i></a>`;
        if (member.twitter)
          socialsHtml += `<a href="${formatAbsoluteUrl(member.twitter)}" class="social-icon twitter" target="_blank"><i class="fa-brands fa-x-twitter"></i></a>`;
        if (member.linkedin)
          socialsHtml += `<a href="${formatAbsoluteUrl(member.linkedin)}" class="social-icon linkedin" target="_blank"><i class="fa-brands fa-linkedin"></i></a>`;
        if (member.reddit)
          socialsHtml += `<a href="${formatAbsoluteUrl(member.reddit)}" class="social-icon reddit" target="_blank"><i class="fa-brands fa-reddit"></i></a>`;

        card.innerHTML = `
          <div class="member-image-wrapper">
            <img src="${member.image_url}" alt="${member.name}" class="member-img">
          </div>
          <div class="member-info">
            <h3 class="member-name">${member.name}</h3>
            <span class="member-role">${member.role}</span>
            <div class="member-socials">${socialsHtml}</div>
          </div>
        `;
        return card;
      }

      // Featured members → leadership grid only (not in carousel)
      if (featuredGrid && featuredSection) {
        featuredMembers.forEach((member) => {
          const card = buildCard(member);
          card.classList.add("featured-member-card");
          featuredGrid.appendChild(card);
        });
        featuredSection.style.display = featuredMembers.length > 0 ? "block" : "none";
      }

      // Regular members → carousel track only
      if (track) {
        regularMembers.forEach((member) => {
          track.appendChild(buildCard(member));
        });
      }
    }
  } catch (err) {
    console.error("Error loading team members:", err);
  }
}

/**
 * For the static-HTML fallback: physically MOVES featured cards from #team-track
 * into #featured-members-grid so they never appear in both places at once.
 */
function renderFeaturedSection() {
  const featuredSection = document.getElementById("featured-members-section");
  const featuredGrid = document.getElementById("featured-members-grid");
  const track = document.getElementById("team-track");
  if (!featuredSection || !featuredGrid || !track) return;

  // Collect featured cards from the track and MOVE them (not clone)
  const featuredCards = Array.from(track.querySelectorAll(".member-card:not(.cloned)[data-featured='true']"))
    .sort((a, b) => {
      return (
        parseInt(a.getAttribute("data-featured-order") || "0", 10) -
        parseInt(b.getAttribute("data-featured-order") || "0", 10)
      );
    });

  if (featuredCards.length === 0) {
    featuredSection.style.display = "none";
    return;
  }

  featuredSection.style.display = "block";
  featuredCards.forEach((card) => {
    card.classList.add("featured-member-card");
    featuredGrid.appendChild(card); // moves the node — removes it from track automatically
  });
}

async function initTeam() {
  sanitizeAllLinks();
  await loadMembers();

  setupTeamCarousel();

  // Check if already authenticated or visiting the admin route/query/hash
  const isAuthSession =
    sessionStorage.getItem("admin_authenticated") === "true";
  const isAdminRoute =
    window.location.pathname === "/admin/iit_ism_1290e-summit" ||
    window.location.search.includes("admin=true") ||
    window.location.hash === "#admin";

  if (isAuthSession || isAdminRoute) {
    if (isAuthSession) {
      isAdminActive = true;
      enterAdminMode();
    } else {
      openAdminModal();
    }
  }
}

/* --- ADMIN MODE FUNCTIONALITY --- */

const adminModal = document.getElementById("admin-passcode-modal");
const adminLoginForm = document.getElementById("admin-login-form");
const adminPasscode = document.getElementById("admin-passcode");
const adminModalCancel = document.getElementById("admin-modal-cancel");
const adminLoginError = document.getElementById("admin-login-error");

const adminBar = document.getElementById("admin-control-bar");
const adminAddEvent = document.getElementById("admin-add-event");
const adminAddMember = document.getElementById("admin-add-member");
const adminSaveBtn = document.getElementById("admin-save");
const adminExitBtn = document.getElementById("admin-exit");

let isAdminActive = false;

initTeam();

function openAdminModal() {
  adminModal.classList.add("open");
  adminPasscode.focus();
}

function closeAdminModal() {
  adminModal.classList.remove("open");
  adminLoginError.textContent = "";
  adminPasscode.value = "";
  // If not authenticated, redirect back to home page
  if (!isAdminActive) {
    window.location.href = "/";
  }
}

adminModalCancel.addEventListener("click", closeAdminModal);

adminAddMember?.addEventListener("click", () => {
  const teamSection = document.getElementById("team");
  if (teamSection) {
    teamSection.scrollIntoView({ behavior: "smooth" });
    const addBtn = teamSection.querySelector(".admin-insection-add-btn");
    if (addBtn) addBtn.click();
  }
});

adminAddEvent?.addEventListener("click", () => {
  const eventsSection = document.getElementById("events");
  if (eventsSection) {
    eventsSection.scrollIntoView({ behavior: "smooth" });
    const addBtn = eventsSection.querySelector(".admin-insection-add-btn");
    if (addBtn) addBtn.click();
  }
});

adminLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const passcodeValue = adminPasscode.value;
  adminLoginError.textContent = "Authenticating...";

  let connectionFailed = false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: passcodeValue }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        isAdminActive = true;
        sessionStorage.setItem("admin_authenticated", "true");
        sessionStorage.setItem("admin_token", passcodeValue); // retained for API auth headers
        adminModal.classList.remove("open");
        enterAdminMode();
        return;
      } else {
        adminLoginError.textContent = data.message || "Invalid passcode";
        return;
      }
    } else {
      // Server returned error status (like 404 for missing route on static server)
      connectionFailed = true;
    }
  } catch (err) {
    // Fetch failed entirely (server not running)
    connectionFailed = true;
    console.warn(
      "Express server not running, falling back to client-side check...",
    );
  }

  // Fallback for static servers (like VS Code Live Server on port 5501)
  // NOTE: passcode check is intentionally server-side only; direct offline editing is not supported.
  if (connectionFailed) {
    adminLoginError.textContent =
      "Cannot connect to the server. Please ensure the Node.js server is running (npm start) and try again.";
  }
});

function handleAdminLinkClick(e) {
  if (document.body.classList.contains("admin-mode")) {
    e.preventDefault();
  }
}

function handleAdminLinkDblClick(e) {
  if (!document.body.classList.contains("admin-mode")) return;
  e.preventDefault();
  e.stopPropagation();

  const link = e.currentTarget;
  const currentHref = link.getAttribute("href") || "";
  const newHref = prompt(
    `Change link URL for "${link.textContent.trim()}":`,
    currentHref,
  );

  if (newHref !== null) {
    let formattedHref = newHref.trim();
    if (
      formattedHref &&
      !formattedHref.startsWith("#") &&
      !formattedHref.startsWith("/") &&
      !formattedHref.startsWith("mailto:") &&
      !formattedHref.startsWith("tel:") &&
      !/^(https?:\/\/|\/\/)/i.test(formattedHref)
    ) {
      formattedHref = "https://" + formattedHref;
    }

    const linkText = link.textContent.trim().toLowerCase();

    // Globally update "Buy Tickets" and "IIC" duplicate links
    if (linkText.includes("buy ticket") || linkText === "iic") {
      let count = 0;
      document.querySelectorAll("a").forEach((el) => {
        const elText = el.textContent.trim().toLowerCase();
        if (elText.includes("buy ticket") || elText === "iic") {
          if (
            (linkText.includes("buy ticket") &&
              elText.includes("buy ticket")) ||
            (linkText === "iic" && elText === "iic")
          ) {
            el.setAttribute("href", formattedHref);
            count++;
          }
        }
      });
      alert(
        `Updated all ${count} matching "${link.textContent.trim()}" links on the page.\nMake sure to save changes!`,
      );
    } else {
      // For event links and others, only update the clicked link
      link.setAttribute("href", formattedHref);
      alert(`Link updated to: ${formattedHref}\nMake sure to save changes!`);
    }
  }
}

function enterAdminMode() {
  document.body.classList.add("admin-mode");
  adminBar.classList.add("open");

  // Remove clones and unpack group containers for editing
  const track = document.getElementById("team-track");
  if (track) {
    const groups = track.querySelectorAll(".team-group");
    if (groups.length > 0) {
      const firstGroup = groups[0];
      const originalCards = Array.from(firstGroup.children);
      originalCards.forEach((card) => {
        if (!card.classList.contains("cloned")) {
          track.appendChild(card);
        } else {
          card.remove();
        }
      });
      groups.forEach((g) => g.remove());
    }
    track.querySelectorAll(".cloned").forEach((el) => el.remove());
  }

  // Make editable: headings, paragraphs, strong text, span tags in cards, etc.
  const editableSelectors = [
    "h1",
    "h2",
    "h3:not(.hero-brand-title)",
    "h4",
    "p",
    "strong",
    ".event-link",
    ".member-name",
    ".member-role",
    ".timeline-card h4",
    ".timeline-card p",
    ".event-time",
    ".event-venue",
    ".sponsor-card span",
    ".button-primary",
    ".button-secondary",
    ".iic-badge",
    ".google-form-link",
    ".schedule-tab",
    ".footer-links a",
  ];

  document.querySelectorAll(editableSelectors.join(", ")).forEach((el) => {
    el.setAttribute("contenteditable", "true");
  });

  // Set up double-click URLs for Buy Tickets, IIC, Event, and Form links
  const editableLinks = document.querySelectorAll(
    ".button-primary, .button-secondary, .iic-badge, .event-link, .google-form-link",
  );
  editableLinks.forEach((link) => {
    link.removeEventListener("click", handleAdminLinkClick);
    link.removeEventListener("dblclick", handleAdminLinkDblClick);
    link.addEventListener("click", handleAdminLinkClick);
    link.addEventListener("dblclick", handleAdminLinkDblClick);
    link.setAttribute(
      "title",
      "Double-click to edit link destination, edit text directly.",
    );
  });

  // Also make footer links editable and bind double-click handler
  const footerLinks = document.querySelectorAll(".footer-links a");
  footerLinks.forEach((link) => {
    link.setAttribute("contenteditable", "true");
    link.removeEventListener("click", handleAdminLinkClick);
    link.removeEventListener("dblclick", handleAdminLinkDblClick);
    link.addEventListener("click", handleAdminLinkClick);
    link.addEventListener("dblclick", handleAdminLinkDblClick);
    link.setAttribute(
      "title",
      "Double-click to edit link destination, edit text directly.",
    );
  });

  // Attach delete buttons to existing cards
  addDeleteButtons();

  // Attach image upload handlers to member card images
  setupImageUploads();

  // Inject in-section Add buttons dynamically
  injectInSectionAddButtons();

  // Inject social media editors
  setupSocialEditors();

  // Attach social media double-click highlight popover editor
  setupSocialDoubleClickEditor();

  // Attach featured member toggle buttons
  setupFeaturedToggles();

  // Change cursor style in admin mode to default since it's hard to edit text with custom pointer
  document.body.style.cursor = "default";
  const customDot = document.querySelector(".cursor-dot");
  const customRing = document.querySelector(".cursor-ring");
  const customGlow = document.querySelector(".cursor-glow");
  if (customDot) customDot.style.display = "none";
  if (customRing) customRing.style.display = "none";
  if (customGlow) customGlow.style.display = "none";
}

function addDeleteButtons() {
  // Clear any existing delete buttons first
  document.querySelectorAll(".admin-delete-btn").forEach((btn) => btn.remove());

  const cards = document.querySelectorAll(
    ".event-card, .member-card, .timeline-event, .faq-item, .sponsor-card",
  );
  cards.forEach((card) => {
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "admin-delete-btn";
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "Delete item";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this item?")) {
        card.remove();
      }
    });

    // For timeline event, append delete button to the timeline-card for styling
    if (card.classList.contains("timeline-event")) {
      const timelineCard = card.querySelector(".timeline-card");
      if (timelineCard) {
        timelineCard.appendChild(deleteBtn);
      } else {
        card.appendChild(deleteBtn);
      }
    } else {
      card.appendChild(deleteBtn);
    }
  });
}

function setupImageUploads() {
  // Remove existing upload overlays
  document
    .querySelectorAll(".admin-image-upload-overlay")
    .forEach((overlay) => overlay.remove());

  // 1. Members image upload
  const memberCards = document.querySelectorAll(".member-card");
  memberCards.forEach((card) => {
    const wrapper = card.querySelector(".member-image-wrapper");
    const img = card.querySelector(".member-img");
    const nameEl = card.querySelector(".member-name");

    if (!wrapper || !img) return;

    const overlay = document.createElement("div");
    overlay.className = "admin-image-upload-overlay";
    overlay.innerHTML = `<button class="admin-image-upload-btn"><i data-lucide="image"></i> Change Photo</button>`;

    overlay.addEventListener("click", (e) => {
      e.stopPropagation();

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";

      fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          img.src = reader.result; // Set source to local base64 data url (no immediate file write, no live-reload)
          img.alt = nameEl ? nameEl.textContent.trim() : "member";
        };
        reader.readAsDataURL(file);
      });

      document.body.appendChild(fileInput);
      fileInput.click();
      fileInput.remove();
    });

    wrapper.appendChild(overlay);
  });

  // 2. Sponsors image upload (Change logo option)
  const sponsorCards = document.querySelectorAll(".sponsor-card");
  sponsorCards.forEach((card) => {
    const img = card.querySelector("img");
    const categoryEl = card.querySelector("span");
    if (!img) return;

    const overlay = document.createElement("div");
    overlay.className = "admin-image-upload-overlay";
    overlay.innerHTML = `<button class="admin-image-upload-btn"><i data-lucide="image"></i> Change Logo</button>`;

    overlay.addEventListener("click", (e) => {
      e.stopPropagation();

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";

      fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          img.src = reader.result; // Set source to local base64 data url
          img.alt = categoryEl ? categoryEl.textContent.trim() : "sponsor";
        };
        reader.readAsDataURL(file);
      });

      document.body.appendChild(fileInput);
      fileInput.click();
      fileInput.remove();
    });

    card.appendChild(overlay);
  });

  if (typeof lucide !== "undefined") lucide.createIcons();
}

function injectInSectionAddButtons() {
  // Clear any existing in-section add buttons first
  document
    .querySelectorAll(".admin-insection-add-btn")
    .forEach((btn) => btn.remove());

  // Helper to create an add button
  function createAddButton(text, iconName, onClickHandler) {
    const btn = document.createElement("button");
    btn.className = "admin-insection-add-btn";
    btn.innerHTML = `<i data-lucide="${iconName}"></i> ${text}`;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      onClickHandler(btn);
    });
    return btn;
  }

  // 1. Events Section Add Button
  const eventsGrid = document.querySelector(".events-grid");
  if (eventsGrid) {
    const btn = createAddButton("Add Event Card", "plus-circle", () => {
      const newCard = document.createElement("article");
      newCard.className = "event-card";
      newCard.innerHTML = `
        <h3 contenteditable="true">NEW EVENT TITLE</h3>
        <p contenteditable="true">Description of the new event. Write about rules, tracks, prizes, or schedules here.</p>
        <a href="#" class="event-link" contenteditable="true">Learn More →</a>
      `;
      eventsGrid.insertBefore(newCard, btn);

      const link = newCard.querySelector(".event-link");
      if (link) {
        link.addEventListener("click", handleAdminLinkClick);
        link.addEventListener("dblclick", handleAdminLinkDblClick);
        link.setAttribute(
          "title",
          "Double-click to edit link destination, edit text directly.",
        );
      }

      addDeleteButtons();
      newCard.scrollIntoView({ behavior: "smooth" });
    });
    eventsGrid.appendChild(btn);
  }

  // 2. Team Section Add Button
  const teamTrack = document.getElementById("team-track");
  if (teamTrack) {
    const btn = createAddButton("Add Team Member", "user-plus", () => {
      const newCard = document.createElement("div");
      newCard.className = "member-card";
      newCard.setAttribute("data-instagram", "");
      newCard.setAttribute("data-facebook", "");
      newCard.setAttribute("data-twitter", "");
      newCard.setAttribute("data-linkedin", "");
      newCard.setAttribute("data-reddit", "");
      newCard.setAttribute("data-featured", "false");
      newCard.setAttribute("data-featured-order", "0");
      newCard.innerHTML = `
        <div class="member-image-wrapper">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80" alt="New Member" class="member-img" />
        </div>
        <div class="member-info">
          <h3 class="member-name" contenteditable="true">New Member Name</h3>
          <span class="member-role" contenteditable="true">Position / Role</span>
        </div>
      `;
      teamTrack.insertBefore(newCard, btn);
      addDeleteButtons();
      setupImageUploads();
      setupSocialEditors();
      setupFeaturedToggles();
      newCard.scrollIntoView({ behavior: "smooth" });
    });
    teamTrack.appendChild(btn);
  }

  // 3. Timeline Event Add Buttons (for each day timeline)
  const timelines = document.querySelectorAll(".schedule-timeline");
  timelines.forEach((timeline) => {
    const btn = createAddButton("Add Event to Timeline", "plus-circle", () => {
      const newEvent = document.createElement("div");
      newEvent.className = "timeline-event";
      newEvent.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-card">
          <span class="event-time" contenteditable="true">12:00 PM</span>
          <h4 contenteditable="true">New Timeline Event</h4>
          <p class="event-venue" contenteditable="true">Venue: Room X</p>
          <p contenteditable="true">Event details and timing info go here.</p>
        </div>
      `;
      timeline.insertBefore(newEvent, btn);
      addDeleteButtons();
      newEvent.scrollIntoView({ behavior: "smooth" });
    });
    timeline.appendChild(btn);
  });

  // 4. FAQs Section Add Button
  const faqGrid = document.querySelector(".faq-grid");
  if (faqGrid) {
    const btn = createAddButton("Add FAQ Item", "plus-circle", () => {
      const newItem = document.createElement("div");
      newItem.className = "faq-item";
      newItem.innerHTML = `
        <button class="faq-question" contenteditable="true">New Frequently Asked Question?</button>
        <div class="faq-answer"><p contenteditable="true">Answer details go here. Explain the rules, requirements, or logistics.</p></div>
      `;

      // Register click to expand/collapse FAQ question
      const button = newItem.querySelector(".faq-question");
      button?.addEventListener("click", () => {
        newItem.classList.toggle("open");
      });

      faqGrid.insertBefore(newItem, btn);
      addDeleteButtons();
      newItem.scrollIntoView({ behavior: "smooth" });
    });
    faqGrid.appendChild(btn);
  }

  // 5. Sponsors Section Add Button
  const sponsorGrid = document.querySelector(".sponsor-grid");
  if (sponsorGrid) {
    const btn = createAddButton("Add Sponsor Logo", "plus-circle", () => {
      const newCard = document.createElement("div");
      newCard.className = "sponsor-card";
      newCard.innerHTML = `
        <span contenteditable="true">Sponsor Category</span>
        <img src="https://via.placeholder.com/180x80" alt="New Sponsor" />
      `;
      sponsorGrid.insertBefore(newCard, btn);
      addDeleteButtons();
      newCard.scrollIntoView({ behavior: "smooth" });
    });
    sponsorGrid.appendChild(btn);
  }

  if (typeof lucide !== "undefined") lucide.createIcons();
}

// Admin Footer Editor
const adminFooterModal = document.getElementById("admin-footer-modal");
const adminFooterForm = document.getElementById("admin-footer-form");
const adminFooterCancel = document.getElementById("admin-footer-cancel");
const adminEditFooterBtn = document.getElementById("admin-edit-footer");
const adminGoTicketsBtn = document.getElementById("admin-go-tickets");

// Triple-click detection on Buy Tickets buttons
let buyTicketsClickCount = 0;
let buyTicketsClickTimer = null;

function handleBuyTicketsTripleClick(e) {
  buyTicketsClickCount++;

  if (buyTicketsClickCount === 1) {
    buyTicketsClickTimer = setTimeout(() => {
      buyTicketsClickCount = 0;
    }, 500); // Reset counter after 500ms
  }

  if (buyTicketsClickCount === 3) {
    clearTimeout(buyTicketsClickTimer);
    buyTicketsClickCount = 0;
    // Navigate to tickets page on triple click
    window.location.href = "/tickets.html";
  }
}

// Open Footer Editor Modal
adminEditFooterBtn?.addEventListener("click", () => {
  // Load current social media URLs into form
  const instaLink = document.querySelector(
    '.social-links a[title="Instagram"]',
  );
  const twitterLink = document.querySelector(
    '.social-links a[title="Twitter"]',
  );
  const linkedinLink = document.querySelector(
    '.social-links a[title="LinkedIn"]',
  );
  const fbLink = document.querySelector('.social-links a[title="Facebook"]');

  document.getElementById("admin-instagram").value =
    instaLink?.getAttribute("href") || "";
  document.getElementById("admin-twitter").value =
    twitterLink?.getAttribute("href") || "";
  document.getElementById("admin-linkedin").value =
    linkedinLink?.getAttribute("href") || "";
  document.getElementById("admin-facebook").value =
    fbLink?.getAttribute("href") || "";

  adminFooterModal.classList.add("open");
});

// Close Footer Editor Modal
adminFooterCancel?.addEventListener("click", () => {
  adminFooterModal.classList.remove("open");
});

// Save Footer Changes
adminFooterForm?.addEventListener("submit", (e) => {
  e.preventDefault();

  const instagramUrl = document.getElementById("admin-instagram").value;
  const twitterUrl = document.getElementById("admin-twitter").value;
  const linkedinUrl = document.getElementById("admin-linkedin").value;
  const facebookUrl = document.getElementById("admin-facebook").value;

  // Update all footer links across the site
  const socialLinks = document.querySelectorAll(".social-links a");
  socialLinks.forEach((link) => {
    const title = link.getAttribute("title");
    if (title === "Instagram") link.setAttribute("href", instagramUrl);
    if (title === "Twitter") link.setAttribute("href", twitterUrl);
    if (title === "LinkedIn") link.setAttribute("href", linkedinUrl);
    if (title === "Facebook") link.setAttribute("href", facebookUrl);
  });

  adminFooterModal.classList.remove("open");
  alert(
    "Social media links updated! Don't forget to Save Changes to persist them.",
  );
});

// Navigate to Tickets Page
adminGoTicketsBtn?.addEventListener("click", () => {
  window.location.href = "/tickets.html";
});

// Setup triple-click on all Buy Tickets buttons
function setupBuyTicketsTripleClick() {
  const buyTicketsButtons = document.querySelectorAll(
    'a[href="/tickets.html"]',
  );
  buyTicketsButtons.forEach((btn) => {
    if (btn.textContent.toLowerCase().includes("buy ticket")) {
      btn.addEventListener("click", (e) => {
        // Allow normal click to work, but count for triple-click
        if (buyTicketsClickCount === 0) {
          buyTicketsClickCount = 1;
          buyTicketsClickTimer = setTimeout(() => {
            buyTicketsClickCount = 0;
          }, 500);
        } else if (buyTicketsClickCount === 1) {
          buyTicketsClickCount = 2;
        } else if (buyTicketsClickCount === 2) {
          buyTicketsClickCount = 3;
          clearTimeout(buyTicketsClickTimer);
          buyTicketsClickCount = 0;
          // Triple click detected - will navigate naturally since href is set
        }
      });
    }
  });
}

// Exit Admin Mode
adminExitBtn.addEventListener("click", () => {
  if (
    confirm(
      "Are you sure you want to exit Admin Mode? Any unsaved changes will be lost.",
    )
  ) {
    sessionStorage.removeItem("admin_authenticated");
    window.location.href = "/";
  }
});

// Save Changes
adminSaveBtn.addEventListener("click", async () => {
  adminSaveBtn.textContent = "Saving...";
  adminSaveBtn.disabled = true;

  // Clone document to clean it
  const docClone = document.documentElement.cloneNode(true);

  // Clean the clone
  docClone.classList.remove("admin-mode");
  docClone.removeAttribute("style"); // Remove dynamic HTML style variables
  const bodyClone = docClone.querySelector("body");
  if (bodyClone) {
    bodyClone.classList.remove("admin-mode");
    bodyClone.style.cursor = "";
    if (bodyClone.getAttribute("class") === "") {
      bodyClone.removeAttribute("class");
    }
    if (bodyClone.getAttribute("style") === "") {
      bodyClone.removeAttribute("style");
    }
  }

  // Remove admin-specific elements in the clone
  docClone.querySelectorAll(".admin-delete-btn").forEach((btn) => btn.remove());
  docClone
    .querySelectorAll(".admin-insection-add-btn")
    .forEach((btn) => btn.remove());
  docClone
    .querySelectorAll(".admin-image-upload-overlay")
    .forEach((overlay) => overlay.remove());
  docClone
    .querySelectorAll(".admin-social-editor")
    .forEach((editor) => editor.remove());
  docClone
    .querySelectorAll(".admin-featured-btn")
    .forEach((btn) => btn.remove());
  docClone
    .querySelectorAll(".admin-featured-order-controls")
    .forEach((el) => el.remove());
  docClone.querySelectorAll("[contenteditable]").forEach((el) => {
    el.removeAttribute("contenteditable");
  });

  // Remove the dynamically-injected social media popover overlay
  const socialPopover = docClone.querySelector("#admin-social-popover");
  if (socialPopover) socialPopover.remove();

  // Remove browser extension injected elements (Apollo, etc.)
  docClone.querySelectorAll(".extension-opener-icon").forEach((el) => el.remove());
  docClone.querySelectorAll("[id^='zp-']").forEach((el) => el.remove());
  docClone.querySelectorAll(".apolloio-css-vars-reset").forEach((el) => el.remove());
  docClone.querySelectorAll(".zp").forEach((el) => {
    // Only remove elements that are clearly Apollo extension widgets (no src content)
    if (el.closest(".extension-opener-icon") || el.id.startsWith("zp-")) el.remove();
  });

  // Strip browser extension attributes from the root <html> element
  const htmlEl = docClone.querySelector("html") || docClone;
  [
    "data-extension-installed",
    "data-extension-id",
    "data-extension-version",
    "data-extension-manifest-version",
  ].forEach((attr) => htmlEl.removeAttribute(attr));

  // Strip any other data-extension-* attributes dynamically
  Array.from(htmlEl.attributes || []).forEach((attr) => {
    if (attr.name.startsWith("data-extension")) htmlEl.removeAttribute(attr.name);
  });

  // Remove dynamic cursor and star elements
  docClone
    .querySelectorAll(".cursor-dot, .cursor-ring, .cursor-glow, .star")
    .forEach((el) => el.remove());

  // Remove temporary admin tooltips set by Double-click hint
  docClone.querySelectorAll("[title*='Double-click']").forEach((el) => {
    el.removeAttribute("title");
  });

  // Remove live-server injected HTML comment nodes
  (function stripLiveServerComments(node) {
    const childNodes = Array.from(node.childNodes);
    childNodes.forEach((child) => {
      if (child.nodeType === 8 /* COMMENT_NODE */) {
        const text = child.nodeValue || "";
        if (text.includes("live-server") || text.includes("Code injected")) {
          child.remove();
        }
      } else if (child.childNodes && child.childNodes.length) {
        stripLiveServerComments(child);
      }
    });
  })(docClone);

  // Remove temporary scroll reveal visible states so animations trigger on fresh load
  docClone.querySelectorAll(".scroll-reveal").forEach((el) => {
    el.classList.remove("visible");
  });

  // Reset schedule tabs and days to default (Day 1 active) in saved HTML
  docClone.querySelectorAll(".schedule-tab").forEach((tab, idx) => {
    if (idx === 0) tab.classList.add("active");
    else tab.classList.remove("active");
  });
  docClone.querySelectorAll(".schedule-day").forEach((day, idx) => {
    if (idx === 0) day.classList.add("active");
    else day.classList.remove("active");
  });

  // Remove Chrome extension stylesheet links
  docClone
    .querySelectorAll("link[href^='chrome-extension://']")
    .forEach((link) => link.remove());

  // Remove Live Server scripts
  docClone.querySelectorAll("script").forEach((script) => {
    if (
      script.textContent.includes("Live reload enabled.") ||
      script.textContent.includes("live-server") ||
      script.textContent.includes("WebSocket")
    ) {
      script.remove();
    }
  });

  // Unpack team-group containers and remove clones in the saved HTML to preserve clean static markup
  const cloneTrack = docClone.querySelector("#team-track");
  if (cloneTrack) {
    const groups = cloneTrack.querySelectorAll(".team-group");
    if (groups.length > 0) {
      const firstGroup = groups[0];
      const originalCards = Array.from(firstGroup.children);
      originalCards.forEach((card) => {
        if (!card.classList.contains("cloned")) {
          cloneTrack.appendChild(card);
        }
      });
      groups.forEach((g) => g.remove());
    }
    cloneTrack.querySelectorAll(".cloned").forEach((el) => el.remove());
  }

  // Reset admin modal and admin bar back to standard closed state in HTML source
  const bar = docClone.querySelector("#admin-control-bar");
  if (bar) bar.classList.remove("open");

  const cloneSaveBtn = docClone.querySelector("#admin-save");
  if (cloneSaveBtn) {
    cloneSaveBtn.removeAttribute("disabled");
    cloneSaveBtn.innerHTML = `<i data-lucide="save"></i> Save Changes`;
  }

  const modal = docClone.querySelector("#admin-passcode-modal");
  if (modal) {
    modal.classList.remove("open");
    const errorText = modal.querySelector(".admin-error-text");
    if (errorText) errorText.textContent = "";
    const passwordInput = modal.querySelector("input[type='password']");
    if (passwordInput) passwordInput.value = "";
  }

  // Clean all image URLs to be relative in the saved HTML (removes absolute port origins)
  docClone.querySelectorAll("img").forEach((img) => {
    const srcAttr = img.getAttribute("src");
    if (srcAttr && srcAttr.includes("/public/")) {
      const idx = srcAttr.indexOf("/public/");
      img.setAttribute("src", srcAttr.substring(idx + 1)); // "public/member_xxx.png"
    }
  });

  const finalHtml = "<!DOCTYPE html>\n" + docClone.outerHTML;

  try {
    const adminToken = sessionStorage.getItem("admin_token") || "";
    const response = await fetch(`${API_BASE_URL}/api/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Passcode": adminToken,
      },
      body: JSON.stringify({
        html: finalHtml,
        page_path: window.location.pathname,
      }),
    });

    const data = await response.json();
    if (data.success) {
      alert("Changes saved successfully!");
    } else {
      alert("Error saving: " + data.message);
    }
  } catch (err) {
    alert("Failed to communicate with the local server to save changes.");
    console.error(err);
  } finally {
    adminSaveBtn.textContent = "Save Changes";
    adminSaveBtn.disabled = false;
    // Force Lucide icons to update on our button locally if needed
    if (typeof lucide !== "undefined") lucide.createIcons();
  }
});

// Initialize triple-click handler for Buy Tickets buttons when page loads
document.addEventListener("DOMContentLoaded", setupBuyTicketsTripleClick);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupBuyTicketsTripleClick);
} else {
  setupBuyTicketsTripleClick();
}

function setupTeamCarousel() {
  const track = document.getElementById("team-track");
  if (
    !track ||
    document.body.classList.contains("admin-mode") ||
    track.classList.contains("static-grid")
  )
    return;

  // Remove existing cloned or group elements
  const groups = track.querySelectorAll(".team-group");
  if (groups.length > 0) {
    const firstGroup = groups[0];
    const originalCards = Array.from(firstGroup.children);
    originalCards.forEach((card) => track.appendChild(card));
    groups.forEach((g) => g.remove());
  }
  track.querySelectorAll(".cloned").forEach((el) => el.remove());

  const originalCards = Array.from(track.children);
  if (originalCards.length === 0) return;

  // Calculate card width + gap (360px + 32px gap = 392px)
  const itemWidth = 392;
  const setWidth = originalCards.length * itemWidth;

  // Calculate how many times we need to repeat the set to exceed the viewport width
  const minWidthRequired = window.innerWidth + 400;
  const K = Math.ceil(minWidthRequired / setWidth);

  // Create Group 1
  const group1 = document.createElement("div");
  group1.className = "team-group";

  // Populate Group 1 (including repetitions if K > 1)
  const baseCards = [];
  for (let k = 0; k < K; k++) {
    originalCards.forEach((card) => {
      if (k === 0) {
        group1.appendChild(card);
        baseCards.push(card);
      } else {
        const clone = card.cloneNode(true);
        clone.classList.add("cloned");
        clone.removeAttribute("contenteditable");
        clone
          .querySelectorAll("[contenteditable]")
          .forEach((el) => el.removeAttribute("contenteditable"));
        group1.appendChild(clone);
        baseCards.push(clone);
      }
    });
  }

  // Create Group 2 (Clone of Group 1)
  const group2 = document.createElement("div");
  group2.className = "team-group cloned";
  baseCards.forEach((card) => {
    const clone = card.cloneNode(true);
    clone.classList.add("cloned");
    clone.removeAttribute("contenteditable");
    clone
      .querySelectorAll("[contenteditable]")
      .forEach((el) => el.removeAttribute("contenteditable"));
    group2.appendChild(clone);
  });

  // Append groups to track
  track.appendChild(group1);
  track.appendChild(group2);
}

function setupSocialEditors() {
  // Remove existing editors if any
  document
    .querySelectorAll(".admin-social-editor")
    .forEach((el) => el.remove());

  document.querySelectorAll(".member-card").forEach((card) => {
    const editor = document.createElement("div");
    editor.className = "admin-social-editor";
    editor.innerHTML = `
      <select class="admin-social-platform">
        <option value="">+ Add/Edit Social Link</option>
        <option value="instagram">Instagram</option>
        <option value="facebook">Facebook</option>
        <option value="twitter">X / Twitter</option>
        <option value="linkedin">LinkedIn</option>
        <option value="reddit">Reddit</option>
      </select>
      <div class="admin-social-input-row" style="display: none; gap: 0.5rem; margin-top: 0.5rem; align-items: center;">
        <input type="text" class="admin-social-url" placeholder="Paste link here..." style="flex: 1; padding: 0.4rem; border-radius: 6px; border: 1px solid var(--border); background: #000; color: #fff; font-size: 0.8rem;">
        <button class="admin-social-save-btn button button-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-radius: 6px; border: none; height: auto;">Save</button>
      </div>
    `;

    const select = editor.querySelector(".admin-social-platform");
    const inputRow = editor.querySelector(".admin-social-input-row");
    const input = editor.querySelector(".admin-social-url");
    const saveBtn = editor.querySelector(".admin-social-save-btn");

    select.addEventListener("change", () => {
      const platform = select.value;
      if (platform) {
        // Populate input with existing value
        const existingUrl = card.getAttribute(`data-${platform}`) || "";
        input.value = existingUrl;
        inputRow.style.display = "flex";
      } else {
        inputRow.style.display = "none";
      }
    });

    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const platform = select.value;
      const url = input.value.trim();

      if (platform) {
        const absoluteUrl = url ? formatAbsoluteUrl(url) : "";
        card.setAttribute(`data-${platform}`, absoluteUrl);

        // Rebuild socials HTML in the card
        updateCardSocialsHTML(card);
        alert(
          `Updated ${platform} link successfully! Make sure to save changes.`,
        );

        // Reset editor
        select.value = "";
        inputRow.style.display = "none";
      }
    });

    // Make sure click on editor input/select doesn't trigger parent clicks
    editor.addEventListener("click", (e) => e.stopPropagation());

    const info = card.querySelector(".member-info");
    if (info) {
      info.appendChild(editor);
    } else {
      card.appendChild(editor);
    }
  });
}

/**
 * Injects a "Mark as Featured / Unmark" toggle button on each member card.
 * Featured members appear in the Leadership section at the top.
 * Admin can also shift a card's featured_order up/down to reorder the leadership grid.
 */
function setupFeaturedToggles() {
  // Remove any existing toggle buttons first
  document.querySelectorAll(".admin-featured-btn").forEach((btn) => btn.remove());
  document.querySelectorAll(".admin-featured-order-controls").forEach((el) => el.remove());

  // Operate on cards in BOTH the featured grid AND the regular carousel track
  const allCards = Array.from(
    document.querySelectorAll(
      "#featured-members-grid .member-card, #team-track .member-card:not(.cloned)"
    )
  );

  allCards.forEach((card) => {
    const isFeatured = card.getAttribute("data-featured") === "true";
    const featuredOrder = parseInt(card.getAttribute("data-featured-order") || "0", 10);

    // --- Feature toggle button ---
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "admin-featured-btn" + (isFeatured ? " is-featured" : "");
    toggleBtn.type = "button";
    toggleBtn.innerHTML = isFeatured
      ? `<span>✓ Featured (Leadership)</span>`
      : `<span>☆ Mark as Featured</span>`;
    toggleBtn.title = isFeatured
      ? "Click to remove from Leadership section"
      : "Click to add to Leadership section at the top";

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const track = document.getElementById("team-track");
      const featuredGrid = document.getElementById("featured-members-grid");
      const featuredSection = document.getElementById("featured-members-section");
      const currentlyFeatured = card.getAttribute("data-featured") === "true";

      if (currentlyFeatured) {
        // Un-feature: move card back to team-track
        card.setAttribute("data-featured", "false");
        card.setAttribute("data-featured-order", "0");
        card.classList.remove("featured-member-card");
        if (track) {
          // Insert before the "Add Member" button if present
          const addBtn = track.querySelector(".admin-insection-add-btn");
          addBtn ? track.insertBefore(card, addBtn) : track.appendChild(card);
        }
        // Hide featured section if now empty
        if (featuredSection && featuredGrid && featuredGrid.querySelectorAll(".member-card").length === 0) {
          featuredSection.style.display = "none";
        }
      } else {
        // Feature: assign next order and move card to featured grid
        const existingFeatured = Array.from(
          document.querySelectorAll("#featured-members-grid .member-card")
        );
        const maxOrder = existingFeatured.reduce((max, c) => {
          return Math.max(max, parseInt(c.getAttribute("data-featured-order") || "0", 10));
        }, -1);
        card.setAttribute("data-featured", "true");
        card.setAttribute("data-featured-order", String(maxOrder + 1));
        card.classList.add("featured-member-card");
        if (featuredGrid) featuredGrid.appendChild(card);
        if (featuredSection) featuredSection.style.display = "block";
      }

      // Refresh toggle buttons on all cards
      setupFeaturedToggles();
    });

    // --- Order controls (only shown when featured) ---
    if (isFeatured) {
      const orderControls = document.createElement("div");
      orderControls.className = "admin-featured-order-controls";
      orderControls.innerHTML = `
        <span class="featured-order-label">Position: ${featuredOrder + 1}</span>
        <button type="button" class="featured-order-btn" data-dir="up" title="Move left / earlier">↑</button>
        <button type="button" class="featured-order-btn" data-dir="down" title="Move right / later">↓</button>
      `;

      orderControls.querySelectorAll(".featured-order-btn").forEach((ob) => {
        ob.addEventListener("click", (e) => {
          e.stopPropagation();
          const dir = ob.getAttribute("data-dir");
          const currentOrder = parseInt(card.getAttribute("data-featured-order") || "0", 10);

          // All featured cards are now in #featured-members-grid
          const allFeatured = Array.from(
            document.querySelectorAll("#featured-members-grid .member-card")
          ).sort((a, b) => {
            return (
              parseInt(a.getAttribute("data-featured-order") || "0", 10) -
              parseInt(b.getAttribute("data-featured-order") || "0", 10)
            );
          });

          const idx = allFeatured.indexOf(card);
          const swapIdx = dir === "up" ? idx - 1 : idx + 1;

          if (swapIdx >= 0 && swapIdx < allFeatured.length) {
            const swapCard = allFeatured[swapIdx];
            const swapOrder = parseInt(swapCard.getAttribute("data-featured-order") || "0", 10);
            card.setAttribute("data-featured-order", String(swapOrder));
            swapCard.setAttribute("data-featured-order", String(currentOrder));
            // Physically reorder in DOM to match
            const featuredGrid = document.getElementById("featured-members-grid");
            if (featuredGrid) {
              const sortedNow = Array.from(featuredGrid.querySelectorAll(".member-card")).sort(
                (a, b) =>
                  parseInt(a.getAttribute("data-featured-order") || "0", 10) -
                  parseInt(b.getAttribute("data-featured-order") || "0", 10)
              );
              sortedNow.forEach((c) => featuredGrid.appendChild(c));
            }
          }

          setupFeaturedToggles();
        });
      });

      orderControls.addEventListener("click", (e) => e.stopPropagation());

      const info = card.querySelector(".member-info");
      if (info) {
        const socialEditor = info.querySelector(".admin-social-editor");
        socialEditor
          ? info.insertBefore(orderControls, socialEditor)
          : info.appendChild(orderControls);
      } else {
        card.appendChild(orderControls);
      }
    }

    const info = card.querySelector(".member-info");
    if (info) {
      const insertBefore =
        info.querySelector(".admin-featured-order-controls") ||
        info.querySelector(".admin-social-editor");
      insertBefore
        ? info.insertBefore(toggleBtn, insertBefore)
        : info.appendChild(toggleBtn);
    } else {
      card.appendChild(toggleBtn);
    }
  });
}


function updateCardSocialsHTML(card) {
  let socialsContainer = card.querySelector(".member-socials");
  if (!socialsContainer) {
    socialsContainer = document.createElement("div");
    socialsContainer.className = "member-socials";
    const info = card.querySelector(".member-info");
    if (info) {
      const editor = info.querySelector(".admin-social-editor");
      if (editor) {
        info.insertBefore(socialsContainer, editor);
      } else {
        info.appendChild(socialsContainer);
      }
    } else {

      card.appendChild(socialsContainer);
    }
  }

  const instagram = card.getAttribute("data-instagram") || "";
  const facebook = card.getAttribute("data-facebook") || "";
  const twitter = card.getAttribute("data-twitter") || "";
  const linkedin = card.getAttribute("data-linkedin") || "";
  const reddit = card.getAttribute("data-reddit") || "";

  let socialsHtml = "";
  if (instagram)
    socialsHtml += `<a href="${formatAbsoluteUrl(instagram)}" class="social-icon instagram" target="_blank"><i class="fa-brands fa-instagram"></i></a>`;
  if (facebook)
    socialsHtml += `<a href="${formatAbsoluteUrl(facebook)}" class="social-icon facebook" target="_blank"><i class="fa-brands fa-facebook"></i></a>`;
  if (twitter)
    socialsHtml += `<a href="${formatAbsoluteUrl(twitter)}" class="social-icon twitter" target="_blank"><i class="fa-brands fa-x-twitter"></i></a>`;
  if (linkedin)
    socialsHtml += `<a href="${formatAbsoluteUrl(linkedin)}" class="social-icon linkedin" target="_blank"><i class="fa-brands fa-linkedin"></i></a>`;
  if (reddit)
    socialsHtml += `<a href="${formatAbsoluteUrl(reddit)}" class="social-icon reddit" target="_blank"><i class="fa-brands fa-reddit"></i></a>`;

  socialsContainer.innerHTML = socialsHtml;
}

function formatAbsoluteUrl(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^(https?:\/\/|\/\/)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function sanitizeAllLinks() {
  document.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href");
    if (
      href &&
      !href.startsWith("#") &&
      !href.startsWith("/") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("tel:") &&
      !/^(https?:\/\/|\/\/)/i.test(href)
    ) {
      link.setAttribute("href", "https://" + href);
    }
  });
}

/* --- SOCIAL MEDIA DOUBLE-CLICK HIGHLIGHT EDITOR --- */
let currentTargetSocialLink = null;

function setupSocialDoubleClickEditor() {
  createSocialPopover();

  const socialLinks = document.querySelectorAll(
    ".social-icon, .social-links a, .member-socials a",
  );

  socialLinks.forEach((link) => {
    link.removeAttribute("contenteditable");

    link.removeEventListener("click", handleSocialLinkClick);
    link.addEventListener("click", handleSocialLinkClick);

    link.removeEventListener("dblclick", handleSocialLinkDblClick);
    link.addEventListener("dblclick", handleSocialLinkDblClick);

    if (document.body.classList.contains("admin-mode")) {
      link.setAttribute(
        "title",
        "Double-click to edit social media link in highlight popup.",
      );
    }
  });
}

function handleSocialLinkClick(e) {
  if (document.body.classList.contains("admin-mode")) {
    e.preventDefault();
  }
}

function handleSocialLinkDblClick(e) {
  if (!document.body.classList.contains("admin-mode")) return;
  e.preventDefault();
  e.stopPropagation();

  const link = e.currentTarget;
  currentTargetSocialLink = link;

  const currentHref = link.getAttribute("href") || "";
  const popover = document.getElementById("admin-social-popover");
  const urlInput = document.getElementById("popoverUrlInput");
  const titleEl = popover?.querySelector(".admin-social-popover-title");

  let platformName = "Social Media";
  const cls = (link.className || "").toLowerCase();
  const ttl = (link.title || "").toLowerCase();

  if (cls.includes("instagram") || ttl.includes("instagram")) platformName = "Instagram";
  else if (cls.includes("facebook") || ttl.includes("facebook")) platformName = "Facebook";
  else if (cls.includes("twitter") || ttl.includes("twitter")) platformName = "X / Twitter";
  else if (cls.includes("linkedin") || ttl.includes("linkedin")) platformName = "LinkedIn";
  else if (cls.includes("reddit") || ttl.includes("reddit")) platformName = "Reddit";

  if (titleEl) {
    titleEl.innerHTML = `<i data-lucide="share-2"></i> Edit ${platformName} Link`;
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  if (urlInput) urlInput.value = currentHref;
  popover?.classList.add("active");
  setTimeout(() => urlInput?.focus(), 100);
}

function createSocialPopover() {
  if (document.getElementById("admin-social-popover")) return;
  const overlay = document.createElement("div");
  overlay.id = "admin-social-popover";
  overlay.className = "admin-social-popover-overlay";
  overlay.innerHTML = `
    <div class="admin-social-popover-card">
      <div class="admin-social-popover-header">
        <span class="admin-social-popover-title"><i data-lucide="share-2"></i> Edit Social Link</span>
        <button type="button" class="admin-social-popover-close" id="popoverCloseBtn">&times;</button>
      </div>
      <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 0.75rem;">Edit destination URL for this handle:</p>
      <input type="url" id="popoverUrlInput" class="admin-social-popover-input" placeholder="https://..." />
      <div class="admin-social-popover-actions">
        <button type="button" id="popoverCancelBtn" class="button button-secondary">Cancel</button>
        <button type="button" id="popoverSaveBtn" class="button button-primary">Save Link</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector("#popoverCloseBtn");
  const cancelBtn = overlay.querySelector("#popoverCancelBtn");
  const saveBtn = overlay.querySelector("#popoverSaveBtn");
  const input = overlay.querySelector("#popoverUrlInput");

  closeBtn?.addEventListener("click", () => overlay.classList.remove("active"));
  cancelBtn?.addEventListener("click", () => overlay.classList.remove("active"));

  saveBtn?.addEventListener("click", () => {
    if (!currentTargetSocialLink) return;

    const rawUrl = input.value.trim();
    const formattedUrl = rawUrl ? formatAbsoluteUrl(rawUrl) : "#";
    currentTargetSocialLink.setAttribute("href", formattedUrl);

    const memberCard = currentTargetSocialLink.closest(".member-card");
    if (memberCard) {
      let platform = "instagram";
      const cls = currentTargetSocialLink.className.toLowerCase();
      if (cls.includes("facebook")) platform = "facebook";
      else if (cls.includes("twitter")) platform = "twitter";
      else if (cls.includes("linkedin")) platform = "linkedin";
      else if (cls.includes("reddit")) platform = "reddit";

      memberCard.setAttribute(`data-${platform}`, formattedUrl);
    }

    overlay.classList.remove("active");
    alert("Social media handle link updated! Click Save Changes on the top bar to persist.");
  });

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      saveBtn?.click();
    }
  });
}

