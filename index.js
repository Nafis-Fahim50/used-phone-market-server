const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.6llxg7j.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const categoryCollection = client.db('resaleMarket').collection('categories');
        const productCollection = client.db('resaleMarket').collection('products');
        const bookingCollection = client.db('resaleMarket').collection('bookings');
        
        app.get('/categories', async(req, res)=>{
            const query = {};
            const cursor = categoryCollection.find(query);
            const result = await cursor.toArray()
            res.send(result);
        })

        app.get('/categories/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {}
            const products = await productCollection.find(query).toArray()
            const phone_collection = products.filter(p => p.category_id == id)
            res.send(phone_collection);
        })

        app.post('/bookings', async(req,res)=>{
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })
    }
    finally{

    }
}
run().catch(error => console.log(error))

app.get('/', (req, res) =>{
    res.send('Resale Market Server is Running...')
})

app.listen(port, ()=>{
    console.log(`Server is running on ${port}`)
})