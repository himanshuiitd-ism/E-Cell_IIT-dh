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
if (typeof lucide !== 'undefined') {
  lucide.createIcons();
}
setupTeamCarousel();

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

const API_BASE_URL = window.location.origin.includes("localhost:3000") ? "" : "http://localhost:3000";

let isAdminActive = false;

// Check if already authenticated or visiting the admin route/query/hash
const isAuthSession = sessionStorage.getItem("admin_authenticated") === "true";
const isAdminRoute = 
  window.location.pathname === "/admin/iit" ||
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
    console.warn("Express server not running, falling back to client-side check...");
  }

  // Fallback for static servers (like VS Code Live Server on port 5501)
  if (connectionFailed) {
    const correctPasscode = "IITDHANBADECELL2620";
    if (passcodeValue === correctPasscode) {
      isAdminActive = true;
      sessionStorage.setItem("admin_authenticated", "true");
      adminModal.classList.remove("open");
      enterAdminMode();
      alert("Authenticated via client-side fallback (Live Server detected).\n\nNOTE: You can edit the page, but 'Save Changes' will only work if you run the Node.js server (using 'npm start' on port 3000).");
    } else {
      adminLoginError.textContent = "Invalid passcode";
    }
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
  const newHref = prompt(`Change link URL for "${link.textContent.trim()}":`, currentHref);
  
  if (newHref !== null) {
    const linkText = link.textContent.trim().toLowerCase();
    
    // Globally update "Buy Tickets" and "IIC" duplicate links
    if (linkText.includes("buy ticket") || linkText === "iic") {
      let count = 0;
      document.querySelectorAll("a").forEach(el => {
        const elText = el.textContent.trim().toLowerCase();
        if (elText.includes("buy ticket") || elText === "iic") {
          if ((linkText.includes("buy ticket") && elText.includes("buy ticket")) || (linkText === "iic" && elText === "iic")) {
            el.setAttribute("href", newHref);
            count++;
          }
        }
      });
      alert(`Updated all ${count} matching "${link.textContent.trim()}" links on the page.\nMake sure to save changes!`);
    } else {
      // For event links and others, only update the clicked link
      link.setAttribute("href", newHref);
      alert(`Link updated to: ${newHref}\nMake sure to save changes!`);
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
      originalCards.forEach(card => {
        if (!card.classList.contains("cloned")) {
          track.appendChild(card);
        } else {
          card.remove();
        }
      });
      groups.forEach(g => g.remove());
    }
    track.querySelectorAll(".cloned").forEach(el => el.remove());
  }

  // Make editable: headings, paragraphs, strong text, span tags in cards, etc.
  const editableSelectors = [
    "h1", "h2", "h3:not(.hero-brand-title)", "h4", "p", 
    ".event-link", ".member-name", ".member-role", 
    ".timeline-card h4", ".timeline-card p", ".event-time", ".event-venue",
    ".sponsor-card span", ".button-primary", ".button-secondary", ".iic-badge"
  ];
  
  document.querySelectorAll(editableSelectors.join(", ")).forEach(el => {
    el.setAttribute("contenteditable", "true");
  });

  // Set up double-click URLs for Buy Tickets, IIC, and Event links
  const editableLinks = document.querySelectorAll(".button-primary, .button-secondary, .iic-badge, .event-link");
  editableLinks.forEach(link => {
    link.removeEventListener("click", handleAdminLinkClick);
    link.removeEventListener("dblclick", handleAdminLinkDblClick);
    link.addEventListener("click", handleAdminLinkClick);
    link.addEventListener("dblclick", handleAdminLinkDblClick);
    link.setAttribute("title", "Double-click to edit link destination, edit text directly.");
  });

  // Attach delete buttons to existing cards
  addDeleteButtons();

  // Attach image upload handlers to member card images
  setupImageUploads();

  // Inject in-section Add buttons dynamically
  injectInSectionAddButtons();

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
  document.querySelectorAll(".admin-delete-btn").forEach(btn => btn.remove());

  const cards = document.querySelectorAll(".event-card, .member-card, .timeline-event, .faq-item, .sponsor-card");
  cards.forEach(card => {
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
  document.querySelectorAll(".admin-image-upload-overlay").forEach(overlay => overlay.remove());

  const memberCards = document.querySelectorAll(".member-card");
  memberCards.forEach(card => {
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

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function injectInSectionAddButtons() {
  // Clear any existing in-section add buttons first
  document.querySelectorAll(".admin-insection-add-btn").forEach(btn => btn.remove());

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
        link.setAttribute("title", "Double-click to edit link destination, edit text directly.");
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
      newCard.scrollIntoView({ behavior: "smooth" });
    });
    teamTrack.appendChild(btn);
  }

  // 3. Timeline Event Add Buttons (for each day timeline)
  const timelines = document.querySelectorAll(".schedule-timeline");
  timelines.forEach(timeline => {
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

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Exit Admin Mode
adminExitBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to exit Admin Mode? Any unsaved changes will be lost.")) {
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
  docClone.querySelectorAll(".admin-delete-btn").forEach(btn => btn.remove());
  docClone.querySelectorAll(".admin-insection-add-btn").forEach(btn => btn.remove());
  docClone.querySelectorAll(".admin-image-upload-overlay").forEach(overlay => overlay.remove());
  docClone.querySelectorAll("[contenteditable]").forEach(el => {
    el.removeAttribute("contenteditable");
  });

  // Remove dynamic cursor and star elements
  docClone.querySelectorAll(".cursor-dot, .cursor-ring, .cursor-glow, .star").forEach(el => el.remove());

  // Remove temporary admin tooltips
  docClone.querySelectorAll(".button-primary, .button-secondary, .iic-badge, .event-link").forEach(link => {
    link.removeAttribute("title");
  });

  // Remove temporary scroll reveal visible states so animations trigger on fresh load
  docClone.querySelectorAll(".scroll-reveal").forEach(el => {
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
  docClone.querySelectorAll("link[href^='chrome-extension://']").forEach(link => link.remove());

  // Remove Live Server scripts
  docClone.querySelectorAll("script").forEach(script => {
    if (script.textContent.includes("Live reload enabled.") || script.textContent.includes("live-server") || script.textContent.includes("WebSocket")) {
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
      originalCards.forEach(card => {
        if (!card.classList.contains("cloned")) {
          cloneTrack.appendChild(card);
        }
      });
      groups.forEach(g => g.remove());
    }
    cloneTrack.querySelectorAll(".cloned").forEach(el => el.remove());
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
  docClone.querySelectorAll("img").forEach(img => {
    const srcAttr = img.getAttribute("src");
    if (srcAttr && srcAttr.includes("/public/")) {
      const idx = srcAttr.indexOf("/public/");
      img.setAttribute("src", srcAttr.substring(idx + 1)); // "public/member_xxx.png"
    }
  });

  const finalHtml = "<!DOCTYPE html>\n" + docClone.outerHTML;

  try {
    const response = await fetch(`${API_BASE_URL}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: finalHtml }),
    });

    const data = await response.json();
    if (data.success) {
      alert("Changes saved successfully to index.html!");
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
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
});


function setupTeamCarousel() {
  const track = document.getElementById("team-track");
  if (!track || document.body.classList.contains("admin-mode")) return;
  
  // Remove existing cloned or group elements
  const groups = track.querySelectorAll(".team-group");
  if (groups.length > 0) {
    const firstGroup = groups[0];
    const originalCards = Array.from(firstGroup.children);
    originalCards.forEach(card => track.appendChild(card));
    groups.forEach(g => g.remove());
  }
  track.querySelectorAll(".cloned").forEach(el => el.remove());
  
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
    originalCards.forEach(card => {
      if (k === 0) {
        group1.appendChild(card);
        baseCards.push(card);
      } else {
        const clone = card.cloneNode(true);
        clone.classList.add("cloned");
        clone.removeAttribute("contenteditable");
        clone.querySelectorAll("[contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
        group1.appendChild(clone);
        baseCards.push(clone);
      }
    });
  }
  
  // Create Group 2 (Clone of Group 1)
  const group2 = document.createElement("div");
  group2.className = "team-group cloned";
  baseCards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add("cloned");
    clone.removeAttribute("contenteditable");
    clone.querySelectorAll("[contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
    group2.appendChild(clone);
  });
  
  // Append groups to track
  track.appendChild(group1);
  track.appendChild(group2);
}



