const API_BASE_URL = "http://localhost:8000";

document.addEventListener("DOMContentLoaded", () => {
    const statusEl = document.getElementById("status");
    const tableBody = document.querySelector("#medicines-table tbody");
    tableBody.addEventListener("click", handleTableAction);
    const emptyStateEl = document.getElementById("empty-state");
    const form = document.getElementById("create-medicine-form");
    const formMessage = document.getElementById("form-message");
//UTILITY FUNCTIONS

    function setStatus(message, type = "info") {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.className = "status"; 
        if (type) {
            statusEl.classList.add(`status--${type}`);
        }
    }

    function clearStatus() {
        if (!statusEl) return;
        statusEl.textContent = "";
        statusEl.className = "status";
    }

    function safeMedicinesArray(data) {
        if (!data || typeof data !== "object") return [];
        const meds = data.medicines;
        return Array.isArray(meds) ? meds : [];
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, (c) => {
            const map = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            };
            return map[c] || c;
        });
    }

//rendering the data 

    function renderMedicines(data) {
        const medicines = safeMedicinesArray(data);
        tableBody.innerHTML = "";

        if (!medicines.length) {
            emptyStateEl.style.display = "block";
            return;
        }

        emptyStateEl.style.display = "none";

        medicines.forEach((med, index) => {
            const tr = document.createElement("tr");

// Handling the missing or wrong data 
            const rawName =
                typeof med?.name === "string" && med.name.trim() !== ""
                    ? med.name.trim()
                    : "Unknown name";

            const hasNumericPrice =
                typeof med?.price === "number" && Number.isFinite(med.price);

            const priceText = hasNumericPrice
                ? `£${med.price.toFixed(2)}`
                : "N/A";

            const hasIssues = rawName === "Unknown name" || !hasNumericPrice;

            tr.innerHTML = `
               <td>${index + 1}</td>
               <td>${escapeHtml(rawName)}</td>
               <td>${priceText}</td>
               <td>
            ${
            hasIssues
            ? '<span class="badge badge--warning">Incomplete data</span>'
            : ''
            }
         </td>
         <td>
           <button class="btn btn-small" data-action="update" data-name="${escapeHtml(rawName)}">
           Update
        </button>
        <button class="btn btn-small btn-danger" data-action="delete" data-name="${escapeHtml(rawName)}">
        Delete
    </button>
  </td>
`;


            tableBody.appendChild(tr);
        });
    }
    async function handleTableAction(event) {
    const button = event.target;
    if (!button.dataset.action) return;

    const action = button.dataset.action;
    const name = button.dataset.name;

    if (!name) return;

    if (action === "delete") {
        const confirmDelete = confirm(`Delete medicine "${name}"?`);
        if (!confirmDelete) return;

        const formData = new FormData();
        formData.append("name", name);

        try {
            const res = await fetch(`${API_BASE_URL}/delete`, {
                method: "DELETE",
                body: formData,
            });

            if (!res.ok) throw new Error();
            await fetchMedicines();
        } catch {
            alert("Failed to delete medicine.");
        }
    }

    if (action === "update") {
        const newPrice = prompt(`Enter new price for "${name}"`);
        if (newPrice === null) return;

        const priceValue = Number(newPrice);
        if (!Number.isFinite(priceValue) || priceValue <= 0) {
            alert("Invalid price.");
            return;
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("price", priceValue);

        try {
            const res = await fetch(`${API_BASE_URL}/update`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error();
            await fetchMedicines();
        } catch {
            alert("Failed to update medicine.");
        }
    }
}

// Fetchging data

    async function fetchMedicines() {
        setStatus("Loading medicines from backend…", "info");

        try {
            const response = await fetch(`${API_BASE_URL}/medicines`);
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const data = await response.json();
            renderMedicines(data);
            clearStatus();
        } catch (err) {
            console.error("Error fetching medicines:", err);
            setStatus(
                "Failed to load medicines. Please make sure the backend is running on port 8000.",
                "error"
            );
        }
    }

     async function fetchAveragePrice() {
    const avgEl = document.getElementById("average-price");
    if (!avgEl) return;

    try {
        const res = await fetch(`${API_BASE_URL}/report/average-price`);
        if (!res.ok) throw new Error();

        const data = await res.json();

        if (data.average_price === null || data.count === 0) {
            avgEl.innerHTML = "Average medicine price: <strong>N/A</strong>";
        } else {
            avgEl.innerHTML = `
                Average medicine price: 
                <strong>£${data.average_price}</strong> 
                <span style="color:#777;">(based on ${data.count} medicines)</span>
            `;
        }
    } catch {
        avgEl.innerHTML = "Average medicine price: <strong>Error loading</strong>";
    }
}

//  Handling form

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            formMessage.textContent = "";
            formMessage.className = "form-message";

            const nameInput = form.elements["name"];
            const priceInput = form.elements["price"];

            const rawName = nameInput.value.trim();
            const rawPrice = priceInput.value.trim();

    
            if (!rawName || !rawPrice) {
                formMessage.textContent = "Please fill in both name and price.";
                formMessage.classList.add("form-message--error");
                return;
            }

            const priceValue = Number(rawPrice);
            if (!Number.isFinite(priceValue) || priceValue <= 0) {
                formMessage.textContent = "Please enter a valid positive price.";
                formMessage.classList.add("form-message--error");
                return;
            }

            // Backend expects form-data
            const formData = new FormData();
            formData.append("name", rawName);
            formData.append("price", String(priceValue));

            try {
                const response = await fetch(`${API_BASE_URL}/create`, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }

                const result = await response.json();
                console.log("Create result:", result);

                formMessage.textContent = "Medicine added successfully.";
                formMessage.classList.add("form-message--success");
                form.reset();
 //List Refresh
                await fetchMedicines();
            } catch (err) {
                console.error("Error creating medicine:", err);
                formMessage.textContent =
                    "Could not add medicine. Please try again.";
                formMessage.classList.add("form-message--error");
            }
        });
    }

    fetchMedicines();
    fetchAveragePrice();
    
});
