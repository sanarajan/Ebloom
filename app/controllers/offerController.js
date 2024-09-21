const Category = require("../models/categoryModel");
const SubCategory = require("../models/subCategoryModel");
const Product = require("../models/productModel");
const userModel = require("../models/userModel");
const Address = require("../models/addressModel");
const Order = require("../models/orderModel");
const Wallet = require("../models/walletModel");
const Offer = require('../models/offerModel');

const path = require("path");
const mongoose = require("mongoose");

exports.offers = async (req, res) => {
    try {
      const offerSucc = req.flash("offerSucc");
      const pageTitle = "Offers";
      const offers = await Offer.find({})
      .populate({
        path: "products", // Populating the `products` field
        model: "Product", // Reference to the Product model
      })
      .populate({
        path: "categories", // Populating the `categories` field directly from Offer
        model: "Category",
      }) .sort({ createdAt: -1 })
      .lean();
  
      console.log(offers); // Logging products for debugging
  
      res.render("admin/offers", {
        offers,
        userName: req.session.adusername,
        layout: "adminLayout",
        pageTitle,
        offerSucc,
       
      });
    } catch (error) {
      console.error("Error in index route:", error);
      res.status(500).send("Internal server error");
    }
  };

  exports.addOffer = async (req, res) => {
   
  
    try {
       const products   =  await Product.find({})
      const  categories =  await Category.find({})
        pageTitle ="Add Offers"
        return res.render("admin/addOffer", {
            userName: req.session.adusername,
            layout: "adminLayout",
            pageTitle,
            products,
            categories           
          });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  };

  
  
  exports.saveOffer = async (req, res) => {
    try {console.log("reached")
      // Destructure the form fields from the request body
      const {
        offerName,
        startDate,
        endDate,
        offerFor,
        product,  // For offer on product
        category, // For offer on category
        offerPercentage,
      //  offerAmount,
        description,
      //  price,
      //  discountedPrice
      } = req.body;
  console.log( req.body)
      // Validate required fields
      if (!offerName || !startDate || !endDate || !offerFor) {
        return res.status(400).json({ message: 'Required fields are missing' });
      }
      // offrNameExist = await Offer.findOne({
      //   offerName: offerName,
      //   startDate: { $lt: end },   
      //   endDate: { $gt: start },    
      //   status: true 
      // });
      // if(offrNameExist){
      //   return res.status(400).json({
      //     message: `An offer name already exists for the selected ${offerFor} within the selected date range.`,
      //   });
      // }
      const start = new Date(startDate);
      const end = new Date(endDate);
  
      // Validation to check if there's any offer for the selected category or product within the same date range
      let conflictingOffer = null;
  
      if (offerFor === 'product' && product) {
        // Check if there's an existing offer for the same product within the given date range
        conflictingOffer = await Offer.findOne({
          products: product,
          startDate: { $lt: end },    // Offer starts before the new offer's end date
          endDate: { $gt: start },    // Offer ends after the new offer's start date
          status: true 
        });
      } else if (offerFor === 'category' && category) {
        // Check if there's an existing offer for the same category within the given date range
        conflictingOffer = await Offer.findOne({
          categories: category,
          startDate: { $lt: end },    // Offer starts before the new offer's end date
          endDate: { $gt: start },    // Offer ends after the new offer's start date
          status: true  
        });
      }
  
      if (conflictingOffer) {
        // If there is a conflicting offer, return a validation message
        return res.status(400).json({
          message: `An offer already exists for the selected ${offerFor} within the selected date range.`,
        });
      }

      
      // Construct the offer object to be saved
      let offerData = {
        offerName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        offerFor,
        description,
      };
  
      // Set the applicable discount type based on offerType
        offerData.offerPercentage = offerPercentage;
        // offerData.offerPrice   = discountedPrice;
      
      // If the offer is for a product
      if (offerFor === 'product' && product) {
        offerData.products = product;
      }  
      // If the offer is for a category
      if (offerFor === 'category' && category) {
        offerData.categories = category;
      }  
     // offerData.productPrice = price;

      // Create a new Offer instance
      const newOffer = new Offer(offerData);
  
      // Save the offer to the database
      await newOffer.save();
      req.flash("offerSucc", "Offer added successfully");
      // Send success response
      res.status(201).json({ message: 'Offer added successfully!' });
    } catch (error) {
      console.error('Error while saving the offer:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  // Category status update route
  exports.offerDelete = async (req, res) => {

    try {console.log("ethum")
      const { id, newStatus } = req.body; // Get the category ID and new status from the request body
  console.log(id+"+"+newStatus+"  datas")
      // Find the category by ID and update its status
      const updatedCategory = await Offer.findByIdAndUpdate(
        id,
        { status: newStatus }, // Update the status field
        { new: true } // Return the updated document
      );
  
      if (updatedCategory) {
        res.json({
          success: true,
          newStatus: updatedCategory.status, // Send the new status back to the client
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Offer not found',
        });
      }
    } catch (error) {
      console.error('Error updating offer status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
  