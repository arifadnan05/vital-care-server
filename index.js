const express = require('express')
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cors = require('cors')
const port = process.env.PORT || 4000;


// middleware

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://vital-care-adnan.vercel.app",
      "https://vital-care.netlify.app"
    ],
    credentials: true,
    optionSuccessStatus: 200,
  })
);
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8lcgwxk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const usersCollection = client.db('vitalCare').collection('users')
    const categorySlideCollection = client.db('vitalCare').collection('homeCategory')
    const medicineCollection = client.db('vitalCare').collection('medicine')
    const cartsCollection = client.db('vitalCare').collection('carts')
    const paymentCollection = client.db('vitalCare').collection('payments')
    const advertisementCollection = client.db('vitalCare').collection('advertisement')


    // JWT related api 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token });
    })

    // verify middleware 
    const verifyToken = (req, res, next) => {
      // console.log('inside verify Token ', req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Onno error' })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
      })

    }
    // use verify admin after verifyToken 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'Forbidden Access' })
      }
      next()
    }
    // use verify admin after verifyToken 
    const verifySeller = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === 'seller';
      if (!isAdmin) {
        return res.status(403).send({ message: 'Forbidden Access' })
      }
      next()
    }
    // set user in the ui 

    app.patch('/users/user/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'user'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    // set seller in the ui

    app.patch('/users/seller/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'seller'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    // user related api

    // only admin access routes
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email != req.decoded.email) {
        return res.status(403).send({ message: 'Unauthorize access' })
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin })
    })

    // only seller can access this route

    app.get('/users/seller/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email != req.decoded.email) {
        return res.status(403).send({ message: 'Unauthorize access' })
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query)
      let seller = false;
      if (user) {
        seller = user?.role === 'seller';
      }
      res.send({ seller })
    })
    app.get('/users/user/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email != req.decoded.email) {
        return res.status(403).send({ message: 'Unauthorize access' })
      }
      const query = { email: email };
      const people = await usersCollection.findOne(query)
      let user = false;
      if (people) {
        user = people?.role === 'user';
      }
      res.send({ user })
    })



    app.get('/users', verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const exitingUser = await usersCollection.findOne(query)
      if (exitingUser) {
        return res.send({ message: 'user already exits', insertedId: null })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })


    // Medicine Category related api
    app.get('/categoryCard', async (req, res) => {
      const result = await categorySlideCollection.find().toArray()
      res.send(result)
    })

    app.post('/manage-category', verifyToken, verifyAdmin, async (req, res) => {
      const query = req.body
      const result = await categorySlideCollection.insertOne(query)
      res.send(result)
    })

    app.get('/category', verifyToken, async (req, res) => {
      const category = req.body
      const result = await categorySlideCollection.find(category).toArray()
      res.send(result)
    })

    app.delete('/category/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await categorySlideCollection.deleteOne(query)
      res.send(result)
    })

    app.get('/category/:id', async (req,res) => {
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await categorySlideCollection.findOne(query)
      res.send(result)
    })
    app.put('/update-category/:id', async (req, res) => {
      const id = req.params.id;
      const categoryData = req.body;
      // console.log(jobData)
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateDoc = {
          $set: {
              ...categoryData
          }
      }
      const result = await categorySlideCollection.updateOne(query, updateDoc, options)
      res.send(result)
  })

    app.get('/category/:category', async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      try {
        const result = await medicineCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: 'Error fetching category data' });
      }
    });

    // // all medicine product get api hare
    // app.get('/medicine', async (req, res) => {
    //   const category = req.query.category
    //   let query = {}
    //   if (category) query = { category }
    //   const result = await medicineCollection.find(query).toArray()
    //   res.send(result)
    // })

    // Medicine related api 

    app.get('/medicine', async (req, res) => {
      const result = await medicineCollection.find().toArray()
      res.send(result)
    })

    app.get('/medicine/details/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await medicineCollection.findOne(query)
      res.send(result)
    })

    // medicine add only seller routes

    app.post('/medicine', verifyToken, verifySeller, async (req, res) => {
      const query = req.body
      const result = await medicineCollection.insertOne(query)
      res.send(result)
    })

    // seller added medicine showing on the seller dashboard

    app.get('/medicine/:email', verifyToken, async (req, res) => {
      const result = await medicineCollection.find({ seller_email: req.params.email }).toArray();
      res.send(result)
    })


    // cart collection api

    app.post('/carts', verifyToken, async (req, res) => {
      const cartItem = req.body
      const result = await cartsCollection.insertOne(cartItem)
      res.send(result)
    })
    // user cart collection get api 

    app.get('/carts', verifyToken, async (req, res) => {
      const email = req.query.email
      const query = { email: email }
      const result = await cartsCollection.find(query).toArray();
      res.send(result)
    })

    app.put('/carts/:id', verifyToken, async (req, res) => {
      try {
        const id = req.params.id
        const query = { _id: new ObjectId(id) }

        // Find the existing document to get the current quantity
        const existingDoc = await cartsCollection.findOne(query)
        if (!existingDoc) {
          return res.status(404).send({ message: 'Cart not found' })
        }

        // Decide whether to increment or decrement based on the request body
        let updatedQuantity;
        if (req.body.action === 'increment') {
          updatedQuantity = existingDoc.quantity + 1;
        } else if (req.body.action === 'decrement' && existingDoc.quantity > 1) {
          updatedQuantity = existingDoc.quantity - 1;
        } else {
          return res.status(400).send({ message: 'Invalid action or quantity cannot be less than 1' });
        }

        // Update the quantity
        const updated = {
          $set: {
            quantity: updatedQuantity
          }
        };

        // Perform the update operation
        const result = await cartsCollection.updateOne(query, updated);
        if (result.modifiedCount === 0) {
          return res.status(500).send({ message: 'Failed to update cart' });
        }

        // Fetch and send the updated document back
        const updatedDoc = await cartsCollection.findOne(query);
        res.send(updatedDoc);
      } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });



    // remove specific cart item on the page api

    app.delete('/carts/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = cartsCollection.deleteOne(query)
      res.send(result)
    })




    // payment method intend
    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100)
      // console.log(amount, 'inside of the amount')
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // payment history send mongodb database 

    app.post('/payments', verifyToken, async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment)
      const query = {
        _id: {
          $in: payment.cartId.map(id => new ObjectId(id))
        }
      }
      const deleteResult = await cartsCollection.deleteMany(query)
      res.send({ paymentResult, deleteResult })
    })

    app.get('/payments', verifyToken, async (req, res) => {
      const result = await paymentCollection.find().toArray()
      res.send(result)
    })



    // payment status update api 
    app.patch('/payments/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'paid'
        }
      }
      const result = await paymentCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    // Seller total revenue api
    app.get('/seller-revenue/:email', verifyToken, async (req, res) => {
      const result = await paymentCollection.find({ seller_email: req.params.email }).toArray();
      res.send(result)
    })


    // user payment history related api
    app.get('/user-payment-history/:email', verifyToken, async (req, res) => {
      const result = await paymentCollection.find({ email: req.params.email }).toArray();
      res.send(result)
    })



    // banner related api
    app.post('/advertisement', verifyToken, async (req, res) => {
      const banner = req.body
      const result = await advertisementCollection.insertOne(banner)
      res.send(result)
    })

    app.get('/advertisement', async (req, res) => {
      const banner = req.body
      const result = await advertisementCollection.find(banner).toArray()
      res.send(result)
    })

    app.patch('/advertisement/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'accepted'
        }
      }
      const result = await advertisementCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    app.delete('/advertisement/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await advertisementCollection.deleteOne(query)
      res.send(result)
    })

    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Vital Care server is running')
})
app.listen(port, () => {
  console.log(`vital care server is running on port ${port}`)
})