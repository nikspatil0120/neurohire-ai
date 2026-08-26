"""
Seed script to add test candidates to MongoDB
Run this script to populate the database with test candidate users
"""
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

# MongoDB connection
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "neurohire"

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Test candidates data

async def seed_candidates():
    """Add test candidates to MongoDB"""
    print("🌱 Starting to seed test candidates...")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    users_collection = db["users"]
    
    try:
        added_count = 0
        skipped_count = 0
        
        for candidate_data in test_candidates:
            # Check if user already exists
            existing_user = await users_collection.find_one({"email": candidate_data["email"]})
            
            if existing_user:
                print(f"⏭️  Skipping {candidate_data['email']} - already exists")
                skipped_count += 1
                continue
            
            # Hash the password
            hashed_password = hash_password(candidate_data["password"])
            
            # Create user document
            user_doc = {
                "full_name": candidate_data["full_name"],
                "email": candidate_data["email"],
                "hashed_password": hashed_password,
                "role": candidate_data["role"],
                "is_active": candidate_data["is_active"],
                "created_at": datetime.utcnow().isoformat(),
                "last_login": None,
            }
            
            # Insert into database
            result = await users_collection.insert_one(user_doc)
            print(f"✅ Added candidate: {candidate_data['full_name']} ({candidate_data['email']})")
            added_count += 1
        
        print(f"\n📊 Summary:")
        print(f"   ✅ Added: {added_count} candidates")
        print(f"   ⏭️  Skipped: {skipped_count} candidates (already exist)")
        print(f"\n🎉 Seeding complete!")
        
        # Show total candidates in database
        total_candidates = await users_collection.count_documents({"role": "candidate"})
        print(f"📈 Total candidates in database: {total_candidates}")
        
    except Exception as e:
        print(f"❌ Error seeding candidates: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(seed_candidates())
