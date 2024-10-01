const express = require('express');
const Web3 = require('web3');
const WebsocketProvider = require('web3-providers-ws');
const mongoose = require('mongoose');

// Create an Express app
const app = express();
const PORT = process.env.PORT || 3000;  // Default port is 3000

// MongoDB connection string (replace with your actual connection string)
const MONGO_URI = 'mongodb://localhost:27017/blockchain';

// Infura WebSocket URL (replace YOUR_INFURA_PROJECT_ID with your actual ID)
const INFURA_WSS_URL = `wss://mainnet.infura.io/ws/v3/94b930cb3e514dae82e9680d69b0e44d`;
const INFURA_HTTP_URL = `https://mainnet.infura.io/v3/94b930cb3e514dae82e9680d69b0e44d`;

// Initialize Web3 with WebSocket Provider (WSS)
const web3 = new Web3(new Web3.providers.HttpProvider(INFURA_WSS_URL));

// Define a schema and model for storing block data in MongoDB
const blockSchema = new mongoose.Schema({
  number: Number,
  hash: String,
  parentHash: String,
  miner: String,
  timestamp: Number,
  transactions: Array,
  gasUsed: Number,
  gasLimit: Number,
  size: Number
});

const Block = mongoose.model('Block', blockSchema);

// Connect to MongoDB
async function connectToMongo() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB', error);
  }
}

// Fetch block data and store it in the database
async function fetchAndStoreBlock(blockNumber) {
  try {
    // Get the block details by block number
    const block = await web3.eth.getBlock(blockNumber);

    // Check if the block already exists in the database
    const blockExists = await Block.findOne({ number: block.number });
    if (blockExists) {
      console.log(`Block ${block.number} already exists in the database.`);
      return;
    }

    // Prepare block data to be stored
    const blockData = {
      number: block.number,
      hash: block.hash,
      parentHash: block.parentHash,
      miner: block.miner,
      timestamp: block.timestamp,
      transactions: block.transactions,
      gasUsed: block.gasUsed,
      gasLimit: block.gasLimit,
      size: block.size
    };

    // Store the block data in the database
    const newBlock = new Block(blockData);
    await newBlock.save();
    console.log(`Block ${block.number} saved to database`);
  } catch (error) {
    console.error(`Error fetching or saving block ${blockNumber}:`, error);
  }
}

// Listen for new blocks using WebSocket
function listenForNewBlocks() {
  web3.eth.subscribe('newBlockHeaders', async (error, blockHeader) => {
    if (error) {
      console.error('Error receiving new block header:', error);
      return;
    }

    console.log(`New block received: ${blockHeader.number}`);

    // Fetch the full block details and store them in the database
    await fetchAndStoreBlock(blockHeader.number);
  });

  // Handle WebSocket disconnections and reconnections
  web3.currentProvider.on('end', (error) => {
    console.error('WebSocket connection closed. Reconnecting...', error);
    reconnect();
  });

  web3.currentProvider.on('error', (error) => {
    console.error('WebSocket connection error:', error);
  });
}

// Reconnect in case of WebSocket disconnection
function reconnect() {
  console.log('Reconnecting to WebSocket...');
  web3.setProvider(new Web3.providers.WebsocketProvider(INFURA_WSS_URL));
  listenForNewBlocks();
}

// Main function to start the WebSocket connection and MongoDB
async function startBlockchainListener() {
  await connectToMongo();
  listenForNewBlocks(); // Start listening for new blocks
}

// Express Route to check server status
app.get('/', (req, res) => {
  res.send('Blockchain Block Fetcher is running');
});

// Express Route to fetch all blocks from the database
app.get('/blocks', async (req, res) => {
  try {
    const blocks = await Block.find().sort({ number: -1 }).limit(10);  // Get the latest 10 blocks
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching blocks' });
  }
});

// Start the server and the blockchain listener
app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await startBlockchainListener();  // Start listening for blocks when the server starts
});
