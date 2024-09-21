require('dotenv').config();

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const User = require('../app/models/userModel'); // Adjust the path if necessary

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback",
  passReqToCallback: true
},
async function(request, accessToken, refreshToken, profile, done) {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.findOne({ email: profile.email });
      if (user) {
        user.googleId = profile.id;
        user.displayName = profile.displayName;
        await user.save();
      } else {
        user = await User.create({ 
          googleId: profile.id, 
          displayName: profile.displayName,
          email: profile.email 
        });
      }
    }
    return done(null, user);
  } catch (err) {
    console.error('Error in Google Strategy Callback:', err);
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id); // Ensure the ID is a string
});

passport.deserializeUser(async (id, done) => {
  try {
    let user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
module.exports = passport;
