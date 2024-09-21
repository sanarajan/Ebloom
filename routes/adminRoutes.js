 
const express = require('express');
const router = express.Router();
const adminController = require('../app/controllers/adminController');
const userController = require('../app/controllers/userController');
const categoryController = require('../app/controllers/categoryController');
const upload = require('../config/multerConfig');
const productController = require('../app/controllers/productController');
const orderController =require('../app/controllers/orderController');
const couponController = require('../app/controllers/couponController');
const reportController =  require('../app/controllers/reportController');
const isAdminAuthenticated = require('../middleware/auth');
const offerController =require('../app/controllers/offerController');

router.get('/', adminController.index);
router.post('/adminlogin', adminController.adminlogin);
router.get('/adminHome',isAdminAuthenticated, adminController.adminHome);
router.get('/adminLogout',isAdminAuthenticated, adminController.adminLogout);
router.get('/fetchDashboard',isAdminAuthenticated, adminController.fetchDashboard);



//users
router.get('/users',isAdminAuthenticated, userController.users);
router.patch('/blockUser',isAdminAuthenticated, adminController.blockUser);

//category
router.get('/categories',isAdminAuthenticated, categoryController.categories);
router.patch('/cateDelete',isAdminAuthenticated, categoryController.cateDelete);
router.get('/addCategory',isAdminAuthenticated, categoryController.addCategory);
router.post('/addCategory',isAdminAuthenticated, categoryController.saveCategory);
router.get('/editCategory/:id',isAdminAuthenticated, categoryController.editCategory);
router.patch('/updateCategory',isAdminAuthenticated, categoryController.updateCategory);

//subcategories
router.get('/subCategories',isAdminAuthenticated, categoryController.subCategories);

router.get('/addSubCategory',isAdminAuthenticated, categoryController.addSubCategory);
router.post('/addSubCategory',isAdminAuthenticated, categoryController.saveSubCategory);
router.get('/editSubCategory/:id',isAdminAuthenticated, categoryController.editSubCategory);
router.patch('/updateSuCategory',isAdminAuthenticated, categoryController.updateSuCategory);
router.patch('/subcateDelete',isAdminAuthenticated, categoryController.subcateDelete);

//products
router.get('/products',isAdminAuthenticated, productController.products);
router.get('/addProducts',isAdminAuthenticated, productController.addProducts);
router.post('/saveProducts',isAdminAuthenticated,upload.array('images', 4), productController.saveProducts);
router.get('/selectSubcategories', isAdminAuthenticated, productController.selectSubcategories);
router.get('/editProduct/:id',isAdminAuthenticated, productController.editProduct);
router.patch('/updateProduct',isAdminAuthenticated,upload.array('images', 4), productController.updateProduct);
router.patch('/toggleProductStatus/:id', isAdminAuthenticated, productController.toggleProductStatus);

//orders
router.get('/orders',isAdminAuthenticated, orderController.orders);
router.get('/orderDetails/:orderId',isAdminAuthenticated, orderController.orderDetails);
// In your routes file
router.post('/updateOrderStatus', isAdminAuthenticated, orderController.updateOrderStatus);
router.post('/sendmail', isAdminAuthenticated, adminController.sendmail);

//coupons
router.get('/coupons',isAdminAuthenticated, couponController.coupons);
router.get('/addCoupon',isAdminAuthenticated, couponController.addCoupon);
router.post('/saveCoupon', isAdminAuthenticated,upload.single('couponImage'), couponController.saveCoupon);
// upload.array('offerImages', 5)
router.patch('/changeCouponStatus', isAdminAuthenticated,couponController.changeCouponStatus)
router.get('/editCoupon/:couponId',isAdminAuthenticated, couponController.editCoupon);
router.post('/updateCoupon', isAdminAuthenticated,upload.single('couponImage'), couponController.updateCoupon);

//reports
router.get('/salesReportList',isAdminAuthenticated, reportController.salesReportList);
router.get('/salesReport',isAdminAuthenticated, reportController.salesReport);

//offer
router.get('/offers',isAdminAuthenticated, offerController.offers);
router.get('/addOffer',isAdminAuthenticated, offerController.addOffer);
router.post('/saveOffer',isAdminAuthenticated, offerController.saveOffer);
router.patch('/offerDelete',isAdminAuthenticated, offerController.offerDelete);





 




















//products
// router.get('/addProducts"',isAdminAuthenticated, productController.addProduct);














module.exports = router;
