const fallbackLinks = {
    services: [
        {
            id: "musashi",
            name: "Musashi",
            status: "Featured",
            description: "chumu.net から最初につながるサービス。URL を追加するとこのカードから遷移できます。",
            url: ""
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

function setLinkState(anchor, url, label) {
    if (!anchor) return;

    if (isReadyUrl(url)) {
        anchor.href = url;
        anchor.textContent = label || "Open";
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.removeAttribute("aria-disabled");
        return;
    }

    anchor.href = "#";
    anchor.textContent = "準備中";
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
    anchor.setAttribute("aria-disabled", "true");
}

function renderServices(services) {
    if (!serviceList || !Array.isArray(services)) return;

    const serviceCards = services.map((service, index) => {
        const card = document.createElement("article");
        card.className = `service-card ${index === 0 ? "featured" : ""}`;

        const label = document.createElement("p");
        label.className = "label";
        label.textContent = service.status || "Service";

        const title = document.createElement("h3");
        title.textContent = service.name || "Untitled service";

        const description = document.createElement("p");
        description.textContent = service.description || "Service details coming soon.";

        const link = document.createElement("a");
        link.className = "text-link";
        setLinkState(link, service.url, service.linkLabel || "Open");

        card.append(label, title, description, link);
        return card;
    });

    const nextCard = document.createElement("article");
    nextCard.className = "service-card muted";
    nextCard.innerHTML = `
        <p class="label">Next</p>
        <h3>New service</h3>
        <p>サービスを追加したら、links.json の services に1件足すだけでここに表示できます。</p>
        <span class="text-link disabled">Slot ready</span>
    `;

    serviceList.replaceChildren(...serviceCards, nextCard);
}

function renderAccounts(accounts) {
    if (!accountList || !accounts) return;

    const names = [
        ["github", "GitHub"],
        ["twitter", "Twitter"],
        ["youtube", "YouTube"],
        ["discord", "Discord"]
    ];

    const accountCards = names.map(([key, name]) => {
        const url = accounts[key] || "";
        const link = document.createElement("a");
        link.className = "account-link";
        link.href = isReadyUrl(url) ? url : "#";

        if (isReadyUrl(url)) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        } else {
            link.setAttribute("aria-disabled", "true");
        }

        link.innerHTML = `<span>${name}</span><small>${isReadyUrl(url) ? "Open" : "Link later"}</small>`;
        return link;
    });

    accountList.replaceChildren(...accountCards);
}

function applyLinks(data) {
    renderServices(data.services || fallbackLinks.services);
    renderAccounts(data.accounts || fallbackLinks.accounts);
}

fetch("links.json", { cache: "no-store" })
    .then((response) => response.ok ? response.json() : fallbackLinks)
    .then(applyLinks)
    .catch(() => applyLinks(fallbackLinks));
