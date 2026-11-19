
import { runDiskScheduling } from "./src/disk_scheduling.mjs";

const $ = id => document.getElementById(id);

const state = {
    path: [],
    service: [],
    serviceSteps: [],
    total: 0,
    step: 0,
    timer: null,
    playing: false,
    diskMin: 0,
    diskMax: 199,
    head: 53
};

// --------------------------------------------------
// INPUT HELPERS
// --------------------------------------------------

function getRequests() {
    const text = $("requests").value.trim();

    if (!text) return [];

    return text.split(",").map(value => {
        const trimmed = value.trim();

        if (!/^-?\d+$/.test(trimmed)) {
            throw new Error("Request queue contains invalid values.");
        }

        return Number(trimmed);
    });
}

function validateInputs(requests, head, min, max) {

    if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max) {
        throw new Error("Invalid disk cylinder range.");
    }

    if (!Number.isInteger(head) || head < min || head > max) {
        throw new Error("Head position is outside the disk range.");
    }

    if (requests.length > 1000) {
        throw new Error("Maximum 1000 requests are supported.");
    }

    if (requests.some(value =>
        !Number.isInteger(value) ||
        value < min ||
        value > max
    )) {
        throw new Error("Requests must be valid disk cylinders.");
    }
}


// --------------------------------------------------
// WEBASSEMBLY ANALYSIS
// --------------------------------------------------

$("configForm").addEventListener("submit", event => {
    event.preventDefault();
    analyze();
});

function analyze() {

    stopSimulation();

    try {

        const requests = getRequests();

        const head = Number($("head").value);
        const min = Number($("diskMin").value);
        const max = Number($("diskMax").value);
        const algorithm = Number($("algorithm").value);
        const direction = Number($("direction").value);

        validateInputs(requests, head, min, max);

        state.head = head;
        state.diskMin = min;
        state.diskMax = max;

        const result = runDiskScheduling(
            algorithm,
            requests,
            head,
            min,
            max,
            direction
        );

        state.path = result.path;
        state.service = result.service;
        state.serviceSteps = getServiceSteps(state.path, state.service);
        state.total = result.total;
        state.step = 0;

        updateDashboard();
        renderQueue(requests);
        renderSequence();
        renderChart();

        moveToStep(0);

        $("requestStatus").textContent = "Analysis complete";

    } catch (error) {

        alert(error.message);

    }
}


// --------------------------------------------------
// DASHBOARD
// --------------------------------------------------

function updateDashboard() {

    const count = state.service.length;

    $("totalMovement").textContent =
        state.total.toLocaleString();

    $("completedRequests").innerHTML =
        `${getCompletedRequestCount()}/${count}`;

    $("averageMovement").textContent =
        count ? (state.total / count).toFixed(2) : "0.00";

    $("headPosition").textContent = state.head;

    $("diskMinLabel").textContent = state.diskMin;
    $("diskMaxLabel").textContent = state.diskMax;

    $("currentCylinderInfo").textContent = state.head;

    $("directionLabel").textContent =
        Number($("direction").value) === 1
            ? "Moving right →"
            : "Moving left ←";

    renderTicks();
}

function getServiceSteps(path, service) {
    let pathIndex = 0;

    return service.map(request => {
        while (pathIndex < path.length && path[pathIndex] !== request) {
            pathIndex += 1;
        }

        if (pathIndex === path.length) {
            throw new Error("Could not match the service order to the movement path.");
        }

        return pathIndex;
    });
}

function getCompletedRequestCount() {
    return state.serviceSteps.filter(step => step <= state.step).length;
}

function renderTicks() {

    const container = $("diskTicks");

    container.innerHTML = "";

    const range = state.diskMax - state.diskMin;

    const values = [
        state.diskMin,
        Math.round(state.diskMin + range * 0.25),
        Math.round(state.diskMin + range * 0.5),
        Math.round(state.diskMin + range * 0.75),
        state.diskMax
    ];

    values.forEach(value => {

        const span = document.createElement("span");

        span.textContent = value;

        container.appendChild(span);

    });
}


