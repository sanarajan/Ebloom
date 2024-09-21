const Category = require("../models/categoryModel");
const SubCategory = require("../models/subCategoryModel");
const mongoose = require("mongoose");

exports.categories = async (req, res) => {
  try {
    const catupdate = req.flash("catupdate");
    const pageTitle = "CATEGORIES";
    const categories = await Category.find({}).lean();
    res.render("admin/categories", {
      categories,
      userName: req.session.adusername,
      layout: "adminLayout",
      pageTitle,
      success: req.flash("success"),
      catupdate,
    });
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.cateDelete = async (req, res) => {
  try {
    const cateId = new mongoose.Types.ObjectId(req.body.id);
    if (!mongoose.Types.ObjectId.isValid(cateId)) {
      console.log("Error occurred: Invalid Category ID");
      return res
        .status(400)
        .json({ success: false, message: "Invalid Category ID" });
    }
    if (!cateId) {
      return res
        .status(400)
        .json({ success: false, message: "Category ID is required" });
    }

    const category = await Category.findById(cateId);
    if (!category) {
      console.log("Category not found");
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // Toggle the isActive status
    category.isActive = !category.isActive;
    await category.save();

    console.log("Category status updated successfully:", category);
    return res.status(200).json({
      success: true,
      message: "Category status updated successfully",
      newStatus: category.isActive ? "Active" : "Inactive",
    });
  } catch (error) {
    console.error("Error in cateDelete route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.addCategory = async (req, res) => {
  try {
    let pageTitle = "Add Category";
    res.render("admin/addCategory", {
      layout: "adminLayout",
      pageTitle,
      userName: req.session.adusername,
    });
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.saveCategory = async (req, res) => {
  try {
    req.body.isActive = true;
    if (!req.body.categoryName) {
      return res.status(400).send("Category name is required");
    }
    req.body.categoryName = req.body.categoryName.toLowerCase();
    const category = new Category(req.body);

    await category.save();
    req.flash("success", "Category added successfully");
    res.redirect("/admin/categories");
  } catch (error) {
    let errorMessage = "";
    if (error.code === 11000 && error.keyPattern.categoryName) {
      // Duplicate key error for username
      errorMessage = "Category already exists";
    } else {
      console.error("Error during user registration:", error);
      errorMessage = "Internal server error";
    }
    let pageTitle = "Add Category";
    // Render the signup form again with error message
    res.render("admin/addCategory", {
      errorMessage,
      layout: "adminLayout",
      pageTitle,
    });
  }
};
exports.editCategory = async (req, res) => {
  try {
    let id = req.params.id;
    let pageTitle = "Edit Category";

    const category = await Category.findById(id).lean();
    if (category) {
      res.render("admin/editCategory", {
        category,
        userName: req.session.adusername,
        id,
        layout: "adminLayout",
        pageTitle,
      });
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

  exports.updateCategory = async (req, res) => {
    try {
      const { _id, categoryName, description, isActive } = req.body;
  
      let categoryId = new mongoose.Types.ObjectId(_id);
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        console.log("error occured");
        return res
          .status(400)
          .json({ success: false, message: "Invalid User ID" });
      }
  
      // const userId = mongoose.Types.ObjectId.createFromHexString(req.params.userId)
      if (!categoryId) {
        console.log("Not received userId:", req.body._id);
        return res
          .status(400)
          .json({ success: false, message: "User ID is required" });
      }
      const existingCategory = await Category.findOne({
        categoryName: categoryName.toLowerCase(),
        _id: { $ne: categoryId }
      });
  
      if (existingCategory) {
        return res.status(400).json({ success: false, message: "Category name already exists" });
      }
  
      const category = await Category.findOneAndUpdate(
        { _id: categoryId },
        {
          $set: {
            categoryName: categoryName,
            description: description,
            isActive: isActive,
          },
        },
        { new: true } // To return the updated document
      );
  
      if (!category) {
        console.log("User not found or already inactive");
        return res.status(404).json({
          success: false,
          message: "User not found or already inactive",
        });
      }
      req.flash("catupdate", "Category updated successfully");
      console.log("User updated successfully:", category);
      return res
        .status(200)
        .json({ success: true, message: "User updated successfully" });
    } catch (error) {
        console.error('Update category error:', error);
    res.status(500).json({ success: false, message: "Internal server error" });
    }
  };


//subcategories

exports.subCategories = async (req, res) => {
  try {
    const subcatupdate = req.flash("subcatupdate");
    const subcatecss = req.flash("subcatecss");
    const pageTitle = "SUB CATEGORIES";
    const subcategories = await SubCategory.find({})
      .populate("categoryId", "categoryName")
      .lean();
    res.render("admin/subcategories", {
      userName: req.session.adusername,
      subcategories,
      subcatupdate,
      layout: "adminLayout",
      pageTitle,
      subcatecss,
    });
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.addSubCategory = async (req, res) => {
  try {
    let pageTitle = "Add Sub Category";
    const categories = await Category.find({}).lean();
    res.render("admin/addSubCategory", {
      userName: req.session.adusername,
      layout: "adminLayout",
      pageTitle,
      categories,
    }); // Renders the login page if no session email is found
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.saveSubCategory = async (req, res) => {
  try {
    req.body.isActive = true;
    // Check if categoryId is provided
    if (!req.body.categoryId) {
      return res.status(400).send("Category ID is required");
    }

    // Validate the categoryId by checking if it exists in the Category model
    const category = await Category.findById(req.body.categoryId);
    if (!category) {
      return res.status(400).send("Invalid Category ID");
    }
    req.body.subCategoryName = req.body.subCategoryName.toLowerCase();
    // Create and save the subcategory
    const subCategory = new SubCategory(req.body);
    await subCategory.save();

    req.flash("subcatecss", "Sub Category added successfully");
    res.redirect("/admin/subcategories");
  } catch (error) {
    let errorMessage = "";

    if (error.code === 11000 && error.keyPattern.subCategoryName) {
      // Duplicate key error for categoryName
      errorMessage = "Sub Category with this name already exists";
    } else {
      console.error("Error during subcategory addition:", error);
      errorMessage = "Internal server error";
    }

    let pageTitle = "Add Sub Category";
    res.render("admin/addSubCategory", {
      errorMessage,
      layout: "adminLayout",
      pageTitle,
    });
  }
};
exports.editSubCategory = async (req, res) => {
  try {
    let id = req.params.id;
    let pageTitle = "Edit Sub Category";

    const subCategory = await SubCategory.findById(id)
      .populate("categoryId")
      .lean();

      const categorylist = await Category.find({}).lean();
    if (subCategory) {
      res.render("admin/editSubCategory", {
        userName: req.session.adusername,
        subCategory,
        layout: "adminLayout",
        pageTitle,
        categorylist,
      });
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.updateSuCategory = async (req, res) => {
  try {
    const { _id, subCategoryName, categoryId, description, isActive } =
      req.body;
      subCategoryName = subCategoryName.toLowerCase();

    let subcategoryId = new mongoose.Types.ObjectId(_id);
    if (!mongoose.Types.ObjectId.isValid(subcategoryId)) {
      console.log("error occured");
      return res
        .status(400)
        .json({ success: false, message: "Invalid User ID" });
    }

    // const userId = mongoose.Types.ObjectId.createFromHexString(req.params.userId)
    if (!subcategoryId) {
      console.log("Not received userId:", req.body._id);
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const subCategory = await SubCategory.findOneAndUpdate(
      { _id: subcategoryId },
      {
        $set: {
          subCategoryName: subCategoryName,
          categoryId: categoryId,
          description: description,
          isActive: isActive,
        },
      },
      { new: true } // To return the updated document
    );

    if (!subCategory) {
      console.log("User not found or already inactive");
      return res.status(404).json({
        success: false,
        message: "User not found or already inactive",
      });
    }
    req.flash("subcatupdate", "Sub Category updated successfully");
    return res
      .status(200)
      .json({ success: true, message: "Sub Category updated successfully" });
  } catch (error) {
    console.error("Error in blockUser route:", error);
    res.status(500).send("Internal server error");
  }
};
exports.subcateDelete = async (req, res) => {
  try {
    const subcateId = new mongoose.Types.ObjectId(req.body.id);
    if (!mongoose.Types.ObjectId.isValid(subcateId)) {
      console.log("Invalid SubCategory ID");
      return res
        .status(400)
        .json({ success: false, message: "Invalid SubCategory ID" });
    }

    let newStatus;
    const subCategory = await SubCategory.findById(subcateId);
    if (subCategory) {
      newStatus = !subCategory.isActive;
      subCategory.isActive = newStatus;
      await subCategory.save();
      return res
        .status(200)
        .json({ success: true, newStatus: newStatus ? "Inactive" : "Active" });
    } else {
      console.log("SubCategory not found");
      return res
        .status(404)
        .json({ success: false, message: "SubCategory not found" });
    }
  } catch (error) {
    console.error("Error in subcateDelete route:", error);
    res.status(500).send("Internal server error");
  }
};
