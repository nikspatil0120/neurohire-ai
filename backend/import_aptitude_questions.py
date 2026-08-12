"""
Script to import aptitude questions into MongoDB
Run: python import_aptitude_questions.py
"""

import asyncio
import json
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path

# MongoDB connection
MONGODB_URL = "mongodb+srv://sahilghogaressg06_db_user:r229cEXXqqs4LNTq@cluster0.wox3xqs.mongodb.net/neurohire_ai?appName=Cluster0"
MONGODB_DB = "neurohire_ai"

async def import_questions():
    """Import aptitude questions from JSON file to MongoDB"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[MONGODB_DB]
    collection = db["aptitude_questions"]
    
    # Read JSON file
    json_file = Path(__file__).parent / "aptitude_questions_data.json"
    with open(json_file, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    # Add timestamps to each question
    current_time = datetime.utcnow()
    for question in questions:
        question["createdAt"] = current_time
        question["updatedAt"] = current_time
    
    # Clear existing questions (optional - comment out if you want to keep existing)
    print(f"Clearing existing questions...")
    await collection.delete_many({})
    
    # Insert questions
    print(f"Inserting {len(questions)} questions...")
    result = await collection.insert_many(questions)
    
    print(f"✅ Successfully inserted {len(result.inserted_ids)} questions into {MONGODB_DB}.aptitude_questions")
    
    # Show summary
    total = await collection.count_documents({})
    verbal = await collection.count_documents({"category": "Verbal"})
    quant = await collection.count_documents({"category": "Quantitative"})
    reasoning = await collection.count_documents({"category": "Reasoning"})
    technical = await collection.count_documents({"category": "Technical"})
    
    print(f"\n📊 Summary:")
    print(f"   Total: {total}")
    print(f"   Verbal: {verbal}")
    print(f"   Quantitative: {quant}")
    print(f"   Reasoning: {reasoning}")
    print(f"   Technical: {technical}")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(import_questions())
