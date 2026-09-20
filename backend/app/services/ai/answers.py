"""Writes the answer sentence from the numbers an approved report function returned.

Every sentence here is built only from those numbers - nothing is invented. If an AI
provider is switched on later (llm.py) it rewrites this text; the numbers still come
from the report function.
"""
from app.services.ai.intents import EXAMPLE_QUESTIONS

# Set from the store settings when the answer is built
_DEFAULT_SYMBOL = "৳"


def _money(amount: float, symbol: str = _DEFAULT_SYMBOL) -> str:
    return f"{symbol} {amount:,.2f}"


def _period_words(period: str) -> str:
    return {
        "today": "today",
        "yesterday": "yesterday",
        "week": "this week",
        "month": "this month",
        "all": "in total",
    }.get(period, period)


def _sales_summary(data: dict, symbol: str) -> str:
    when = _period_words(data["period"])
    if not data["sales_count"]:
        return f"There were no sales {when}."
    text = (
        f"Sales {when}: {_money(data['total_sales'], symbol)} from {data['sales_count']} "
        f"{'sale' if data['sales_count'] == 1 else 'sales'}, "
        f"averaging {_money(data['average_sale'], symbol)} per sale."
    )
    if data["unpaid_amount"]:
        text += f" {_money(data['unpaid_amount'], symbol)} of that is still unpaid."
    return text


def _top_products(data: dict, symbol: str) -> str:
    when = _period_words(data["period"])
    if not data["products"]:
        return f"Nothing was sold {when}, so there are no top products yet."
    lines = [
        f"{i}. {p['name']} — {p['quantity']:g} sold, {_money(p['revenue'], symbol)}"
        for i, p in enumerate(data["products"], start=1)
    ]
    return f"Top products {when}:\n" + "\n".join(lines)


def _payment_methods(data: dict, symbol: str) -> str:
    when = _period_words(data["period"])
    if not data["methods"]:
        return f"No payments were taken {when}."
    parts = [f"{m['method']} {_money(m['amount'], symbol)} ({m['count']})" for m in data["methods"]]
    return f"How customers paid {when}: " + ", ".join(parts) + "."


def _low_stock(data: dict, symbol: str) -> str:
    if not data["low_stock_count"] and not data["out_of_stock_count"]:
        return "Every active product is above its reorder level. Nothing needs restocking."
    text = (
        f"{data['low_stock_count']} {'product is' if data['low_stock_count'] == 1 else 'products are'} at or below "
        f"the reorder level, and {data['out_of_stock_count']} "
        f"{'is' if data['out_of_stock_count'] == 1 else 'are'} out of stock."
    )
    if data["products"]:
        lines = [f"• {p['name']} — {p['in_stock']} left (reorder at {p['reorder_level']})" for p in data["products"]]
        text += "\n" + "\n".join(lines)
    return text


def _inventory_value(data: dict, symbol: str) -> str:
    if not data["product_count"]:
        return "There are no active products yet, so the stock has no value to report."
    return (
        f"{data['units_in_stock']:g} units across {data['product_count']} active products. "
        f"They cost {_money(data['purchase_value'], symbol)} to buy and would bring in "
        f"{_money(data['retail_value'], symbol)} at the current selling prices."
    )


def _expiring_soon(data: dict, symbol: str) -> str:
    if not data["batches"]:
        return f"No stock batches expire within the next {data['days']} days."
    one = data["expiring_count"] == 1
    text = f"{data['expiring_count']} {'batch expires' if one else 'batches expire'} within {data['days']} days"
    text += f", and {data['expired_count']} already expired." if data["expired_count"] else "."
    lines = [
        f"• {b['product']} (batch {b['batch']}) — {b['quantity']} units, "
        + (f"expired {abs(b['days_left'])} days ago" if b["days_left"] < 0 else f"{b['days_left']} days left")
        for b in data["batches"][:10]
    ]
    return text + "\n" + "\n".join(lines)


