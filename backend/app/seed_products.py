"""Seeds the product catalog with ~150 sample products for local development
and demos (PRD 5.3/5.4/5.16). Safe to run again - skips anything that already
exists by name/code.

Run from the backend folder, with .venv active, AFTER python -m app.init_db:
    python -m app.seed_products
"""
import random

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Brand, Category, Product, TaxRate, Unit

random.seed(7)  # reproducible: same data every run, easier to demo/debug

CATEGORIES = [
    "Grocery", "Dairy", "Snacks", "Beverage", "Personal Care", "Household",
    "Bakery", "Frozen Foods", "Health & Wellness", "Baby Care", "Stationery",
]

BRANDS = [
    "ACI", "Pran", "Square", "Marico", "Unilever", "Fresh", "Akij", "Bashundhara",
    "Rupchanda", "Teer", "Radhuni", "Kohinoor", "Olympic", "Danish", "Nestle",
]

UNITS = ["Piece", "Kg", "Liter", "Box", "Packet", "Dozen", "Bottle", "Can"]

TAX_RATES = [
    ("Standard VAT", "15.00"),
    ("Reduced VAT", "5.00"),
    ("Zero VAT", "0.00"),
]

# name templates per category, so generated names read naturally (not "Grocery Item 42")
PRODUCT_TEMPLATES: dict[str, list[str]] = {
    "Grocery": ["Rice 5kg", "Rice 10kg", "Lentils 1kg", "Cooking Oil 1L", "Cooking Oil 5L", "Sugar 1kg",
                "Salt 1kg", "Flour 1kg", "Semai 200g", "Chickpeas 1kg", "Mustard Oil 1L", "Spice Mix 100g",
                "Turmeric Powder 200g", "Chili Powder 200g", "Onion 1kg", "Potato 1kg", "Garlic 500g"],
    "Dairy": ["Milk 1L", "Milk 500ml", "Yogurt 400g", "Butter 200g", "Cheese Slice 200g", "Ghee 500g",
              "Cream 250ml", "Condensed Milk 400g", "Powder Milk 500g", "Paneer 200g"],
    "Snacks": ["Biscuit Pack", "Chanachur 200g", "Chips 100g", "Cake Roll", "Cream Biscuit", "Nuts Mix 250g",
               "Popcorn 100g", "Chocolate Bar", "Wafer Pack", "Namkeen 200g", "Toast Biscuit"],
    "Beverage": ["Cola 500ml", "Cola 1.5L", "Mineral Water 1L", "Mineral Water 500ml", "Fruit Juice 1L",
                 "Energy Drink 250ml", "Tea Bags 100pc", "Coffee 200g", "Lemon Drink 500ml", "Mango Juice 1L"],
    "Personal Care": ["Soap Bar", "Shampoo 200ml", "Toothpaste 100g", "Toothbrush", "Hand Wash 250ml",
                       "Body Lotion 200ml", "Razor Pack", "Face Wash 100ml", "Deodorant Spray", "Hair Oil 200ml"],
    "Household": ["Detergent Powder 1kg", "Dish Wash Liquid 500ml", "Toilet Cleaner 500ml", "Air Freshener",
                  "Floor Cleaner 1L", "Garbage Bag Pack", "Mosquito Coil", "Tissue Box", "Matchbox", "Candle Pack"],
    "Bakery": ["White Bread", "Brown Bread", "Bun Pack", "Cake Slice", "Cookies Pack", "Croissant", "Pastry Box"],
    "Frozen Foods": ["Frozen Paratha", "Frozen Vegetables 500g", "Ice Cream 1L", "Frozen Fish 500g",
                      "Frozen Chicken 1kg", "Frozen Samosa Pack"],
    "Health & Wellness": ["Multivitamin 30pc", "Hand Sanitizer 100ml", "Face Mask 10pc", "First Aid Kit",
                           "Protein Powder 500g", "Herbal Syrup 100ml"],
    "Baby Care": ["Baby Diaper Pack", "Baby Wipes 80pc", "Baby Powder 200g", "Baby Lotion 200ml", "Baby Soap"],
    "Stationery": ["Notebook A4", "Ballpoint Pen Pack", "Pencil Box", "Eraser Pack", "A4 Paper Ream", "Marker Set"],
}


