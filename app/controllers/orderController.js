const Category = require("../models/categoryModel");
const SubCategory = require("../models/subCategoryModel");
const Product = require("../models/productModel");
const userModel = require("../models/userModel");
const Address = require("../models/addressModel");
const Order = require("../models/orderModel");
const Wallet = require("../models/walletModel");
//INVOICE DOWNLOAD
const PDFDocument = require('pdfkit');


const path = require("path");
const mongoose = require("mongoose");

exports.orders = async (req, res) => {
  try { 
    let pageTitle = "Orders";
    const fetchUserId = await userModel.findOne({
      email: req.session.aduseremail,
    });
    if (!fetchUserId) {
      return res.status(404).json({ message: "User not found" });
    }
    const userId = fetchUserId._id;
    console.log(userId);
    // Fetch orders and populate necessary fields
    const orders = await Order.find({
      paymentStatus: { $ne: "Failed" } 
    }) 
    .sort({ createdAt: -1 })
      .populate("userId", "_id username email")
      .populate("orderedProducts.category")
      .populate("orderedProducts.subcategory") 
   ; 

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Orders not found" });
    }

    // Process orders to add deliveryDate and itemTotalPrice
    const updatedOrders = orders.map((order) => {
      const orderDate = new Date(order.createdAt);
      
      const updatedProducts = order.orderedProducts.map((product) => {
        let deliveryDate;

        if (
          product.orderStatus === "Order Placed" ||
          product.orderStatus === "Shipped"
        ) {
          deliveryDate = new Date(orderDate);
          deliveryDate.setDate(orderDate.getDate() + 10); // Delivery date 10 days from order date
        } else if (product.orderStatus === "Delivered") {
          deliveryDate = new Date(order.updatedAt); // Delivery date is the order's updated date
        } else if (product.orderStatus === "Pending Cancellation") {
          deliveryDate = new Date(product.cancellation.cancelDate); // Delivery date is the order's updated date
        }

        // Add deliveryDate and itemTotalPrice to product
        const updatedProduct = {
          ...product.toObject(),
          deliveryDate: deliveryDate ? deliveryDate.toLocaleDateString() : null,
          itemTotalPrice: product.price * product.quantity,
        };

        return updatedProduct;
      });
      // Attach the updated products to the order
      return {
        ...order.toObject(),
        orderedProducts: updatedProducts,
        
      };
    });
    console.log(updatedOrders)

    // Log updated orders for debugging
    res.render("admin/orders", {
      userName: req.session.adusername,
      layout: "adminLayout",
      pageTitle,
      updatedOrders,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders", error });
  }
};

//admin
exports.orderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const orders = await Order.find({ _id: orderId })
      .populate("userId", "_id username email")
      .populate("orderedProducts.category")
      .populate("orderedProducts.subcategory")
      .populate("coupon", "couponName discountType discountPercentage discountValue");
    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Orders not found" });
    }

    if (!orders) {
      return res.status(404).send("Order not found");
    }
