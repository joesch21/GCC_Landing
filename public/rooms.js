/**
 * 18+ lounge helpers — age self-attestation + room entry video flow.
 * Not KYC; session/local acknowledgment only.
 */
const AGE_ACK_KEY = "gcc-landing:age-ack-18";

const AGE_GATE_COPY = {
  title: "Hold on, darling…",
  body:
    "Companion Room and Game Room are for members who are 18 or older. " +
    "This is a self-attestation only — not identity verification. " +
    "Confirm you are over 18 to continue, or stay on the main site.",
  affirm: "I'm 18+ — continue",
  decline: "Not for me",
};

const ROOMS = {
  companion: {
    id: "companion",
    title: "Companion Room",
    entryPage: "companion-room.html",
    video: "/media/companion-room/entry.mp4",
    destination: "https://goldcondor.ngrok.io/",
    continueLabel: "Enter Companion Room",
  },
  game: {
    id: "game",
    title: "Game Room",
    entryPage: "game-room.html",
    video: "/media/game-room/entry.mp4",
    destination: "https://pavid-dorsey-prohibitory.ngrok-free.dev",
    continueLabel: "Enter Game Room",
  },
};

function hasAgeAck() {
  try {
    return localStorage.getItem(AGE_ACK_KEY) === "1";
  } catch {
    return false;
  }
}

function setAgeAck() {
  try {
    localStorage.setItem(AGE_ACK_KEY, "1");
  } catch {
    /* private mode — proceed for this session only */
  }
}

function ensureAgeModal() {
  let root = document.getElementById("ageGateModal");
  if (root) return root;

  root = document.createElement("div");
  root.id = "ageGateModal";
  root.className = "age-gate";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "ageGateTitle");
  root.innerHTML = `
    <div class="age-gate__scrim" data-age-decline></div>
    <div class="age-gate__panel">
      <p class="eyebrow age-gate__eyebrow"><span class="age-gate__badge">18+</span> Members lounge</p>
      <h2 id="ageGateTitle">${AGE_GATE_COPY.title}</h2>
      <p class="age-gate__body">${AGE_GATE_COPY.body}</p>
      <div class="age-gate__actions">
        <button type="button" class="btn btn--primary" data-age-affirm>${AGE_GATE_COPY.affirm}</button>
        <button type="button" class="btn btn--outline" data-age-decline>${AGE_GATE_COPY.decline}</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);
  return root;
}

/**
 * Prompt for 18+ if needed, then run onOk.
 * @returns {Promise<boolean>} true if allowed through
 */
function requireAgeGate() {
  if (hasAgeAck()) return Promise.resolve(true);

  const modal = ensureAgeModal();
  modal.hidden = false;
  document.body.classList.add("age-gate-open");

  return new Promise((resolve) => {
    const cleanup = (ok) => {
      modal.hidden = true;
      document.body.classList.remove("age-gate-open");
      modal.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      resolve(ok);
    };
    const onClick = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("[data-age-affirm]")) {
        setAgeAck();
        cleanup(true);
      } else if (t.closest("[data-age-decline]")) {
        cleanup(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") cleanup(false);
    };
    modal.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    const affirm = modal.querySelector("[data-age-affirm]");
    if (affirm) affirm.focus();
  });
}

/** Navigate to a room entry page after age gate. */
async function openRoomEntry(roomKey) {
  const room = ROOMS[roomKey];
  if (!room) return;
  const ok = await requireAgeGate();
  if (!ok) return;
  window.location.href = room.entryPage;
}

/** Wire landing-page room cards / links (`data-room="companion|game"`). */
function initRoomLaunchers() {
  document.querySelectorAll("[data-room]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const key = el.getAttribute("data-room");
      openRoomEntry(key);
    });
  });
}

/**
 * Room entry page: age gate → play entry.mp4 → continue to destination.
 * Expects #roomEntryVideo, #roomEnterBtn, optional #roomSkipBtn
 * and body[data-room-id="companion"|"game"].
 */
async function initRoomEntryPage() {
  const roomId = document.body.getAttribute("data-room-id");
  const room = roomId ? ROOMS[roomId] : null;
  if (!room) return;

  const ok = await requireAgeGate();
  if (!ok) {
    window.location.replace("index.html#members-18");
    return;
  }

  const video = document.getElementById("roomEntryVideo");
  const enterBtn = document.getElementById("roomEnterBtn");
  const skipBtn = document.getElementById("roomSkipBtn");
  const status = document.getElementById("roomEntryStatus");

  const go = () => {
    window.location.href = room.destination;
  };

  if (enterBtn) {
    enterBtn.textContent = room.continueLabel;
    enterBtn.addEventListener("click", go);
  }
  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      if (video) {
        try { video.pause(); } catch (_) { /* ignore */ }
      }
      go();
    });
  }

  if (video) {
    video.addEventListener("ended", () => {
      if (status) status.textContent = "Ready when you are.";
      if (enterBtn) enterBtn.classList.add("btn--primary");
    });
    // Best-effort autoplay after age affirmation (user gesture chain)
    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          if (status) status.textContent = "Tap play on the video, then enter when ready.";
        });
      } else if (status) {
        status.textContent = "Playing entry…";
      }
    };
    if (status) status.textContent = "Playing entry…";
    if (video.readyState >= 2) tryPlay();
    else video.addEventListener("loadeddata", tryPlay, { once: true });
  }
}

window.GCC_ROOMS = {
  ROOMS,
  hasAgeAck,
  requireAgeGate,
  openRoomEntry,
};

window.addEventListener("DOMContentLoaded", () => {
  initRoomLaunchers();
  if (document.body.hasAttribute("data-room-id")) {
    initRoomEntryPage();
  }
});