def seed_categories(db: Session) -> dict[str, Category]:
    result = {}
    for name in CATEGORIES:
        obj = db.scalar(select(Category).where(Category.name == name))
        if obj is None:
            obj = Category(name=name, status="active")
            db.add(obj)
        result[name] = obj
    db.flush()
    return result


def seed_brands(db: Session) -> list[Brand]:
    result = []
    for name in BRANDS:
        obj = db.scalar(select(Brand).where(Brand.name == name))
        if obj is None:
            obj = Brand(name=name, status="active")
            db.add(obj)
        result.append(obj)
    db.flush()
    return result


def seed_units(db: Session) -> dict[str, Unit]:
    result = {}
    for name in UNITS:
        obj = db.scalar(select(Unit).where(Unit.name == name))
        if obj is None:
            obj = Unit(name=name, status="active")
            db.add(obj)
        result[name] = obj
    db.flush()
    return result


def seed_tax_rates(db: Session) -> list[TaxRate]:
    result = []
    for name, rate in TAX_RATES:
        obj = db.scalar(select(TaxRate).where(TaxRate.name == name))
        if obj is None:
            obj = TaxRate(name=name, rate_percent=rate, status="active")
            db.add(obj)
        result.append(obj)
    db.flush()
    return result


def seed_products(db: Session, categories: dict[str, Category], brands: list[Brand], units: dict[str, Unit], tax_rates: list[TaxRate]) -> int:
    existing_codes = set(db.scalars(select(Product.product_code)))
    created = 0
    sku_counter = 1000

    for category_name, names in PRODUCT_TEMPLATES.items():
        category = categories[category_name]
        for base_name in names:
            # a couple of variants per base name, so we comfortably reach 100-200 products
            for variant in ["", " - Value Pack"]:
                sku_counter += 1
                product_code = f"PRD-{sku_counter}"
                if product_code in existing_codes:
                    continue

                name = f"{base_name}{variant}"
                brand = random.choice(brands)
                unit_name = _guess_unit(base_name)
                unit = units[unit_name]
                tax_rate = random.choice(tax_rates)

                purchase_price = round(random.uniform(20, 900), 2)
                sale_price = round(purchase_price * random.uniform(1.12, 1.35), 2)
                reorder_level = random.choice([5, 10, 15, 20])
                # weighted so most products are healthy stock, some low, a few out-of-stock -
                # gives the dashboard/reports something real to show
                current_quantity = random.choices(
                    [0, random.randint(1, reorder_level), random.randint(reorder_level + 1, 200)],
                    weights=[8, 17, 75],
                )[0]

                db.add(Product(
                    product_code=product_code,
                    barcode=f"8801{sku_counter:06d}",
                    name=name,
                    category_id=category.category_id,
                    brand_id=brand.brand_id,
                    unit_id=unit.unit_id,
                    tax_rate_id=tax_rate.tax_rate_id,
                    purchase_price=purchase_price,
                    sale_price=sale_price,
                    tax_percent=tax_rate.rate_percent,
                    reorder_level=reorder_level,
                    current_quantity=current_quantity,
                    expiry_tracking=category_name in {"Dairy", "Bakery", "Frozen Foods", "Health & Wellness", "Baby Care"},
                    status="active",
                ))
                created += 1
    return created


def _guess_unit(base_name: str) -> str:
    lower = base_name.lower()
    if "kg" in lower:
        return "Kg"
    if "l" in lower and ("1l" in lower or "500ml" in lower or "250ml" in lower or "l" == lower[-1]):
        return "Liter"
    if "pack" in lower or "box" in lower:
        return "Box"
    if "bottle" in lower:
        return "Bottle"
    return "Piece"


def main() -> None:
    with SessionLocal() as db:
        categories = seed_categories(db)
        brands = seed_brands(db)
        units = seed_units(db)
        tax_rates = seed_tax_rates(db)
        created = seed_products(db, categories, brands, units, tax_rates)
        db.commit()

    print(f"Catalog data ready: {len(CATEGORIES)} categories, {len(BRANDS)} brands, "
          f"{len(UNITS)} units, {len(TAX_RATES)} tax rates, {created} new products added.")


if __name__ == "__main__":
    main()
