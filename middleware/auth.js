function isAdminAuthenticated(req, res, next) {
    if (req.session && req.session.adusername&& req.session.aduserType===1) {
      return next();
    } else {
        res.redirect('/admin');
    }
  }
  
  module.exports = isAdminAuthenticated;
  