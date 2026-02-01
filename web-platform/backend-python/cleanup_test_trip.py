"""Quick cleanup script to remove the test trip TRP-2026-0011 and related data."""

import sys
sys.path.insert(0, '/app')

from app.config import get_supabase_admin_client

supabase = get_supabase_admin_client()

def cleanup():
    # Find the trip by trip_number
    trip_result = supabase.table("trips").select("id, trip_number, status").eq(
        "trip_number", "TRP-2026-0011"
    ).execute()

    if not trip_result.data:
        print("Trip TRP-2026-0011 not found")
        return

    trip = trip_result.data[0]
    trip_id = trip["id"]
    print(f"Found trip: {trip['trip_number']} (id: {trip_id}, status: {trip['status']})")

    # Delete pending deliveries linked to this trip
    pd_result = supabase.table("pending_deliveries").delete().eq("trip_id", trip_id).execute()
    print(f"Deleted {len(pd_result.data) if pd_result.data else 0} pending deliveries")

    # Delete trip stops linked to this trip
    stops_result = supabase.table("trip_stops").delete().eq("trip_id", trip_id).execute()
    print(f"Deleted {len(stops_result.data) if stops_result.data else 0} trip stops")

    # Delete trip_requests linked to this trip
    tr_result = supabase.table("trip_requests").delete().eq("trip_id", trip_id).execute()
    print(f"Deleted {len(tr_result.data) if tr_result.data else 0} trip_requests")

    # Check if there's a loan linked to this trip and clear the pickup_trip_id
    loan_result = supabase.table("loans").select("id, status").eq("pickup_trip_id", trip_id).execute()
    if loan_result.data:
        for loan in loan_result.data:
            # Reset the loan to confirmed status so it can be reassigned
            supabase.table("loans").update({
                "pickup_trip_id": None,
                "status": "confirmed"  # Reset to awaiting pickup assignment
            }).eq("id", loan["id"]).execute()
            print(f"Reset loan {loan['id']} to 'confirmed' status (cleared pickup_trip_id)")

    # Finally delete the trip
    trip_delete = supabase.table("trips").delete().eq("id", trip_id).execute()
    print(f"Deleted trip: {trip['trip_number']}")

    print("\nCleanup complete!")

if __name__ == "__main__":
    cleanup()
