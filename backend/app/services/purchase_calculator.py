# """Money maths for a purchase (PRD 5.6). Pure Decimal calculations: no database, no FastAPI.

# The PRD formula, per purchase:

#     line_total  = quantity x unit_price x (1 - line discount %)
#     subtotal    = sum of the line totals
#     tax         = subtotal x tax %
#     grand total = subtotal - discount + tax + shipping charge
#     due         = grand total - paid

# Every amount is rounded to 2 decimals (half up) once, so the purchase, its lines and the supplier's
# due always add up to the cent. Money is always Decimal, never float.

# PRD 5.6 charges the VAT on the SUBTOTAL. Sales (Module 5) charge VAT after the discount. If the team decides
# purchases should do the same, change `taxable` in calculate_purchase - nothing else needs to change.
# """
# from dataclasses import dataclass
# from decimal import ROUND_HALF_UP, Decimal

# CENT = Decimal("0.01")
# HUNDRED = Decimal("100")

# PAID = "PAID"
# PARTIALLY_PAID = "PARTIALLY_PAID"
# DUE = "DUE"


# class PurchaseError(ValueError):
#     """A purchase the rules reject. The message is safe to show to the manager."""


# @dataclass(frozen=True)
# class LineInput:
#     product_id: int
#     quantity: Decimal
#     unit_price: Decimal
#     line_discount_percent: Decimal


# @dataclass(frozen=True)
# class LineResult:
#     product_id: int
#     quantity: Decimal
#     unit_price: Decimal
#     line_discount_percent: Decimal
#     line_total: Decimal


# @dataclass(frozen=True)
# class PurchaseTotals:
#     lines: tuple[LineResult, ...]
#     subtotal: Decimal
#     discount_amount: Decimal
#     tax_percent: Decimal
#     tax_amount: Decimal
#     shipping_charge: Decimal
#     total_amount: Decimal


# @dataclass(frozen=True)
# class Settlement:
#     paid_amount: Decimal
#     due_amount: Decimal
#     payment_status: str


# def money(value: Decimal) -> Decimal:
#     """Round to 2 decimals, half up (0.005 -> 0.01)."""
#     return value.quantize(CENT, rounding=ROUND_HALF_UP)


# def payment_status_for(total: Decimal, paid: Decimal) -> str:
#     if paid >= total:
#         return PAID
#     return DUE if paid <= 0 else PARTIALLY_PAID


# def _require_decimal(name: str, value: object) -> None:
#     if not isinstance(value, Decimal):
#         raise TypeError(f"{name} must be a Decimal, not {type(value).__name__} (team rule: money never uses float)")


# def _require_percent(name: str, value: Decimal) -> None:
#     _require_decimal(name, value)
#     if value < 0 or value > HUNDRED:
#         raise PurchaseError(f"{name.replace('_', ' ').capitalize()} must be between 0 and 100.")


# def calculate_line(line: LineInput) -> LineResult:
#     _require_decimal("quantity", line.quantity)
#     _require_decimal("unit_price", line.unit_price)
#     _require_percent("line_discount_percent", line.line_discount_percent)
#     if line.quantity <= 0:
#         raise PurchaseError("Quantity must be greater than zero.")
#     if line.unit_price <= 0:
#         raise PurchaseError("Unit price must be greater than zero.")

#     line_total = money(line.quantity * line.unit_price * (HUNDRED - line.line_discount_percent) / HUNDRED)
#     return LineResult(line.product_id, line.quantity, line.unit_price, line.line_discount_percent, line_total)


# def calculate_purchase(
#     lines: list[LineInput],
#     discount_amount: Decimal,
#     tax_percent: Decimal,
#     shipping_charge: Decimal,
# ) -> PurchaseTotals:
#     if not lines:
#         raise PurchaseError("A purchase needs at least one item.")
#     _require_decimal("discount_amount", discount_amount)
#     _require_decimal("shipping_charge", shipping_charge)
#     _require_percent("tax_percent", tax_percent)
#     if discount_amount < 0 or shipping_charge < 0:
#         raise PurchaseError("The discount and the shipping charge can't be negative.")

#     results = tuple(calculate_line(line) for line in lines)
#     subtotal = sum((r.line_total for r in results), Decimal("0.00"))
#     discount = money(discount_amount)
#     if discount > subtotal:
#         raise PurchaseError("The discount can't be more than the subtotal.")

#     taxable = subtotal  # PRD 5.6: Tax = Subtotal x Tax %
#     tax_amount = money(taxable * tax_percent / HUNDRED)
#     shipping = money(shipping_charge)
#     return PurchaseTotals(
#         lines=results,
#         subtotal=subtotal,
#         discount_amount=discount,
#         tax_percent=tax_percent,
#         tax_amount=tax_amount,
#         shipping_charge=shipping,
#         total_amount=subtotal - discount + tax_amount + shipping,
#     )


# def settle_payment(total: Decimal, paid_amount: Decimal) -> Settlement:
#     """Works out paid, due and status for the amount paid when the purchase is recorded (PRD 5.6)."""
#     _require_decimal("total", total)
#     _require_decimal("paid_amount", paid_amount)
#     if paid_amount < 0:
#         raise PurchaseError("The paid amount can't be negative.")
#     paid = money(paid_amount)
#     if paid > total:
#         raise PurchaseError("The paid amount can't be more than the grand total.")
#     return Settlement(paid_amount=paid, due_amount=total - paid, payment_status=payment_status_for(total, paid))












