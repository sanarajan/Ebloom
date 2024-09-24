const Category = require("../models/categoryModel");
const SubCategory = require("../models/subCategoryModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const userModel = require("../models/userModel");
const Address = require("../models/addressModel");
const Order = require("../models/orderModel");
const Wishlist = require("../models/wishlistModel");
const Coupon = require("../models/couponModel");
const Wallet = require("../models/walletModel");
const Offer = require("../models/offerModel");

const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: "rzp_test_oMNW7kruQ4TMbO",
  key_secret: "NuhGj1P30sdMmbn0MhA021uV",
});

// Controller function to render cart page with cart items
exports.yourCart = async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.session.useremail });
    const cart = await Cart.findOne({ user: user._id, isActive: true })
      .populate("products.product")
      .exec();

    if (!cart) {
      return res.render("user/yourCart", {
        showSidebar: false,
        cartItems: [],
        totalItems: 0,
        totalPrice: 0,
        totalDiscount: 0,
        deliveryCharges: 0,
        packagingFee: 0,
        totalAmount: 0,
        totalSavings: 0,
      });
    }

    // Calculate delivery date
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 10);
    const deliveryDateString = deliveryDate.toDateString();

    let totalItems = 0;
    let totalPrice = 0;
    let totalDiscount = 0;

    // Iterate through cart items and apply offers
    const cartItems = await Promise.all(
      cart.products.map(async (item) => {
        const product = item.product;

        // Find percentage-based offers for product and category
        const productOffer = await Offer.findOne({
          offerFor: "product",
          products: product._id,
          status: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        });

        const categoryOffer = await Offer.findOne({
          offerFor: "category",
          categories: product.categoryId,
          status: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        });

        // Determine the best percentage offer (if any)
        let highestPercentage = 0;

        if (productOffer) {
          highestPercentage = productOffer.offerPercentage;
        }

        if (
          categoryOffer &&
          categoryOffer.offerPercentage > highestPercentage
        ) {
          highestPercentage = categoryOffer.offerPercentage;
        }

        // Calculate offer price based on highest percentage
        let offerPrice = product.price;
        if (highestPercentage > 0) {
          offerPrice = Math.round(
            product.price * (1 - highestPercentage / 100)
          );
        }

        // Calculate totals
        let itemTotalPrice = 0;
        if (offerPrice) {
          itemTotalPrice = offerPrice * item.quantity;
        } else {
          itemTotalPrice = product.price * item.quantity;
        }
        totalPrice += itemTotalPrice;
        totalItems += item.quantity;
        totalDiscount += (product.price - offerPrice) * item.quantity;

        return {
          product: {
            _id: product._id,
            name: product.productName,
            specification: product.specification,
            price: product.price,
            offerPrice: offerPrice, // Ensure price is formatted
            offerPercentage: highestPercentage,
            image: product.thumbnailPaths[0],
            productQuantity: product.quantity,
          },
          quantity: item.quantity,
          deliveryDate: deliveryDateString,
        };
      })
    );

    const deliveryCharges = 75; // Example value
    const packagingFee = 50; // Example value
    const totalAmount = totalPrice + deliveryCharges + packagingFee;
    res.render("user/yourCart", {
      showSidebar: false,
      cartItems,
      totalItems,
      totalPrice: totalPrice.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      deliveryCharges,
      packagingFee,
      totalAmount: totalAmount.toFixed(2),
      totalSavings: totalDiscount.toFixed(2),
    });
  } catch (error) {
    console.error("Error in yourCart route:", error);
    res.status(500).send("Internal server error");
  }
};

const MAX_QUANTITY = 10; // Set your maximum quantity limit here