////  
/////
    const updatedOrders = orders.map((order) => {
      const coupon = order.coupon ? {
        discountType: order.coupon.discountType,
        discountPercentage: order.coupon.discountPercentage,
        discountValue: order.coupon.discountValue
      } : null;
    
    //  console.log(order.coupon.couponName +" : No coupon applied");
      let couponDisc=""
      if(order.coupon&&order.coupon.discountType==='Percentage'){
        couponDisc = order.coupon.couponName+"-(Disc-"+order.coupon.discountPercentage+"%)"
      }
      if(order.coupon&&order.coupon.discountType==='Amount'){
        couponDisc = '₹'+order.coupon.discountValue
      }
     
      const orderDate = new Date(order.createdAt);
      let offerTot =0
      const updatedProducts = order.orderedProducts.map((product) => {
        let deliveryDate;
        let btnColr = "";
        offerTot += product.discountOffer* product.quantity;
        if (
          product.orderStatus === "Order Placed" ||
          product.orderStatus === "Shipped"
        ) {
          btnColr = product.orderStatus === "Order Placed" ? "blue" : "orange";

          deliveryDate = new Date(orderDate);
          deliveryDate.setDate(orderDate.getDate() + 10); // Delivery date 10 days from order date
        } else if (product.orderStatus === "Delivered") {
          btnColr = "green";
          deliveryDate = new Date(order.updatedAt); // Delivery date is the order's updated date
        } else if (product.orderStatus === "Pending Cancellation") {
          btnColr = "yellow;color:black";
          deliveryDate = new Date(product.cancellation.cancelDate); // Delivery date is the order's updated date
        } else if (product.orderStatus === "Cancelled") {
          btnColr = "red";
        }
        let productDiscount='NA'
        if(product.discountProduct){
          productDiscount = product.discountProduct;
        }
        let itemTotalPrice = product.price * product.quantity;
        let soldPrice = itemTotalPrice-productDiscount;
        let offerPrice =product.offerPrice;
        if(!product.discountOffer)
          product.discountOffer=0
        if(!product.discountProduct)
          product.discountProduct=0
        let totProdDisc = product.discountProduct+(product.discountOffer*product.quantity);
        //discount amount calc
        // Add deliveryDate and itemTotalPrice to product
        const updatedProduct = {
          ...product.toObject(),
          deliveryDate: deliveryDate ? deliveryDate.toLocaleDateString() : null,
          btnColr: btnColr,
          itemTotalPrice: itemTotalPrice,
          productDiscount : productDiscount,
          soldPrice:soldPrice  ,
          totalMRP:product.totalMRP,
          offerPrice:offerPrice,
          totProdDisc:totProdDisc
          

        };

        return updatedProduct;
      });

      // Attach the updated products to the order
      return {
        ...order.toObject(),
        orderedProducts: updatedProducts,
        offerTot:offerTot,
        couponDisc
      };
    });
   // console.log("Updated Orders: ", JSON.stringify(updatedOrders, null, 2));
    let pageTitle = "Order Details";
    res.render("admin/orderDetails", {
      updatedOrders,
      layout: 'adminLayout',
      pageTitle,
      showSidebar: false,
    });
  } catch (err) {
    console.error("Error fetching order details:", err);
    res.status(500).send("Server Error");
  }
};

exports.updateOrderStatus = async (req, res) => {


  const { status, orderId, productId, userId, totalAmt } = req.body;
  try {
    // Find the order and update the product's order status
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, "orderedProducts.productId": productId, userId: userId },
      { $set: { "orderedProducts.$.orderStatus": status } },
      { new: true }
    );
    if (!updatedOrder) {
      return res
        .status(404)
        .json({ success: false, error: "Order not found." });
    }
    // If the status is 'Cancelled', update the product quantity and status
    if (status === "Cancelled" || status === "Returned") {
      // Find the specific product in the order
      const product = updatedOrder.orderedProducts.find(
        (prod) => prod.productId.toString() === productId
      );

      if (product) {
        console.log(" product" + product.productId);
        // Update product quantity and order status in the Product collection
        await Product.findByIdAndUpdate(product.productId, {
          $inc: { quantity: product.quantity }
        //  $set: { orderStatus: status },
        });

        // Ensure the order's product status is also updated to 'Cancelled'
        await Order.updateOne(
          { _id: orderId, "orderedProducts.productId": productId },
          { $set: { "orderedProducts.$.orderStatus": status } }
        );
        //update wallet
        const refundAmount = product.price * product.quantity;
        let wallet = await Wallet.findOne({ userId: userId });
        if (!wallet) {
          // If wallet does not exist, create a new one
          wallet = new Wallet({
            userId: userId,
            Balance: refundAmount,
            History: [
              {
                TransactionType: "Refund",
                Amount: refundAmount,
                Date: new Date(),
              },
            ],
          });

        } else {
          // If wallet exists, update balance and history
          wallet.Balance += refundAmount;

          wallet.History.push({
            TransactionType: "Refund",
            Amount: refundAmount,
            Date: new Date(),
          });
        }

        // Only update wallet for non-COD payments and 'Returned' orders
        if (
          (status === "Cancelled" && updatedOrder.paymentMethod.trim() !== "COD") ||
          status === "Returned"
        ) {
          console.log("Processing wallet update...");
          await wallet.save();
            console.log("Wallet updated with refund amount:", refundAmount);
          }
        

        //end update wallet
        console.log("Product and Order status updated to 'Cancelled'");
      } else {
        console.log("Product not found in the order");
      }
    }

    res.json({ success: true, updatedOrder });
  } catch (err) {
    console.error("Error updating order status:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update order status." });
  }
};
exports.returnOrder = async (req, res) => {
  try {
    const { reason, orderId, productId } = req.body;

    const order = await Order.findById(orderId);
    console.log(order);
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
        .json({ success: false, message: "Product not found in order." });
    }

    // Update the product's order status to "Returned"
    product.orderStatus = "Return";
    product.return = {
      reason: reason,
      returnDate: new Date(),
    };

    await order.save();

    res
      .status(200)
      .json({ success: true, message: "Product returned successfully." });
  } catch (error) {
    console.error("Error returning order:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to return order." });
  }
};

