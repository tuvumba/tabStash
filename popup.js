document.addEventListener("DOMContentLoaded", loadSessions);
document.getElementById("save").addEventListener("click", () => {
    browser.runtime.sendMessage({ action: "saveSession" });
});

async function loadSessions() {
    console.log("Loading sessions...");
    let storedData = await browser.storage.local.get("sessions");
    let sessions = storedData.sessions || [];

    let sessionList = document.getElementById("sessionList");
    sessionList.innerHTML = "";

    sessions.forEach(session => {
        let li = document.createElement("li");

        // div for session name and buttons
        let sessionItem = document.createElement("div");
        sessionItem.classList.add("session-item");

        // session name element
        let nameSpan = document.createElement("span");
        nameSpan.textContent = session.name || `Session ${session.id}`;
        nameSpan.classList.add("session-name");

        // input for editing, hidden by default
        let nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = session.name || `Session ${session.id}`;
        nameInput.classList.add("edit-input");
        nameInput.style.display = "none"; // Hide initially

        // edit button with Unicode icon
        let editBtn = document.createElement("button");
        editBtn.innerHTML = "&#9998;"; // karandashik
        editBtn.classList.add("icon-button");
        editBtn.addEventListener("click", () => startEditing(nameSpan, nameInput, session.id));

        // delete button with Unicode icon
        let deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "&#128465;"; // korzino4ka
        deleteBtn.classList.add("icon-button");
        deleteBtn.addEventListener("click", () => deleteSession(session.id));

        // open button with Unicode icon
        let openBtn = document.createElement("button");
        openBtn.innerHTML = "&#128269;"; // lupa
        openBtn.classList.add("icon-button");
        openBtn.addEventListener("click", () => openSession(session.id));

        sessionItem.appendChild(nameSpan);
        sessionItem.appendChild(nameInput);
        sessionItem.appendChild(editBtn);
        sessionItem.appendChild(deleteBtn);
        sessionItem.appendChild(openBtn);

        li.appendChild(sessionItem);
        sessionList.appendChild(li);
    });

    console.log("Sessions loaded:", sessions);
}


async function restoreSession(sessionId) {
    let storedData = await browser.storage.local.get("sessions");
    let sessions = storedData.sessions || [];
    let session = sessions.find(s => s.id === sessionId);

    if (session) {
        for (let tab of session.tabs) {
            await browser.tabs.create({ url: tab.url });
        }
        console.log("Session restored:", session);
    }
}

function startEditing(nameSpan, nameInput, sessionId) {
    nameSpan.style.display = "none";
    nameInput.style.display = "inline-block";
    nameInput.focus();

    nameInput.addEventListener("blur", () => saveEdit(sessionId, nameInput));
    nameInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            saveEdit(sessionId, nameInput);
        }
    });
}

async function saveEdit(sessionId, nameInput) {
    let newName = nameInput.value.trim();
    if (!newName) return;

    // send the update to the background
    browser.runtime.sendMessage({
        action: "editSession",
        sessionId: sessionId,
        newName: newName
    });
    nameInput.style.display = "none";
}

async function deleteSession(sessionId) {
    browser.runtime.sendMessage({ action: "deleteSession", sessionId: sessionId });
}

async function openSession(sessionId) {
    browser.runtime.sendMessage({ action: "openSession", sessionId: sessionId });
}

browser.runtime.onMessage.addListener((message) => {
    console.log("Received message in popup.js:", message);

    if (message.action === "sessionSaved" || message.action === "sessionDeleted" || message.action === "sessionUpdated") {
        loadSessions();
    } 
});