def _customer_dues(data: dict, symbol: str) -> str:
    if not data["total_due"]:
        return "No customer owes anything at the moment."
    text = (
        f"Customers owe {_money(data['total_due'], symbol)} in total, across "
        f"{data['customers_with_due']} {'customer' if data['customers_with_due'] == 1 else 'customers'}."
    )
    if data["customers"]:
        lines = [f"• {c['name']} ({c['phone']}) — {_money(c['due'], symbol)}" for c in data["customers"]]
        text += "\n" + "\n".join(lines)
    return text


def _supplier_dues(data: dict, symbol: str) -> str:
    if not data["total_due"]:
        return "There is nothing owed to suppliers right now."
    text = f"The shop owes suppliers {_money(data['total_due'], symbol)} in total."
    if data["suppliers"]:
        lines = [f"• {s['name']} — {_money(s['due'], symbol)}" for s in data["suppliers"]]
        text += "\n" + "\n".join(lines)
    return text


def _purchases_summary(data: dict, symbol: str) -> str:
    when = _period_words(data["period"])
    if not data["purchase_count"]:
        return f"No stock was purchased {when}."
    return (
        f"Purchases {when}: {data['purchase_count']} "
        f"{'purchase' if data['purchase_count'] == 1 else 'purchases'} worth {_money(data['total_amount'], symbol)}. "
        f"{_money(data['paid_amount'], symbol)} paid, {_money(data['due_amount'], symbol)} still due."
    )


def _loyalty_summary(data: dict, symbol: str) -> str:
    if not data["customer_count"]:
        return "There are no customers registered yet."
    text = f"{data['customer_count']} customers hold {data['total_points']:,} loyalty points in total."
    tiers = [t for t in data["tiers"] if t["tier"]]
    if tiers:
        text += " By tier: " + ", ".join(f"{t['tier']} {t['customers']}" for t in tiers) + "."
    return text


def _product_lookup(data: dict, symbol: str) -> str:
    if not data["products"]:
        return f"I couldn't find a product matching \"{data['search']}\"."
    lines = [
        f"• {p['name']} ({p['code']}) — {_money(p['price'], symbol)}, {p['in_stock']} in stock"
        + ("" if p["status"] == "active" else " (inactive)")
        for p in data["products"]
    ]
    if len(lines) == 1:
        return lines[0].lstrip("• ")
    return f"Products matching \"{data['search']}\":\n" + "\n".join(lines)


def _business_summary(data: dict, symbol: str) -> str:
    return (
        f"Today: {_money(data['sales_today'], symbol)} from {data['sales_count_today']} "
        f"{'sale' if data['sales_count_today'] == 1 else 'sales'}.\n"
        f"Stock: {data['low_stock_count']} low, {data['out_of_stock_count']} out of stock, "
        f"worth {_money(data['inventory_retail_value'], symbol)} at retail.\n"
        f"Money: customers owe {_money(data['customer_due'], symbol)}, "
        f"suppliers are owed {_money(data['supplier_due'], symbol)}."
    )


_WRITERS = {
    "sales_summary": _sales_summary,
    "top_products": _top_products,
    "payment_methods": _payment_methods,
    "low_stock": _low_stock,
    "inventory_value": _inventory_value,
    "expiring_soon": _expiring_soon,
    "customer_dues": _customer_dues,
    "supplier_dues": _supplier_dues,
    "purchases_summary": _purchases_summary,
    "loyalty_summary": _loyalty_summary,
    "product_lookup": _product_lookup,
    "business_summary": _business_summary,
}


def write_answer(function_name: str, data: dict, currency_symbol: str = _DEFAULT_SYMBOL) -> str:
    writer = _WRITERS.get(function_name)
    if writer is None:  # a new report function without a sentence yet
        return "I found the data but can't describe it yet."
    return writer(data, currency_symbol)


def write_not_understood() -> str:
    """Shown when no intent matched, so the user learns what can be asked."""
    examples = "\n".join(f"• {question}" for question in EXAMPLE_QUESTIONS)
    return (
        "I can only answer questions about the shop's own data, and I didn't understand that one.\n"
        "Try something like:\n" + examples
    )
