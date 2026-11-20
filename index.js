require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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

//jwk operation
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  //verifying..
  try {
    const { payload } = await jwtVerify(token, JWKS);
    //console.log("payload:", payload);
    next();
  } catch (error) {
    console.error("JWT verify failed:", error.code, error.name, error.message);
    return res.status(403).json({
      message: "Forbidden",
      reason: error.code,
      name: error.name,
      detail: error.message,
    });
  }
};

async function run() {
  try {
    //await client.connect();

    const db = client.db("doc-appoint");
    const doctorsCollection = db.collection("doctors");
    const bookingCollection = db.collection("bookings");

    // Get top 3 highest-rated doctors
    app.get("/top-rated", async (req, res) => {
      const result = await doctorsCollection
        .find()
        .sort({ rating: -1 })
        .limit(3)
        .toArray();
      res.send(result);
    });

    //get all data & search
    app.get("/all-appointment", async (req, res) => {
      const { search } = req.query;
      let query = {};

      if (search && search.trim()) {
        const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query = { name: { $regex: safeSearch, $options: "i" } };
      }

      const result = await doctorsCollection.find(query).toArray();
      res.send(result);
    });

    //get single data.
    app.get("/all-appointment/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await doctorsCollection.findOne(query);
      res.json(result);
    });

    //adding booking data
    app.post("/booking", verifyToken, async (req, res) => {
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData);
      res.json(result);
    });

    //get user booking data
    app.get("/booking", verifyToken, async (req, res) => {
      const userId = req.query.userId;
      const query = { userId };
      const result = await bookingCollection.find(query).toArray();
      res.json(result);
    });

    //edit booking data
    app.patch("/booking/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;

      const query = {
        _id: new ObjectId(id),
      };
      const updateDoc = {
        $set: {
          doctorName: updatedData.doctorName,
          patientName: updatedData.patientName,
          date: updatedData.date,
          time: updatedData.time,
          message: updatedData.message,
        },
      };

      const result = await bookingCollection.updateOne(query, updateDoc);

      res.send(result);
    });

    //delete single booking data
    app.delete("/booking/:bookingId", verifyToken, async (req, res) => {
      const { bookingId } = req.params;
      const query = { _id: new ObjectId(bookingId) };
      const result = await bookingCollection.deleteOne(query);
      res.json(result);
    });

    //await client.db("admin").command({ ping: 1 });
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
