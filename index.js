require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000
const app = express()

// middleware

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



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
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