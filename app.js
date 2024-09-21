const express = require("express");
const app = express();
const passport = require("./config/passport-setup"); //for google auth /single signon

const session = require("express-session");
const MongoStore = require("connect-mongo");
const nocache = require("nocache");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
// const bodyParser = require('body-parser');//deprecated please use new parser
const exphbs = require("express-handlebars");
const logger = require("morgan");
const flash = require("connect-flash");
const mongoose = require("./config/database");
const sessionMiddleware = require("./middleware/sessionMiddleware"); // For session check in view
// const setUploadFolder = require('../middlewares/setUploadFolder');

const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const helpers = require("./helpers/helpers");

app.use(nocache());

app.use(
  session({
    secret: "ebloom",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      client: mongoose.connection.getClient(), // Use the Mongoose connection's client
      ttl: 14 * 24 * 60 * 60, // Session TTL in seconds (14 days)
    }),
    cookie: { secure: false }, ////for google auth /single signon
  })
);
//for google auth /single signon
app.use(passport.initialize());
app.use(passport.session());
//end for google auth /single signon

app.use(sessionMiddleware);

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// parse application/json
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

app.use(logger("dev"));
app.use(flash());

app.engine(
  "hbs",
  exphbs.engine({
    extname: "hbs",
    defaultLayout: "layout",
    layoutsDir: path.join(__dirname, "app/views/layouts/"),
    partialsDir: path.join(__dirname, "app/views/partials/"),
    helpers: helpers,
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    },
  })
);
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// app.use(setUploadFolder('uploads'));

app.set("views", path.join(__dirname, "app/views"));
app.set("view engine", "hbs");

// Routes
app.use("/", userRoutes);
app.use("/admin", adminRoutes);

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
