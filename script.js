
// ========================================
// FINTRACK - PERSONAL FINANCE TRACKER
// ========================================

const transactionForm = document.getElementById("transactionForm");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const transactionList = document.getElementById("transactionList");

const totalBalanceElement = document.getElementById("totalBalance");
const totalIncomeElement = document.getElementById("totalIncome");
const totalExpensesElement = document.getElementById("totalExpenses");

let transactions = [];

// ========================================
// INITIALISE APP
// ========================================

function initialiseApp() {
    dateInput.value = getLocalDate();

    try {
        const savedTransactions = localStorage.getItem("finTrackTransactions");

        if (savedTransactions) {
            const parsed = JSON.parse(savedTransactions);

            if (Array.isArray(parsed)) {
                transactions = parsed.filter(isValidTransaction);
            }
        }
    } catch (error) {
        console.warn("Saved transactions could not be loaded.");
    }

    renderTransactions();
    updateSummary();
}

// ========================================
// DATE
// ========================================

function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ========================================
// VALIDATE TRANSACTIONS
// ========================================

function isValidTransaction(item) {
    return (
        item &&
        typeof item.id === "string" &&
        typeof item.description === "string" &&
        Number.isFinite(item.amount) &&
        item.amount > 0 &&
        ["income", "expense"].includes(item.type) &&
        typeof item.category === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    );
}

// ========================================
// ADD TRANSACTION
// ========================================

transactionForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    const amount = Number(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value;
    const date = dateInput.value;

    if (!description) {
        alert("Please enter a transaction name.");
        descriptionInput.focus();
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Please enter an amount greater than zero.");
        amountInput.focus();
        return;
    }

    if (!["income", "expense"].includes(type)) {
        alert("Please select a valid transaction type.");
        return;
    }

    if (!date) {
        alert("Please select a transaction date.");
        dateInput.focus();
        return;
    }

    const transaction = {
        id: createId(),
        description: description,
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
        type: type,
        category: category,
        date: date
    };

    transactions.push(transaction);

    saveTransactions();
    renderTransactions();
    updateSummary();

    transactionForm.reset();
    dateInput.value = getLocalDate();
    typeInput.value = "income";
    descriptionInput.focus();
});

// ========================================
// CREATE UNIQUE ID
// ========================================

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return Date.now().toString() + Math.random().toString(36).slice(2);
}

// ========================================
// SAVE TRANSACTIONS
// ========================================

function saveTransactions() {
    try {
        localStorage.setItem(
            "finTrackTransactions",
            JSON.stringify(transactions)
        );
    } catch (error) {
        alert("Your browser could not save the data. Please check browser storage.");
    }
}

// ========================================
// FORMAT MONEY
// ========================================

function formatMoney(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// ========================================
// UPDATE FINANCIAL SUMMARY
// ========================================

function updateSummary() {
    const income = transactions
        .filter(item => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);

    const expenses = transactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

    const balance = income - expenses;

    totalBalanceElement.textContent = formatMoney(balance);
    totalIncomeElement.textContent = formatMoney(income);
    totalExpensesElement.textContent = formatMoney(expenses);
}

// ========================================
// SAFELY DISPLAY TEXT
// ========================================

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return replacements[character];
    });
}

// ========================================
// DISPLAY TRANSACTIONS
// ========================================

function renderTransactions() {
    if (transactions.length === 0) {
        transactionList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">♡</span>
                <h3>No transactions yet</h3>
                <p>Add your first transaction to get started.</p>
            </div>
        `;

        return;
    }

    const sortedTransactions = [...transactions].sort(function (a, b) {
        return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
    });

    transactionList.innerHTML = sortedTransactions.map(function (item) {
        const isIncome = item.type === "income";
        const sign = isIncome ? "+" : "−";
        const icon = isIncome ? "↙" : "↗";

        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <span class="transaction-icon">${icon}</span>

                    <div>
                        <div class="transaction-name">
                            ${escapeHTML(item.description)}
                        </div>

                        <div class="transaction-meta">
                            ${escapeHTML(item.category)} · ${escapeHTML(item.date)}
                        </div>
                    </div>
                </div>

                <div>
                    <span class="transaction-amount ${item.type}">
                        ${sign}${formatMoney(item.amount)}
                    </span>

                    <button
                        type="button"
                        class="delete-transaction"
                        data-delete-id="${escapeHTML(item.id)}"
                        aria-label="Delete ${escapeHTML(item.description)}"
                    >Delete</button>
                </div>
            </div>
        `;
    }).join("");
}

// ========================================
// DELETE TRANSACTION
// ========================================

transactionList.addEventListener("click", function (event) {
    const button = event.target.closest("[data-delete-id]");

    if (!button) {
        return;
    }

    const id = button.dataset.deleteId;

    const transaction = transactions.find(item => item.id === id);

    if (!transaction) {
        return;
    }

    const confirmed = window.confirm(
        `Delete "${transaction.description}"?`
    );

    if (!confirmed) {
        return;
    }

    transactions = transactions.filter(item => item.id !== id);

    saveTransactions();
    renderTransactions();
    updateSummary();
});

// ========================================
// START
// ========================================

initialiseApp();
