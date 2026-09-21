"""Turns a typed question into one approved report function and its arguments.

No AI provider is needed for this: each intent has a list of words, and the intent whose
words match best wins. An LLM can take over this step later (see llm.py) - it must still
return one of the names below, so the safety rules don't change.
"""
import re

# Words that pick a period, longest phrases first
_PERIOD_WORDS = [
    ("yesterday", "yesterday"),
    ("this week", "week"),
    ("last 7 days", "week"),
    ("this month", "month"),
    ("all time", "all"),
    ("overall", "all"),
    ("in total", "all"),
    ("today", "today"),
    ("week", "week"),
    ("month", "month"),
]

# Intent -> the report function it runs, and the words that suggest it.
# "strong" words are worth more than "weak" ones, so "due" alone doesn't beat "supplier due".
_INTENTS: list[dict] = [
    {
        "name": "sales_summary",
        "function": "sales_summary",
        "strong": ["sales", "revenue", "sold", "turnover", "earned", "income"],
        "weak": ["how much", "total", "business"],
    },
    {
        "name": "top_products",
        "function": "top_products",
        "strong": ["top product", "best selling", "best-selling", "top selling", "most sold", "popular product", "top items"],
        "weak": ["top", "best", "popular"],
    },
    {
        "name": "payment_methods",
        "function": "payment_methods",
        "strong": ["payment method", "paid by", "how did customers pay", "cash or card", "bkash", "card payment"],
        "weak": ["payment", "cash", "card", "digital"],
    },
    {
        "name": "low_stock",
        "function": "low_stock",
        "strong": ["low stock", "low on stock", "running out", "out of stock", "reorder", "restock", "need to order"],
        "weak": ["stock", "inventory", "shelf"],
    },
    {
        "name": "inventory_value",
        "function": "inventory_value",
        "strong": ["stock value", "inventory value", "worth", "value of stock", "value of inventory"],
        "weak": ["value"],
    },
    {
        "name": "expiring_soon",
        "function": "expiring_soon",
        "strong": ["expiry", "expiring", "expire", "expired", "shelf life"],
        "weak": ["batch"],
    },
    {
        "name": "customer_dues",
        "function": "customer_dues",
        "strong": ["customer due", "customers owe", "customer owes", "outstanding due", "credit customers", "receivable"],
        "weak": ["due", "owe", "credit"],
    },
    {
        "name": "supplier_dues",
        "function": "supplier_dues",
        "strong": ["supplier due", "owe supplier", "supplier payment", "payable", "we owe"],
        "weak": ["supplier", "vendor"],
    },
    {
        "name": "purchases_summary",
        "function": "purchases_summary",
        "strong": ["purchase", "bought", "buying", "stock in", "received stock"],
        "weak": ["order"],
    },
    {
        "name": "loyalty_summary",
        "function": "loyalty_summary",
        "strong": ["loyalty", "points", "tier", "silver", "gold"],
        "weak": ["reward"],
    },
    {
        "name": "product_lookup",
        "function": "product_lookup",
        "strong": ["price of", "cost of", "how much is", "stock of", "do we have", "how many"],
        "weak": ["product", "price"],
    },
    {
        "name": "recent_sales",
        "function": "recent_sales",
        "strong": ["recent sale", "last sale", "latest sale", "last few sales", "recent bills", "last transactions"],
        "weak": ["recent", "latest"],
    },
    {
        "name": "invoice_lookup",
        "function": "invoice_lookup",
        "strong": ["invoice number", "invoice inv", "show invoice", "find invoice", "invoice no", "bill number"],
        "weak": ["invoice", "receipt", "bill"],
    },
    {
        "name": "unpaid_sales",
        "function": "unpaid_sales",
        "strong": ["unpaid", "not paid", "not fully paid", "partially paid", "outstanding invoice", "pending payment"],
        "weak": ["pending"],
    },
    {
        "name": "sales_by_cashier",
        "function": "sales_by_cashier",
        "strong": ["by cashier", "which cashier", "who sold", "best cashier", "cashier performance", "sales per cashier"],
        "weak": ["cashier", "staff", "counter"],
    },
    {
        "name": "held_bills",
        "function": "held_bills",
        "strong": ["held bill", "on hold", "paused bill", "parked sale", "saved cart", "held cart"],
        "weak": ["hold", "held", "paused"],
    },
    {
        "name": "stock_movements_summary",
        "function": "stock_movements_summary",
        "strong": ["stock movement", "stock moved", "stock in and out", "goods movement", "stock activity"],
        "weak": ["movement", "moved"],
    },
    {
        "name": "business_summary",
        "function": "business_summary",
        "strong": ["how is my business", "how is business", "business summary", "overview", "summary of", "how are we doing"],
        "weak": ["summary", "overall"],
    },
]

