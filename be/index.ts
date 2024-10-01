import express from 'express';
import Web3 from 'web3';
import { MongoClient } from 'mongodb';

// Create an Express application
const app = express();
const PORT = 3000;

// Replace 'YOUR_INFURA_PROJECT_ID' with your actual Infura project ID
const infuraUrl = 'wss://mainnet.infura.io/ws/v3/94b930cb3e514dae82e9680d69b0e44d';
const web3 = new Web3(new Web3.providers.WebsocketProvider(infuraUrl));

// MongoDB connection URL and database/collection names
const mongoUrl = 'mongodb://localhost:27017'; // Change this to your MongoDB connection string if using Atlas
const dbName = 'ethereum';
const collectionName = 'blocks';

// Function to store block data in MongoDB
async function storeBlockInDB(block: any) {
    const client = new MongoClient(mongoUrl);
    
    try {
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        // Insert block data into the collection
        const result = await collection.insertOne(block);
        console.log(`Block stored with _id: ${result.insertedId}`);
    } catch (error) {
        console.error('Error storing block in database:', error);
    } finally {
        await client.close();
    }
}

// Function to get the latest block
async function getLatestBlock() {
    try {
        const latestBlock = await web3.eth.getBlock('latest');
        console.log('Latest Block Data:', latestBlock);

        // Store the block in MongoDB
        await storeBlockInDB(latestBlock);
    } catch (error) {
        console.error('Error fetching the latest block:', error);
    }
}

// Define the type for the block header
interface BlockHeader {
    number: string; // Block number (hexadecimal string)
    hash: string; // Block hash
    parentHash: string; // Parent block hash
    // Add other properties you need here
}

// Subscribe to new blocks
web3.eth.subscribe('newBlockHeaders', async (error: any, blockHeader: BlockHeader) => {
    if (error) {
        console.error('Error subscribing to new blocks:', error);
        return;
    }

    console.log('New Block Header:', blockHeader);

    // Fetch the full block details and store it
    await getLatestBlock();
});

// Define a simple route
app.get('/', (req, res) => {
    res.send('Ethereum Block Tracker is running!');
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Call the function to get the latest block on start
getLatestBlock();
