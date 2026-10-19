/* Idle "pause" screen: after IDLE_SECONDS without interaction, a bouncing box appears.
   Any movement, key press, touch or scroll brings the site back. */
(function () {
    const IDLE_SECONDS = 45;          // change to taste
    const SIZE = window.innerWidth < 600 ? 110 : 160;
    const COLOURS = [
        ["#ee0028", "#fff"], ["#ffb300", "#111"], ["#ff6900", "#111"],
        ["#00b548", "#111"], ["#04548a", "#fff"]
    ];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let timer, raf, last, colourIndex = 0;
    let x, y, vx, vy;
    let overlay, box, msg;

    function build() {
        overlay = document.createElement("div");
        overlay.className = "idle-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-label", "Paused. Move the mouse or press any key to continue.");
        overlay.innerHTML =
            '<div class="idle-box" aria-hidden="true">BANG</div>' +
            '<p class="idle-text">Paused. Move your mouse or press any key to continue.</p>' +
            '<p class="idle-corner" aria-live="polite"></p>';
        document.body.appendChild(overlay);
        box = overlay.querySelector(".idle-box");
        msg = overlay.querySelector(".idle-corner");
        box.style.width = box.style.height = SIZE + "px";
    }

    function paint() {
        const [bg, fg] = COLOURS[colourIndex % COLOURS.length];
        box.style.background = bg;
        box.style.color = fg;
    }

    function rand(a, b) { return a + Math.random() * (b - a); }

    function show() {
        if (overlay && overlay.classList.contains("on")) return;
        if (!overlay) build();
        overlay.classList.add("on");
        document.body.style.overflow = "hidden";
        msg.textContent = "";

        const maxX = window.innerWidth - SIZE, maxY = window.innerHeight - SIZE;
        // random start spot and slightly different random speeds make corner hits very rare
        x = rand(SIZE, Math.max(SIZE, maxX - SIZE));
        y = rand(SIZE, Math.max(SIZE, maxY - SIZE));
        vx = rand(110, 190) * (Math.random() < 0.5 ? -1 : 1);
        vy = rand(80, 150) * (Math.random() < 0.5 ? -1 : 1);
        paint();
        place();

        if (!reduceMotion) { last = performance.now(); raf = requestAnimationFrame(step); }
    }

    function hide() {
        if (!overlay || !overlay.classList.contains("on")) return;
        overlay.classList.remove("on");
        document.body.style.overflow = "";
        cancelAnimationFrame(raf);
    }

    function place() { box.style.transform = "translate(" + x + "px," + y + "px)"; }

    function jitter(v) {
        // tiny random change after every bounce keeps the path from ever settling into a corner
        const s = Math.abs(v) * (1 + (Math.random() - 0.5) * 0.08);
        return Math.min(220, Math.max(70, s)) * Math.sign(v);
    }

    function step(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const maxX = window.innerWidth - SIZE, maxY = window.innerHeight - SIZE;
        let hitX = false, hitY = false;

        x += vx * dt; y += vy * dt;
        if (x <= 0) { x = 0; vx = Math.abs(vx); hitX = true; }
        else if (x >= maxX) { x = maxX; vx = -Math.abs(vx); hitX = true; }
        if (y <= 0) { y = 0; vy = Math.abs(vy); hitY = true; }
        else if (y >= maxY) { y = maxY; vy = -Math.abs(vy); hitY = true; }

        if (hitX || hitY) {
            colourIndex++; paint();
            if (hitX) vy = jitter(vy);
            if (hitY) vx = jitter(vx);
            if (hitX && hitY) {
                msg.textContent = "A perfect corner! That almost never happens.";
                setTimeout(function () { msg.textContent = ""; }, 4000);
            }
        }
        place();
        raf = requestAnimationFrame(step);
    }

    function activity(e) {
        if (overlay && overlay.classList.contains("on")) {
            // ignore the tiny mouse jitter right as the overlay appears
            if (e && e.type === "mousemove" && Math.abs(e.movementX) + Math.abs(e.movementY) < 3) return;
            hide();
        }
        clearTimeout(timer);
        timer = setTimeout(show, IDLE_SECONDS * 1000);
    }

    ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"].forEach(function (ev) {
        window.addEventListener(ev, activity, { passive: true });
    });
    window.addEventListener("resize", function () {
        if (overlay && overlay.classList.contains("on")) {
            x = Math.min(x, window.innerWidth - SIZE); y = Math.min(y, window.innerHeight - SIZE); place();
        }
    });
    activity();
})();