exports.reOrder = async (req, res) => {
  const { id } = req.params;
  console.log("orderid "+id)
  const orderId=id;
  try {
      // Update the order status to 'Failed' or 'Canceled'
      res.render("user/reOrder", { showSidebar: true ,orderId});
  } catch (error) {
      console.error('Error marking payment as failed:', error);
      res.status(500).json({ success: false, message: 'Failed to update payment status.' });
  }
};
exports.selectedOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const orders = await Order.find({ _id: orderId })
      .populate("userId", "_id username email")
      .populate("orderedProducts.productId")
      .populate("orderedProducts.category")
      .populate("orderedProducts.subcategory")
      .populate("coupon", "couponName discountType discountPercentage discountValue");

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const updatedOrders = orders.map((order) => {
      const coupon = order.coupon ? {
        discountType: order.coupon.discountType,
        discountPercentage: order.coupon.discountPercentage,
        discountValue: order.coupon.discountValue
      } : null;

      let couponDisc = "";
      if (order.coupon) {
        couponDisc = order.coupon.discountType === 'Percentage'
          ? `${order.coupon.couponName} - (Disc - ${order.coupon.discountPercentage}%)`
          : `₹${order.coupon.discountValue}`;
      }

      let offerTot = 0;
      const updatedProducts = order.orderedProducts.map((product) => {
        let itemTotalPrice = product.price * product.quantity;
        let soldPrice = itemTotalPrice - (product.discountProduct || 0);
        let offerPrice = product.offerPrice || 0;
        let totProdDisc = (product.discountProduct || 0) + (product.discountOffer * product.quantity);

        const updatedProduct = {
          ...product.toObject(),
          itemTotalPrice: itemTotalPrice,
          soldPrice: soldPrice,
          totalMRP: product.totalMRP,
          offerPrice: offerPrice,
          totProdDisc: totProdDisc
        };

        return updatedProduct;
      });

      return {
        ...order.toObject(),
        orderedProducts: updatedProducts,
        offerTot: offerTot,
        couponDisc: couponDisc
      };
    });

    res.status(200).json({ order: updatedOrders, success: true });
  } catch (err) {
    console.error("Error fetching order details:", err);
    res.status(500).json({ message: "Server Error" });
  }
};


exports.invoice = async (req, res) => {
 
  try {
      // Update the order status to 'Failed' or 'Canceled'
      res.render("user/invoice");
  } catch (error) {
      console.error('Error marking payment as failed:', error);
      res.status(500).json({ success: false, message: 'Failed to update payment status.' });
  }
};



