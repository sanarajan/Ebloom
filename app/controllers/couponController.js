const Coupon = require("../models/couponModel");
const fs = require("fs");
const path = require("path");

const multer = require("multer");
const sharp = require("sharp");

const mongoose = require("mongoose");

exports.coupons = async (req, res) => {
  try {
    const coupnAdd = req.flash("coupnAdd");
    const couponUpdat = req.flash("couponUpdat");
    const pageTitle = "COUPONS";
    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();
    console.log(coupons);
    res.render("admin/coupons", {
      coupons,
      userName: req.session.adusername,
      layout: "adminLayout",
      pageTitle,
      success: req.flash("success"),
      coupnAdd,
      couponUpdat,
    });
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};
exports.addCoupon = async (req, res) => {
  try {
    let pageTitle = "Add Coupon";
    res.render("admin/addCoupon", {
      layout: "adminLayout",
      pageTitle,
      userName: req.session.adusername,
      imagePath: "images/no-image.jpeg",
    });
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.saveCoupon = async (req, res) => {
  try {
    const {
      
      startDate,
      endDate,
      description,
      minPurchase,
      discountType,
      discountPercentage,
      discountValue,
      userUsageLimit,
      status,
      
    } = req.body;
    const couponName=req.body.couponName.trim().toLowerCase()
    if (!couponName) {
      return res.status(400).json({ error: "Coupon name is required" });
    }
    let file = req.file;
    if (!file) { console.log("no file")
      file = { path: req.session.tempFilePath };
    }
    if (!file) {
      return res.status(400).json({ error: "Coupon image is required" });
    }

    const imagePath = file.path.replace(/\\/g, "/");

    // Proceed with other validations and saving to database
    // Create new coupon object
    const newCoupon = new Coupon({
      couponName,
      couponImage: imagePath, // Handle as the uploaded file path
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description,
      minPurchase: parseInt(minPurchase),
      discountType,
      discountPercentage:
        discountType === "Percentage" ? parseInt(discountPercentage) : "",
      discountValue: discountType === "Amount" ? parseInt(discountValue) : 0,
      status: status ? status : true,
      userUsageLimit: userUsageLimit ? parseInt(userUsageLimit, 10) : undefined,
    });

    const savedCoupon = await newCoupon.save();
    if(!savedCoupon){
      if (req.session.tempFilePath) {
        fs.unlink(req.session.tempFilePath, (err) => {
          if (err) console.error("Error deleting temporary file:", err);
        });
        req.session.tempFilePath = null;
        console.log(" session unlink aayi")
      }
   }else{
    req.session.tempFilePath = null;
   }
    req.flash("coupnAdd", "Coupon added successfully");
    return res.redirect("/admin/coupons");
  } catch (error) {
    console.error("Error adding coupon:", error.message);
    let errorMessage = "";

    if (error.code === 11000 ) {
      const duplicateKeyError = error.message.match(
        /index: (.+)_1 dup key: { (.+): "(.+)" }/
      );
      if (duplicateKeyError) {
        const keyField = duplicateKeyError[2];
        const keyValue = duplicateKeyError[3];
        if (keyField === "couponName") {  
          errorMessage = `Coupon with name '${keyValue}' already exists.`;
        }
      }
    }
    const {
      couponName,
      startDate,
      endDate,
      description,
      minPurchase,
      discountType,
      discountPercentage,
      discountValue,
      userUsageLimit,
      status,
    } = req.body;
    let imagePath;
    if (req.file) {
      imagePath = req.file.path.replace(/\\/g, "/");
      req.session.tempFilePath = imagePath; // Preserve path for rendering
    }else{
    //  file = { path: req.session.tempFilePath };
      imagePath =  req.session.tempFilePath ;
    }
   // const categories = await Category.find({ isActive: true });
    res.render("admin/addCoupon", {
      error: errorMessage,
      couponName,
      startDate,
      endDate,
      description,
      minPurchase,
      discountType,
      discountPercentage,
      discountValue,
      userUsageLimit,     
      status: status ? status : true,
      layout: "adminLayout",
      pageTitle: "Add Coupon",
      userName: req.session.adusername,
      imagePath: imagePath, // Pass the image path back to the form
    });
    // For other errors
  }
};

exports.changeCouponStatus = async (req, res) => {
  try {
    const { id } = req.body;

    // Find the coupon by ID
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    // Toggle the status
    coupon.status = !coupon.status;

    // Save the updated coupon
    await coupon.save();

    // Send a response back to the client
    res.json({
      success: true,
      newStatus: coupon.status ? "Active" : "Inactive",
    });
  } catch (error) {
    console.error("Error updating coupon status:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while updating the coupon status",
      });
  }
};

exports.editCoupon = async (req, res) => {
  try {
    let id = req.params.couponId;
    const coupon = await Coupon.findById(id).lean();
    let pageTitle = "Edit Coupon";
    res.render("admin/editCoupon", {
      layout: "adminLayout",
      pageTitle,
      userName: req.session.adusername,
      coupon,
      //    imagePath:'images/no-image.jpeg'
    });
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};
exports.updateCoupon = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      description,
      minPurchase,
      discountType,
      discountPercentage,
      discountValue,
      userUsageLimit,
      status,
      
      _id,
    } = req.body;
    const couponName=req.body.couponName.trim().toLowerCase()

    console.log("this is update second");
    if (!couponName) {
      return res.status(400).json({ error: "Coupon name is required" });
    }

    console.log("this is update third");
    // Proceed with other validations and saving to database
    // Create new coupon object
    let coupon;
    if (req.body._id) {
      // Update existing coupon
      coupon = await Coupon.findById(req.body._id);
      if (!coupon) {
        return res.status(404).json({ error: "Coupon not found" });
      }
      let imagePath = coupon.couponImage; // Preserve the existing image path if no new image is uploaded
      let file = req.file;

      if (file) {
        // If a new file is uploaded, handle it

        imagePath = file.path.replace(/\\/g, "/");
        // Delete the old image file if it exists
        if (coupon.couponImage && fs.existsSync(coupon.couponImage)) {
          fs.unlinkSync(coupon.couponImage);
        }
      } else if (req.session.tempFilePath) {
        file = { path: req.session.tempFilePath };
        imagePath = file.path.replace(/\\/g, "/");
      } else {
        imagePath = coupon.couponImage;
      }

      coupon.couponName = couponName;
      coupon.couponImage = imagePath;
      coupon.startDate = new Date(startDate);
      coupon.endDate = new Date(endDate);
      coupon.description = description;
      coupon.minPurchase = parseInt(minPurchase);
      coupon.discountType = discountType;
      coupon.discountPercentage =
        discountType === "Percentage" ? parseInt(discountPercentage) : "";
      coupon.discountValue =
        discountType === "Amount" ? parseInt(discountValue) : 0;
      coupon.status = status ? status : true;
      coupon.userUsageLimit = userUsageLimit
        ? parseInt(userUsageLimit, 10)
        : undefined;
    }
    console.log("this is update data");
    console.log(coupon)
    const savedCoupon = await coupon.save();
    if(!savedCoupon){
      if (req.session.tempFilePath) {
        fs.unlink(req.session.tempFilePath, (err) => {
          if (err) console.error("Error deleting temporary file:", err);
        });
       
      }
    }else{
      req.session.tempFilePath = null;
    }
    req.flash("couponUpdat", "Coupon updated successfully");
    return res.redirect("/admin/coupons");
  } catch (error) {
    console.error("Error adding coupon:", error.message);
    let errorMessage = "";

    if (error.code === 11000) {//console.log(" unique error"+keyField)
      const duplicateKeyError = error.message.match(
        /index: (.+)_1 dup key: { (.+): "(.+)" }/
      );
      if (duplicateKeyError) {
        const keyField = duplicateKeyError[2];
        const keyValue = duplicateKeyError[3];
        if (keyField === "couponName") {
          errorMessage = `Coupon with name '${keyValue}' already exists.`;
        }
      }
    }
    const {
      couponName,
      startDate,
      endDate,
      description,
      minPurchase,
      discountType,
      discountPercentage,
      discountValue,
      userUsageLimit,
      status
    
    } = req.body;
    coupon = await Coupon.findById(req.body._id);

    let imagePath;
    if (req.file) {
      imagePath = req.file.path.replace(/\\/g, "/");
      req.session.tempFilePath = imagePath; // Preserve path for rendering
    }else if(req.session.tempFilePath){
      //  file = { path: req.session.tempFilePath };
        imagePath =  req.session.tempFilePath ;
      }else{
        imagePath= coupon.couponImage
      }
   //category = cat
    res.render("admin/editCoupon", {
      error: errorMessage,
      coupon:{
        _id:req.body._id,
        couponName,
        startDate,
        endDate,
        description,
        minPurchase,
        discountType,
        discountPercentage,
        discountValue,
        userUsageLimit,
        couponImage: imagePath
       
      },
      status: status ? status : true,
      layout: "adminLayout",
      pageTitle: "Add Coupon",
      userName: req.session.adusername,
       // Pass the image path back to the form
    });
    // For other errors
  }
};
