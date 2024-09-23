const User = require("../models/userModel"); // Make sure to require the correct User model
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const moment = require("moment");
const Order = require("../models/orderModel");

exports.index = async (req, res) => {
  //   const salt = bcrypt.genSaltSync(10);
  //  let password = bcrypt.hashSync("admin", salt);
  try {
    if (!req.session.adusername) {
      res.render("admin/adminlogin", { layout: false });
    } else {
      if (req.session.passwordWrong) {
        res.render("admin/adminlogin", { msg: "Invalid Login" });
      } else {
        res.redirect("/admin/adminHome"); // Redirects to home if login is successful
      }
    }
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.adminlogin = async (req, res) => {
  try {
    if (!req.session.adusername) {
      const user = await User.findOne({
        username: req.body.username,

        userType: 1,
      });
      if (user && bcrypt.compareSync(req.body.password, user.password)) {
        // Store user details in session
        req.session.aduserType = user.userType;
        req.session.adusername = user.username;
        req.session.aduseremail = user.email;
        req.session.adpasswordWrong = false;
        console.log("User logged in:", user.username);

        res.redirect("/admin/adminHome");
      } else {
        req.session.adpasswordWrong = true;
        res.render("admin/adminlogin", {
          // Corrected the path to render adminLogin
          pwIncorrect: "User not found or invalid credentials",
        });
        console.log("User not found or invalid credentials");
      }
    } else {
      res.redirect("/admin/adminHome");
    }
  } catch (error) {
    console.error("Error in login route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.adminHome = async (req, res) => {
  try {
    if (req.session.adusername) {
      const pageTitle = "Dashboard";
      const message = req.flash("success");
      const update = req.flash("update");
      const deleted = req.flash("deleted");

      // Filter by date (monthly or yearly)

      // Render the template with all the required data
      res.render("admin/dashboard", {
        userName: req.session.adusername,
        message,
        update,
        deleted,

        layout: "adminLayout",
        pageTitle,
      });
    } else {
      res.redirect("/admin");
    }
  } catch (error) {
    console.error("Error in dashboard route:", error);
    res.status(500).send("Internal server error");
  }
};


exports.fetchDashboard = async (req, res) => {
  try {
    if (req.session.adusername) {
      // Filter by date (monthly, yearly, or daily)
      const filter = req.query.filter || "yearly";
      console.log(filter + " data");
      let dateFilter;
      if (filter === "monthly") {
        dateFilter = {
          $gte: moment().startOf("month").toDate(),
          $lt: moment().endOf("month").toDate(),
        };
      } else if (filter === "yearly") {
        dateFilter = {
          $gte: moment().startOf("year").toDate(),
          $lt: moment().endOf("year").toDate(),
        };
      } else if (filter === "today") {
        dateFilter = {
          $gte: moment().startOf("day").toDate(),
          $lt: moment().endOf("day").toDate(),
        };
      }

      // Common filter to exclude failed payment status
      const commonFilter = { 
        createdAt: dateFilter, 
        paymentStatus: { $ne: 'Failed' } 
      };
      // Total Sales and Revenue
      const totalSales = await Order.countDocuments(commonFilter);
      const totalRevenueResult = await Order.aggregate([
        { $match: commonFilter },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
      ]);
      const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

      const customerCount = await User.countDocuments({ userType: 2 });

      // 1. Top 10 Best Selling Products with Price, Image, Revenue
      const topProducts = await Order.aggregate([
        { $match: commonFilter },
        { $unwind: "$orderedProducts" },
        {
          $group: {
            _id: "$orderedProducts.productId",
            productName: { $first: "$orderedProducts.productName" },
            price: { $first: "$orderedProducts.price" },
            discountProduct: { $first: "$orderedProducts.discountProduct" },
            discountOffer: { $first: "$orderedProducts.discountOffer" },

            offerPrice: { $first: "$orderedProducts.offerPrice" },
            prodQuantity: { $first: "$orderedProducts.quantity" },
            image: { $first: "$orderedProducts.image" },
            totalSold: { $sum: "$orderedProducts.quantity" },
            totalRevenue: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$orderedProducts.offerPrice", "$orderedProducts.price"] },
                 // "$orderedProducts.quantity",
                  
                ],
              },
            },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
      ]);
      // 2. Top 10 Best Selling Categories with Names
      const topCategories = await Order.aggregate([
        { $match: commonFilter },
        { $unwind: "$orderedProducts" },
        {
          $group: {
            _id: "$orderedProducts.category",
            totalSold: { $sum: "$orderedProducts.quantity" },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        {
          $project: {
            _id: 1,
            totalSold: 1,
            categoryName: "$category.categoryName",
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
      ]);


      ///////
      const subCategoriesInOrders = await Order.aggregate([
        { $match: commonFilter },
        { $unwind: "$orderedProducts" },
        { $group: { _id: "$orderedProducts.subcategory" } },
        { $lookup: {
            from: "subcategories",
            localField: "_id",
            foreignField: "_id",
            as: "subcategoryDetails"
          }
        },
        { $unwind: "$subcategoryDetails" },
        { $project: { 
            _id: 1, 
            subCategoryName: "$subcategoryDetails.subCategoryName"
          }
        }
      ]);
      
      console.log(subCategoriesInOrders);
      
      ///
      // 3. Top 10 Best Selling Subcategories with Names
      const topSubCategories = await Order.aggregate([
        { $match: commonFilter },
        { $unwind: "$orderedProducts" },
        {
          $group: {
            _id: "$orderedProducts.subcategory",
            totalSold: { $sum: "$orderedProducts.quantity" },
          },
        },
        {
          $lookup: {
            from: "subcategories",
            localField: "_id",
            foreignField: "_id",
            as: "subcategory",
          },
        },
        { $unwind: "$subcategory" },
        {
          $project: {
            _id: 1,
            totalSold: 1,
            subCategoryName: "$subcategory.subCategoryName",
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
      ]);


      // Prepare data for charts and tables
      const productLabels = topProducts.map((p) => p.productName);
      const productData = topProducts.map((p) => p.totalSold);

      const categoryLabels = topCategories.map((c) => c.categoryName);
      const categoryData = topCategories.map((c) => c.totalSold);

      const subCategoryLabels = topSubCategories.map(
        (sc) => sc.subCategoryName
      );
      const subCategoryData = topSubCategories.map((sc) => sc.totalSold);

      // Render the template with all the required data
      res.json({
        userName: req.session.adusername,
        topProducts,
        topCategories,
        topSubCategories,
        productLabels: JSON.stringify(productLabels),
        productData: JSON.stringify(productData),
        categoryLabels: JSON.stringify(categoryLabels),
        categoryData: JSON.stringify(categoryData),
        subCategoryLabels: JSON.stringify(subCategoryLabels),
        subCategoryData: JSON.stringify(subCategoryData),
        totalSales,
        totalRevenue,
        customerCount,
        filter,
        layout: "adminLayout",
        ok: true,
      });
    } else {
      res.redirect("/admin");
    }
  } catch (error) {
    console.error("Error in dashboard route:", error);
    res.status(500).send("Internal server error");
  }
};

// user parts
exports.blockUser = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.body.id);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log("error occured");
      return res
        .status(400)
        .json({ success: false, message: "Invalid User ID" });
    }
    if (!userId) {
      console.log("Not received userId:", req.body.userId);
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }
    let noval = "";
    let pass = "";
    if (req.body.task === "block") {
      pass = "unblock";

      noval = false;
    } else {
      pass = "block";
      noval = true;
    }
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { isActive: noval } },
      { new: true } // To return the updated document
    );

    if (!updatedUser) {
      console.log("User not found or already inactive");
      return res.status(404).json({
        success: false,
        message: "User not found or already inactive",
      });
    }

    console.log("User updated successfully:", updatedUser);
    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      block: pass,
    });
  } catch (error) {
    console.error("Error in blockUser route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.adminLogout = (req, res) => {
  req.session.destroy();
  res.redirect("/admin");
};

exports.sendmail = async (req, res) => {
  console.log("ethunnund");
  await sendOTPEmail("sanamol87@gmail.com", "1234");
};
