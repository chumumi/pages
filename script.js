const fallbackLinks = {
    services: [
        {
            id: "musashi",
            name: "Musashi",
            status: "Featured",
            description: "The first service connected from chumu.net. Its public destination can be added when ready.",
            url: "",
            linkLabel: "Open Musashi"
        }
    ],
    accounts: {
        github: "",
        twitter: "",
        youtube: "",
        discord: ""
    }
};

const serviceList = document.querySelector("#service-list");
const accountList = document.querySelector("#account-list");

function isReadyUrl(url) {
    return typeof url === "string" && /^https?:\/\//.test(url);
}

function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
}

function createOutboundLink(url, label) {
    const link = createElement("a", "text-link", label || "Open");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
}

function createDisabledText(text) {
    return createElement("span", "text-link disabled", text);
}

function renderServices(services) {
    if (!serviceList || !Array.isArray(services)) return;

    const cards = services.map((service, index) => {
        const card = createElement("article", `service-card ${index === 0 ? "featured" : ""}`.trim());
        const label = createElement("p", "label", service.status || "Service");
        const title = createElement("h3", "", service.name || "Untitled service");
        const description = createElement("p", "", service.description || "Details coming soon.");
        const action = isReadyUrl(service.url)
            ? createOutboundLink(service.url, service.linkLabel || "Open")
            : createDisabledText("Coming soon");

        card.append(label, title, description, action);
        return card;
    });

    const futureCard = createElement("article", "service-card muted");
    futureCard.append(
        createElement("p", "label", "Next"),
        createElement("h3", "", "Future service"),
        createElement("p", "", "This area is ready for the next project once a name, description, and URL are available."),
        createDisabledText("Reserved")
    );

    serviceList.replaceChildren(...cards, futureCard);
}

function renderAccounts(accounts) {
    if (!accountList || !accounts) return;

    const accountNames = [
        ["github", "GitHub"],
        ["twitter", "Twitter"],
        ["youtube", "YouTube"],
        ["discord", "Discord"]
    ];

    const cards = accountNames.map(([key, name]) => {
        const url = accounts[key] || "";
        const card = createElement(isReadyUrl(url) ? "a" : "span", "account-link", "");
        const title = createElement("span", "", name);
        const status = createElement("small", "", isReadyUrl(url) ? "Open" : "Coming soon");

        if (isReadyUrl(url)) {
            card.href = url;
            card.target = "_blank";
            card.rel = "noopener noreferrer";
        } else {
            card.classList.add("disabled");
        }

        card.append(title, status);
        return card;
    });

    accountList.replaceChildren(...cards);
}

function applyLinks(data) {
    renderServices(data.services || fallbackLinks.services);
    renderAccounts(data.accounts || fallbackLinks.accounts);
}

fetch("links.json", { cache: "no-store" })
    .then((response) => response.ok ? response.json() : fallbackLinks)
    .then(applyLinks)
    .catch(() => applyLinks(fallbackLinks));