exports.updateCartQuantity = async (req, res) => {
  const { productId, wish } = req.body;
  let quantity = req.body.quantity;

  // Validate the productId and quantity
  if (!productId || !quantity) {
    return res.status(400).json({
      success: false,
      message: "Product ID and quantity are required",
    });
  }
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid product ID" });
  }

  try {
    // Find the cart for the logged-in user
    const user = await userModel.findOne({ email: req.session.useremail });
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    let cart = await Cart.findOne({ user: user._id, isActive: true });
    if (!cart) {
      if (wish === "yes") {
        cart = new Cart({
          user: user._id,
          products: [],
          isActive: true,
        });
        quantity = 1;
      }
    } else if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    } else {
      if (wish === "yes") {
        const productInCart = cart.products.find(
          (item) => item.product.toString() === productId
        );
        if (productInCart) {
          quantity = productInCart.quantity;
          quantity = quantity + 1;
        } else {
          quantity = 1;
        }
      }
    }
    // Find the product
    if (quantity > product.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.quantity} items available`,
      });
    }
    // Check if quantity exceeds maximum limit

    if (quantity > MAX_QUANTITY) {
      return res.status(400).json({
        success: false,
        message: `Maximum quantity of ${MAX_QUANTITY} reached for this product.`,
      });
      console.log("errr");
    }
    let cartItem = null;
    if (cart && wish !== "yes") {
      // Find the product in the cart for regular cart page calls
      cartItem = cart.products.find(
        (item) => item.product.toString() === productId
      );
    } else if (wish === "yes") {
      // For wishlist calls, check if the product is already in the cart
      return res.status(200).json({ success: true, message: "Exist quantity" });
    } else {
      // If the product is not in the cart, add it as a new item
      cart.products.push({
        product: productId,
        quantity: quantity,
      });
    }

    if (cartItem && wish !== "yes") {
      cartItem.quantity = quantity;
    } else if (!cartItem && wish !== "yes") {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in cart" });
    }

    // Save the updated cart
    await cart.save();
    const updatedCart = await Cart.findOne({ user: user._id, isActive: true })
      .populate("products.product")
      .exec();
    // offer exist or not
    let totalPrice = 0;
    let totalDiscount = 0;
    const totalItems = updatedCart.products.length;

    // Get the current date to filter active offers
    const currentDate = new Date();

    // Function to get the best percentage offer for a product or category
    const getBestOffer = async (product, categoryId) => {
      // Find any active product offers
      const productOffer = await Offer.findOne({
        products: product,
        startDate: { $lt: currentDate }, // Offer starts before the new offer's end date
        endDate: { $gt: currentDate }, // Offer ends after the new offer's start date
        status: true,
      });
      // Find any active category offers
      const categoryOffer = await Offer.findOne({
        categories: categoryId,
        startDate: { $lt: currentDate }, // Offer starts before the new offer's end date
        endDate: { $gt: currentDate }, // Offer ends after the new offer's start date
        status: true,
      });

      // Calculate the best offer: compare both product and category offers (only percentages)
      let bestOffer = null;

      if (productOffer && categoryOffer) {
        // Compare percentage offers and choose the higher one
        bestOffer =
          productOffer.offerPercentage > categoryOffer.offerPercentage
            ? productOffer
            : categoryOffer;
      } else {
        // If only one offer exists, use it
        bestOffer = productOffer || categoryOffer;
      }

      return bestOffer;
    };

    // Iterate over the products in the cart to calculate total price and discount
    for (let item of updatedCart.products) {
      const product = item.product;
      const quantity = item.quantity;

      let productPrice = product.price; // Base price

      // Get the best percentage offer for this product or its category
      const bestOffer = await getBestOffer(product, product.categoryId);
      if (bestOffer) {
        // Calculate discount based on the best offer's percentage
        const discountValue = (productPrice * bestOffer.offerPercentage) / 100;
        productPrice -= discountValue; // Update product price with the discount applied
        totalDiscount += discountValue * quantity;
      }

      // Add the final product price (after applying offer, if any) to the total price
      totalPrice += productPrice * quantity;
    }

    // Define static charges
    const deliveryCharges = 75; // Example value
    const packagingFee = 50; // Example value

    // Calculate the final total amount
    const totalAmount = totalPrice + deliveryCharges + packagingFee;
    const totalSavings = totalDiscount; // Total savings is equivalent to the total discount

    // Set session data for tab calculation
    req.session.totalItems = totalItems;
    req.session.totalPrice = totalPrice; // Total price after discount applied
    req.session.totalMRP = totalPrice + totalDiscount; // MRP reflects total before discount
    req.session.totalAmount = totalAmount;
    //end session setting for tab calculation

    // Prepare response data

    res.json({
      success: true,
      totalItems,
      totalPrice,
      totalDiscount,
      deliveryCharges,
      packagingFee,
      totalAmount,
      totalSavings,
    });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//user side
// Assuming you have required necessary models like Cart, Product, and userModel

exports.addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const user = await userModel.findOne({ email: req.session.useremail });

  try {
    let product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({ message: "Insufficient stock available" });
    }

    if (product.quantity === 0) {
      return res.status(400).json({ message: "Product is out of stock" });
    }

    let cart = await Cart.findOne({ user: user._id, isActive: true });

    if (!cart) {
      cart = new Cart({
        user: user._id,
        products: [{ product: productId, quantity }],
      });
    } else {
      const productIndex = cart.products.findIndex((item) =>
        item.product.equals(productId)
      );

      if (productIndex >= 0) {
        if (
          cart.products[productIndex].quantity + quantity >
          product.quantity
        ) {
          return res
            .status(400)
            .json({ message: "Quantity exceeds available stock" });
        }
        cart.products[productIndex].quantity += quantity;
      } else {
        cart.products.push({ product: productId, quantity });
      }
    }

    // Update the product quantity in the database
    // product.quantity -= quantity;
    // await product.save();

    await cart.save();
    res.status(200).json({ message: "Product added to cart", cart });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
exports.removeCartItem = async (req, res) => {
  const { productId } = req.params;

  // Validate the productId
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid product ID" });
  }

  try {
    // Find the cart for the logged-in user
    const user = await userModel.findOne({ email: req.session.useremail });
    const cart = await Cart.findOne({ user: user._id, isActive: true });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    // Find the index of the item to remove
    const itemIndex = cart.products.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in cart" });
    }

    // Remove the item from the cart
    cart.products.splice(itemIndex, 1);

    // Save the updated cart
    await cart.save();
    const updatedCart = await Cart.findOne({ user: user._id, isActive: true })
      .populate("products.product")
      .exec();
    const totalItems = updatedCart.products.length;
    const totalPrice = updatedCart.products.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const totalDiscount = 0;
    const deliveryCharges = 75; // Example value
    const packagingFee = 50; // Example value
    const totalAmount =
      totalPrice - totalDiscount + deliveryCharges + packagingFee;
    const totalSavings = totalDiscount; // Example value

    // Prepare response data
    req.session.totalPrice = totalPrice;
    req.session.totalMRP = totalPrice;
    req.session.totalItems = totalItems;
    req.session.totalAmount = totalAmount;

    res.json({
      success: true,
      totalItems,
      totalPrice,
      totalDiscount,
      deliveryCharges,
      packagingFee,
      totalAmount,
      totalSavings,
      message: "Item removed from cart",
    });
  } catch (error) {
    console.error("Error removing item from cart:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.checkout = async (req, res) => {
  try {
    // Fetch user by email from session
    const fetchUserId = await userModel.findOne({
      email: req.session.useremail,
    });
    const userId = fetchUserId._id;

    if (!userId) {
      return res.redirect("/login");
    }

    // Fetch user addresses
    const user = await userModel
      .findById(userId)
      .populate("address_ids")
      .exec();
    const addresses = user.address_ids;

    // Fetch cart items for the user
    const cart = await Cart.find({ user: userId, isActive: true })
      .populate({
        path: "products.product",
        select: "productName price thumbnailPaths categoryId",
      })
      .exec();

    if (cart.length) {
      let totalItems = 0;
      let totalPrice = 0;
      let totalDiscount = 0;
      let deliveryCharges = 75;
      let packagingFee = 50;
      let totalAmount = 0;
      let totalSavings = 0;

      // Iterate over cart items to calculate total amounts and apply offers
      for (const cartItem of cart) {
        for (const item of cartItem.products) {
          const product = item.product; // Populated product
          if (product) {
            totalItems += item.quantity;
            const originalPrice = product.price;

            // Fetch offers for the product or its category
            const productOffer = await Offer.findOne({
              products: product._id,
              offerFor: "product", // Specifically for products
              status: true,
              startDate: { $lte: new Date() },
              endDate: { $gte: new Date() },
            }).exec();

            const categoryOffer = await Offer.findOne({
              categories: product.categoryId,
              offerFor: "category", // Specifically for categories
              status: true,
              startDate: { $lte: new Date() },
              endDate: { $gte: new Date() },
            }).exec();

            let bestOffer = 0;
            let offerPrice = originalPrice;
            let discount = 0;
            let offerPercentage = 0;

            // Compare product-specific and category-specific offers to find the best one
            if (productOffer && categoryOffer) {
              // Compare both offers and choose the one with the highest discount
              const productOfferDiscount =
                productOffer.offerType === "percentage"
                  ? (productOffer.offerPercentage / 100) * originalPrice
                  : productOffer.offerAmount;

              const categoryOfferDiscount =
                categoryOffer.offerType === "percentage"
                  ? (categoryOffer.offerPercentage / 100) * originalPrice
                  : categoryOffer.offerAmount;

              if (productOfferDiscount > categoryOfferDiscount) {
                bestOffer = productOffer;
              } else {
                bestOffer = categoryOffer;
              }
            } else if (productOffer) {
              bestOffer = productOffer;
            } else if (categoryOffer) {
              bestOffer = categoryOffer;
            }

            // Calculate the best offer price if any offer exists
            if (bestOffer) {
              offerPrice =
                originalPrice -
                Math.round(originalPrice * (bestOffer.offerPercentage / 100));
              discount = originalPrice - offerPrice;
              offerPercentage = bestOffer.offerPercentage;
            }

            // Update total price and discount
            totalPrice += offerPrice * item.quantity;
            totalDiscount += discount * item.quantity;
            totalAmount += offerPrice * item.quantity;

            console.log(
              `Product: ${
                product.productName
              }, Original Price: ${originalPrice}, Offer Price: ${offerPrice}, Discount: ${discount}, Offer Type: ${
                bestOffer ? bestOffer.offerFor : "none"
              }`
            );
          }
        }
      }

      // Add fixed charges
      totalAmount += deliveryCharges + packagingFee;
      totalSavings = totalDiscount;

      // Render checkout page with all calculated data
      res.render("user/checkout", {
        showSidebar: false,
        addresses: addresses,
        cartItems: cart,
        cartProduct: cart.products,
        totalItems: totalItems,
        totalPrice: totalPrice,
        totalDiscount: totalDiscount,
        deliveryCharges: deliveryCharges,
        packagingFee: packagingFee,
        totalAmount: totalAmount,
        totalSavings: totalSavings,
        userId: userId,
      });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.error("Error in checkout route:", error);
    res.status(500).send("Internal server error");
  }
};

//uses inside payment function
async function getCouponsForUserCart(userId) {
  try {
    console.log(userId + " id in offer");

    const matchingCoupons = await Coupon.find({
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      status: true,
    }).lean();

    const orders = await Order.find({ userId }).lean();

    // Get a list of used coupons by the user
    const usedCouponsStr = [
      ...new Set(
        orders
          .map((order) => order.coupon?.toString()) // Convert ObjectId to string
          .filter((coupon) => coupon !== undefined && coupon !== null) // Filter out undefined or null coupons
      ),
    ];

    // Filter out coupons that the user has already used
    const filteredCoupons = matchingCoupons.filter((coupon) => {
      const couponIdStr = coupon._id.toString(); // Ensure _id is a string

      console.log(
        `${couponIdStr} in matching coupons. Used coupons: ${usedCouponsStr}`
      );

      return !usedCouponsStr.includes(couponIdStr); // Check if coupon is not used
    });

    const formattedCoupons = filteredCoupons.map((coupon) => {
      return {
        couponName: coupon.couponName,
        _id: coupon._id,
        discountType: coupon.discountType,
        minPurchase: coupon.minPurchase,
        discountValueHide:
          coupon.discountType === "Percentage"
            ? `${coupon.discountPercentage}`
            : `${coupon.discountValue}`,
        discountValue:
          coupon.discountType === "Percentage"
            ? `${coupon.discountPercentage}%`
            : `₹${coupon.discountValue}`,
      };
    });
    return formattedCoupons;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
exports.payment = async (req, res) => {
  try {
    let {
      addressId,
      Price,
      discount,
      deliveryCharges,
      packagingFee,
      totalSavings,
      totalAmount,
    } = req.body;

    Price = req.session.totalPrice || req.body.Price;
    totalAmount = req.session.totalAmount || req.body.totalAmount;

    // Fetch the logged-in user's details
    const fetchUserId = await userModel.findOne({
      email: req.session.useremail,
    });
    const userId = fetchUserId._id;

    // Fetch user's active cart
    const cart = await Cart.findOne({ user: userId, isActive: true }).populate(
      "products.product"
    );

    if (!cart) {
      return res.redirect("/");
    }

    const cartId = cart._id;
    const address = await Address.findOne({ _id: addressId });

    // Initialize totals
    let totalItems = 0;
    let totalPrice = 0;
    let totalDiscount = 0;
    let totalOfferSavings = 0;
    let totalAmountFinal = 0;
    let totalMRP = 0;
    // Iterate over cart items and calculate totals after applying the best offer
    for (const item of cart.products) {
      const product = item.product;
      if (product) {
        totalItems += item.quantity;
        const originalPrice = product.price;

        // Fetch product and category-specific offers (only percentage-based)
        const productOffer = await Offer.findOne({
          products: product._id,
          offerFor: "product",
          status: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        });

        const categoryOffer = await Offer.findOne({
          categories: product.categoryId,
          offerFor: "category",
          status: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        });

        let bestOffer = null;
        let offerPrice = originalPrice;
        let discount = 0;

        // Compare product-specific and category-specific offers to find the best one
        if (productOffer && categoryOffer) {
          const productOfferDiscount = Math.round(
            (productOffer.offerPercentage / 100) * originalPrice
          );
          const categoryOfferDiscount = Math.round(
            (categoryOffer.offerPercentage / 100) * originalPrice
          );

          // Choose the offer with the highest discount
          if (productOfferDiscount > categoryOfferDiscount) {
            bestOffer = productOffer;
            discount = productOfferDiscount;
          } else {
            bestOffer = categoryOffer;
            discount = categoryOfferDiscount;
          }
        } else if (productOffer) {
          bestOffer = productOffer;
          discount = Math.round(
            (bestOffer.offerPercentage / 100) * originalPrice
          );
        } else if (categoryOffer) {
          bestOffer = categoryOffer;
          discount = Math.round(
            (bestOffer.offerPercentage / 100) * originalPrice
          );
        }

        // Apply the best offer and calculate the final price
        if (bestOffer) {
          offerPrice = originalPrice - discount;
        }

        // Update totals
        totalPrice += originalPrice * item.quantity;
        totalDiscount += discount * item.quantity;
        totalAmountFinal += offerPrice * item.quantity;
        totalMRP += product.price * item.quantity;
      }
    }
    console.log(totalPrice + " -" + totalDiscount);
    totalPrice = totalPrice - totalDiscount;

    // Add delivery charges and packaging fee
    deliveryCharges = req.body.deliveryCharges || 75; // Set default if not provided
    packagingFee = req.body.packagingFee || 50; // Set default if not provided
    totalAmountFinal =
      parseInt(totalAmountFinal) +
      parseInt(deliveryCharges) +
      parseInt(packagingFee);
    totalSavings = totalDiscount;

    // Fetch any coupons for the user
    const coupons = await getCouponsForUserCart(userId);

    // Render the payment page with calculated totals and offer details
    res.render("user/payment", {
      orderDetails: {
        address,
        totalPrice: totalPrice,
        discount: totalDiscount,
        deliveryCharges,
        packagingFee,
        totalSavings,
        totalAmount: totalAmountFinal,
        totalMRP: totalMRP,
        cartItems: cart.products, // Show all products in the cart
        itemCount: totalItems,
        userId,
        cartId,
      },
      coupons,
    });
  } catch (error) {
    console.error("Error during payment processing:", error);
    res.status(500).json({ error: "Server error" });
  }
};
exports.createOrder = async (req, res) => {
  const { amount, currency, order_Id } = req.body; // amount should be passed in the smallest currency unit (like paise for INR)
  try {
    const options = {
      amount: amount * 100, // converting to the smallest currency unit
      currency: currency || "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
    };
    const order = await razorpayInstance.orders.create(options);
    razorpayOrderId = order.id;
    console.log("yes here" + razorpayOrderId);

    await Order.updateOne(
      { _id: order_Id },
      {
        $set: { razorpayOrderId: razorpayOrderId },
      }
    );
    console.log("yes here" + razorpayOrderId);

    res.status(200).json({ success: true, razorpayOrderId: razorpayOrderId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

async function generateUniqueOrderId() {
  let isUnique = false;
  let orderId;
  while (!isUnique) {
    const randomPart = Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit random number
    orderId = `ORD${randomPart}`; // Combines "ORD" with the 6-digit random number

    // Check if the orderId already exists in the database
    const existingOrder = await Order.findOne({ orderId });

    if (!existingOrder) {
      isUnique = true; // If no existing order found, it's unique
    }
  }

  return orderId;
}
exports.placeOrder = async (req, res) => {
  try {
    let {
      addressId,
      userId,
      cartId,
      totalPrice,
      discount,
      selectedCouponId,
      deliveryCharges,
      packingCharge,
      totalSavings,
      totalAmount,
      productIds,
      totalDiscount,
    } = req.body;
    selectedCouponId = selectedCouponId ? selectedCouponId : null;
    ///session fetch
    totalPrice = req.session.totalPrice || req.body.totalPrice;
    // discount = req.session.discount || req.body.discount;
    // deliveryCharges = req.session.deliveryCharges || req.body.deliveryCharges;
    // packagingFee = req.session.packagingFee || req.body.packagingFee;
    // totalSavings = req.session.totalSavings || req.body.totalSavings;
    totalAmount = req.session.totalAmount || req.body.totalAmount;
    totalMRP = req.session.totalMRP || req.body.totalMRP;

    if (req.session.totalAmount) {
      totalAmount = totalAmount - discount;
    }

    //end session fetch
    //RAZOR
    let razorpayOrderId = "";
    if (req.body.paymentType === "Online") {
      const options = {
        amount: totalAmount * 100, // amount in paise
        currency: "INR",
        receipt: crypto.randomBytes(10).toString("hex"),
      };
      let razorpayOrder;
      try {
        razorpayOrder = await razorpayInstance.orders.create(options);
      } catch (error) {
        return res.status(500).json({
          error: "Error creating Razorpay order",
          message: error.message,
        });
      }
      razorpayOrderId = razorpayOrder.id;
    }
    //RAZOR END
    //orderid unique value create

    let orderId = await generateUniqueOrderId();
    //end orderid creation
    const address = await Address.findOne({ _id: addressId }).select("-_id");
    // const productIdArray = productIds.split(',').map(id => id.trim());

    const cart = await Cart.findOne({ _id: cartId }).populate({
      path: "products.product", // Populate the product field in cart
      populate: [
        { path: "categoryId", model: "Category" }, // Populate category in product
        { path: "subCategoryId", model: "SubCategory" }, // Populate subcategory in product
      ],
    });
    //discount split
    /////////CALCULATE TOTAL VALUE PRODUCT
    const totalOrderValue = cart.products.reduce((acc, item) => {
      return acc + item.product.price * item.quantity;
    }, 0);
    //////////
    if (req.body.paymentType === "COD") {
      paymentStatus = "Completed";
    } else {
      paymentStatus = "Pending";
    }
    const cartItemsWithDetails = await Promise.all(
      cart.products.map(async (item) => {
        const productOffer = await Offer.findOne({
          products: item.product._id,
          offerFor: "product",
          status: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        });
        const categoryOffer = await Offer.findOne({
          categories: item.product.categoryId,
          offerFor: "category",
          status: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        });

        let bestOffer = null;
        let offerPercentage = 0;
        let offerPrice = item.product.price;
        let discountOffer = 0;
        // let totalAmountFinal=0;
        let totalItems = 0;
        let offerId = null; // Default value

        // Find the best offer (either product-specific or category-specific)
        if (productOffer && categoryOffer) {
          const productOfferDiscount = Math.round(
            (productOffer.offerPercentage / 100) * item.product.price
          );
          const categoryOfferDiscount = Math.round(
            (categoryOffer.offerPercentage / 100) * item.product.price
          );

          // Choose the offer with the highest discount
          if (productOfferDiscount > categoryOfferDiscount) {
            bestOffer = productOffer;
            offerPercentage = productOffer.offerPercentage;
            discountOffer = productOfferDiscount;
            offerId = productOffer._id;
          } else {
            bestOffer = categoryOffer;
            offerPercentage = categoryOffer.offerPercentage;
            discountOffer = categoryOfferDiscount;
            offerId = categoryOffer._id;
          }
        } else if (productOffer) {
          bestOffer = productOffer;
          offerPercentage = productOffer.offerPercentage;
          discountOffer = Math.round(
            (productOffer.offerPercentage / 100) * item.product.price
          );
          offerId = productOffer._id;
        } else if (categoryOffer) {
          bestOffer = categoryOffer;
          offerPercentage = categoryOffer.offerPercentage;
          discountOffer = Math.round(
            (categoryOffer.offerPercentage / 100) * item.product.price
          );
          offerId = categoryOffer._id;
        } else {
          bestOffer = 0;
          offerPercentage = 0;
          discountOffer = 0;
        }

        // Calculate the final offer price after applying the best offer
        if (bestOffer) {
          offerPrice = item.product.price - discountOffer;
        }
        console.log(bestOffer + " bestOffer");

        const itemTotalValue = offerPrice * item.quantity; // Use offerPrice here

        let discountProduct = (itemTotalValue / totalPrice) * discount; // Coupon discount split
        discountProduct = Math.round(discountProduct);
        totalPrice = totalPrice - discountProduct;
        offerPrice = offerPrice * item.quantity - discountProduct;

        totalItems += item.quantity;
        console.log(totalItems + " total item");
        // const productCouponDiscount = Math.round((offerPrice * item.quantity / totalOrderValue) * discount);

        // totalPrice += item.product.price * item.quantity;console.log(totalPrice+"tot price")
        //totalDiscount += discountProduct + discountOffer * item.quantity;console.log(totalDiscount+"tot disc")

        //   totalAmountFinal += offerPrice * item.quantity;
        return {
          productId: item.product._id,
          productName: item.product.productName,
          category: item.product.categoryId
            ? item.product.categoryId._id
            : null,
          subcategory: item.product.subCategoryId
            ? item.product.subCategoryId._id
            : null,
          quantity: item.quantity,
          image: item.product.thumbnailPaths[0],
          price: item.product.price,
          itemTotalValue: itemTotalValue, // Calculated total value for this item
          discountProduct: discountProduct, // Coupon discount split for this item
          offerPercentage: offerPercentage, // Offer percentage applied
          offerPrice: offerPrice, // Price after applying offer
          offerId: offerId,
          discountOffer: discountOffer,
          paymentStatus: "Pending",
        };
      })
    );
    console.log(totalOrderValue + " orders");

    const newOrder = new Order({
      orderId,
      paymentMethod: req.body.paymentType,
      orderStatus: "Order Placed",
      address: address,
      deliveryCharge: deliveryCharges,
      userId,
      packingCharge: packingCharge,
      coupon: selectedCouponId,
      discount: discount,
      totalPrice: totalPrice,
      totalMRP: totalMRP,
      totalAmount: totalAmount,
      totalDiscount: totalDiscount,
      orderedProducts: cartItemsWithDetails,
      razorpayOrderId: razorpayOrderId,
      paymentStatus: paymentStatus,
    });
    // Log the newOrder for debugging purposes
    console.log(newOrder + " newOrder");

    // Save the new order to the database
    let result = await newOrder.save();
    if (result) {
      await Cart.findByIdAndUpdate(cartId, { isActive: false }, { new: true });
      for (const item of cartItemsWithDetails) {
        const product = await Product.findById(item.productId);

        if (!product) {
          console.error(`Product with ID ${item.productId} not found.`);
          continue;
        }

        // Check if there is enough stock in the product
        if (product.quantity < item.quantity) {
          console.error(`Not enough stock for product ID ${item.productId}.`);
          continue;
        }

        // Decrease the product quantity
        product.quantity -= item.quantity;

        await product.save();
      }
      delete req.session.totalItems;
      delete req.session.totalPrice;
      delete req.session.totalAmount;
      delete req.session.totalMRP;
      console.log("last" + orderId);
      return res.json({
        success: true,
        message: "Order placed successfully",
        orderId: result.orderId,
        razorpayOrderId: razorpayOrderId,
        amount: totalAmount * 100,
      });

      //res.render("user/paymenySuccess", { orderId });
    }
  } catch (error) {
    // Respond with error message
    res.status(500).json({ message: "Error placing order", error });
  }
};
exports.verifyPayment = async (req, res) => {
  const secret = "NuhGj1P30sdMmbn0MhA021uV";
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

  // Create a SHA256 hash of the razorpay_order_id and razorpay_payment_id
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
  const digest = shasum.digest("hex");

  // Verify the signature
  if (digest !== razorpaySignature) {
    console.log("----Signature mismatch----");
    await Order.updateOne(
      { razorpayOrderId: razorpayOrderId },
      {
        $set: { paymentStatus: "Failed", razorpayPaymentId: razorpayPaymentId },
      }
    );
    return res.status(400).json({
      success: false,
      message: "Payment verification failed due to signature mismatch",
    });
  }

  try {
    const payment = await razorpayInstance.payments.fetch(razorpayPaymentId);

    if (payment.status !== "captured") {
      console.log("Non-success Payment Status: ", payment.status);
      await Order.updateOne(
        { razorpayOrderId: razorpayOrderId },
        {
          $set: {
            paymentStatus: payment.status,
            razorpayPaymentId: razorpayPaymentId,
          },
        }
      );
      return res.status(400).json({
        success: false,
        message: "Payment was not successful",
      });
    }

    const order = await Order.findOne({ razorpayOrderId: razorpayOrderId });
    if (!order) {
      return res.status(404).send("Order not found");
    }
    console.log("status success aayi");

    order.razorpayPaymentId = razorpayPaymentId;
    order.paymentStatus = "Completed";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      orderId: order.orderId,
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    return res.status(500).send("Error updating order status");
  }
};

exports.paymentSuccess = async (req, res) => {
  const { orderId } = req.params;
  //  const orderId = req.params.orderId
  res.render("user/paymentSuccess", { orderId: orderId });
};

exports.paymentFailedPage = async (req, res) => {
  res.render("user/paymentFailedPage", { orderId: "hgjhgj" });
};
//RAZOR VERIFY
exports.paymentFailed = async (req, res) => {
  const { orderId } = req.body;
  try {
    // Update the order status to 'Failed' or 'Canceled'
    await Order.updateOne(
      { razorpayOrderId: orderId },
      { $set: { paymentStatus: "Failed" } }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error marking payment as failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update payment status." });
  }
};

exports.myOrders = async (req, res) => {
  try {
    res.render("user/myOrders", { showSidebar: true });
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders", error });
  }
};

exports.fetchOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Get the current page from the query parameters
    const limit = 10; // Number of items per page
    const skip = (page - 1) * limit;

    // Fetch userId based on email in session
    const fetchUserId = await userModel.findOne({
      email: req.session.useremail,
    });
    if (!fetchUserId) {
      return res.status(404).json({ message: "User not found" });
    }
    const userId = fetchUserId._id;

    // Fetch orders with populated fields
    const orders = await Order.find({ userId: userId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        select: "username email displayName", // Include user details
      })
      .populate({
        path: "orderedProducts.productId",
        select: "productName thumbnailPaths price", // Include product details
      })
      .populate({
        path: "orderedProducts.category",
        select: "categoryName", // Include category details
      })
      .populate({
        path: "orderedProducts.subcategory",
        select: "subCategoryName", // Include subcategory details
      })
      .exec();

    // Fetch total number of orders for pagination
    const totalOrders = await Order.countDocuments({ userId: userId });
    const totalPages = Math.ceil(totalOrders / limit);

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Orders not found" });
    }

    // Process orders to add deliveryDate and itemTotalPrice
    const updatedOrders = orders.map((order) => {
      const orderDate = new Date(order.createdAt);
      const deliveryDate = getDeliveryDate(order, orderDate);

      // Calculate item total price and add deliveryDate
      const updatedProducts = order.orderedProducts.map((product) => ({
        ...product.toObject(),
        deliveryDate,
        itemTotalPrice: product.price * product.quantity,
      }));

      // Return the updated order with updated orderedProducts
      return {
        ...order.toObject(),
        orderedProducts: updatedProducts,
      };
    });

    res.json({ success: true, updatedOrders, totalPages, currentPage: page });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Error fetching orders", error });
  }
};

// Implement the getDeliveryDate function as needed
function getDeliveryDate(order, orderDate) {
  // Example logic for deliveryDate, adjust according to your needs
  const deliveryTime = 7; // Example: 7 days for delivery
  const deliveryDate = new Date(orderDate);
  deliveryDate.setDate(deliveryDate.getDate() + deliveryTime);
  return deliveryDate;
}

exports.cancelOrder = async (req, res) => {
  try {
    const { orderId, productId, reason } = req.body;
    // console.log(productId + " " + reason);
    if (!orderId || !productId || !reason) {
      return res.status(400).json({
        success: false,
        message: "Order ID, Product ID, and reason are required.",
      });
    }
    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    const product = order.orderedProducts.find(
      (p) => p.productId.toString() === productId
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in the order." });
    }
    product.orderStatus = "Pending Cancellation";
    product.cancellation = { reason, cancelDate: new Date() };
    product.cancelledBy = req.session.userType;
    await order.save();
    res.status(200).json({
      success: true,
      message: "Product cancellation requested successfully.",
    });
  } catch (error) {
    console.error("Error cancelling product:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

//wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.body;
    let wishlist = await Wishlist.findOne({
      user: userId,
      products: productId,
    });

    if (wishlist) {
      await Wishlist.deleteOne({ _id: wishlist._id });
      return res.status(200).json({ message: "Product removed from wishlist" });
    } else {
      wishlist = new Wishlist({ user: userId, products: productId });
      await wishlist.save();
      return res.status(200).json({ message: "Product added to wishlist" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error toggling wishlist", error });
  }
};
// Route to render the wishlist page
exports.whishlist = (req, res) => {
  try {
    // Render the page without any data
    res.render("user/whishlist", {
      showSidebar: true,
      products: [], // No products passed initially
    });
  } catch (error) {
    console.error("Error in wishlist route:", error);
    res.status(500).send("Internal server error");
  }
};

// Route to fetch wishlist data
exports.getWishlistData = async (req, res) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = 3; // Default to 10 items per page if not provided
    const skip = (page - 1) * limit;
    const wishlist = await Wishlist.find({ user: userId })
      .populate({
        path: "products",
        populate: {
          path: "categoryId",
          model: "Category",
        },
      })
      .skip(skip)
      .limit(limit)
      .lean();
    const totalWishlist = await Wishlist.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalWishlist / limit);
    if (!wishlist) {
      return res.json({ products: [], message: "Your wishlist is empty." });
    }

    const productsWithDetails = wishlist.map((item) => {
      let status;
      let backgroundColor;

      // Determine the status and background color based on quantity
      if (item.products.quantity <= 0) {
        status = "Sold Out";
        backgroundColor = "red";
      } else if (item.products.quantity < 10) {
        status = "Low Stock";
        backgroundColor = "orange";
      } else {
        status = "Available";
        backgroundColor = "green";
      }

      // Return the product object with additional details
      return {
        ...item.products,
        categoryName: item.products.categoryId
          ? item.products.categoryId.categoryName
          : "Unknown",
        status: status,
        color: backgroundColor,
      };
    });

    res.json({
      success: true,
      products: productsWithDetails,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error in fetching wishlist data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deletWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.userId;
    const wishlist = await Wishlist.findOne({
      user: userId,
      products: productId,
    });
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }
    if (!wishlist.products.equals(productId)) {
      return res.status(404).json({ message: "Product not found in wishlist" });
    }
    // Remove the product from the wishlist
    await Wishlist.deleteOne({ _id: wishlist._id });
    res.status(200).json({ message: "Product removed from wishlist" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove product from wishlist" });
  }
};

//wallet
exports.wallet = async (req, res) => {
  try {
    //  const wallet = await Wallet.findOne({ userId: req.session.userId }).lean();
    // if (wallet && wallet.History) {
    //   wallet.History.sort((a, b) => new Date(b.date) - new Date(a.date));
    // }
    res.render("user/wallet", {
      showSidebar: true,
    });
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};
exports.fetchWallet = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 4; // Number of transactions per page
    const skip = (page - 1) * limit;

    const wallet = await Wallet.findOne({ userId: req.session.userId }).lean();
    if (wallet && wallet.History) {
      // Sorting and paginating the History array
      wallet.History.sort((a, b) => new Date(b.Date) - new Date(a.Date));
      const paginatedHistory = wallet.History.slice(skip, skip + limit);

      // Prepare the pagination data
      const totalTransactions = wallet.History.length;
      const totalPages = Math.ceil(totalTransactions / limit);

      return res.json({
        wallet: {
          Balance: wallet.Balance,
          History: paginatedHistory,
        },
        totalPages,
        currentPage: page,
      });
    } else {
      return res.json({
        wallet: { Balance: 0, History: [] },
        totalPages: 0,
        currentPage: page,
      });
    }
  } catch (error) {
    console.error("Error in wallet route:", error);
    res.status(500).send("Internal server error");
  }
};
