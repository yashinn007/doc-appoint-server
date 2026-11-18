require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT;
const URI = process.env.MONGODB_URI;

// middleware
app.use(cors());
app.use(express.json());

const client = new MongoClient(URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // ডেটাবেসের সাথে সংযোগ:
    await client.connect();

    const db = client.db("doc-appoint");
    const doctorsCollection = db.collection("doctors");
    const bookingCollection = db.collection("bookings");

    //get all data
    app.get("/all-appointment", async (req, res) => {
      const result = await doctorsCollection.find().toArray();
      res.send(result);
    });

    //get single data
    app.get("/all-appointment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await doctorsCollection.findOne(query);
      res.json(result);
    });

    //adding booking data
    app.post("/booking", async (req, res) => {
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData);
      res.json(result);
    });

    //get all booking data
    app.get("/booking", async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    });

    //edit booking data
    app.patch("/booking", async (req, res) => {
      const updatedData = req.body;
      const query = { userId: updatedData.userId };
      const result = await bookingCollection.updateOne(query, {
        $set: updatedData,
      });
      res.json(result);
    });

    //delete single booking data
    app.delete("/booking/:bookingId", async (req, res) => {
      const { bookingId } = req.params;
      const query = { _id: new ObjectId(bookingId) };
      const result = await bookingCollection.deleteOne(query);
      res.json(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("You successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