let invoiceNumber = 100;
exports.invoiceDownload = async (req, res) => {
  const {
      orderId,
      productDetails,
      totalPrice,
      totalOfferPrice,
      deliveryCharge,
      packingCharge,
      totalAmount,
      address
      
  } = req.body;
  console.log(req.body)
  try {
    const order = await Order.findOne({ _id:orderId });

    if (!order) {
        return res.status(404).json({ message: 'Order not found' });
    }

    let invoiceNo;

    // Check if the order already has an invoice number
    if (!order.invoiceNo) {
        // If no invoice number, find the highest current invoice number
        const highestInvoice = await Order.findOne()
        .sort({ invoiceNo: -1 })
        .select('invoiceNo -_id');
        if (!highestInvoice || typeof highestInvoice.invoiceNo !== 'number') {
          invoiceNo = 100;
        } else {
          invoiceNo = highestInvoice.invoiceNo + 1;
        } // Start from 100 if no invoices exist
        
        // Save the generated invoice number to the order
        order.invoiceNo = invoiceNo;
        await order.save();
    } else {
        // Use the existing invoice number
        invoiceNo = order.invoiceNo;
    }

    const userAddress = `${order.address.place,order.address.house},${order.address.place,order.address.place},
    ${order.address.place,order.address.city} ,${order.address.place,order.address.district}
   ,${order.address.place,order.address.state}`
      // Create a PDF document
      const doc = new PDFDocument({ margin: 50 });

      // Set the response header to download the file
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');

      // Stream the document to the response
      doc.pipe(res);

      // Define margins and page width
      const pageWidth = doc.page.width;
      const leftMargin = doc.page.margins.left;
      const rightMargin = doc.page.margins.right;
      const contentWidth = pageWidth - leftMargin - rightMargin;

      // Add header with invoice details and address on the same row
      const headerTop = doc.y;
      const addressWidth = 200; // Adjust width as needed
      const invoiceWidth = contentWidth - addressWidth;

      // Invoice Details on the left
      doc.fontSize(16).text('Invoice', leftMargin, headerTop, { align: 'left' });
      doc.fontSize(12).text(`Invoice Number: INV${invoiceNo}`, leftMargin, headerTop + 20, { align: 'left' });
      doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, leftMargin, headerTop + 40, { align: 'left' });
      doc.moveDown();
      doc.moveDown();
      // User Address on the right
      const addressStartX = pageWidth - rightMargin - addressWidth;
      doc.fontSize(14).text('User Address', addressStartX, headerTop, { align: 'right' });
      doc.fontSize(12).text(userAddress, addressStartX, headerTop + 20, { align: 'right' });

      // Add a line below the header
      doc.moveDown();
     // doc.strokeColor('#ddd').lineWidth(1).moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y).stroke();
      doc.moveDown();
      doc.moveDown();

      doc.moveDown();

      doc.moveDown();

      doc.moveDown();

      const columnWidths = [200, 60, 100, 100]; // Adjust column widths as needed
      const tableLeft = leftMargin;
      // Center "Product Details:" and add table right-aligned
      const tableTop = doc.y;
      let x = tableLeft;
      let y = tableTop + 20;
      doc.fontSize(12).text('Product Details:',x,y, { align: 'center', underline: true });
      doc.moveDown();
      doc.moveDown();
      doc.moveDown();

      // Define table columns
    

      // Add table headers
       x = tableLeft;
       y +=  20; // Adjust y position if needed
      doc.fontSize(10);
      doc.text('Product Name', x, y, { width: columnWidths[0], align: 'left' });
      doc.text('Quantity', x + columnWidths[0], y, { width: columnWidths[1], align: 'left' });
      doc.text('Total Price', x + columnWidths[0] + columnWidths[1], y, { width: columnWidths[2], align: 'left' });
      doc.text('Offer Price', x + columnWidths[0] + columnWidths[1] + columnWidths[2], y, { width: columnWidths[3], align: 'left' });

      // Add a line below the table header
      y += 20; // Adjust y position if needed
      doc.strokeColor('#ddd').lineWidth(1).moveTo(tableLeft, y).lineTo(pageWidth - rightMargin, y).stroke();
      doc.moveDown();
let totProdAmount=0
      // Add table rows
      productDetails.forEach(product => {console.log(product.itemTotalPrice)
        doc.text(product.productName, x, y + 10, { width: columnWidths[0], align: 'left' });
        doc.text(product.quantity.toString(), x + columnWidths[0], y + 10, { width: columnWidths[1], align: 'left' });
        doc.text(`₹${Number(product.itemTotalPrice).toFixed(2)}`, x + columnWidths[0] + columnWidths[1], y + 10, { width: columnWidths[2], align: 'left' });
        doc.text(`₹${Number(product.offerPrice).toFixed(2)}`, x + columnWidths[0] + columnWidths[1] + columnWidths[2], y + 10, { width: columnWidths[3], align: 'left' });
        y += 20; // Adjust row height if needed
        totProdAmount+=product.offerPrice
    });


      // Add a line below the products table
      y += 20;
      doc.strokeColor('#ddd').lineWidth(1).moveTo(tableLeft, y).lineTo(pageWidth - rightMargin, y).stroke();
     
     
    

      // Add total amount
      doc.fontSize(12).text(`Total  : ₹${Number(totProdAmount).toFixed(2)}`,380,y+=20);
      doc.moveDown();
      doc.moveDown();

      // Add charges table
      doc.fontSize(12).text('Charges:', { underline: true });
      doc.moveDown();
      doc.fontSize(10).text(`Delivery Charge: ₹${Number(deliveryCharge).toFixed(2)}`, { align: 'left' });
      doc.text('Packing Charge: ₹'+Number(packingCharge).toFixed(2), { align: 'left' });
      doc.moveDown();
      
      // Add a line after charges
      doc.moveDown();
      
      doc.strokeColor('#ddd').lineWidth(1).moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y).stroke();
      doc.moveDown();

      // Add total amount
      doc.fontSize(12).text(`Total Amount : ₹${Number(totalAmount).toFixed(2)}`,360,y+=130);

      // End the PDF document
      doc.end();

  } catch (error) {
      console.error('Error generating invoice:', error);
      res.status(500).send('Error generating invoice');
  }
};

