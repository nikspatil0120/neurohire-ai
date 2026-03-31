// test-mongo-connection.js - Simple Node.js script to test MongoDB connection
import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://sahilghogaressg06_db_user:r229cEXXqqs4LNTq@cluster0.wox3xqs.mongodb.net/?appName=Cluster0";

async function testConnection() {
  const client = new MongoClient(uri);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully!');

    const db = client.db('neurohire_ai');
    const collections = await db.listCollections().toArray();
    console.log('📊 Available collections:', collections.map(c => c.name));

    // Test users collection
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log('👥 Users in database:', userCount);

    console.log('🎉 MongoDB test completed successfully!');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

testConnection();
