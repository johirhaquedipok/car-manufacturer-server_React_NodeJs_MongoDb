/* 
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
