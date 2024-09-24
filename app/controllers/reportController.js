const Category = require("../models/categoryModel");
const SubCategory = require("../models/subCategoryModel");
const Product = require("../models/productModel");
const userModel = require("../models/userModel");
const Order = require("../models/orderModel");
const Wallet = require("../models/walletModel");

const path = require("path");
const mongoose = require("mongoose");

exports.salesReportList = async (req, res) => {
  try {
    res.render("admin/salesReport", {
      layout: "adminLayout",
      pageTitle: "Sales Report",
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching sales report", error });
  }
};

exports.salesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Create a filter object to be used in the query
    const filter = { paymentStatus: { $ne: "Failed" } }; // Exclude orders with paymentStatus "Failed"

    // If startDate and endDate are provided, use them to filter the orders
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    console.log("Filter applied:", filter);

    const orders = await Order.aggregate([
      { $match: filter },
      { $unwind: "$orderedProducts" },
      // {
      //   $match: {
      //     "orderedProducts.orderStatus": { 
      //       $in: ["Delivered", "Order Placed", "Shipped"] 
      //     },
      //   },
      // },
      {
        $lookup: {
          from: "products", // Ensure this matches your collection name
          localField: "orderedProducts.productId",
          foreignField: "_id",
          as: "orderedProducts.product",
        },
      },
      { $unwind: "$orderedProducts.product" },
      {
        $lookup: {
          from: "categories", // Ensure this matches your collection name
          localField: "orderedProducts.category",
          foreignField: "_id",
          as: "orderedProducts.category",
        },
      },
      { $unwind: "$orderedProducts.category" },
      {
        $lookup: {
          from: "subcategories", // Ensure this matches your collection name
          localField: "orderedProducts.subcategory",
          foreignField: "_id",
          as: "orderedProducts.subcategory",
        },
      },
      { $unwind: "$orderedProducts.subcategory" },
      {
        $lookup: {
          from: "users", // Assuming users is the collection name
          localField: "userId",
          foreignField: "_id",
          as: "users", // Store the user data in the "user" field
        },
      },
      { $unwind: "$users" },
      {
        $project: {
          _id: 1,
          orderId: 1,
          paymentMethod: 1,
          address: 1,
          deliveryCharge: 1,
          packingCharge: 1,
          coupon: 1,
          userId: 1,
          discount: 1,
          totalPrice: 1,
          totalAmount: 1,
          paymentStatus: 1,
          totalDiscount: 1,
          totalMRP: 1,

          // Include other necessary fields here

          orderedProducts: {
            productId: "$orderedProducts.product._id",
            productName: "$orderedProducts.product.productName",
            category: "$orderedProducts.category.categoryName",
            subcategory: "$orderedProducts.subcategory.subCategoryName",
            quantity: "$orderedProducts.quantity",
            image: "$orderedProducts.product.thumbnailPaths",
            price: "$orderedProducts.product.price",
            discountProduct: "$orderedProducts.discountProduct",
            discountOffer: "$orderedProducts.discountOffer",
            offerPrice: "$orderedProducts.offerPrice",
            orderStatus: "$orderedProducts.orderStatus",
            cancellation: "$orderedProducts.cancellation",
          },
          users: {
            username: "$users.username",
          },
          createdAt: 1,
          updatedAt: 1,
        },
      },
      { $sort: { createdAt: -1 } } 
    ]);
    let totalOrders = 0;
    // const uniqueOrderIds = new Set(orders.map(order => order._id.toString()));
    // totalOrders = uniqueOrderIds.size;
    // const uniqueCustomerIds = new Set(orders.map(order => order.userId.toString()));
    // const totalCustomers = uniqueCustomerIds.size;
    
    
    let updatedOrders = [];

    // let totalCustomers = new Set();
    //  let onlinePayment = 0;
    //let cashOnDelivery = 0;
    let totalRefund = 0;
    let totalDiscount = 0;
    let totalShippingCharges = 0;
    let totalProfit = 0;
    let cashOnDelivery = 0
    let onlinePayment = 0
    let totalOrderedAmount=0;
    let totalSales = orders.length
    let uniqueOrderIds = new Set();
    let uniqueCustomerIds = new Set();

    // Check if any orders were found
    if (!orders.length) {
      console.log("No orders found");
    } else {
      updatedOrders = orders.map((order) => {
        if(!uniqueOrderIds.has(order._id.toString())){
          totalShippingCharges += order.deliveryCharge+order.packingCharge || 0;
          if(order.paymentMethod === "COD"){
            cashOnDelivery+=1
          }
          if(order.paymentMethod === "Online"){
            onlinePayment+=1
          }
         }
        uniqueOrderIds.add(order._id.toString());
        uniqueCustomerIds.add(order.userId.toString());
        totalOrders = uniqueOrderIds.size;
        totalCustomers = uniqueCustomerIds.size;
       
        ///////
        const orderDate = new Date(order.createdAt);
        const deliveryDate = getDeliveryDate(order, orderDate);
        const orderedProduct = order.orderedProducts;
        if (Array.isArray(orderedProduct)) {
          orderedProduct = orderedProduct.filter(
            (product) =>
              product.orderStatus !== "Cancelled" &&
              product.orderStatus !== "Returned"
          );

          if (orderedProduct.length === 0) {
            return null;
          }
          orderedProduct =
            orderedProduct.length === 1 ? orderedProduct[0] : orderedProduct;
        } else {
          if (
            orderedProduct.orderStatus === "Cancelled" ||
            orderedProduct.orderStatus === "Returned"
          ) {        

            // Track refund separately
            if (
              orderedProduct.orderStatus === "Cancelled" &&
              order.paymentMethod === "Online"
            ) {
              totalRefund +=
                orderedProduct.price * orderedProduct.quantity -
                (orderedProduct.discountProduct || 0);
            }
            if (orderedProduct.orderStatus === "Returned") {  
            

              totalRefund +=
                (orderedProduct.price * orderedProduct.quantity) -
                (orderedProduct.discountProduct || 0)-(orderedProduct.discountOffer*orderedProduct.quantity);
            }
            return null;
          }
        }
        //all totals

        //  totalCustomers.add(order.userId);
        //  if (order.paymentMethod === "Online") onlinePayment += 1;
        //  if (order.paymentMethod === "COD") cashOnDelivery += 1;
       // totalDiscount += orderedProduct.discountProduct || 0;
       let offerPrice = orderedProduct.offerPrice;

        const productDiscount = orderedProduct.discountProduct || 0;
        let itemTotalPrice = orderedProduct.offerPrice ;
        let soldPrice = itemTotalPrice - productDiscount;
        totalProfit += soldPrice;
       
        // if (
        //   orderedProduct.orderStatus === "Returned" ||
        //   (orderedProduct.orderStatus === "Cancelled" &&
        //     order.paymentMethod === "Online")
        // ) {
        //   totalRefund += soldPrice; // Add refunded amount to total refund
        // }
        let totProdOffer =
          orderedProduct.discountOffer * orderedProduct.quantity;

          totalOrderedAmount += itemTotalPrice;
        //end all totals
        //tot discount of each product

        // let totProdDisc = parseInt(orderedProduct.discountProduct)+parseInt(orderedProduct.discountOffer)
        let totProdDisc =
          parseInt(orderedProduct.discountProduct || 0) +
          parseInt(orderedProduct.discountOffer || 0) * orderedProduct.quantity;
          totalDiscount+=totProdDisc;
        const updatedProduct = {
          ...orderedProduct,
          productDiscount,
          soldPrice,
          totProdOffer,
          offerPrice,
          totProdDisc,
          deliveryDate,
          itemTotalPrice: orderedProduct.price * orderedProduct.quantity,
          image:
            orderedProduct.image && orderedProduct.image.length > 0
              ? orderedProduct.image[0]
              : "https://via.placeholder.com/75",
        };
        return {
          ...order,
          orderedProducts: updatedProduct,
        };
      });
    }
    // console.log(updatedOrders.length + " total orders")
    //   res.json({ orders, ok: true });
    res.status(200).json({
      ok: true,
      orders: updatedOrders,
      report: {
        totalOrders,
        totalSales,
        totalOrderedAmount,
        totalCustomers: totalCustomers,
        onlinePayment,
        cashOnDelivery,
        totalRefund,
        totalDiscount,
        totalShippingCharges,
        totalProfit,
      },
    });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ message: "Error fetching sales report", error });
  }
};

function getDeliveryDate(order, orderDate) {
  // Example logic for deliveryDate, adjust according to your needs
  const deliveryTime = 7; // Example: 7 days for delivery
  const deliveryDate = new Date(orderDate);
  deliveryDate.setDate(deliveryDate.getDate() + deliveryTime);
  return deliveryDate;
}
