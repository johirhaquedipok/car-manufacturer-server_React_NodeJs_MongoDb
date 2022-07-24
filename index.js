const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

// mongodb
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

// verifyToken
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

// mongo db connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.amtbqis.mongodb.net/?retryWrites=true&w=majority`;

// create client
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();

    // all products
    const productsCollection = client
      .db("sonikon_global")
      .collection("allProducts");
    // users all products
    const orderedCollection = client
      .db("sonikon_global")
      .collection("orderedProducts");
    // all users
    const userCollection = client.db("sonikon_global").collection("users");
    // user review
    const userReviewCollection = client
      .db("sonikon_global")
      .collection("usersReview");
    // user profile
    const userProfileCollection = client
      .db("sonikon_global")
      .collection("usersProfile");
    // all admin
    const adminCollection = client.db("sonikon_global").collection("admin");

    /*
     * get : All get collection
     */
    // get all products
    app.get("/products", async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });

    // get all products
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);

      res.send(product);
    });

    /* Get users Products */
    app.get("/users-ordered-products/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const order = await orderedCollection.findOne({ userEmail: email });
      res.send(order);
    });

    /* Get all users */
    app.get("/users", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    /* Get all users review */
    app.get("/users-review", verifyJWT, async (req, res) => {
      const reviews = await userReviewCollection.find().toArray();
      res.send(reviews);
    });

    /* Get users profile*/
    app.get("/users-profile/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const profile = await userProfileCollection.find(query).toArray();
      res.send(profile);
    });

    /* get User Role: Admin */
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    /*
     * Post : All Post collection
     */

    // send token to the user
    app.post("/signin", async (req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30d",
      });

      res.send({ accessToken });
    });

    // users ordered porducts
    app.post("/users-ordered-products", verifyJWT, async (req, res) => {
      const order = req.body;
      const id = req.body.productDetails[0].productId;
      const email = req.body.userEmail;
      const filter = { userEmail: email };
      const emailExist = await orderedCollection.findOne(filter);

      // insert data to users db
      if (emailExist) {
        const newproduct = req.body.productDetails[0];
        const result = await orderedCollection.updateOne(filter, {
          $push: { productDetails: newproduct },
        });
        return res.send({ success: true, result });
      }
      const result = await orderedCollection.insertOne(order);

      // update availabe products qty
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      const orderedQty = req.body.productDetails[0].orderedQty;
      const newAvailableQty = product.availableQty - orderedQty;
      await productsCollection.updateOne(
        query,
        { $set: { availableQty: newAvailableQty } },
        { upsert: true }
      );

      return res.send({ success: true, result });
    });

    /* post all review*/
    app.post("/users-review/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const review = req.body;
      const result = await userReviewCollection.insertOne(review);
      res.send(result);
    });

    /* Get users profile*/
    app.post("/users-profile/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const data = req.body;
      console.log(data);
      const query = { email };
      const profile = await userProfileCollection.insertOne(data);
      res.send(profile);
    });

    console.log("database connected");
  } finally {
  }
}

run().catch(console.dir());

app.get("/", async (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Doctors App listening on port ${port}`);
});