// --------------------------------------------------
// DISK HEAD
// --------------------------------------------------

function moveHead(cylinder) {

    const range = state.diskMax - state.diskMin;

    const percentage = range === 0
        ? 0
        : ((cylinder - state.diskMin) / range) * 100;

    $("headMarker").style.left = `${percentage}%`;

    $("diskProgress").style.width = `${percentage}%`;

    $("currentCylinder").textContent = cylinder;

    $("headPosition").textContent = cylinder;

    $("currentCylinderInfo").textContent = cylinder;
}

function moveToStep(index) {

    if (!state.path.length) return;

    state.step = Math.max(
        0,
        Math.min(index, state.path.length - 1)
    );

    const current = state.path[state.step];

    const previous = state.step > 0
        ? state.path[state.step - 1]
        : current;

    const distance = Math.abs(current - previous);

    moveHead(current);

    $("nextTarget").textContent =
        state.step < state.path.length - 1
            ? state.path[state.step + 1]
            : "Complete";

    $("stepDistance").textContent =
        `${distance} cylinders`;

    const progress = state.path.length > 1
        ? (state.step / (state.path.length - 1)) * 100
        : 100;

    $("progressBar").style.width = `${progress}%`;

    $("progressText").textContent =
        `${Math.round(progress)}%`;

    $("completedRequests").innerHTML =
        `${getCompletedRequestCount()}/${state.service.length}`;

    highlightSequence();
}


// --------------------------------------------------
// PLAY / PAUSE
// --------------------------------------------------

function stopSimulation() {

    clearTimeout(state.timer);

    state.timer = null;
    state.playing = false;

    $("playBtn").textContent = "▶ Play Simulation";
}

function playSimulation() {

    if (!state.path.length) {
        alert("Analyze an algorithm first.");
        return;
    }

    if (state.playing) {

        stopSimulation();

        return;
    }

    if (state.step >= state.path.length - 1) {
        moveToStep(0);
    }

    state.playing = true;

    $("playBtn").textContent = "Ⅱ Pause Simulation";

    function next() {

        if (!state.playing) return;

        if (state.step >= state.path.length - 1) {

            stopSimulation();

            $("requestStatus").textContent = "Simulation completed";

            return;
        }

        moveToStep(state.step + 1);

        const delay = Number($("speed").value);

        state.timer = setTimeout(next, delay);

    }

    next();
}

$("playBtn").addEventListener("click", playSimulation);


// --------------------------------------------------
// STEP CONTROLS
// --------------------------------------------------

$("stepBtn").addEventListener("click", () => {

    stopSimulation();

    moveToStep(state.step + 1);

});

$("stepBackBtn").addEventListener("click", () => {

    stopSimulation();

    moveToStep(state.step - 1);

});

$("resetBtn").addEventListener("click", () => {

    stopSimulation();

    state.step = 0;

    moveHead(state.head);

    moveToStep(0);

    $("requestStatus").textContent = "Simulation reset";

});


// --------------------------------------------------
// REQUEST QUEUE
// --------------------------------------------------

function renderQueue(requests) {

    const container = $("requestQueue");

    container.innerHTML = "";

    requests.forEach(value => {

        const chip = document.createElement("span");

        chip.className = "queue-chip";

        chip.textContent = value;

        container.appendChild(chip);

    });

}

$("randomBtn").addEventListener("click", () => {

    const min = Number($("diskMin").value);
    const max = Number($("diskMax").value);

    if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max) {
        alert("Enter a valid disk range first.");
        return;
    }

    const requests = [];

    for (let i = 0; i < 8; i++) {

        requests.push(
            Math.floor(Math.random() * (max - min + 1)) + min
        );

    }

    $("requests").value = requests.join(", ");

    renderQueue(requests);

});


// --------------------------------------------------
// SERVICE SEQUENCE
// --------------------------------------------------

