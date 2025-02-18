browser.runtime.onMessage.addListener(async (message) => {
    console.log("Received message in background.js:", message);

    if (message.action === "saveSession") {
        await saveSession();
    } else if (message.action === "deleteSession") {
        await deleteSession(message.sessionId);
    } else if (message.action === "editSession") {
        await editSession(message.sessionId, message.newName);
    } else if (message.action === "openSession") {
        await openSession(message.sessionId);
    } else if (message.action == "deleteLink"){
        await deleteLink(message.sessionId, message.linkIndex);
    } else if (message.action == "addLink"){
        await addLink(message.sessionId, message.newUrl, message.title);
    }

});

async function saveSession() {
    let tabs = await browser.tabs.query({ currentWindow: true }); // get current tabs
    let sessionTabs = tabs.map(tab => ({ url: tab.url, title: tab.title })); // map them into url,title

    let storedData = await browser.storage.local.get("sessions");
    let sessions = storedData.sessions || [];

    let newSession = {
        id: Date.now(),
        name: `Session ${sessions.length + 1}`,
        tabs: sessionTabs, 
        toggleState: false
    };

    sessions.push(newSession);
    await browser.storage.local.set({ sessions });

    console.log("Session saved:", newSession);
    browser.runtime.sendMessage({ action: "sessionSaved", session: newSession });
}

async function deleteSession(sessionId) {
    let storedData = await browser.storage.local.get("sessions");
    //Add Delete confirmation here
    let sessions = storedData.sessions || [];

    let updatedSessions = sessions.filter(session => session.id !== sessionId);
    await browser.storage.local.set({ sessions: updatedSessions });

    console.log("Session deleted:", sessionId);
    browser.runtime.sendMessage({ action: "sessionDeleted", sessionId });
}

async function editSession(sessionId, newName) {
    let storedData = await browser.storage.local.get("sessions");
    let sessions = storedData.sessions || [];

    sessions = sessions.map(session =>
        session.id === sessionId ? { ...session, name: newName } : session 
        // basically, find a needed session. keep everything like it was, just change the name to newName
    );

    await browser.storage.local.set({ sessions });

    console.log(`Session ${sessionId} renamed to ${newName}`);
    browser.runtime.sendMessage({ action: "sessionUpdated", sessionId, newName });
}

async function openSession(sessionId) {
    let storedData = await browser.storage.local.get("sessions");
    let sessions = storedData.sessions || [];
    let session = sessions.find(s => s.id === sessionId);

    if (session) {
        session.tabs.forEach(tab => {
            browser.tabs.create({ url: tab.url });
        });
        console.log("Session opened:", session);
    }
}

async function deleteLink(sessionId, linkIndex) {
    let storedData = await browser.storage.local.get("sessions");
    let sessions = storedData.sessions || [];
    let session = sessions.find(s => s.id === sessionId);

    if (session && session.tabs.length > linkIndex) {
        session.tabs.splice(linkIndex, 1); // delete the link
        await browser.storage.local.set({ sessions });

        console.log(`Deleted link ${linkIndex} from session ${sessionId}`);
        browser.runtime.sendMessage({ action: "linkDeleted", sessionId: sessionId });
    }
}

async function addLink(sessionId, newUrl, title) {
    let storedData = await browser.storage.local.get("sessions");
    let sessions = storedData.sessions || [];
    let session = sessions.find(s => s.id === sessionId);

    if (session) {
        session.tabs.push({ url: newUrl, title: title }); // push new link
        await browser.storage.local.set({ sessions });

        console.log(`Added link to session ${sessionId}: ${newUrl}`);
        browser.runtime.sendMessage({ action: "linkAdded", sessionId: sessionId });
    }
}


