const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { default: Stripe } = require('stripe');
const stripe = require('stripe')(process.env.STRIPE_KEY)

const app = express();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.6llxg7j.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJwt (req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
        if(err){
            return res.status(401).send('unauthorized access')
        }
        req.decoded = decoded;
        next();
    })
}

async function run(){
    try{
        const categoryCollection = client.db('resaleMarket').collection('categories');
        const productCollection = client.db('resaleMarket').collection('products');
        const bookingCollection = client.db('resaleMarket').collection('bookings');
        const userCollection = client.db('resaleMarket').collection('users');
        const paymentCollection = client.db('resaleMarket').collection('payments');

        // const verifyBuyer = async (req, res, next) =>{
        //     const decodedEmail = req.decoded.email;
        //     const query = { email: decodedEmail }
        //     const user = await userCollection.findOne(query);
        //     if(user.role !== 'buyer'){
        //         return res.status(403).send('Forbidden Access')
        //     }
        //     next();
        // }

        const verifySeller = async (req, res, next) =>{
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await userCollection.findOne(query);
            if(user.role !== 'seller'){
                return res.status(403).send('Forbidden Access')
            }
            next();
        }

       const verifyAdmin = async (req, res, next) =>{
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query)
            if(user.role !== 'admin'){
                return res.status(403).send('forbidden access')
            }
            next();
       }

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

        app.get('/products/:id',async(req, res)=>{
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const products = await productCollection.find(query).toArray()
            res.send(products);
        })

        app.get('/reportedProducts', verifyJwt, verifyAdmin, async(req, res)=>{
            const query = {
                reported : 'true'
            }
            const product = await productCollection.find(query).toArray();
            res.send(product)
        })

        app.delete('/reportedProducts/:id', verifyJwt, verifyAdmin, async(req, res)=>{
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })

        app.put('/products/:id',  async (req, res)=>{
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set:{
                    reported: 'true',
                }
            }
            const result = await productCollection.updateOne(filter,updateDoc)
            res.send(result);

        })

        app.post('/bookings', async(req,res)=>{
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        app.get('/bookings/:id', async(req, res) =>{
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingCollection.findOne(query)
            res.send(booking);
        })

        app.get('/bookings', verifyJwt, async(req,res)=>{
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if(email !== decodedEmail){
                return res.status(403).send({message: 'forbidden access'})
            }
            const query = {email: email};
            const bookings = await bookingCollection.find(query).toArray()
            res.send(bookings);
        })

        app.post('/users', async(req,res)=>{
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        // get all seller 

        app.get('/allSellers', verifyJwt, verifyAdmin, async(req, res) =>{
            const query = {
                role: 'seller'
            }
            const seller = await userCollection.find(query).toArray()
            res.send(seller);
        })

        app.get('/user/verifySeller/:email', async(req, res) =>{
            const email = req.params.email
            const query = {
                email: email
            }
            const verifySeller = await userCollection.findOne(query);
            res.send(verifySeller);
        })

        app.put('/allSellers/:id', verifyJwt, verifyAdmin, async(req, res)=>{
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set:{
                    verified: 'true'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // delete seller 

        app.delete('/allSellers/:id', verifyJwt, verifyAdmin, async(req, res)=>{
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(filter);
            res.send(result);
        })

        // get all buyers 

        app.get('/allBuyers', verifyJwt, verifyAdmin, async(req, res) =>{
            const query = {
                role: 'buyer'
            }
            const buyer = await userCollection.find(query).toArray()
            res.send(buyer);
        })

        app.delete('/allBuyers/:id', verifyJwt, verifyAdmin, async(req, res)=>{
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(filter);
            res.send(result);
        })

        // implemnet jwt 

        app.get('/jwt', async(req, res) =>{
            const email = req.query.email;
            const query = {
                email: email
            };
            const user = await userCollection.findOne(query)
            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1d'})
                return res.send({accessToken: token})
            }
            res.status(403).send({accessToken: ''})
        })

        app.get('/users/buyer/:email', async(req,res)=>{
            const email = req.params.email;
            const query = {email}
            const user = await userCollection.findOne(query);
            res.send({isBuyer: user?.role === 'buyer'})
        })

        app.get('/users/seller/:email', async(req,res)=>{
            const email = req.params.email;
            const query = {email}
            const user = await userCollection.findOne(query);
            res.send({isSeller: user?.role === 'seller'})
        })

        app.get('/users/admin/:email', async(req,res)=>{
            const email = req.params.email;
            const query = {email}
            const user = await userCollection.findOne(query);
            res.send({isAdmin: user?.role === 'admin'})
        })
        
        // Product added by seller 

        app.post('/addProducts', verifyJwt, verifySeller, async(req, res) =>{
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result)
        })

        app.get('/addProducts', verifyJwt, verifySeller, async(req,res)=>{
            const email = req.query.email;
            const query = {email: email};
            const products = await productCollection.find(query).toArray()
            res.send(products);
        })

        app.delete('/addProducts/:id', verifyJwt, verifySeller, async(req, res)=>{
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await productCollection.deleteOne(filter)
            res.send(result);
        })


        // Payment 
        app.post('/create-payment-intent', async(req,res)=>{
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency : 'usd',
                amount : amount,
                "payment_method_types": [
                    "card"
                  ],
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
              });
        })

        app.post('/payments', async(req,res)=>{
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = {_id: ObjectId(id)}
            const updateDoc = {
                $set:{
                    paid:true,
                    transationId: payment.transationId
                }
            }
            const updateResult = await bookingCollection.updateOne(filter,updateDoc);
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