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

        let sessionItem = document.createElement("div");
        sessionItem.classList.add("session-item");

        let nameSpan = document.createElement("span");
        nameSpan.textContent = session.name || `Session ${session.id}`;
        nameSpan.classList.add("session-name");

        let toggleBtn = document.createElement("button");
        // toggleBtn.innerHTML = session.toggleState ? "v" : ">";     previous
        toggleBtn.innerHTML = session.toggleState ? "&#9207" : "&#9205"; //down & right
        toggleBtn.classList.add("icon-button");
        toggleBtn.id = "toggleBtn";
        toggleBtn.addEventListener("click", () => toggleLinks(session.id, toggleBtn));

        let openBtn = document.createElement("button");
        openBtn.innerHTML = "&#8689"; // open button
        openBtn.classList.add("icon-button");
        openBtn.id = "openBtn";
        openBtn.title = "Open"
        openBtn.addEventListener("click", () => openSession(session.id));

        let editBtn = document.createElement("button");
        editBtn.innerHTML = "&#9998;"; // edit pencil
        editBtn.classList.add("icon-button");
        editBtn.id = "editBtn";
        editBtn.title = "Edit";
        editBtn.addEventListener("click", () => startEditing(nameSpan, session.id));

        let deleteBtn = document.createElement("button");
        //deleteBtn.innerHTML = "&#128465;"; // trashcan
        deleteBtn.innerHTML = "&#9747"; //cross
        deleteBtn.classList.add("icon-button");
        deleteBtn.id = "deleteBtn";
        deleteBtn.title = "Delete";
        deleteBtn.addEventListener("click", () => deleteSession(session.id));

        

        let linksContainer = document.createElement("div");
        linksContainer.classList.add("links-container");

        // initial folding
        if (!session.toggleState) {
            linksContainer.classList.add("hidden");
        }

        session.tabs.forEach((tab, index) => {
            let linkItem = document.createElement("div");
            linkItem.classList.add("link-item");

            let link = document.createElement("a");
            link.href = tab.url;
            link.textContent = tab.title || tab.url;
            link.target = "_blank";

            let deleteLinkBtn = document.createElement("button");
            //deleteLinkBtn.innerHTML = "&#128465;"; // Trash icon
            deleteLinkBtn.innerHTML = "&#9747"; //cross icon
            deleteLinkBtn.classList.add("icon-button");
            deleteLinkBtn.addEventListener("click", () => deleteLink(session.id, index));

            linkItem.appendChild(link);
            linkItem.appendChild(deleteLinkBtn);
            linksContainer.appendChild(linkItem);
        });

        // link input field
        let addLinkInput = document.createElement("input");
        addLinkInput.type = "text";
        addLinkInput.placeholder = "Enter new link..."; 
        addLinkInput.classList.add("edit-input");

        let addLinkBtn = document.createElement("button");
        addLinkBtn.textContent = "+";
        addLinkBtn.classList.add("icon-button");
        addLinkBtn.addEventListener("click", () => addLink(session.id, addLinkInput));

        let addLinkContainer = document.createElement("div");
        addLinkContainer.classList.add("add-link-container");
        addLinkContainer.appendChild(addLinkInput);
        addLinkContainer.appendChild(addLinkBtn);

        linksContainer.appendChild(addLinkContainer);

        sessionItem.appendChild(toggleBtn);
        sessionItem.appendChild(nameSpan);
        sessionItem.appendChild(openBtn);
        sessionItem.appendChild(editBtn);
        sessionItem.appendChild(deleteBtn);
        

        li.appendChild(sessionItem);
        li.appendChild(linksContainer);
        sessionList.appendChild(li);
    });

    console.log("Sessions loaded:", sessions);
}


function toggleLinks(sessionId, toggleBtn) {
    browser.storage.local.get("sessions", function(storedData) {
        let sessions = storedData.sessions || [];
        let session = sessions.find(s => s.id === sessionId);

        if (session) {
            session.toggleState = !session.toggleState;
            // save the updated toggle
            browser.storage.local.set({ sessions: sessions });

            // apply the folding style
            let linksContainer = toggleBtn.parentElement.nextElementSibling;
            if (session.toggleState) {
                linksContainer.style.display = "block";
                toggleBtn.innerHTML = "&#9207"; //down
            } else {
                linksContainer.style.display = "none";
                toggleBtn.innerHTML = "&#9205"; //right
            }
        }
    });
}

async function deleteLink(sessionId, linkIndex) {
    browser.runtime.sendMessage({ action: "deleteLink", sessionId, linkIndex });
}

// try to get the title of the page
async function fetchTitle(url) {
    try {
        let response = await fetch(url);
        let text = await response.text();
        let doc = new DOMParser().parseFromString(text, "text/html");
        return doc.querySelector("title")?.innerText || url;
    } catch (error) {
        console.error("Failed to fetch title:", error);
        return url;
    }
}


async function addLink(sessionId, inputElement) {
    let newUrl = inputElement.value.trim();
    console.log("Adding ", newUrl);
    if (!newUrl) return;

    if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
        newUrl = "https://" + newUrl; // default https
    }


    try {
        let title = await fetchTitle(newUrl);
        console.log("Fetched title:", title);

        browser.runtime.sendMessage({ 
            action: "addLink", 
            sessionId, 
            newUrl, 
            title 
        });
    } catch (error) {
        console.error("Error fetching title:", error);
        browser.runtime.sendMessage({ 
            action: "addLink", 
            sessionId, 
            newUrl, 
            title: newUrl // url title fallback
        });
    }

    inputElement.value = ""; 
}


browser.runtime.onMessage.addListener((message) => {
    console.log("Received message in popup.js:", message);
    if (["sessionSaved", "sessionDeleted", "sessionUpdated"].includes(message.action)) {
        loadSessions();
    } else if (["linkDeleted", "linkAdded"].includes(message.action)){
        loadSessions(false);
    } else {
        console.log("Unknown message in popup.js!");
    }
});


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

function startEditing(nameSpan, sessionId) {
    //remove icons while editing
    let toggleBtn = document.getElementById("toggleBtn");
    let editBtn = document.getElementById("editBtn");
    let openBtn = document.getElementById("openBtn");
    let deleteBtn = document.getElementById("deleteBtn");
    toggleBtn.style.display = "none";
    openBtn.style.display = "none";
    deleteBtn.style.display = "none";
    editBtn.innerHTML = "&#10003";

    // create input field
    let nameInput = document.createElement("input");
    nameInput.value = nameSpan.textContent; // set to current name
    nameInput.classList.add("edit-input");

    nameSpan.style.display = "none";  // hide the name span 

    // so it remains on the same place
    nameSpan.parentElement.insertBefore(nameInput, nameSpan.parentElement.querySelector(".icon-button"));

    nameInput.style.display = "inline-block";  // show the input field
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