function renderSequence() {

    const container = $("serviceOrder");

    container.innerHTML = "";

    if (state.service.length === 0) {
        const emptyState = document.createElement("span");
        emptyState.className = "empty-state";
        emptyState.textContent = "No requests to service.";
        container.appendChild(emptyState);
        return;
    }

    state.service.forEach((value, index) => {

        const item = document.createElement("div");

        item.className = "sequence-item";

        const number = document.createElement("span");

        number.className = "sequence-number";

        number.textContent = value;

        number.dataset.index = index;

        item.appendChild(number);

        if (index < state.service.length - 1) {

            const arrow = document.createElement("span");

            arrow.className = "sequence-arrow";

            arrow.textContent = "→";

            item.appendChild(arrow);

        }

        container.appendChild(item);

    });

}

function highlightSequence() {

    const items = document.querySelectorAll(".sequence-number");

    items.forEach(item => {

        const index = Number(item.dataset.index);
        const completed = state.serviceSteps[index] <= state.step;
        const current = state.serviceSteps[index] === state.step;

        item.classList.toggle("completed", completed && !current);
        item.classList.toggle("current", current);

    });

}


// --------------------------------------------------
// MOVEMENT CHART
// --------------------------------------------------

function renderChart() {

    const canvas = $("movementChart");

    const ctx = canvas.getContext("2d");

    const rect = canvas.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = 260 * dpr;

    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = 260;

    ctx.clearRect(0, 0, width, height);

    if (!state.path.length) return;

    const padding = {
        left: 35,
        right: 15,
        top: 20,
        bottom: 30
    };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const min = state.diskMin;
    const max = state.diskMax;

    // Horizontal grid lines.
    ctx.font = "10px Inter";
    ctx.fillStyle = "#8793ad";
    ctx.strokeStyle = "#263149";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {

        const y = padding.top + chartHeight * i / 4;

        const value = Math.round(
            max - (max - min) * i / 4
        );

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillText(value, 2, y + 3);

    }

    const points = state.path.map((value, index) => {

        const x = padding.left +
            (state.path.length > 1
                ? index / (state.path.length - 1) * chartWidth
                : chartWidth / 2);

        const y = padding.top +
            (max - value) / (max - min) * chartHeight;

        return { x, y, value };

    });

    // Gradient.
    const gradient = ctx.createLinearGradient(
        0,
        padding.top,
        0,
        height
    );

    gradient.addColorStop(0, "#42d9f544");
    gradient.addColorStop(1, "#42d9f500");

    ctx.beginPath();

    ctx.moveTo(points[0].x, points[0].y);

    points.forEach(point => {
        ctx.lineTo(point.x, point.y);
    });

    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.lineTo(points[0].x, height - padding.bottom);

    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.fill();

    // Line.
    ctx.beginPath();

    points.forEach((point, index) => {

        if (index === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }

    });

    ctx.strokeStyle = "#42d9f5";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Points.
    points.forEach((point, index) => {

        ctx.beginPath();

        ctx.arc(
            point.x,
            point.y,
            index === state.step ? 5 : 3,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            index === state.step
                ? "#ffffff"
                : "#42d9f5";

        ctx.fill();

    });

    // X-axis labels.
    ctx.fillStyle = "#8793ad";
    ctx.font = "9px Inter";

    points.forEach((point, index) => {

        if (index % Math.max(1, Math.ceil(points.length / 8)) === 0) {

            ctx.fillText(
                index,
                point.x - 3,
                height - 8
            );

        }

    });

}


// --------------------------------------------------
// THEME TOGGLE
// --------------------------------------------------

$("themeButton").addEventListener("click", () => {

    document.body.classList.toggle("light-theme");

});


// --------------------------------------------------
// INITIAL SETUP
// --------------------------------------------------

renderQueue(getRequests());

renderTicks();

moveHead(state.head);

window.addEventListener("resize", renderChart);