# Words dropped when working out which product was asked about
_STOP_WORDS = {
    "the", "a", "an", "of", "for", "is", "are", "we", "i", "my", "our", "do", "does", "have", "has", "in", "stock",
    "price", "cost", "much", "many", "left", "there", "any", "currently", "now", "please", "tell", "me", "what",
    "whats", "show", "give", "sell", "selling", "at", "today",
}

# Shown on the empty chat screen and when nothing matches
EXAMPLE_QUESTIONS = [
    "How much did we sell today?",
    "What are the top selling products this month?",
    "Which products are low on stock?",
    "How much do customers owe us?",
    "Which sales are still unpaid?",
    "Who sold the most today?",
    "What is expiring in the next 30 days?",
    "How is my business doing?",
]


def detect_period(question: str, default: str = "today") -> str:
    for phrase, period in _PERIOD_WORDS:
        if phrase in question:
            return period
    return default


def _detect_days(question: str, default: int = 30) -> int:
    match = re.search(r"(\d+)\s*(day|days|week|weeks|month|months)", question)
    if not match:
        return default
    amount, unit = int(match.group(1)), match.group(2)
    if unit.startswith("week"):
        return amount * 7
    if unit.startswith("month"):
        return amount * 30
    return amount


def _detect_product_name(question: str) -> str:
    """The product someone asked about, e.g. "what is the price of rice 5kg" -> "rice 5kg"."""
    after = re.split(r"\b(?:price of|cost of|how much is|stock of|do we have|how many|left of)\b", question, maxsplit=1)
    text = after[1] if len(after) > 1 else question
    words = [word for word in re.findall(r"[a-z0-9.\-]+", text) if word not in _STOP_WORDS]
    return " ".join(words[:4]).strip()


def _detect_invoice_number(question: str) -> str:
    """The invoice someone asked about, e.g. "show invoice INV-2026-00125" -> "INV-2026-00125"."""
    match = re.search(r"\b([a-z]{2,4}-[\w-]*\d+)\b", question)  # INV-2026-00125
    if match:
        return match.group(1).upper()
    match = re.search(r"\b(?:invoice|bill|receipt)\s*(?:number|no\.?|#)?\s*(\d+)\b", question)
    return match.group(1) if match else ""


def _score(question: str, intent: dict) -> int:
    """Longer phrases win, so "who sold the most" beats the plain word "sold"."""
    score = sum(10 + len(word) for word in intent["strong"] if word in question)
    score += sum(len(word) for word in intent["weak"] if word in question)
    return score


def detect_intent(question: str) -> tuple[str, str, dict] | None:
    """Returns (intent name, report function, arguments), or None if nothing matches.

    The caller then runs that function - the question itself never reaches the database.
    """
    text = question.lower().strip()
    if not text:
        return None

    best = max(_INTENTS, key=lambda intent: _score(text, intent))
    if _score(text, best) == 0:
        return None

    name, function = best["name"], best["function"]
    if name in ("sales_summary", "payment_methods", "sales_by_cashier", "stock_movements_summary"):
        return name, function, {"period": detect_period(text, "today")}
    if name in ("top_products", "purchases_summary"):
        return name, function, {"period": detect_period(text, "month")}
    if name == "expiring_soon":
        return name, function, {"days": _detect_days(text)}
    if name == "product_lookup":
        product = _detect_product_name(text)
        if not product:
            return None  # "how many?" on its own isn't a question we can answer
        return name, function, {"name": product}
    if name == "invoice_lookup":
        number = _detect_invoice_number(text)
        if not number:
            # "show me the invoices" without a number - the latest sales answer that better
            return "recent_sales", "recent_sales", {}
        return name, function, {"number": number}
    return name, function, {}
