// //for google auth /single signon
function isLoggedIn(req, res, next) {
    if (req.user) {
      return next();
    } else {
        res.sendStatus(401);
    }
  }
  
  module.exports = isLoggedIn;
  