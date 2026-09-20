"""Money maths for a sale (PRD 5.14, 5.15, 5.16). Pure Decimal calculations: no database, no FastAPI.

Order of calculation, per cart line:
    line_subtotal = unit_price x quantity
    discount      = line_subtotal x loyalty discount %
    tax           = (line_subtotal - discount) x the product's VAT %
    line_total    = line_subtotal - discount + tax

Each amount is rounded to 2 decimals (half up) once, on the line. The sale totals are the sums of the
lines, so the sale, its items and its invoice can never disagree by a cent.
"""
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")
HUNDRED = Decimal("100")

PAID = "PAID"
PARTIALLY_PAID = "PARTIALLY_PAID"
DUE = "DUE"


class PaymentError(ValueError):
    """A payment the rules reject. The message is safe to show to the cashier."""


@dataclass(frozen=True)
class LineInput:
    product_id: int
    quantity: Decimal
    unit_price: Decimal  # from the database, never from the browser
    tax_percent: Decimal  # the product's VAT rate, from the database


@dataclass(frozen=True)
class LineResult:
    product_id: int
    quantity: Decimal
    unit_price: Decimal
    tax_percent: Decimal
    line_subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    line_total: Decimal


@dataclass(frozen=True)
class SaleTotals:
    lines: tuple[LineResult, ...]
    subtotal: Decimal
    discount_percent: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal


@dataclass(frozen=True)
class Settlement:
    paid_amount: Decimal
    due_amount: Decimal
    payment_status: str


def money(value: Decimal) -> Decimal:
    """Round to 2 decimals, half up (0.005 -> 0.01)."""
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _require_decimal(name: str, value: object) -> None:
    if not isinstance(value, Decimal):
        raise TypeError(f"{name} must be a Decimal, not {type(value).__name__} (team rule: money never uses float)")


def _require_percent(name: str, value: Decimal) -> None:
    _require_decimal(name, value)
    if value < 0 or value > HUNDRED:
        raise ValueError(f"{name} must be between 0 and 100")


def calculate_line(line: LineInput, discount_percent: Decimal) -> LineResult:
    _require_decimal("quantity", line.quantity)
    _require_decimal("unit_price", line.unit_price)
    _require_percent("tax_percent", line.tax_percent)
    _require_percent("discount_percent", discount_percent)
    if line.quantity <= 0:
        raise ValueError("Quantity must be greater than zero")
    if line.unit_price < 0:
        raise ValueError("Unit price cannot be negative")

    line_subtotal = money(line.unit_price * line.quantity)
    discount_amount = money(line_subtotal * discount_percent / HUNDRED)
    taxable = line_subtotal - discount_amount
    tax_amount = money(taxable * line.tax_percent / HUNDRED)
    return LineResult(
        product_id=line.product_id,
        quantity=line.quantity,
        unit_price=line.unit_price,
        tax_percent=line.tax_percent,
        line_subtotal=line_subtotal,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        line_total=taxable + tax_amount,
    )


def calculate_sale(lines: list[LineInput], discount_percent: Decimal) -> SaleTotals:
    if not lines:
        raise ValueError("A sale needs at least one item")
    results = tuple(calculate_line(line, discount_percent) for line in lines)
    return SaleTotals(
        lines=results,
        subtotal=sum((r.line_subtotal for r in results), Decimal("0.00")),
        discount_percent=discount_percent,
        discount_amount=sum((r.discount_amount for r in results), Decimal("0.00")),
        tax_amount=sum((r.tax_amount for r in results), Decimal("0.00")),
        total_amount=sum((r.line_total for r in results), Decimal("0.00")),
    )


def settle_payment(
    total: Decimal,
    payment_amounts: list[Decimal],
    *,
    is_registered_customer: bool,
    available_credit: Decimal,
) -> Settlement:
    """Works out paid, due and status, and rejects payments the rules don't allow (PRD 5.12, 5.15).

    payment_amounts: the money received, one amount per payment method used (cash, card, digital).
    available_credit: credit_limit - outstanding_due of the customer (ignored for guests).
    """
    _require_decimal("total", total)
    _require_decimal("available_credit", available_credit)
    for amount in payment_amounts:
        _require_decimal("payment amount", amount)
        if amount <= 0:
            raise PaymentError("Payment amounts must be greater than zero.")

    paid = money(sum(payment_amounts, Decimal("0.00")))
    if paid > total:
        raise PaymentError("The payment is more than the sale total.")

    due = total - paid
    if due > 0:
        if not is_registered_customer:
            raise PaymentError("Guest customers must pay the full amount.")
        if due > max(available_credit, Decimal("0.00")):
            raise PaymentError("Credit limit exceeded.")

    if due == 0:
        status = PAID
    elif paid == 0:
        status = DUE
    else:
        status = PARTIALLY_PAID
    return Settlement(paid_amount=paid, due_amount=due, payment_status=status)
