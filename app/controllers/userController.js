const userModel = require("../models/userModel");
const Product = require("../models/productModel");
const Address = require("../models/addressModel");
const userOTPVerification = require("../models/userOTPVerification");
const Wallet = require("../models/walletModel");

const { sendOTPEmail } = require("../../utils/otpEmail");
const bcrypt = require("bcryptjs"); //password hashing
const crypto = require("crypto"); //for otp generating
const baseUrl = process.env.BASEURL;
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

exports.index = (req, res) => {
  try {
    if (!req.session.useremail) {
      res.render("user/index", {
        layout: false,
      });
    } else {
      if (req.session.useruserPasswordWrong) {
        res.render("user/index", { msg: "Invalid Login" });
      } else {
        res.redirect("home"); // Redirects to home if login is successful
      }
    }
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.users = async (req, res) => {
  try {
    const pageTitle = "USERS";
    const data = await userModel.find({ userType: 2 }).lean();
    res.render("admin/users", { data, layout: "adminLayout", pageTitle });
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.userRegistration = async (req, res) => {
  try {
    res.render("user/userRegistration", { layout: false });
    // Renders the login page if no session email is found
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.home = async (req, res) => {
  try {
    if (req.session.username) {
      const homeProducts = await Product.find()
        .sort({ createdAt: -1 })
        .limit(4)
        .lean();
      res.render("user/home", { homeProducts, showSidebar: false });
    } else {
      if (req.session.userPasswordWrong) {
        res.redirect("/login", {
          msg: "Incorrect username or password ",
        });
      } else {
        res.redirect("/");
      }
    }
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};
function generateReferralId(firstName) {
  const randomCode = Math.floor(1000 + Math.random() * 9000); // Generate a random 4-digit number
  const namePart = firstName.substring(0, 4).toUpperCase();  // Take the first 4 letters of the first name
  return `${namePart}${randomCode}`;
}
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password,referalId , phoneNumber } = req.body;
    const username = `${firstName} ${lastName}`;
    const verified = false;
    userType = 2;
    isActive = true;
    // Check if email or phone number already exists
    const existingUser = await userModel.findOne({
      $or: [{ email }, { phoneNumber }],
    });
    if (existingUser) {
      console.log(existingUser);
      let errorMessage = "Email or Phone Number already in use";
      if (existingUser.email === email) errorMessage = "Email already in use";
      if (existingUser.phoneNumber === phoneNumber)
        errorMessage = "Phone Number already in use";
      return res.render("user/userRegistration", {
        errorMessage,
        formData: req.body
      });
    }
    const referralId = generateReferralId(firstName);
    if (referalId) {
      const referredUser = await userModel.findOne({ referralId: referalId });
      if (!referredUser) {
        return res.status(400).render('user/userRegistration', {
          errorMessage: 'Invalid referral ID.',
          formData: req.body // pass all the submitted form data
      });
      } 
        
     
  }

    // Create new user
    const newUser = new userModel({
      username,
      email,
      password,
      phoneNumber,
      verified,
      userType,
      referralId,
      isActive,
    });
    const result = await newUser.save();
    if (result) {
      // Create a wallet for the new user
      const newWallet = new Wallet({
        userId: result._id,
        Balance: 0, // Initialize the wallet balance to 0
        History: [], // Start with an empty transaction history
      });

      await newWallet.save();
      if (referalId) {
      console.log("yes referal ullathanu")
          // Credit 200 Rs to the referred user's wallet
          const wallet = await Wallet.findOne({ userId: result._id });
          console.log(wallet+" iyale wallet")
          wallet.Balance += 200;
          wallet.History.push({
              TransactionType: 'Referral',
              Amount: 200,
              Date: new Date(),
          });
          await wallet.save();
        }
      req.session.userType = newUser.userType;
      req.session.userId = newUser._id;
      req.session.username = newUser.username;
      req.session.useremail = newUser.email;
      req.session.userPasswordWrong = false;
      console.log("User logged in:", newUser.username);
      res.redirect("/home");
    }
  } catch (error) {
    console.error("Error in registration:", error);
    res.status(500).send("Internal server error");
  }
};
exports.sendOTPVerificationEmail = async (req, res) => {
  const { otpEmail } = req.body;
  console.log("email" + otpEmail);
  try {
    const otp = generateOTP(); //generate otp

    // Save OTP to the database
    const otpEntry = new userOTPVerification({
      email: otpEmail,
      otp,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // OTP expires in 5 minutes
    });
    const res1 = await otpEntry.save();
    console.log("OTP saved to database:", res1);

    // Send OTP to user's email
    const res2 = await sendOTPEmail(otpEmail, otp);
    console.log("OTP email sent:", res2);
    if (res1 && res2) {
      console.log("sented");
      return res.json({ success: true, message: "OTP sent successfully." });
    } else res.status(500).json({ success: false, message: "kuntham." });
  } catch (error) {
    console.error("Error in OTP generation or email sending:", error);
    res.status(500).json({
      success: false,
      message: "Error in sending OTP. Please try again.",
    });
  }
};

//first login form
exports.login = async (req, res) => {
  try {
    if (!req.session.useremail) {
      const user = await userModel.findOne({
        email: req.body.email,
        userType: 2,
        isActive: true,
      });
      if (user && bcrypt.compareSync(req.body.password, user.password)) {
        req.session.userType = user.userType;
        req.session.username = user.username;
        req.session.useremail = user.email;
        req.session.userId = user._id;
        req.session.userPasswordWrong = false;
        console.log("User logged in:", user.username);

        res.redirect("/home");
      } else {
        req.session.userPasswordWrong = true;
        res.render("user/index", {
          pwIncorrect: "User not found or invalid credentials",
        });
        console.log("User not found or invalid credentials");
      }
    } else {
      res.redirect("/home");
    }
  } catch (error) {
    console.error("Error in login route:", error);
    res.status(500).send("Internal server error");
  }
};
exports.shop = async (req, res) => {
  try {
    res.render("user/shop", { showSidebar: false });
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};
exports.productDetails = async (req, res) => {
  try {
    res.render("user/productDetails", { showSidebar: false });
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.optVerification = async (req, res) => {
  try {
    if (!req.session.useremail) {
      const email = req.query.email;
      res.render("user/optVerification", { layout: false, email });
    } else {
      res.redirect("/home");
    }
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Internal server error");
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    if (!req.session.useremail) {
      const { email, otp } = req.body;

      // Find the OTP entry in the database
      const otpEntry = await userOTPVerification.findOne({ email, otp });
      const currentDate = new Date();
      const otpCreatedAt = new Date(otpEntry.createdAt);
      // console.log(otpCreatedAt.getTime()+" > "+currentDate.getTime())
      const timeDifference = currentDate - otpCreatedAt;
      const fortySecondsInMs = 40 * 1000;
      if (otpEntry && timeDifference < fortySecondsInMs) {
        // OTP is valid and not expired
        const user = await userModel.findOne({
          email: email,
          userType: 2,
          isActive: true,
        });
        if (user) {
          req.session.userType = user.userType;
          req.session.username = user.username;
          req.session.useremail = user.email;
          req.session.userId = user._id;
          req.session.userPasswordWrong = false;
          console.log("User logged in:", user.username);
          return res.json({
            success: true,
            sess: true,
            message: "OTP verified successfully.",
          });
        } else {
          return res
            .status(400)
            .json({ success: false, message: "Invalid Credentials." });
        }
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Otp Expired." });
      }
    } else {
      // OTP is invalid or expired
      return res.status(400).json({
        success: true,
        sess: true,
        message: "Invalid or expired OTP.",
      });
    }
  } catch (error) {
    console.error("Error in OTP verification:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying OTP. Please try again.",
    });
  }
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect("/");
};

exports.profile = async (req, res) => {
  try {
    let userData = await userModel.findOne({
      email: req.session.useremail,
      userType: 2,
      isActive: true,
    });
    if (userData) {
      const [firstName, lastName] = userData.username.split(" ");
      const username= firstName+" "+lastName
      res.render("user/userAccount", {
        showSidebar: true,
        userData,
        firstName,
        lastName,
        username
      });
    } else {
      const msgErr = "No userfound";
      res.render("user/userAccount", { showSidebar: true, msgErr });
    }

    // Renders the login page if no session email is found
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Interna server error");
  }
};
exports.editName = async (req, res) => {
  try {
    const { _id, firstName, lastName } = req.body;

    // Server-side validation
    if (!_id || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "ID, first name, and last name are required.",
      });
    }
    if (firstName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "First names should be at least 2 characters long.",
      });
    }

    // Find the user by ID and update the username
    const user = await userModel.findById(_id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Update the user's name
    user.username = `${firstName} ${lastName}`;
    await user.save();
    // Respond with success message
    res.json({ success: true, message: "Name updated successfully." });
  } catch (error) {
    console.error("Error updating name:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the name.",
    });
  }
};

exports.editPhoneNumber = async (req, res) => {
  try {
    console.log("hfg");
    const { phoneNumber, userId } = req.body;

    if (!phoneNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required." });
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits long.",
      });
    }

    // Assuming user is authenticated and user ID is in the session

    const user = await userModel.findById(userId);
    console.log(user);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    user.phoneNumber = phoneNumber;
    await user.save();

    res.json({ success: true, message: "Phone number updated successfully." });
  } catch (error) {
    console.error("Error updating phone number:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.address = async (req, res) => {
  try {
    const user = await userModel
      .findOne({ email: req.session.useremail })
      .populate("address_ids");
    const id = user._id;

    if (!user) {
      return res.status(404).send("User not found");
    }
    res.render("user/address", {
      showSidebar: true,
      id,
      addresses: user.address_ids,
    });
    // Renders the login page if no session email is found
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Interna server error");
  }
};
exports.addAddress = async (req, res) => {
  try {
    const { userId, house, place, city, district, state, pincode } = req.body;

    // Validate input
    if (
      !userId ||
      !house ||
      !place ||
      !city ||
      !district ||
      !state ||
      !pincode
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Create a new address
    const newAddress = new Address({
      house,
      place,
      city,
      district,
      state,
      pincode,
    });
    await newAddress.save();

    // Add address ID to the user's address_ids array
    const user = await userModel.findById(userId);
    console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.address_ids.push(newAddress._id);
    await user.save();

    res
      .status(201)
      .json({ message: "Address added successfully", address: newAddress });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.updateAddress = async (req, res) => {
  console.log("reached");
  try {
    const { id, house, place, city, district, state, pincode } = req.body;

    // Validate input
    if (!id || !house || !place || !city || !district || !state || !pincode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Update the address
    const updatedAddress = await Address.findByIdAndUpdate(
      id,
      {
        house,
        place,
        city,
        district,
        state,
        pincode,
      },
      { new: true }
    );
    if (!updatedAddress) {
      return res.status(404).json({ message: "Address not found" });
    }
    console.log(updatedAddress);
    // Update the address ID in the user's address_ids array if necessary

    console.log(updatedAddress);

    res.status(200).json({
      message: "Address updated successfully",
      address: updatedAddress,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.body;

    // Validate input
    if (!id) {
      return res.status(400).json({ message: "Address ID is required" });
    }

    // Find and delete the address
    const address = await Address.findByIdAndDelete(id);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Remove address ID from the user's address_ids array
    const user = await userModel.findOne({ address_ids: id });
    if (user) {
      user.address_ids.pull(id);
      await user.save();
    }

    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.changePassword = async (req, res) => {
  try {  
    res.render("user/changePassword", {
      showSidebar: true,
     
    });
    // Renders the login page if no session email is found
  } catch (error) {
    console.error("Error in index route:", error);
    res.status(500).send("Interna server error");
  }
};
exports.updatePassword = async (req, res) => {console.log("ethis")
  const { oldPassword, newPassword } = req.body;
console.log(oldPassword+"-"+newPassword)
  try {
      const user = await userModel
      .findOne({ email: req.session.useremail }) ;
      console.log(user+" user")

      if (!user) {
          return res.status(404).json({ success:false,message: 'User not found.' });
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {console.log(" match alla")
          return res.status(400).json({success:false,noMatch:"ok", message: 'Old password is incorrect.' });
      }
console.log(isMatch+" ismatch")
      // Hash the new password
     // const hashedPassword = await bcrypt.hash(newPassword, 10);

      user.password = newPassword;console.log( user.password+" final")
      await user.save();

      res.status(200).json({success:true, message: 'Password updated successfully.' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

