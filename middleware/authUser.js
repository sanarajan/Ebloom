// middleware/isUserAuthenticated.js
function isUserAuthenticated(req, res, next) {
  console.log("Checking authentication auth");

  if (req.session && req.session.useremail && req.session.userType === 2) {
    console.log(" sssion pass")
    next();
  } else {
    // User is not authenticated, redirect to login page
    res.redirect("/");
  }
}
module.exports = isUserAuthenticated;