"""Money maths for a purchase (PRD 5.6). Pure Decimal calculations: no database, no FastAPI.

The PRD formula, per purchase:

    line_total  = quantity x unit_price x (1 - line discount %)
    subtotal    = sum of the line totals
    tax         = subtotal x tax %
    grand total = subtotal - discount + tax + shipping charge
    due         = grand total - paid

Every amount is rounded to 2 decimals (half up) once, so the purchase, its lines and the supplier's
due always add up to the cent. Money is always Decimal, never float.

PRD 5.6 charges the VAT on the SUBTOTAL. Sales (Module 5) charge VAT after the discount. If the team decides
purchases should do the same, change `taxable` in calculate_purchase - nothing else needs to change.
"""
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")
HUNDRED = Decimal("100")

PAID = "PAID"
PARTIALLY_PAID = "PARTIALLY_PAID"
DUE = "DUE"


class PurchaseError(ValueError):
    """A purchase the rules reject. The message is safe to show to the manager."""


@dataclass(frozen=True)
class LineInput:
    product_id: int
    quantity: Decimal
    unit_price: Decimal
    line_discount_percent: Decimal


@dataclass(frozen=True)
class LineResult:
    product_id: int
    quantity: Decimal
    unit_price: Decimal
    line_discount_percent: Decimal
    line_total: Decimal


@dataclass(frozen=True)
class PurchaseTotals:
    lines: tuple[LineResult, ...]
    subtotal: Decimal
    discount_amount: Decimal
    tax_percent: Decimal
    tax_amount: Decimal
    shipping_charge: Decimal
    total_amount: Decimal


@dataclass(frozen=True)
class Settlement:
    paid_amount: Decimal
    due_amount: Decimal
    payment_status: str


def money(value: Decimal) -> Decimal:
    """Round to 2 decimals, half up (0.005 -> 0.01)."""
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def payment_status_for(total: Decimal, paid: Decimal) -> str:
    if paid >= total:
        return PAID
    return DUE if paid <= 0 else PARTIALLY_PAID


def _require_decimal(name: str, value: object) -> None:
    if not isinstance(value, Decimal):
        raise TypeError(f"{name} must be a Decimal, not {type(value).__name__} (team rule: money never uses float)")


def _require_percent(name: str, value: Decimal) -> None:
    _require_decimal(name, value)
    if value < 0 or value > HUNDRED:
        raise PurchaseError(f"{name.replace('_', ' ').capitalize()} must be between 0 and 100.")


def calculate_line(line: LineInput) -> LineResult:
    _require_decimal("quantity", line.quantity)
    _require_decimal("unit_price", line.unit_price)
    _require_percent("line_discount_percent", line.line_discount_percent)
    if line.quantity <= 0:
        raise PurchaseError("Quantity must be greater than zero.")
    if line.unit_price <= 0:
        raise PurchaseError("Unit price must be greater than zero.")

    line_total = money(line.quantity * line.unit_price * (HUNDRED - line.line_discount_percent) / HUNDRED)
    return LineResult(line.product_id, line.quantity, line.unit_price, line.line_discount_percent, line_total)


def calculate_purchase(
    lines: list[LineInput],
    discount_amount: Decimal,
    tax_percent: Decimal,
    shipping_charge: Decimal,
) -> PurchaseTotals:
    if not lines:
        raise PurchaseError("A purchase needs at least one item.")
    _require_decimal("discount_amount", discount_amount)
    _require_decimal("shipping_charge", shipping_charge)
    _require_percent("tax_percent", tax_percent)
    if discount_amount < 0 or shipping_charge < 0:
        raise PurchaseError("The discount and the shipping charge can't be negative.")

    results = tuple(calculate_line(line) for line in lines)
    subtotal = sum((r.line_total for r in results), Decimal("0.00"))
    discount = money(discount_amount)
    if discount > subtotal:
        raise PurchaseError("The discount can't be more than the subtotal.")

    taxable = subtotal  # PRD 5.6: Tax = Subtotal x Tax %
    tax_amount = money(taxable * tax_percent / HUNDRED)
    shipping = money(shipping_charge)
    return PurchaseTotals(
        lines=results,
        subtotal=subtotal,
        discount_amount=discount,
        tax_percent=tax_percent,
        tax_amount=tax_amount,
        shipping_charge=shipping,
        total_amount=subtotal - discount + tax_amount + shipping,
    )


def settle_payment(total: Decimal, paid_amount: Decimal) -> Settlement:
    """Works out paid, due and status for the amount paid when the purchase is recorded (PRD 5.6)."""
    _require_decimal("total", total)
    _require_decimal("paid_amount", paid_amount)
    if paid_amount < 0:
        raise PurchaseError("The paid amount can't be negative.")
    paid = money(paid_amount)
    if paid > total:
        raise PurchaseError("The paid amount can't be more than the grand total.")
    return Settlement(paid_amount=paid, due_amount=total - paid, payment_status=payment_status_for(total, paid))