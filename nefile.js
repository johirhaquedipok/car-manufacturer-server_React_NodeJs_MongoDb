/* 
<<<<<<< HEAD
onClick


      /* // insert data to users db
      if (emailExist) {
        const newproduct = req.body.productDetails[0];
        const result = await orderedCollection.updateOne(filter, {
          $push: { productDetails: newproduct },
        });
        return res.send({ success: true, result });
      }

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

      return res.send({ success: true, result }); */
*/
=======
    * API Naming Convention
    *app.get (/booking) --> get all bookings in this collection. or get more than one or by filter  
    *app.get (/booking/:id) --> get a specific booking  
    *app.post (/booking) --> add a new booking  
    *app.patch (/booking/:id) --> 
    *app.put (/booking/:id) --> upsert ==> update (if exists) or insert (if doesn't exist).
    *app.delete (/booking/:id) --> delete from the database
    
    */

/* 
    * get
    *
    
    */

app.get("/products", async (req, res) => {
  const query = {};
  const cursor = servicesCollection.find(query).project({ name: 1 });
  const products = await cursor.toArray();
  res.send(products);
});

// this is not the proper way to query
app.get("/available", async (req, res) => {
  const date = req.query.date;
  // step 1: get all services
  const services = await servicesCollection.find().toArray();
  // step 2: get the booking of that day
  const query = { date: date };
  const bookings = await bookingCollection.find(query).toArray();

  // step 3: for each service, find bookings for that service

  /* services.forEach((service) => {
      const serviceBookings = bookings.filter(
        (b) => b.treatment === service.name
      );
      const booked = serviceBookings.map((s) => s.slot);
      const available = service.slots.filter((s) => !booked.includes(s));
      service.available = available;
      // service.booked = booked
    }); */

  // step 3: for each service
  services.forEach((service) => {
    // step 4: find booking for that service. output [{}, {}, {}, {}]
    const serviceBookings = bookings.filter(
      (book) => book.treatment === service.name
    );
    // step 5: select slots for the service Bookings . output ['', '', '', '']
    const bookedSlots = serviceBookings.map((book) => book.slot);
    // step 6: select those slots that are no in bookedSlots .
    const available = service.slots.filter(
      (slot) => !bookedSlots.includes(slot)
    );
    // step 7: set available to slots to make it easier.
    service.available = available;
  });

  res.send(services);
});

/* for single user data in dashboard */

app.get("/booking", verifyJWT, async (req, res) => {
  const patient = req.query.patient;
  const decodedEmail = req.decoded.email;
  if (patient === decodedEmail) {
    const query = { patient: patient };
    const bookings = await bookingCollection.find(query).toArray();
    return res.send(bookings);
  } else {
    return res.status(403).send({ message: "Forbidden Access" });
  }
});

/* Get all users */
app.get("/user", verifyJWT, async (req, res) => {
  const users = await userCollection.find().toArray();
  res.send(users);
});

/* get User Role: Admin */
app.get("/admin/:email", async (req, res) => {
  const email = req.params.email;

  const user = await userCollection.findOne({ userEmail: email });
  console.log(user);
  const isAdmin = user.role === "admin";
  res.send({ admin: isAdmin });
});

/* manage doctors: add or remove doctors */
app.get("/doctor", verifyJWT, verifyAdmin, async (req, res) => {
  const doctors = await doctorCollection.find().toArray();
  res.send(doctors);
});

/* 
    * POST
    
    */

app.post("/booking", async (req, res) => {
  const booking = req.body;
  const query = {
    treatment: booking.treatment,
    date: booking.date,
    patient: booking.patient,
  };
  const exist = await bookingCollection.findOne(query);
  if (exist) {
    return res.send({ success: false, booking: exist });
  }
  const result = await bookingCollection.insertOne(booking);
  return res.send({ success: true, result });
});

// doctors post
app.post("/doctor", verifyJWT, verifyAdmin, async (req, res) => {
  const doctor = req.body;
  const result = await doctorCollection.insertOne(doctor);
  res.send(result);
});

/* 
    *PUT
    
    */

app.put("/user/:email", async (req, res) => {
  const user = req.body;
  const email = req.params.email;
  const filter = { email: email };
  const options = { upsert: true };
  const updateDoc = {
    $set: user,
  };
  const result = await userCollection.updateOne(filter, updateDoc, options);
  const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "30d",
  });
  res.send({ result, token });
});

// for user admin panel
app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
  const email = req.params.email;
  const filter = { email: email };

  const updateDoc = {
    $set: { role: "admin" },
  };
  const result = await userCollection.updateOne(filter, updateDoc);

  res.send({ result });
});

/* 
    *DELETE
    
    */

// doctors delete
app.delete("/doctor/:email", verifyJWT, verifyAdmin, async (req, res) => {
  const email = req.params.email;
  const filter = { email: email };
  const result = await doctorCollection.deleteOne(filter);
  res.send(result);
});
>>>>>>> cf0d1d315e53828e84ee16613e452b46b979a9bb
