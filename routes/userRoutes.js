 
const express = require('express');
const router = express.Router();
const userController = require('../app/controllers/userController');
const productController = require('../app/controllers/productController');
const cartController = require('../app/controllers/cartController');
const orderController = require('../app/controllers/orderController');
const isUserAuthenticated = require('../middleware/authUser');
//for google auth /single signon
const isLoggedIn = require('../middleware/google');
const session = require('express-session');
const passport = require('../config/passport-setup');
//fend or google auth /single signon



router.get('/', userController.index);
router.get('/userRegistration', userController.userRegistration);
router.post('/register', userController.register);
router.get('/logout',isUserAuthenticated, userController.logout);



router.get('/home',isUserAuthenticated, userController.home);
router.post('/login', userController.login);
router.get('/optVerification', userController.optVerification);
router.post('/sendOTPVerificationEmail', userController.sendOTPVerificationEmail);

router.post('/verifyOtp', userController.verifyOtp);


//product list
router.get('/shop',isUserAuthenticated, productController.shop);
router.get('/shopFetch',isUserAuthenticated, productController.shopFetch);

router.get('/productDetails/:id',isUserAuthenticated,productController.productDetails);
router.get('/productsSearch',isUserAuthenticated,productController.productsSearch);

// router.get('/profile', isUserAuthenticated, function(req, res) {
//     res.render('profile', { user: req.user });
//   });

  //for google auth /single signon
router.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

router.get( '/auth/google/callback',
    passport.authenticate( 'google', {
        successRedirect: '/auth/google/success',
        failureRedirect: '/auth/google/failure'
}));

router.get( '/auth/google/success',isLoggedIn,
 (req,res)=>{
  let name = req.user.displayName
  req.session.userType = req.user.userType;
  req.session.username = req.user.username;
  req.session.userId = req.user._id;
  req.session.useremail = req.user.email;
  req.session.userPasswordWrong = false;
  console.log(req.user)

  res.redirect("/home")
  // res.send(`hello ${name}`)

 });
 router.get( '/auth/google/failure',
  (req,res)=>{
   res.send("some error found") 
  });
//end for google auth /single signon
router.get('/profile',isUserAuthenticated,userController.profile);
router.post('/editName',isUserAuthenticated,userController.editName);
router.post('/editPhoneNumber',isUserAuthenticated,userController.editPhoneNumber);
router.get('/address',isUserAuthenticated,userController.address);
router.post('/addAddress',isUserAuthenticated,userController.addAddress);
router.put('/updateAddress',isUserAuthenticated,userController.updateAddress);
router.delete('/deleteAddress', isUserAuthenticated,userController.deleteAddress);
router.get('/changePassword',isUserAuthenticated,userController.changePassword);
router.post('/updatePassword',isUserAuthenticated,userController.updatePassword);




//cart and product
router.post('/addToCart',isUserAuthenticated, cartController.addToCart);
router.get('/yourCart',isUserAuthenticated,cartController.yourCart);
router.post('/updateCartQuantity', isUserAuthenticated, cartController.updateCartQuantity);
router.delete('/removeCartItem/:productId',isUserAuthenticated,cartController.removeCartItem);
router.get('/checkout',isUserAuthenticated,cartController.checkout);
router.post('/payment',isUserAuthenticated,cartController.payment);
router.post('/placeOrder',isUserAuthenticated,cartController.placeOrder);
router.post('/verifyPayment',isUserAuthenticated, cartController.verifyPayment);
router.get('/paymentSuccess/:orderId',isUserAuthenticated, cartController.paymentSuccess);
router.post('/paymentFailed',isUserAuthenticated, cartController.paymentFailed);
router.get('/paymentFailedPage',isUserAuthenticated, cartController.paymentFailedPage);






router.get('/myOrders',isUserAuthenticated,cartController.myOrders);
router.get('/fetchOrders',isUserAuthenticated,cartController.fetchOrders);
router.post('/cancelOrder',isUserAuthenticated, cartController.cancelOrder);
router.post('/returnOrder', isUserAuthenticated,orderController.returnOrder);
router.get('/reOrder/:id', isUserAuthenticated,orderController.reOrder);

router.get('/selectedOrder/:id', isUserAuthenticated,orderController.selectedOrder);
router.post('/createOrder', isUserAuthenticated,cartController.createOrder);
router.get('/invoice',isUserAuthenticated,orderController.invoice);
router.post('/invoiceDownload',isUserAuthenticated,orderController.invoiceDownload);


//wishlist
router.post('/addToWishlist',isUserAuthenticated, cartController.addToWishlist);
router.get('/whishlist',isUserAuthenticated,cartController.whishlist);
router.get('/getWishlistData',isUserAuthenticated,cartController.getWishlistData);


router.delete('/deletWishlist',isUserAuthenticated,cartController.deletWishlist);

router.get('/wallet',isUserAuthenticated,cartController.wallet);
router.get('/fetchWallet',isUserAuthenticated,cartController.fetchWallet);




















module.exports = router;
