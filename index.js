const express = require('express')
require('dotenv').config()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000
const app = express()

const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// middleware
// app.use(cors())
app.use(express.json())

// Define allowed origins
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://car-rental-76f12.web.app',
    'https://car-rental-client-weld.vercel.app',

];

app.use(cors({


    origin: function (origin, callback) {

        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
})

async function run() {
    try {

        const database = client.db('car-rental')
        const carCollection = database.collection('cars')
        const bookingCollection = database.collection('bookings')

        app.get('/cars', async (req, res) => {
            const { available } = req.query;

            let filter = {};

            // Only filter if query param exists
            if (available === 'true') {
                filter.availability = 'Available';
            }

            try {
                const cars = await carCollection.find(filter).toArray();
                res.send(cars);
            } catch (error) {
                res.status(500).send({ error: "Failed to fetch cars", details: error });
            }
        });



        // save a coffee data using post method
        app.post('/add-car', async (req, res) => {
            const carData = req.body
            const result = await carCollection.insertOne(carData)
            console.log(result)
            res.status(201).send({ ...result, message: 'data paisi vai thanks' })
        })

        // get a single coffee by id
        app.get('/my-cars/:email', async (req, res) => {
            const email = req.params.email
            // return console.log(email)
            const filter = { ownerEmail: email }
            const cars = await carCollection.find(filter).toArray()
            console.log(cars)
            res.send(cars)
        })

        // PUT: Update a car by ID
        app.put("/cars/:id", async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;

            try {
                const result = await carCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedData }
                );

                res.send(result);
            } catch (err) {
                res.status(500).send({ error: "Failed to update car", details: err });
            }
        });

        // Delete a car by id
        app.delete('/cars/:id', async (req, res) => {
            const id = req.params.id
            console.log(id)
            const result = await carCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.send({ deletedCount: 1 });
            } else {
                res.status(404).send({ message: 'Car not found' });
            }
        });

        //get car by id
        app.get('/cars/:id', async (req, res) => {
            const id = req.params.id;
            const car = await carCollection.findOne({ _id: new ObjectId(id) });
            if (!car) return res.status(404).send({ error: "Car not found" });
            res.send(car);
        });

        app.get('/bookings', async (req, res) => {
            try {
                const bookings = await bookingCollection.find().toArray();
                res.send(bookings);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch bookings", error: err });
            }
        });

        // get all bookings by customer email

        app.get("/my-bookings/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { ownerEmail: email };

            try {
                const bookings = await bookingCollection.find(filter).toArray();
                res.send(bookings);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch bookings", error: err });
            }
        });


        // cancel functionalities

        app.patch('/bookings/:id/cancel', async (req, res) => {
            const { id } = req.params;

            try {
                const result = await bookingCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: "Cancelled" } }
                );

                if (result.modifiedCount > 0) {
                    res.send({ message: "Booking canceled successfully." });
                } else {
                    res.status(404).send({ message: "Booking not found or already canceled." });
                }
            } catch (err) {
                res.status(500).send({ message: "Server error", error: err });
            }
        });

        console.log('Registering PATCH /bookings/:id/modify');
        // booking date
        app.patch('/bookings/:id/modify', async (req, res) => {
            const { id } = req.params;
            const { startDate, endDate } = req.body;

            if (!startDate || !endDate) {
                return res.status(400).send({ message: "Start and end dates are required." });
            }

            try {
                const result = await bookingCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            startDate,
                            endDate,
                            bookingDate: new Date(),
                        },
                    },
                    { returnDocument: 'after' }
                );

                if (result.value) {
                    res.send(result.value);
                } else {
                    res.status(404).send({ message: "Booking not found." });
                }
            } catch (err) {
                res.status(500).send({ message: "Server error", error: err });
            }
        });

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            try {
                const result = await bookingCollection.insertOne(booking);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to create booking", error });
            }
        });

        // 📊 Dashboard Statistics APIs

        // 1️⃣ Total cars added by a user
        app.get("/my-cars/count/:email", async (req, res) => {
            const email = req.params.email;
            try {
                const count = await carCollection.countDocuments({ ownerEmail: email });
                res.send({ count });
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch car count", error });
            }
        });

        // 2️⃣ Total bookings made by a user (as a renter)
        app.get("/bookings/count/:email", async (req, res) => {
            const email = req.params.email;
            try {
                const count = await bookingCollection.countDocuments({ userEmail: email });
                res.send({ count });
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch booking count", error });
            }
        });

        // 3️⃣ Total earnings (as a car owner)
        app.get("/earnings/:email", async (req, res) => {
            const email = req.params.email;
            try {
                const bookings = await bookingCollection.find({ ownerEmail: email }).toArray();
                const total = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
                res.send({ total });
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch earnings", error });
            }
        });

        // -------------------------
        // 💳 Create Payment Intent
        // -------------------------
        app.post("/create-payment-intent", async (req, res) => {
            try {
                const { totalPrice } = req.body;

                if (!totalPrice || totalPrice <= 0) {
                    return res.status(400).send({ error: "Invalid total price" });
                }

                // Stripe expects amount in cents
                const amount = Math.round(totalPrice * 100);

                const paymentIntent = await stripe.paymentIntents.create({
                    amount,
                    currency: "usd",
                    payment_method_types: ["card"],
                });

                res.send({
                    clientSecret: paymentIntent.client_secret,
                });
            } catch (error) {
                console.error("Stripe Payment Error:", error);
                res.status(500).send({ error: "Failed to create payment intent", details: error.message });
            }
        });


        app.post("/confirm-booking", async (req, res) => {
            const { sessionId } = req.body;

            try {
                const session = await stripe.checkout.sessions.retrieve(sessionId);
                const bookingData = session.metadata;

                if (session.payment_status === "paid") {
                    const result = await bookingCollection.insertOne({
                        ...bookingData,
                        totalPrice: Number(bookingData.totalPrice),
                        status: "Confirmed",
                    });
                    res.send({ success: true, bookingId: result.insertedId });
                } else {
                    res.status(400).send({ error: "Payment not completed." });
                }
            } catch (error) {
                console.error("Error confirming booking:", error);
                res.status(500).send({ error: "Failed to confirm booking" });
            }
        });

        // -------------------------
        // 💰 Get Payments for a User
        // -------------------------
        app.get("/payments", async (req, res) => {
            try {
                const email = req.query.email;
                if (!email) return res.status(400).send({ message: "Email is required" });

                const payments = await bookingCollection
                    .find({ customerEmail: email, status: "Paid" })
                    .sort({ bookingDate: -1 })
                    .toArray();

                res.send(payments);
            } catch (error) {
                console.error("Error fetching payments:", error);
                res.status(500).send({ error: "Failed to fetch payments" });
            }
        });






        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('welcome to car rental server')
})

app.listen(port, () => {
    console.log(`server is running at port ${port}`)
})