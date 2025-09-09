import requests
import json
import time
from typing import List, Dict, Any

# ==============================================================================
# CONFIGURATION
# ==============================================================================
CONFIG = {
    "min_discount_percentage": 5.0,  # Minimum 5% discount
    "min_discount_amount": 1.00,     # Minimum $1.00 discount
    "max_price": 100.00,             # Maximum normal game price
    "pages_to_fetch": 25,            # Number of pages to fetch from the API
    "page_size": 60,
    "sort_by": "Metacritic"
}

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def fetch_from_api(url: str) -> List[Dict[str, Any]]:
    """Generic function to fetch data from an API and handle errors."""
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from {url}: {e}")
        return []

def get_store_map() -> Dict[str, str]:
    """Fetches store information and returns a mapping of storeID to storeName."""
    stores_data = fetch_from_api("https://www.cheapshark.com/api/1.0/stores")
    return {store['storeID']: store['storeName'] for store in stores_data}

def fetch_all_deals(num_pages: int) -> List[Dict[str, Any]]:
    """Fetches and aggregates deals from multiple pages of the CheapShark API."""
    all_deals = []
    print(f"Fetching deals from {num_pages} pages...")
    for page_num in range(num_pages):
        deals_url = (
            f"https://www.cheapshark.com/api/1.0/deals?"
            f"pageSize={CONFIG['page_size']}&pageNumber={page_num}&sortBy={CONFIG['sort_by']}"
        )
        print(f"  - Fetching page {page_num + 1}/{num_pages}...")
        page_deals = fetch_from_api(deals_url)
        if not page_deals:
            print("  - No more deals found. Stopping.")
            break
        all_deals.extend(page_deals)
        time.sleep(1)  # Be polite to the API
    return all_deals

def filter_and_deduplicate_deals(deals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Filters deals based on CONFIG criteria and finds the cheapest deal per game title."""
    cheapest_deals = {}
    rejected_count = 0

    for deal in deals:
        try:
            sale_price = float(deal['salePrice'])
            normal_price = float(deal['normalPrice'])

            # Primary filtering conditions
            is_on_sale = 0.00 < sale_price < normal_price
            meets_discount_reqs = (normal_price - sale_price) >= CONFIG['min_discount_amount']
            is_within_price_range = normal_price <= CONFIG['max_price']

            if is_on_sale and meets_discount_reqs and is_within_price_range:
                title = deal['title']
                # If game not seen before, or this deal is cheaper, update it
                if title not in cheapest_deals or sale_price < float(cheapest_deals[title]['salePrice']):
                    cheapest_deals[title] = deal
            else:
                rejected_count += 1
        except (ValueError, TypeError, KeyError):
            rejected_count += 1
            continue
            
    print(f"Rejected {rejected_count} deals during initial filtering and deduplication.")
    return list(cheapest_deals.values())

def format_deal(deal: Dict[str, Any], store_map: Dict[str, str], index: int) -> Dict[str, Any]:
    """Formats a single deal into the desired final structure for the JSON file."""
    # Improve image quality by replacing URL parts
    image_url = deal.get('thumb', '')
    if 'steamstatic' in image_url:
        image_url = image_url.replace('capsule_184x69.jpg', 'header.jpg')
    elif 'gog-statics.com' in image_url:
        image_url = image_url.replace('_product_tile_117h.webp', '_product_tile_256.webp')

    # Calculate discount percentage for display
    normal_price = float(deal['normalPrice'])
    sale_price = float(deal['salePrice'])
    discount = round(((normal_price - sale_price) / normal_price) * 100) if normal_price > 0 else 0

    return {
        "id": index + 1,
        "title": deal['title'],
        "platform": "PC",
        "price": sale_price,
        "oldPrice": normal_price,
        "store": store_map.get(deal['storeID'], f"Store ID: {deal['storeID']}"),
        "url": f"https://www.cheapshark.com/redirect?dealID={deal['dealID']}",
        "imageUrl": image_url,
        "discountPercentage": discount,
        "featured": index < 12  # Mark the top 12 deals as featured
    }

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

def main():
    """Main function to run the deal fetching and processing pipeline."""
    store_map = get_store_map()
    if not store_map:
        print("Could not fetch store map. Aborting.")
        return

    raw_deals = fetch_all_deals(CONFIG['pages_to_fetch'])
    print(f"Successfully fetched a total of {len(raw_deals)} raw deals.")

    unique_deals = filter_and_deduplicate_deals(raw_deals)
    print(f"Found {len(unique_deals)} unique game deals after processing.")

    # Sort by savings amount (highest discounts first)
    unique_deals.sort(key=lambda x: float(x['savings']), reverse=True)
    
    # Format all the deals for the final JSON output
    formatted_deals = [format_deal(deal, store_map, i) for i, deal in enumerate(unique_deals)]
    
    with open('deals.json', 'w') as f:
        json.dump(formatted_deals, f, indent=2)

    print(f"\n✅ deals.json file has been successfully updated with {len(formatted_deals)} deals.")
    
    # Print statistics
    if formatted_deals:
        avg_discount = sum(d['discountPercentage'] for d in formatted_deals) / len(formatted_deals)
        print(f"📊 Average discount: {avg_discount:.1f}%")
        print(f"🏆 Best deal: {formatted_deals[0]['title']} - {formatted_deals[0]['discountPercentage']}% off")

if __name__ == "__main__":
    main()
