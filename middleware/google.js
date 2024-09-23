// //for google auth /single signon
function isLoggedIn(req, res, next) { 
    if (req.user) {
     // const newUser = req.user
      // req.session.userType = newUser.userType;
      // req.session.userId = newUser._id;
      // req.session.username = newUser.username;
      // req.session.useremail = newUser.email;
      // req.session.userPasswordWrong = false;
     
      return next();
    } else {
        res.sendStatus(401);
    }
  }  
  module.exports = isLoggedIn;
  