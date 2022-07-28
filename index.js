const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    const userCollection = client
      .db("sonikon_global")
      .collection("userCollection");
    // user review
    const userReviewCollection = client
      .db("sonikon_global")
      .collection("usersReview");
    // user profile
    const userProfileCollection = client
      .db("sonikon_global")
      .collection("usersProfile");
    // payment collection
    const userPaymentCollection = client
      .db("sonikon_global")
      .collection("paymentCollection");

    /* verify Admin */
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        userEmail: requester,
      });
      if (requesterAccount?.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };
    // payment
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { orderedQty } = req.body;
      const amount = orderedQty * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "USD",
        payment_method_types: ["card"],
      });

      res.send({ clientSecret: paymentIntent.client_secret });
    });

    /*
     * get : All get collection
     */
    // get all products
    app.get("/products", async (req, res) => {
      const query = {};
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    // get all products
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    });

    // find products for payment
    app.get("/ordered-products-payment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await orderedCollection.findOne(query);
      res.send(product);
    });

    /* Get single users Products */
    app.get("/users-ordered-products/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const order = await orderedCollection
        .find({ userEmail: email })
        .toArray();
      res.send(order);
    });

    /* Get all users review */
    app.get("/users-review", verifyJWT, async (req, res) => {
      const reviews = await userReviewCollection.find().toArray();
      res.send(reviews);
    });

    /* Get users profile*/
    app.get("/users-profile/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const profile = await userProfileCollection.findOne(query);
      res.send(profile);
    });

    /* get User Role: Admin */
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ userEmail: email });
      const isAdmin = user?.role === "admin";
      if (isAdmin) {
        res.send({ admin: isAdmin });
      }
    });
    /* ge allt User  */
    app.get("/all-users", verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const users = await userCollection.find(query).toArray();
      res.send(users);
    });

    /* Get all users ordred Products */
    app.get(
      "/all-users-ordered-products",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const query = {};
        const result = await orderedCollection.find(query).toArray();
        res.send(result);
      }
    );
    /*
     * Post : All Post collection
     */

    // send token to the user
    app.put("/signin/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { userEmail: email };
      const options = { upsert: true };
      const update = { $set: filter };
      const result = await userCollection.updateOne(filter, update, options);
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30d",
      });

      res.send({ accessToken, result });
    });

    /* post a new product*/
    app.post("/add-products", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    // users ordered porducts
    app.post("/users-ordered-products", verifyJWT, async (req, res) => {
      const { availableQty, ...order } = req.body;
      const id = order.productId;

      const filter = { _id: ObjectId(id) };
      const update = {
        $set: {
          availableQty: availableQty,
        },
      };
      // insert new available qty in the product collection
      await productsCollection.updateOne(filter, update);

      const result = await orderedCollection.insertOne(order);
      return res.send({ success: true, result });
    });

    /* post all review*/
    app.post("/users-review/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const review = req.body;
      const result = await userReviewCollection.insertOne(review);
      res.send(result);
    });

    /* update or post users profile*/
    app.put("/users-profile/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: ObjectId(id) };
      const findProfile = await userProfileCollection.findOne(filter);
      if (findProfile) {
        const profile = await userProfileCollection.updateOne(filter, {
          $set: data,
        });
        res.send(profile);
      } else {
        const profile = await userProfileCollection.insertOne(data);
        res.send(profile);
      }
    });

    /* post a user*/
    app.post("/users-collection/:email", verifyJWT, async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    /*
     *Put:
     */

    /* update User Role: Admin */
    app.put("/users-role/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { userEmail: email };
      const option = { upsert: true };
      const update = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, update, option);
      res.send(result);
    });

    /*
     *Patch: update the product payment
     */

    app.patch("/users-ordered-products/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const { payment } = req.body;
      const filter = { _id: ObjectId(id) };
      const update = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      // insert paymet id in the payment collection
      await userPaymentCollection.insertOne(payment);
      // insert paymet id in the users orderd product collection
      const result = await orderedCollection.updateOne(filter, update);
      res.send(result);
    });

    /*
     * Delete : Product collection
     */

    /* admin delete a product*/
    app.delete(
      "/delete-products-collection/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await productsCollection.deleteOne(query);
        res.send(result);
      }
    );
    /* user delete a product*/
    app.delete("/users-ordered-products/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderedCollection.deleteOne(query);
      res.send(result);
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
  console.log(`Sonikon App listening on port ${port}`);
});
