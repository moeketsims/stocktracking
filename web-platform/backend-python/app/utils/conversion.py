"""Unit conversion utilities for kg/bag display.

Fixed conversion rate: 1 bag = 10 kg for all potato products.
"""

KG_PER_BAG = 10.0


def kg_to_bags(kg_value: float) -> float:
    """Convert kilograms to bags (1 bag = 10 kg).

    Args:
        kg_value: Quantity in kilograms

    Returns:
        Quantity in bags, rounded to 2 decimal places
    """
    if kg_value is None:
        return 0.0
    return round(kg_value / KG_PER_BAG, 2)


def bags_to_kg(bag_value: float) -> float:
    """Convert bags to kilograms (1 bag = 10 kg).

    Args:
        bag_value: Quantity in bags

    Returns:
        Quantity in kilograms
    """
    if bag_value is None:
        return 0.0
    return bag_value * KG_PER_BAG
